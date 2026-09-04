import type { CategoryToneName } from '@/constants/theme';

/** Milliseconds since the Unix epoch. */
export type Timestamp = number;

/**
 * A saved thing. This is the domain model used by the UI; the database row
 * shape (`ItemRow`) is deliberately separate so storage can evolve — and so a
 * future sync layer can map remote payloads onto the same domain object.
 */
export interface SavedItem {
  id: string;
  title: string;
  /** Optional — quick add must work with a title alone. */
  url: string | null;
  description: string | null;
  notes: string | null;
  categoryId: string;
  imageUri: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** When a local notification should fire. Null when no reminder is set. */
  reminderAt: Timestamp | null;
  /** Identifier returned by expo-notifications, so it can be cancelled. */
  reminderNotificationId: string | null;
  /** Tag names attached to this item, resolved from the join table. */
  tags: string[];
}

/** Fields accepted when creating an item. Everything else is derived. */
export interface NewItemInput {
  title: string;
  url?: string | null;
  description?: string | null;
  notes?: string | null;
  categoryId: string;
  imageUri?: string | null;
  isFavorite?: boolean;
  reminderAt?: Timestamp | null;
  tags?: string[];
}

/** Partial update — omitted keys are left untouched. */
export interface UpdateItemInput {
  title?: string;
  url?: string | null;
  description?: string | null;
  notes?: string | null;
  categoryId?: string;
  imageUri?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  reminderAt?: Timestamp | null;
  reminderNotificationId?: string | null;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  /** Lucide icon name, resolved through `components/ui/Icon`. */
  icon: string;
  /** Which semantic tone the chip/icon uses. */
  tone: CategoryToneName;
  /** Ordering within Browse. */
  sortOrder: number;
  /** Built-in categories cannot be deleted. */
  isSystem: boolean;
  createdAt: Timestamp;
}

export interface CategoryWithCount extends Category {
  itemCount: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface TagWithCount extends Tag {
  itemCount: number;
}

/** A reminder as surfaced to the UI — always tied to an item. */
export interface Reminder {
  itemId: string;
  title: string;
  categoryId: string;
  fireAt: Timestamp;
  notificationId: string | null;
}

// ─── Query / view options ──────────────────────────────────────────────────

export type SortOption = 'recent' | 'oldest' | 'updated' | 'alphabetical';

export const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Recently added',
  oldest: 'Oldest first',
  updated: 'Recently updated',
  alphabetical: 'A – Z',
};

export type ViewMode = 'list' | 'grid';

export type LibraryScope = 'active' | 'archived' | 'favorites' | 'all';

export interface ItemQuery {
  scope: LibraryScope;
  search?: string;
  categoryId?: string | null;
  /**
   * Matches any of several categories at once. Used by groupings that span
   * more than one pocket — "Watch later" covers both films and shows.
   * Ignored when `categoryId` is set.
   */
  categoryIds?: readonly string[] | null;
  tag?: string | null;
  favoritesOnly?: boolean;
  sort: SortOption;
  limit?: number;
  offset?: number;
}

// ─── Settings ──────────────────────────────────────────────────────────────

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  themePreference: ThemePreference;
  hapticsEnabled: boolean;
  /** Category pre-selected in the Add form. */
  defaultCategoryId: string;
  confirmDeletion: boolean;
  remindersEnabled: boolean;
  /** Whether onboarding has been completed. */
  hasOnboarded: boolean;
  /** Persisted view preferences. */
  savedViewMode: ViewMode;
  savedSort: SortOption;
}

// ─── Import / export ───────────────────────────────────────────────────────

export const BACKUP_FORMAT = 'tuck.backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  appVersion: string;
  counts: {
    items: number;
    categories: number;
    tags: number;
  };
  categories: Category[];
  items: SavedItem[];
}

export interface ImportSummary {
  itemsAdded: number;
  itemsUpdated: number;
  itemsSkipped: number;
  categoriesAdded: number;
  invalidRecords: number;
}
