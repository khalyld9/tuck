import { DEFAULT_CATEGORY_ID } from '@/constants/categories';
import type { SettingRow } from '@/types/db';
import type { Settings, SortOption, ThemePreference, ViewMode } from '@/types/models';

import { getDatabase } from '../database';

/**
 * Settings live in the same SQLite file as everything else — one storage
 * engine, one backup surface, and no async-storage race on first paint.
 */

export const DEFAULT_SETTINGS: Settings = {
  themePreference: 'system',
  hapticsEnabled: true,
  defaultCategoryId: DEFAULT_CATEGORY_ID,
  confirmDeletion: true,
  remindersEnabled: true,
  hasOnboarded: false,
  savedViewMode: 'list',
  savedSort: 'recent',
};

const THEME_VALUES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const VIEW_VALUES: readonly ViewMode[] = ['list', 'grid'];
const SORT_VALUES: readonly SortOption[] = ['recent', 'oldest', 'updated', 'alphabetical'];

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === '1' || value === 'true';
}

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export async function loadSettings(): Promise<Settings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SettingRow>('SELECT key, value FROM settings');
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    themePreference: parseEnum(map.get('themePreference'), THEME_VALUES, DEFAULT_SETTINGS.themePreference),
    hapticsEnabled: parseBoolean(map.get('hapticsEnabled'), DEFAULT_SETTINGS.hapticsEnabled),
    defaultCategoryId: map.get('defaultCategoryId') ?? DEFAULT_SETTINGS.defaultCategoryId,
    confirmDeletion: parseBoolean(map.get('confirmDeletion'), DEFAULT_SETTINGS.confirmDeletion),
    remindersEnabled: parseBoolean(map.get('remindersEnabled'), DEFAULT_SETTINGS.remindersEnabled),
    hasOnboarded: parseBoolean(map.get('hasOnboarded'), DEFAULT_SETTINGS.hasOnboarded),
    savedViewMode: parseEnum(map.get('savedViewMode'), VIEW_VALUES, DEFAULT_SETTINGS.savedViewMode),
    savedSort: parseEnum(map.get('savedSort'), SORT_VALUES, DEFAULT_SETTINGS.savedSort),
  };
}

function serialize(value: string | boolean): string {
  return typeof value === 'boolean' ? (value ? '1' : '0') : value;
}

export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
    key,
    serialize(value as string | boolean),
  ]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const db = await getDatabase();
  const entries = Object.entries(patch) as [keyof Settings, Settings[keyof Settings]][];
  if (entries.length === 0) return;

  await db.withTransactionAsync(async () => {
    for (const [key, value] of entries) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        key,
        serialize(value as string | boolean),
      ]);
    }
  });
}

/** Restores defaults but keeps onboarding done, so no forced re-onboarding. */
export async function resetSettings(): Promise<void> {
  await saveSettings({ ...DEFAULT_SETTINGS, hasOnboarded: true });
}
