/**
 * Identifier helpers.
 *
 * IDs are generated on-device and are globally unique, which means a future
 * sync layer can merge two devices' databases without renumbering anything.
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomChunk(length: number): string {
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Time-sortable unique id: base36 timestamp + randomness.
 * Sorting by id therefore roughly matches creation order, which is handy for
 * stable list keys and debugging.
 */
export function createId(prefix = ''): string {
  const time = Date.now().toString(36);
  return `${prefix}${time}${randomChunk(10)}`;
}

/** Normalises an arbitrary string into a stable slug usable as a category id. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug.length > 0 ? slug : createId('c');
}
