import type { SQLiteDatabase } from 'expo-sqlite';

import { createId } from '@/lib/id';
import type { TagCountRow, TagRow } from '@/types/db';
import type { Tag, TagWithCount } from '@/types/models';

import { getDatabase } from '../database';
import { mapTag, mapTagWithCount } from './mappers';

/** Trim, collapse whitespace, drop a leading '#', and cap the length. */
export function normalizeTagName(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 32)
    .trim();
}

/** Splits a free-text tag field ("indie, roguelike") into clean names. */
export function parseTagInput(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const piece of raw.split(/[,\n]/)) {
    const name = normalizeTagName(piece);
    if (name.length === 0) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/**
 * Resolves tag names to ids, creating any that don't exist yet.
 * Runs inside the caller's transaction when there is one.
 */
export async function ensureTags(db: SQLiteDatabase, names: string[]): Promise<string[]> {
  const clean = names.map(normalizeTagName).filter((name) => name.length > 0);
  if (clean.length === 0) return [];

  const ids: string[] = [];
  for (const name of clean) {
    const existing = await db.getFirstAsync<TagRow>(
      'SELECT id, name FROM tags WHERE name = ? COLLATE NOCASE',
      [name]
    );
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const id = createId('t');
    await db.runAsync('INSERT INTO tags (id, name) VALUES (?, ?)', [id, name]);
    ids.push(id);
  }
  return ids;
}

/** Replaces the full tag set for an item. */
export async function setItemTags(
  db: SQLiteDatabase,
  itemId: string,
  names: string[]
): Promise<void> {
  await db.runAsync('DELETE FROM item_tags WHERE itemId = ?', [itemId]);
  const tagIds = await ensureTags(db, names);
  for (const tagId of tagIds) {
    await db.runAsync('INSERT OR IGNORE INTO item_tags (itemId, tagId) VALUES (?, ?)', [
      itemId,
      tagId,
    ]);
  }
}

/** Deletes tags no longer referenced by any item. */
export async function pruneOrphanTags(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    'DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tagId FROM item_tags)'
  );
}

export async function listTags(): Promise<Tag[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagRow>('SELECT id, name FROM tags ORDER BY name COLLATE NOCASE');
  return rows.map(mapTag);
}

/** Tags with how many active items use them — powers the Browse tag cloud. */
export async function listTagsWithCounts(): Promise<TagWithCount[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagCountRow>(`
    SELECT t.id, t.name, COUNT(it.itemId) AS itemCount
    FROM tags t
    JOIN item_tags it ON it.tagId = t.id
    JOIN items i ON i.id = it.itemId AND i.isArchived = 0
    GROUP BY t.id, t.name
    HAVING itemCount > 0
    ORDER BY itemCount DESC, t.name COLLATE NOCASE
  `);
  return rows.map(mapTagWithCount);
}
