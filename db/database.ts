import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';

export const DATABASE_NAME = 'tuck.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME, {
    useNewConnection: false,
  });

  // WAL keeps reads fast while a write is in flight; foreign keys enforce the
  // item_tags cascade so deleting an item never leaves orphan rows.
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await runMigrations(db);
  return db;
}

/**
 * Returns the shared database handle, opening and migrating it on first call.
 * Concurrent callers await the same promise, so migrations only ever run once.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = open().catch((error) => {
      // Reset so a later attempt can retry rather than caching the failure.
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

/** Test/reset helper — drops the cached handle so the next call reopens. */
export async function closeDatabase(): Promise<void> {
  if (!databasePromise) return;
  const db = await databasePromise.catch(() => null);
  databasePromise = null;
  await db?.closeAsync().catch(() => undefined);
}

/** Wipes every user row but keeps the schema and the built-in categories. */
export async function resetUserData(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM item_tags;
      DELETE FROM items;
      DELETE FROM tags;
      DELETE FROM categories WHERE isSystem = 0;
    `);
  });
}
