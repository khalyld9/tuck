import { useEffect, useState } from 'react';

import { itemsRepo } from '@/db/repositories';
import { selectRevision, useItemsStore } from '@/store/useItemsStore';
import type { ItemQuery, SavedItem } from '@/types/models';

/**
 * Runs an arbitrary SQLite query and keeps it in sync with mutations.
 *
 * Screens describe *what* they want (scope, search, sort) and this re-runs the
 * query whenever the store's revision counter changes, so a favourite toggled
 * on one screen is reflected everywhere without a manual refresh.
 */
export function useItemQuery(query: ItemQuery): {
  items: SavedItem[];
  loading: boolean;
} {
  const revision = useItemsStore(selectRevision);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Serialising the query gives a stable dependency without forcing callers
  // to memoise the object they pass in.
  const key = JSON.stringify(query);

  useEffect(() => {
    let cancelled = false;

    itemsRepo
      .queryItems(JSON.parse(key) as ItemQuery)
      .then((result) => {
        if (!cancelled) {
          setItems(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, revision]);

  return { items, loading };
}

/** Debounced search text — keeps typing smooth on large libraries. */
export function useDebounced<T>(value: T, delay = 140): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
