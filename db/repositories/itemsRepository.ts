import type { SQLiteDatabase } from 'expo-sqlite';

import { FALLBACK_CATEGORY_ID } from '@/constants/categories';
import { createId } from '@/lib/id';
import { getDomain, normalizeUrl } from '@/lib/url';
import type { CountRow, ItemRow } from '@/types/db';
import type { ItemQuery, NewItemInput, SavedItem, SortOption, UpdateItemInput } from '@/types/models';

import { getDatabase } from '../database';
import { buildSearchText, mapItem, TAG_DELIMITER } from './mappers';
import { pruneOrphanTags, setItemTags } from './tagsRepository';

/**
 * Every read goes through this projection so tags always arrive with the item
 * in one round-trip instead of an N+1 query per row.
 */
const SELECT_ITEM = `
  SELECT i.*,
         (SELECT GROUP_CONCAT(t.name, '${TAG_DELIMITER}')
          FROM item_tags it
          JOIN tags t ON t.id = it.tagId
          WHERE it.itemId = i.id) AS tagNames
  FROM items i
`;

const ORDER_BY: Record<SortOption, string> = {
  recent: 'i.createdAt DESC',
  oldest: 'i.createdAt ASC',
  updated: 'i.updatedAt DESC',
  alphabetical: 'i.title COLLATE NOCASE ASC',
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** Resolves the category name so it can be folded into the search haystack. */
async function categoryNameFor(db: SQLiteDatabase, categoryId: string): Promise<string> {
  const row = await db.getFirstAsync<{ name: string }>(
    'SELECT name FROM categories WHERE id = ?',
    [categoryId]
  );
  return row?.name ?? '';
}

async function refreshSearchText(
  db: SQLiteDatabase,
  itemId: string
): Promise<void> {
  const row = await db.getFirstAsync<ItemRow>(`${SELECT_ITEM} WHERE i.id = ?`, [itemId]);
  if (!row) return;
  const categoryName = await categoryNameFor(db, row.categoryId);
  const item = mapItem(row);
  const searchText = buildSearchText({
    title: item.title,
    url: item.url,
    description: item.description,
    notes: item.notes,
    categoryName,
    domain: getDomain(item.url),
    tags: item.tags,
  });
  await db.runAsync('UPDATE items SET searchText = ? WHERE id = ?', [searchText, itemId]);
}

// ─── Create ────────────────────────────────────────────────────────────────

export async function createItem(input: NewItemInput): Promise<SavedItem> {
  const db = await getDatabase();
  const now = Date.now();
  const id = createId('i');
  const url = normalizeUrl(input.url ?? null);
  const title = input.title.trim();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO items (
         id, title, url, description, notes, categoryId, imageUri,
         isFavorite, isArchived, createdAt, updatedAt, reminderAt,
         reminderNotificationId, searchText
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, '')`,
      [
        id,
        title,
        url,
        input.description?.trim() || null,
        input.notes?.trim() || null,
        input.categoryId || FALLBACK_CATEGORY_ID,
        input.imageUri ?? null,
        input.isFavorite ? 1 : 0,
        now,
        now,
        input.reminderAt ?? null,
      ]
    );

    if (input.tags && input.tags.length > 0) {
      await setItemTags(db, id, input.tags);
    }
    await refreshSearchText(db, id);
  });

  const created = await getItem(id);
  if (!created) throw new Error('Failed to read back the created item');
  return created;
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getItem(id: string): Promise<SavedItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ItemRow>(`${SELECT_ITEM} WHERE i.id = ?`, [id]);
  return row ? mapItem(row) : null;
}

/**
 * The single query behind Saved, Browse, Favourites, Archive and search.
 * Everything is expressed as indexed predicates plus one LIKE over the
 * denormalised `searchText`, so it stays fast with thousands of rows.
 */
export async function queryItems(query: ItemQuery): Promise<SavedItem[]> {
  const db = await getDatabase();
  const where: string[] = [];
  const params: (string | number)[] = [];

  switch (query.scope) {
    case 'active':
      where.push('i.isArchived = 0');
      break;
    case 'archived':
      where.push('i.isArchived = 1');
      break;
    case 'favorites':
      where.push('i.isArchived = 0', 'i.isFavorite = 1');
      break;
    case 'all':
      break;
  }

  if (query.favoritesOnly && query.scope !== 'favorites') {
    where.push('i.isFavorite = 1');
  }

  if (query.categoryId) {
    where.push('i.categoryId = ?');
    params.push(query.categoryId);
  } else if (query.categoryIds && query.categoryIds.length > 0) {
    // Placeholders are generated from the array length and the values are
    // still bound, so this stays parameterised rather than interpolated.
    where.push(`i.categoryId IN (${query.categoryIds.map(() => '?').join(', ')})`);
    params.push(...query.categoryIds);
  }

  const search = query.search?.trim().toLowerCase();
  if (search && search.length > 0) {
    // Each whitespace-separated term must appear somewhere in the haystack,
    // which makes multi-word search behave the way people expect.
    for (const term of search.split(/\s+/).slice(0, 6)) {
      where.push("i.searchText LIKE ? ESCAPE '\\'");
      params.push(`%${escapeLike(term)}%`);
    }
  }

  if (query.tag) {
    where.push(
      `EXISTS (SELECT 1 FROM item_tags it
               JOIN tags t ON t.id = it.tagId
               WHERE it.itemId = i.id AND t.name = ? COLLATE NOCASE)`
    );
    params.push(query.tag);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limitClause = query.limit ? ` LIMIT ${Math.max(0, Math.trunc(query.limit))}` : '';
  const offsetClause = query.offset ? ` OFFSET ${Math.max(0, Math.trunc(query.offset))}` : '';

  const rows = await db.getAllAsync<ItemRow>(
    `${SELECT_ITEM} ${whereClause} ORDER BY ${ORDER_BY[query.sort]}${limitClause}${offsetClause}`,
    params
  );
  return rows.map(mapItem);
}

/** Latest saves for the Home screen. */
export async function listRecentItems(limit = 6): Promise<SavedItem[]> {
  return queryItems({ scope: 'active', sort: 'recent', limit });
}

/** Upcoming reminders, soonest first. */
export async function listUpcomingReminders(limit = 5): Promise<SavedItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ItemRow>(
    `${SELECT_ITEM}
     WHERE i.reminderAt IS NOT NULL AND i.isArchived = 0
     ORDER BY i.reminderAt ASC
     LIMIT ?`,
    [limit]
  );
  return rows.map(mapItem);
}

/**
 * The handful of numbers Home needs to say something true about the library.
 *
 * One aggregate query rather than several, because this runs on every visit
 * to the first screen.
 */
export interface LibraryPulse {
  /** Saved in the last 7 days. */
  savedThisWeek: number;
  /** Active items older than 30 days — the quietly forgotten pile. */
  gatheringDust: number;
  /** Reminders that have already passed. */
  overdue: number;
  /** Reminders due in the next 24 hours. */
  dueSoon: number;
  /** Name of the category with the most active items, if there is one. */
  topCategory: string | null;
  topCategoryCount: number;
}

export async function getPulse(now: number = Date.now()): Promise<LibraryPulse> {
  const db = await getDatabase();
  const week = now - 7 * 86_400_000;
  const month = now - 30 * 86_400_000;
  const tomorrow = now + 86_400_000;

  const row = await db.getFirstAsync<{
    savedThisWeek: number;
    gatheringDust: number;
    overdue: number;
    dueSoon: number;
  }>(
    `SELECT
       SUM(CASE WHEN createdAt >= ? AND isArchived = 0 THEN 1 ELSE 0 END) AS savedThisWeek,
       SUM(CASE WHEN createdAt < ? AND isArchived = 0 THEN 1 ELSE 0 END) AS gatheringDust,
       SUM(CASE WHEN reminderAt IS NOT NULL AND reminderAt < ? AND isArchived = 0
                THEN 1 ELSE 0 END) AS overdue,
       SUM(CASE WHEN reminderAt IS NOT NULL AND reminderAt >= ? AND reminderAt < ?
                AND isArchived = 0 THEN 1 ELSE 0 END) AS dueSoon
     FROM items`,
    [week, month, now, now, tomorrow]
  );

  const top = await db.getFirstAsync<{ name: string; total: number }>(
    `SELECT c.name AS name, COUNT(*) AS total
     FROM items i
     JOIN categories c ON c.id = i.categoryId
     WHERE i.isArchived = 0
     GROUP BY i.categoryId
     ORDER BY total DESC, c.sortOrder ASC
     LIMIT 1`
  );

  return {
    savedThisWeek: row?.savedThisWeek ?? 0,
    gatheringDust: row?.gatheringDust ?? 0,
    overdue: row?.overdue ?? 0,
    dueSoon: row?.dueSoon ?? 0,
    topCategory: top?.name ?? null,
    topCategoryCount: top?.total ?? 0,
  };
}

/**
 * How many things were saved on each of the last seven days, oldest first.
 *
 * Drives the sparkline on Home. Bucketing happens in SQL against the
 * `createdAt` index rather than by loading rows and grouping in JS, so the
 * cost doesn't grow with the size of the library. Days with nothing saved
 * come back as 0 rather than being dropped, because the chart needs a slot
 * per day to stay readable.
 */
export async function countPerDay(
  days = 7,
  now: number = Date.now()
): Promise<{ day: number; count: number }[]> {
  const db = await getDatabase();

  // Local midnight, so "today" matches what the calendar says rather than UTC.
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const start = midnight.getTime() - (days - 1) * 86_400_000;

  const rows = await db.getAllAsync<{ offset: number; total: number }>(
    `SELECT CAST((createdAt - ?) / 86400000 AS INTEGER) AS offset,
            COUNT(*) AS total
     FROM items
     WHERE createdAt >= ? AND isArchived = 0
     GROUP BY offset`,
    [start, start]
  );

  const buckets = new Array<number>(days).fill(0);
  for (const row of rows) {
    if (row.offset >= 0 && row.offset < days) buckets[row.offset] = row.total;
  }

  return buckets.map((count, index) => ({
    day: start + index * 86_400_000,
    count,
  }));
}

export interface LibraryCounts {
  active: number;
  archived: number;
  favorites: number;
  withReminders: number;
  total: number;
}

export async function getCounts(): Promise<LibraryCounts> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    active: number;
    archived: number;
    favorites: number;
    withReminders: number;
    total: number;
  }>(`
    SELECT
      SUM(CASE WHEN isArchived = 0 THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN isArchived = 1 THEN 1 ELSE 0 END) AS archived,
      SUM(CASE WHEN isFavorite = 1 AND isArchived = 0 THEN 1 ELSE 0 END) AS favorites,
      SUM(CASE WHEN reminderAt IS NOT NULL AND isArchived = 0 THEN 1 ELSE 0 END) AS withReminders,
      COUNT(*) AS total
    FROM items
  `);
  return {
    active: row?.active ?? 0,
    archived: row?.archived ?? 0,
    favorites: row?.favorites ?? 0,
    withReminders: row?.withReminders ?? 0,
    total: row?.total ?? 0,
  };
}

/**
 * Active item totals per category, as a plain map.
 *
 * Home's "Come back to" rows each span several categories, so they need
 * arbitrary sums rather than the per-category rows the categories store
 * already holds. One grouped query answers every row at once.
 */
export async function countByCategory(): Promise<Record<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ categoryId: string; total: number }>(
    `SELECT categoryId, COUNT(*) AS total
     FROM items
     WHERE isArchived = 0
     GROUP BY categoryId`
  );

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.categoryId] = row.total;
  return counts;
}

/** Picks one random active item — the engine behind Surprise Me. */
export async function getRandomItem(excludeId?: string): Promise<SavedItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ItemRow>(
    `${SELECT_ITEM}
     WHERE i.isArchived = 0 ${excludeId ? 'AND i.id != ?' : ''}
     ORDER BY RANDOM() LIMIT 1`,
    excludeId ? [excludeId] : []
  );
  return row ? mapItem(row) : null;
}

/** A handful of random items used for the Surprise Me shuffle animation. */
export async function getRandomItems(count: number): Promise<SavedItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ItemRow>(
    `${SELECT_ITEM} WHERE i.isArchived = 0 ORDER BY RANDOM() LIMIT ?`,
    [Math.max(1, count)]
  );
  return rows.map(mapItem);
}

export async function countItems(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM items');
  return row?.count ?? 0;
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function updateItem(id: string, changes: UpdateItemInput): Promise<SavedItem | null> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  const assign = (column: string, value: string | number | null) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };

  if (changes.title !== undefined) assign('title', changes.title.trim());
  if (changes.url !== undefined) assign('url', normalizeUrl(changes.url));
  if (changes.description !== undefined) assign('description', changes.description?.trim() || null);
  if (changes.notes !== undefined) assign('notes', changes.notes?.trim() || null);
  if (changes.categoryId !== undefined) assign('categoryId', changes.categoryId);
  if (changes.imageUri !== undefined) assign('imageUri', changes.imageUri);
  if (changes.isFavorite !== undefined) assign('isFavorite', changes.isFavorite ? 1 : 0);
  if (changes.isArchived !== undefined) assign('isArchived', changes.isArchived ? 1 : 0);
  if (changes.reminderAt !== undefined) assign('reminderAt', changes.reminderAt);
  if (changes.reminderNotificationId !== undefined) {
    assign('reminderNotificationId', changes.reminderNotificationId);
  }

  assign('updatedAt', Date.now());

  await db.withTransactionAsync(async () => {
    if (sets.length > 0) {
      await db.runAsync(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
    }
    if (changes.tags !== undefined) {
      await setItemTags(db, id, changes.tags);
      await pruneOrphanTags(db);
    }
    await refreshSearchText(db, id);
  });

  return getItem(id);
}

/** Toggles favourite and returns the new value (or null if the item is gone). */
export async function toggleFavorite(id: string): Promise<boolean | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ isFavorite: number }>(
    'SELECT isFavorite FROM items WHERE id = ?',
    [id]
  );
  if (!row) return null;
  const next = row.isFavorite === 1 ? 0 : 1;
  await db.runAsync('UPDATE items SET isFavorite = ?, updatedAt = ? WHERE id = ?', [
    next,
    Date.now(),
    id,
  ]);
  return next === 1;
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE items SET isArchived = ?, updatedAt = ? WHERE id = ?', [
    archived ? 1 : 0,
    Date.now(),
    id,
  ]);
}

export async function setReminder(
  id: string,
  reminderAt: number | null,
  notificationId: string | null
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE items SET reminderAt = ?, reminderNotificationId = ?, updatedAt = ? WHERE id = ?',
    [reminderAt, notificationId, Date.now(), id]
  );
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteItem(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    // item_tags rows cascade via the foreign key.
    await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
    await pruneOrphanTags(db);
  });
}

/** Empties the archive. Returns how many items were removed. */
export async function deleteArchived(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CountRow>(
    'SELECT COUNT(*) AS count FROM items WHERE isArchived = 1'
  );
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM items WHERE isArchived = 1');
    await pruneOrphanTags(db);
  });
  return row?.count ?? 0;
}

// ─── Restore (used by Undo and by import) ──────────────────────────────────

/**
 * Re-inserts a previously deleted item verbatim, preserving its id and
 * timestamps. This is what makes "Undo" after a delete truthful rather than a
 * re-create with a new identity.
 */
export async function restoreItem(item: SavedItem): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO items (
         id, title, url, description, notes, categoryId, imageUri,
         isFavorite, isArchived, createdAt, updatedAt, reminderAt,
         reminderNotificationId, searchText
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
      [
        item.id,
        item.title,
        item.url,
        item.description,
        item.notes,
        item.categoryId,
        item.imageUri,
        item.isFavorite ? 1 : 0,
        item.isArchived ? 1 : 0,
        item.createdAt,
        item.updatedAt,
        item.reminderAt,
        item.reminderNotificationId,
      ]
    );
    await setItemTags(db, item.id, item.tags);
    await refreshSearchText(db, item.id);
  });
}

/**
 * Upsert used by import. `strategy` decides what happens when the id already
 * exists — importing must never silently destroy data.
 */
export async function upsertImportedItem(
  item: SavedItem,
  strategy: 'skip' | 'replace' | 'duplicate'
): Promise<'added' | 'updated' | 'skipped'> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<CountRow>(
    'SELECT COUNT(*) AS count FROM items WHERE id = ?',
    [item.id]
  );
  const exists = (existing?.count ?? 0) > 0;

  if (exists && strategy === 'skip') return 'skipped';

  if (exists && strategy === 'duplicate') {
    await restoreItem({ ...item, id: createId('i') });
    return 'added';
  }

  await restoreItem(item);
  return exists ? 'updated' : 'added';
}

/** All items, used by export. */
export async function listAllItems(): Promise<SavedItem[]> {
  return queryItems({ scope: 'all', sort: 'recent' });
}
