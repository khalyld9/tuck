/**
 * Raw SQLite row shapes.
 *
 * Kept separate from the domain models so the mapping layer is explicit:
 * SQLite has no booleans (0/1 integers) and nullable columns come back as
 * `null`, which the repositories normalise before the UI ever sees them.
 */

export interface ItemRow {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  notes: string | null;
  categoryId: string;
  imageUri: string | null;
  isFavorite: number;
  isArchived: number;
  createdAt: number;
  updatedAt: number;
  reminderAt: number | null;
  reminderNotificationId: string | null;
  /** Comma-separated tag names produced by GROUP_CONCAT in list queries. */
  tagNames?: string | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  tone: string;
  sortOrder: number;
  isSystem: number;
  createdAt: number;
}

export interface CategoryCountRow extends CategoryRow {
  itemCount: number;
}

export interface TagRow {
  id: string;
  name: string;
}

export interface TagCountRow extends TagRow {
  itemCount: number;
}

export interface CountRow {
  count: number;
}

export interface SettingRow {
  key: string;
  value: string;
}
