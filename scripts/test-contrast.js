/**
 * Colour contrast check.  Run with:  node scripts/test-contrast.js
 *
 * Asserts every coloured-text-on-tinted-background pairing in the design
 * tokens clears WCAG AA. Category tiles, chips and badges all set type in a
 * hue on a tint of that same hue, which is exactly the combination that
 * quietly fails, so this is checked mechanically rather than by eye.
 *
 *   - tone.ink on tone.bg    >= 4.5:1  (labels, counts — normal text)
 *   - body text on surfaces  >= 4.5:1
 *   - muted text on surfaces >= 4.5:1
 *
 * tone.fg is deliberately exempt: it colours icons and strokes, which WCAG
 * treats as graphical objects (3:1), not text.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules/typescript'));

function load(file) {
  const full = path.join(ROOT, file);
  const out = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const m = { exports: {} };
  const req = (spec) => {
    if (spec === 'react-native') return { Platform: { select: (o) => o.default ?? o.ios } };
    if (spec.startsWith('@/')) return load(spec.replace('@/', '') + '.ts');
    if (spec.startsWith('./')) return load(path.join(path.dirname(file), spec.slice(2)) + '.ts');
    return require(spec);
  };
  new Function('exports', 'require', 'module', out)(m.exports, req, m);
  return m.exports;
}

const { lightTheme, darkTheme } = load('constants/theme.ts');

// Accepts #rgb, #rrggbb and rgba(...). Alpha is composited over `over`,
// because a translucent colour's real contrast depends on what is behind it.
const toRgb = (h, over) => {
  const m = /rgba?\(([^)]+)\)/.exec(h);
  if (m) {
    const parts = m[1].split(',').map((v) => parseFloat(v.trim()));
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    if (a >= 1 || !over) return [r, g, b];
    const bg = toRgb(over);
    return [r, g, b].map((v, i) => v * a + bg[i] * (1 - a));
  }
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const luminance = (rgb) => {
  const a = rgb.map((v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};
const contrast = (fg, bg) => {
  const a = luminance(toRgb(fg, bg));
  const b = luminance(toRgb(bg));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

const AA = 4.5;
let failures = 0;

for (const [themeName, theme] of [['light', lightTheme], ['dark', darkTheme]]) {
  console.log(`\n== ${themeName} ==`);

  for (const [name, tone] of Object.entries(theme.tones)) {
    const r = contrast(tone.ink, tone.bg);
    const ok = r >= AA;
    if (!ok) failures += 1;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  tone ${name.padEnd(8)} ink on bg   ${r.toFixed(2)}:1`);

    // Solid category cards fill edge-to-edge with `onSolid` text on top, so
    // that pairing has to clear AA in its own right.
    const rs = contrast(tone.onSolid, tone.solid);
    const oks = rs >= AA;
    if (!oks) failures += 1;
    console.log(
      `  ${oks ? 'ok  ' : 'FAIL'}  tone ${name.padEnd(8)} onSolid/solid ${rs.toFixed(2)}:1`
    );
  }

  const c = theme.colors;
  const textPairs = [
    ['text on background', c.text, c.background],
    ['text on surface', c.text, c.surface],
    ['textMuted on background', c.textMuted, c.background],
    ['textMuted on surface', c.textMuted, c.surface],
    ['textSubtle on surface', c.textSubtle, c.surface],
    ['textOnAccent on accent', c.textOnAccent, c.accent],
    ['accent on background', c.accent, c.background],
    ['danger on dangerSoft', c.danger, c.dangerSoft],
    ['reminder on surface', c.reminder, c.surface],
    ['heroText on heroSurface', c.heroText, c.heroSurface],
    ['heroTextMuted on heroSurface', c.heroTextMuted, c.heroSurface],
    ['heroText on heroSurfaceAlt', c.heroText, c.heroSurfaceAlt],
  ];
  for (const [label, fg, bg] of textPairs) {
    const r = contrast(fg, bg);
    const ok = r >= AA;
    if (!ok) failures += 1;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(24)}    ${r.toFixed(2)}:1`);
  }
}

console.log(
  failures === 0
    ? '\nPASS — every text pairing clears WCAG AA (4.5:1).'
    : `\nFAIL — ${failures} pairing(s) below 4.5:1.`
);
process.exit(failures === 0 ? 0 : 1);
