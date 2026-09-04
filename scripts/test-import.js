/**
 * Import robustness check.  Run with:  node scripts/test-import.js
 *
 * Feeds the real parser in lib/import-export/backup.ts a pile of malformed,
 * hostile and future-versioned payloads and asserts the two things that
 * actually matter: it never throws, and it never destroys data the user
 * already had.
 *
 * The module is transpiled with the project's own TypeScript and evaluated
 * against an in-memory stand-in for SQLite, so the only code under test is
 * ours — no emulator, no database, no network.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules/typescript'));

function transpile(file) {
  const src = fs.readFileSync(file, 'utf8');
  return ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
}

// ---- in-memory stand-in for SQLite -------------------------------------
const db = { items: new Map(), categories: new Map() };
const seedCats = ['movies', 'shows', 'games', 'books', 'food', 'places', 'products',
                  'websites', 'articles', 'videos', 'ideas', 'inspiration', 'other'];
for (const id of seedCats) db.categories.set(id, { id, name: id, icon: 'bookmark', tone: 'neutral', sortOrder: 1 });
// Pretend the user already has real data we must never lose.
for (let i = 0; i < 12; i += 1) {
  db.items.set(`existing-${i}`, { id: `existing-${i}`, title: `Existing ${i}`, categoryId: 'books', tags: [] });
}

const stubs = {
  '@/db/repositories': {
    itemsRepo: {
      listAllItems: async () => [...db.items.values()],
      countItems: async () => db.items.size,
      upsertImportedItem: async (item, strategy) => {
        const exists = db.items.has(item.id);
        if (!exists) { db.items.set(item.id, item); return 'added'; }
        if (strategy === 'skip') return 'skipped';
        if (strategy === 'replace') { db.items.set(item.id, item); return 'updated'; }
        const copy = { ...item, id: `${item.id}-copy` };
        db.items.set(copy.id, copy);
        return 'added';
      },
    },
    categoriesRepo: {
      listCategories: async () => [...db.categories.values()],
      ensureCategoryExists: async (c) => {
        if (db.categories.has(c.id)) return false;
        db.categories.set(c.id, c);
        return true;
      },
    },
  },
  '@/constants/categories': { FALLBACK_CATEGORY_ID: 'other' },
  '@/types/models': { BACKUP_FORMAT: 'tuck.backup', BACKUP_VERSION: 1 },
  'expo-document-picker': { getDocumentAsync: async () => ({ canceled: true }) },
  'expo-file-system': { File: class { constructor(u) { this.u = u; } async text() { return '{}'; } }, Paths: { cache: '/tmp' } },
  'expo-sharing': { isAvailableAsync: async () => false, shareAsync: async () => {} },
  'react-native': { Platform: { OS: 'ios' } },
};

function loadModule(file) {
  const code = transpile(file);
  const m = new Module(file);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  const req = (spec) => (spec in stubs ? stubs[spec] : m.require(spec));
  req.resolve = (s) => s;
  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', code);
  fn(m.exports, req, m, file, path.dirname(file));
  return m.exports;
}

const backup = loadModule(path.join(ROOT, 'lib/import-export/backup.ts'));

const CASES = [
  ['null', null],
  ['a bare string', 'not a backup'],
  ['a number', 42],
  ['an empty object', {}],
  ['items is not an array', { items: 'nope' }],
  ['bare array of items', [{ id: 'bare-1', title: 'Bare array item', categoryId: 'books' }]],
  ['records missing id/title', { items: [
    { title: 'No id at all' }, { id: 'no-title' }, { id: '', title: '' },
    null, 'a string', 7, { id: 'valid-1', title: 'This one is fine' },
  ]}],
  ['wrong field types', { items: [
    { id: 'weird-1', title: 'Weird types', createdAt: 'yesterday', isFavorite: 'yes',
      tags: [1, 2, {}, 'realtag', ''], url: 12345, reminderAt: {} },
  ]}],
  ['ISO string dates', { items: [
    { id: 'iso-1', title: 'ISO dated', createdAt: '2024-03-01T10:00:00.000Z', updatedAt: '2024-03-02T10:00:00.000Z' },
  ]}],
  ['unknown category', { items: [{ id: 'cat-1', title: 'Unknown category', categoryId: 'nope-not-real' }]}],
  ['future version + unknown fields', { format: 'tuck.backup', version: 999, items: [
    { id: 'fut-1', title: 'From the future', someNewField: { nested: true } },
  ]}],
  ['a 5000-char title', { items: [{ id: 'big-1', title: 'x'.repeat(5000) }]}],
  ['custom category in file', {
    categories: [{ id: 'recipes', name: 'Recipes', icon: 'bookmark', tone: 'rose', sortOrder: 20 }],
    items: [{ id: 'rec-1', title: 'A recipe', categoryId: 'recipes' }],
  }],
  ['duplicate of an existing id', { items: [{ id: 'existing-3', title: 'Trying to overwrite' }]}],
  ['deeply nested junk', { items: [{ id: 'x', title: 'ok', notes: { a: { b: { c: [1,2,3] } } } }]}],
];

(async () => {
  let failures = 0;
  console.log(`baseline items: ${db.items.size}\n`);

  for (const [name, payload] of CASES) {
    const before = db.items.size;
    let result, threw = null;
    try { result = await backup.importBackupPayload(payload, 'skip'); }
    catch (e) { threw = e && e.message ? e.message : String(e); }
    const after = db.items.size;
    const lost = after < before;
    if (threw || lost) failures += 1;
    const tag = threw ? 'THREW   ' : lost ? 'DATALOSS' : 'ok      ';
    console.log(`[${tag}] ${name}`);
    console.log(`           ${before} -> ${after} items`);
    if (threw) console.log(`           error: ${threw}`);
    else console.log(`           ${JSON.stringify(result)}`);
  }

  // Every original row must still be present.
  const survivors = seedCats.length && [...Array(12).keys()].filter((i) => db.items.has(`existing-${i}`)).length;
  console.log(`\noriginal rows surviving: ${survivors}/12`);
  if (survivors !== 12) failures += 1;

  // A round trip must preserve the data.
  const built = await backup.buildBackup();
  console.log(`buildBackup -> format=${built.format} version=${built.version} items=${built.items.length}`);
  const json = JSON.parse(JSON.stringify(built));
  const before = db.items.size;
  const round = await backup.importBackupPayload(json, 'skip');
  console.log(`round trip re-import: ${before} -> ${db.items.size} (all skipped: ${round.itemsSkipped === before})`);
  if (db.items.size !== before) failures += 1;

  console.log(failures === 0 ? '\nPASS — no crashes, no data loss.' : `\nFAIL — ${failures} problem(s).`);
  process.exit(failures === 0 ? 0 : 1);
})();
