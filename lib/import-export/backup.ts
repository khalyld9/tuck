import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { categoriesRepo, itemsRepo } from '@/db/repositories';
import { FALLBACK_CATEGORY_ID } from '@/constants/categories';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupFile,
  type ImportSummary,
  type SavedItem,
} from '@/types/models';

/**
 * Import / export.
 *
 * The backup is plain JSON written to the device — no upload, no account.
 * Import is defensive by design: it validates every record, never deletes
 * anything the user already has, and reports exactly what happened.
 */

const APP_VERSION = '1.0.0';

function timestampSlug(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;
}

export async function buildBackup(): Promise<BackupFile> {
  const [items, categories] = await Promise.all([
    itemsRepo.listAllItems(),
    categoriesRepo.listCategories(),
  ]);

  // Defensive: an export must never be the thing that throws, even if a row
  // somehow reaches us without a tag array.
  const tagNames = new Set<string>();
  for (const item of items) {
    if (!Array.isArray(item.tags)) continue;
    for (const tag of item.tags) tagNames.add(tag);
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    counts: {
      items: items.length,
      categories: categories.length,
      tags: tagNames.size,
    },
    categories,
    items,
  };
}

export interface ExportResult {
  ok: boolean;
  /** Where the file landed, when we can say. */
  uri?: string;
  itemCount: number;
  reason?: string;
}

/**
 * Writes the backup and hands it to the OS share sheet so the user chooses
 * where it goes (Files, AirDrop, Drive…). On web it triggers a download.
 */
export async function exportBackup(): Promise<ExportResult> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup, null, 2);
  const filename = `tuck-backup-${timestampSlug()}.json`;

  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      return { ok: true, itemCount: backup.items.length };
    } catch (error) {
      return { ok: false, itemCount: 0, reason: describe(error) };
    }
  }

  try {
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(json);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export your Tuck backup',
        UTI: 'public.json',
      });
    }

    return { ok: true, uri: file.uri, itemCount: backup.items.length };
  } catch (error) {
    return { ok: false, itemCount: 0, reason: describe(error) };
  }
}

// ─── Import ────────────────────────────────────────────────────────────────

export type DuplicateStrategy = 'skip' | 'replace' | 'duplicate';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  // Tolerate ISO strings from a hand-edited or third-party file.
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function readBoolean(source: Record<string, unknown>, key: string): boolean {
  const value = source[key];
  return value === true || value === 1 || value === '1';
}

function readTags(source: Record<string, unknown>): string[] {
  const value = source.tags;
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 12);
}

/**
 * Coerces an arbitrary record into a SavedItem.
 * Missing optional fields are filled with sane defaults; a record without a
 * usable title or id is rejected rather than guessed at.
 */
function parseItem(raw: unknown, knownCategories: Set<string>): SavedItem | null {
  if (!isRecord(raw)) return null;

  const title = readString(raw, 'title')?.trim();
  if (!title) return null;

  const id = readString(raw, 'id');
  if (!id) return null;

  const now = Date.now();
  const createdAt = readNumber(raw, 'createdAt') ?? now;
  const categoryId = readString(raw, 'categoryId') ?? FALLBACK_CATEGORY_ID;

  return {
    id,
    title: title.slice(0, 300),
    url: readString(raw, 'url'),
    description: readString(raw, 'description'),
    notes: readString(raw, 'notes'),
    // Point at "Other" when the backup references a category we don't have and
    // couldn't create — never drop the item.
    categoryId: knownCategories.has(categoryId) ? categoryId : FALLBACK_CATEGORY_ID,
    imageUri: readString(raw, 'imageUri'),
    isFavorite: readBoolean(raw, 'isFavorite'),
    isArchived: readBoolean(raw, 'isArchived'),
    createdAt,
    updatedAt: readNumber(raw, 'updatedAt') ?? createdAt,
    reminderAt: readNumber(raw, 'reminderAt'),
    // Notification ids are device-specific — never import them.
    reminderNotificationId: null,
    tags: readTags(raw),
  };
}

export interface ImportResult extends ImportSummary {
  ok: boolean;
  reason?: string;
  /** Version of the file we read, for the confirmation message. */
  fileVersion?: number;
}

const EMPTY_SUMMARY: ImportSummary = {
  itemsAdded: 0,
  itemsUpdated: 0,
  itemsSkipped: 0,
  categoriesAdded: 0,
  invalidRecords: 0,
};

/** Parses and applies a backup payload. Additive by default. */
export async function importBackupPayload(
  payload: unknown,
  strategy: DuplicateStrategy = 'skip'
): Promise<ImportResult> {
  if (!isRecord(payload)) {
    return { ...EMPTY_SUMMARY, ok: false, reason: "That file isn't a Tuck backup." };
  }

  // Accept our own format, and tolerate a bare array of items.
  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : null;

  if (!rawItems) {
    return { ...EMPTY_SUMMARY, ok: false, reason: 'No items found in that file.' };
  }

  const fileVersion =
    typeof payload.version === 'number' ? payload.version : BACKUP_VERSION;

  // A newer file may contain fields this build doesn't understand. Importing
  // is still safe because unknown keys are ignored, so we proceed and say so.
  if (fileVersion > BACKUP_VERSION) {
    // fall through — handled by the caller's messaging
  }

  const summary: ImportSummary = { ...EMPTY_SUMMARY };

  // Recreate any custom categories the backup relies on, first.
  if (Array.isArray(payload.categories)) {
    for (const rawCategory of payload.categories) {
      if (!isRecord(rawCategory)) {
        summary.invalidRecords += 1;
        continue;
      }
      const id = readString(rawCategory, 'id');
      const name = readString(rawCategory, 'name');
      if (!id || !name) {
        summary.invalidRecords += 1;
        continue;
      }
      const added = await categoriesRepo.ensureCategoryExists({
        id,
        name,
        icon: readString(rawCategory, 'icon') ?? 'bookmark',
        tone: readString(rawCategory, 'tone') ?? 'neutral',
        sortOrder: readNumber(rawCategory, 'sortOrder') ?? 99,
      });
      if (added) summary.categoriesAdded += 1;
    }
  }

  const categories = await categoriesRepo.listCategories();
  const knownCategories = new Set(categories.map((category) => category.id));

  for (const raw of rawItems) {
    const item = parseItem(raw, knownCategories);
    if (!item) {
      summary.invalidRecords += 1;
      continue;
    }

    try {
      const outcome = await itemsRepo.upsertImportedItem(item, strategy);
      if (outcome === 'added') summary.itemsAdded += 1;
      else if (outcome === 'updated') summary.itemsUpdated += 1;
      else summary.itemsSkipped += 1;
    } catch {
      summary.invalidRecords += 1;
    }
  }

  return { ...summary, ok: true, fileVersion };
}

/** Opens the system file picker and imports the chosen backup. */
export async function importBackupFromFile(
  strategy: DuplicateStrategy = 'skip'
): Promise<ImportResult | null> {
  try {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'public.json', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled) return null;

    const asset = picked.assets?.[0];
    if (!asset) return { ...EMPTY_SUMMARY, ok: false, reason: "Couldn't read that file." };

    let text: string;
    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      text = await response.text();
    } else {
      text = await new File(asset.uri).text();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ...EMPTY_SUMMARY, ok: false, reason: "That file isn't valid JSON." };
    }

    return importBackupPayload(parsed, strategy);
  } catch (error) {
    return { ...EMPTY_SUMMARY, ok: false, reason: describe(error) };
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
