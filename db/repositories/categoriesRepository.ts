import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_ID } from '@/constants/categories';
import type { CategoryToneName } from '@/constants/theme';
import { slugify } from '@/lib/id';
import type { CategoryCountRow, CategoryRow, CountRow } from '@/types/db';
import type { Category, CategoryWithCount } from '@/types/models';

import { getDatabase } from '../database';
import { mapCategory, mapCategoryWithCount } from './mappers';

export async function listCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY sortOrder ASC, name COLLATE NOCASE ASC'
  );
  return rows.map(mapCategory);
}

/**
 * Categories plus their active (non-archived) item counts.
 * A LEFT JOIN keeps empty categories in the list so Browse stays stable.
 */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryCountRow>(`
    SELECT c.*, COALESCE(counts.itemCount, 0) AS itemCount
    FROM categories c
    LEFT JOIN (
      SELECT categoryId, COUNT(*) AS itemCount
      FROM items
      WHERE isArchived = 0
      GROUP BY categoryId
    ) counts ON counts.categoryId = c.id
    ORDER BY c.sortOrder ASC, c.name COLLATE NOCASE ASC
  `);
  return rows.map(mapCategoryWithCount);
}

export async function getCategory(id: string): Promise<Category | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
  return row ? mapCategory(row) : null;
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  tone?: CategoryToneName;
}

/**
 * Adds a user category. IDs are slugs so backups remain human-readable and
 * merge predictably; collisions get a numeric suffix.
 */
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const db = await getDatabase();
  const name = input.name.trim().slice(0, 32);
  if (name.length === 0) throw new Error('Category name is required');

  let id = slugify(name);
  let attempt = 1;
  while (await db.getFirstAsync<CategoryRow>('SELECT id FROM categories WHERE id = ?', [id])) {
    attempt += 1;
    id = `${slugify(name)}-${attempt}`;
  }

  const maxOrder = await db.getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(sortOrder) AS maxOrder FROM categories'
  );
  const sortOrder = (maxOrder?.maxOrder ?? DEFAULT_CATEGORIES.length) + 1;
  const createdAt = Date.now();

  await db.runAsync(
    `INSERT INTO categories (id, name, icon, tone, sortOrder, isSystem, createdAt)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [id, name, input.icon ?? 'bookmark', input.tone ?? 'neutral', sortOrder, createdAt]
  );

  return {
    id,
    name,
    icon: input.icon ?? 'bookmark',
    tone: input.tone ?? 'neutral',
    sortOrder,
    isSystem: false,
    createdAt,
  };
}

export async function updateCategory(
  id: string,
  changes: { name?: string; icon?: string; tone?: CategoryToneName }
): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (changes.name !== undefined) {
    sets.push('name = ?');
    values.push(changes.name.trim().slice(0, 32));
  }
  if (changes.icon !== undefined) {
    sets.push('icon = ?');
    values.push(changes.icon);
  }
  if (changes.tone !== undefined) {
    sets.push('tone = ?');
    values.push(changes.tone);
  }
  if (sets.length === 0) return;

  values.push(id);
  await db.runAsync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, values);
}

/**
 * Deletes a user category and reassigns its items to "Other".
 * System categories are protected.
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
  if (!row || row.isSystem === 1) return false;

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE items SET categoryId = ? WHERE categoryId = ?', [
      FALLBACK_CATEGORY_ID,
      id,
    ]);
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  });
  return true;
}

/** Ensures a category id exists, creating it from a backup payload if needed. */
export async function ensureCategoryExists(category: {
  id: string;
  name: string;
  icon?: string;
  tone?: string;
  sortOrder?: number;
}): Promise<boolean> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<CountRow>(
    'SELECT COUNT(*) AS count FROM categories WHERE id = ?',
    [category.id]
  );
  if ((existing?.count ?? 0) > 0) return false;

  await db.runAsync(
    `INSERT INTO categories (id, name, icon, tone, sortOrder, isSystem, createdAt)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      category.id,
      category.name.slice(0, 32),
      category.icon ?? 'bookmark',
      category.tone ?? 'neutral',
      category.sortOrder ?? 99,
      Date.now(),
    ]
  );
  return true;
}
