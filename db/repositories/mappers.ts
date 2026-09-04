import { FALLBACK_CATEGORY_ID } from '@/constants/categories';
import type { CategoryToneName } from '@/constants/theme';
import type { CategoryCountRow, CategoryRow, ItemRow, TagCountRow, TagRow } from '@/types/db';
import type { Category, CategoryWithCount, SavedItem, Tag, TagWithCount } from '@/types/models';

const VALID_TONES: readonly CategoryToneName[] = [
  'clay',
  'sage',
  'plum',
  'ocean',
  'amber',
  'rose',
  'neutral',
];

function toTone(value: string): CategoryToneName {
  return (VALID_TONES as readonly string[]).includes(value)
    ? (value as CategoryToneName)
    : 'neutral';
}

/** Tag names arrive from GROUP_CONCAT as a single delimited string. */
export const TAG_DELIMITER = '\u001f';

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(TAG_DELIMITER)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function mapItem(row: ItemRow): SavedItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    notes: row.notes,
    categoryId: row.categoryId || FALLBACK_CATEGORY_ID,
    imageUri: row.imageUri,
    isFavorite: row.isFavorite === 1,
    isArchived: row.isArchived === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reminderAt: row.reminderAt,
    reminderNotificationId: row.reminderNotificationId,
    tags: parseTags(row.tagNames),
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    tone: toTone(row.tone),
    sortOrder: row.sortOrder,
    isSystem: row.isSystem === 1,
    createdAt: row.createdAt,
  };
}

export function mapCategoryWithCount(row: CategoryCountRow): CategoryWithCount {
  return { ...mapCategory(row), itemCount: row.itemCount };
}

export function mapTag(row: TagRow): Tag {
  return { id: row.id, name: row.name };
}

export function mapTagWithCount(row: TagCountRow): TagWithCount {
  return { id: row.id, name: row.name, itemCount: row.itemCount };
}

/**
 * Builds the denormalised lowercase haystack stored on each row.
 * Including the category name and domain means search covers them without a
 * join, keeping keystroke latency flat as the library grows.
 */
export function buildSearchText(parts: {
  title: string;
  url?: string | null;
  description?: string | null;
  notes?: string | null;
  categoryName?: string | null;
  domain?: string | null;
  tags?: string[];
}): string {
  return [
    parts.title,
    parts.url ?? '',
    parts.description ?? '',
    parts.notes ?? '',
    parts.categoryName ?? '',
    parts.domain ?? '',
    (parts.tags ?? []).join(' '),
  ]
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
