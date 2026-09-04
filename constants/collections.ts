import type { CategoryToneName } from './theme';

/**
 * Standing collections — the shelves a person actually thinks in.
 *
 * Categories are precise ("Movies", "Shows", "Videos"); intentions are
 * broader. When you sit down to watch something you don't care which of the
 * three pockets it landed in, so these group several categories under one
 * heading. They are a *view* over categories, not a new table: nothing is
 * stored, so a collection can never drift out of sync with the items it
 * describes, and a category added later simply needs listing here.
 *
 * IDs are stable slugs because they appear in navigation paths.
 */
export interface CollectionDef {
  id: string;
  name: string;
  /** One-line description, used as the destination screen's subtitle. */
  blurb: string;
  icon: string;
  tone: CategoryToneName;
  /** Categories folded into this collection. */
  categoryIds: readonly string[];
}

export const COLLECTIONS: readonly CollectionDef[] = [
  {
    id: 'watch',
    name: 'Watch later',
    blurb: 'Films, shows and videos',
    icon: 'play',
    tone: 'plum',
    categoryIds: ['movies', 'shows', 'videos'],
  },
  {
    id: 'read',
    name: 'Read later',
    blurb: 'Books and articles',
    icon: 'book-open',
    tone: 'clay',
    categoryIds: ['books', 'articles'],
  },
  {
    id: 'ideas',
    name: 'Ideas',
    blurb: 'Thoughts and inspiration',
    icon: 'lightbulb',
    tone: 'amber',
    categoryIds: ['ideas', 'inspiration'],
  },
] as const;

export function findCollection(id: string | undefined): CollectionDef | null {
  if (!id) return null;
  return COLLECTIONS.find((collection) => collection.id === id) ?? null;
}

/**
 * Quick tuck — the handful of things people save most often.
 *
 * Each entry is a real category id, so tapping one opens the normal Add form
 * with that category already chosen. Nothing here is a special code path:
 * it's the same form, two taps shorter.
 */
export interface QuickTuckDef {
  categoryId: string;
  /** Shortened for the pill; the category's own name can be longer. */
  label: string;
  icon: string;
  tone: CategoryToneName;
}

export const QUICK_TUCK: readonly QuickTuckDef[] = [
  { categoryId: 'movies', label: 'Movie', icon: 'clapperboard', tone: 'plum' },
  { categoryId: 'places', label: 'Place', icon: 'map-pin', tone: 'sage' },
  { categoryId: 'ideas', label: 'Idea', icon: 'lightbulb', tone: 'amber' },
  { categoryId: 'books', label: 'Read', icon: 'book-open', tone: 'clay' },
  { categoryId: 'food', label: 'Food', icon: 'utensils', tone: 'rose' },
] as const;
