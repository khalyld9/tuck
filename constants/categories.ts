import type { CategoryToneName } from './theme';

/**
 * Built-in categories.
 *
 * IDs are stable slugs (not auto-increment) so backups stay portable across
 * devices and a future sync layer can merge without collisions. The database
 * seeds these on first launch; users can add their own on top.
 */
export interface CategorySeed {
  id: string;
  name: string;
  icon: string;
  tone: CategoryToneName;
  sortOrder: number;
}

export const DEFAULT_CATEGORIES: readonly CategorySeed[] = [
  { id: 'movies', name: 'Movies', icon: 'clapperboard', tone: 'plum', sortOrder: 0 },
  { id: 'shows', name: 'Shows', icon: 'tv', tone: 'ocean', sortOrder: 1 },
  { id: 'games', name: 'Games', icon: 'gamepad-2', tone: 'sage', sortOrder: 2 },
  { id: 'books', name: 'Books', icon: 'book-open', tone: 'clay', sortOrder: 3 },
  { id: 'food', name: 'Food', icon: 'utensils', tone: 'rose', sortOrder: 4 },
  { id: 'places', name: 'Places', icon: 'map-pin', tone: 'sage', sortOrder: 5 },
  { id: 'products', name: 'Products', icon: 'shopping-bag', tone: 'amber', sortOrder: 6 },
  { id: 'websites', name: 'Websites', icon: 'globe', tone: 'ocean', sortOrder: 7 },
  { id: 'articles', name: 'Articles', icon: 'newspaper', tone: 'neutral', sortOrder: 8 },
  { id: 'videos', name: 'Videos', icon: 'play', tone: 'rose', sortOrder: 9 },
  { id: 'ideas', name: 'Ideas', icon: 'lightbulb', tone: 'amber', sortOrder: 10 },
  { id: 'inspiration', name: 'Inspiration', icon: 'sparkles', tone: 'plum', sortOrder: 11 },
  { id: 'other', name: 'Other', icon: 'bookmark', tone: 'neutral', sortOrder: 12 },
] as const;

/** Fallback used when an item references a category that no longer exists. */
export const FALLBACK_CATEGORY_ID = 'other';

/** Pre-selected in the Add form until the user changes it in Settings. */
export const DEFAULT_CATEGORY_ID = 'other';

/**
 * Very small heuristic that guesses a category from a pasted URL.
 * Purely local — no network, no metadata fetching.
 */
const DOMAIN_HINTS: ReadonlyArray<{ match: RegExp; categoryId: string }> = [
  { match: /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)/i, categoryId: 'videos' },
  { match: /(netflix\.com|hulu\.com|max\.com|disneyplus\.com|primevideo\.com)/i, categoryId: 'shows' },
  { match: /(imdb\.com|letterboxd\.com|themoviedb\.org)/i, categoryId: 'movies' },
  { match: /(steampowered\.com|epicgames\.com|gog\.com|itch\.io|nintendo\.com)/i, categoryId: 'games' },
  { match: /(goodreads\.com|bookshop\.org|audible\.com|openlibrary\.org)/i, categoryId: 'books' },
  { match: /(yelp\.com|opentable\.com|resy\.com|tabelog\.com|doordash\.com)/i, categoryId: 'food' },
  { match: /(airbnb\.|booking\.com|tripadvisor\.|maps\.app\.goo\.gl|google\.[a-z.]+\/maps)/i, categoryId: 'places' },
  { match: /(amazon\.|etsy\.com|ebay\.|shopify\.|uniqlo\.|muji\.)/i, categoryId: 'products' },
  { match: /(medium\.com|substack\.com|nytimes\.com|theguardian\.com|newyorker\.com|theverge\.com)/i, categoryId: 'articles' },
  { match: /(dribbble\.com|behance\.net|pinterest\.|are\.na|unsplash\.com)/i, categoryId: 'inspiration' },
];

export function guessCategoryFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  for (const hint of DOMAIN_HINTS) {
    if (hint.match.test(url)) return hint.categoryId;
  }
  return null;
}
