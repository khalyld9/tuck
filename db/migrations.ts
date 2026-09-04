import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from '@/constants/categories';

/**
 * Schema migrations.
 *
 * Each migration is applied exactly once and the resulting version is stored
 * in SQLite's own `user_version` pragma, so upgrades survive app updates.
 * Add new migrations to the end of the array — never edit an existing one.
 */
export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

const initialSchema: Migration = {
  version: 1,
  name: 'initial_schema',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        icon        TEXT NOT NULL DEFAULT 'bookmark',
        tone        TEXT NOT NULL DEFAULT 'neutral',
        sortOrder   INTEGER NOT NULL DEFAULT 0,
        isSystem    INTEGER NOT NULL DEFAULT 0,
        createdAt   INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS items (
        id                     TEXT PRIMARY KEY NOT NULL,
        title                  TEXT NOT NULL,
        url                    TEXT,
        description            TEXT,
        notes                  TEXT,
        categoryId             TEXT NOT NULL DEFAULT 'other'
                                 REFERENCES categories(id) ON DELETE SET DEFAULT,
        imageUri               TEXT,
        isFavorite             INTEGER NOT NULL DEFAULT 0,
        isArchived             INTEGER NOT NULL DEFAULT 0,
        createdAt              INTEGER NOT NULL,
        updatedAt              INTEGER NOT NULL,
        reminderAt             INTEGER,
        reminderNotificationId TEXT
      );

      CREATE TABLE IF NOT EXISTS tags (
        id   TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
      );

      CREATE TABLE IF NOT EXISTS item_tags (
        itemId TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        tagId  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
        PRIMARY KEY (itemId, tagId)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      -- Indexes tuned for the queries the app actually runs:
      -- the Saved list (archived + sort), category browsing, reminders,
      -- favourites, and tag joins.
      CREATE INDEX IF NOT EXISTS idx_items_archived_created
        ON items (isArchived, createdAt DESC);
      CREATE INDEX IF NOT EXISTS idx_items_archived_updated
        ON items (isArchived, updatedAt DESC);
      CREATE INDEX IF NOT EXISTS idx_items_archived_title
        ON items (isArchived, title COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_items_category
        ON items (categoryId, isArchived);
      CREATE INDEX IF NOT EXISTS idx_items_favorite
        ON items (isFavorite, isArchived);
      CREATE INDEX IF NOT EXISTS idx_items_reminder
        ON items (reminderAt) WHERE reminderAt IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_item_tags_tag
        ON item_tags (tagId);
      CREATE INDEX IF NOT EXISTS idx_item_tags_item
        ON item_tags (itemId);
    `);

    // Seed the built-in categories.
    const now = Date.now();
    const statement = await db.prepareAsync(
      `INSERT OR IGNORE INTO categories (id, name, icon, tone, sortOrder, isSystem, createdAt)
       VALUES ($id, $name, $icon, $tone, $sortOrder, 1, $createdAt)`
    );
    try {
      for (const category of DEFAULT_CATEGORIES) {
        await statement.executeAsync({
          $id: category.id,
          $name: category.name,
          $icon: category.icon,
          $tone: category.tone,
          $sortOrder: category.sortOrder,
          $createdAt: now,
        });
      }
    } finally {
      await statement.finalizeAsync();
    }
  },
};

/**
 * Adds a denormalised, lowercase search column. Keeping a prepared haystack on
 * the row lets search stay a single indexed LIKE scan instead of joining tags
 * on every keystroke.
 */
const searchIndex: Migration = {
  version: 2,
  name: 'search_haystack',
  up: async (db) => {
    await db.execAsync(`
      ALTER TABLE items ADD COLUMN searchText TEXT NOT NULL DEFAULT '';
      CREATE INDEX IF NOT EXISTS idx_items_search ON items (searchText);
    `);
  },
};

export const MIGRATIONS: readonly Migration[] = [initialSchema, searchIndex];

export const LATEST_VERSION = MIGRATIONS.reduce(
  (max, migration) => Math.max(max, migration.version),
  0
);

/** Applies every migration newer than the database's current `user_version`. */
export async function runMigrations(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= LATEST_VERSION) return currentVersion;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    // Each migration runs in its own transaction so a failure can't leave the
    // schema half-applied.
    await db.withTransactionAsync(async () => {
      await migration.up(db);
    });
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }

  return LATEST_VERSION;
}
