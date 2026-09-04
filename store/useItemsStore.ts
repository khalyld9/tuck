import { create } from 'zustand';

import { itemsRepo } from '@/db/repositories';
import type { LibraryCounts } from '@/db/repositories/itemsRepository';
import { cancelReminder, scheduleReminder } from '@/lib/notifications/reminders';
import type {
  ItemQuery,
  NewItemInput,
  SavedItem,
  UpdateItemInput,
} from '@/types/models';

/**
 * Items store.
 *
 * SQLite stays the source of truth. This store holds a normalised in-memory
 * mirror so lists re-render instantly after a mutation, then reconciles with
 * the database. `revision` lets screens with bespoke queries know when to refetch.
 */

interface ItemsState {
  /** id → item. Normalised so a favourite toggle touches exactly one entry. */
  byId: Record<string, SavedItem>;
  /** Active (non-archived) ids in "recently added" order. */
  activeIds: string[];
  archivedIds: string[];
  counts: LibraryCounts;
  hydrated: boolean;
  loading: boolean;
  /** Bumped after every mutation so dependent queries can refresh. */
  revision: number;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;

  add: (input: NewItemInput) => Promise<SavedItem>;
  update: (id: string, changes: UpdateItemInput) => Promise<SavedItem | null>;
  remove: (id: string) => Promise<SavedItem | null>;
  restore: (item: SavedItem) => Promise<void>;

  toggleFavorite: (id: string) => Promise<boolean>;
  setArchived: (id: string, archived: boolean) => Promise<void>;

  setReminder: (id: string, fireAt: number | null) => Promise<'scheduled' | 'cleared' | 'failed'>;

  query: (query: ItemQuery) => Promise<SavedItem[]>;
  clearArchive: () => Promise<number>;
  reset: () => Promise<void>;
}

const EMPTY_COUNTS: LibraryCounts = {
  active: 0,
  archived: 0,
  favorites: 0,
  withReminders: 0,
  total: 0,
};

function indexItems(items: SavedItem[]) {
  const byId: Record<string, SavedItem> = {};
  const activeIds: string[] = [];
  const archivedIds: string[] = [];

  for (const item of items) {
    byId[item.id] = item;
    if (item.isArchived) archivedIds.push(item.id);
    else activeIds.push(item.id);
  }

  return { byId, activeIds, archivedIds };
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  byId: {},
  activeIds: [],
  archivedIds: [],
  counts: EMPTY_COUNTS,
  hydrated: false,
  loading: false,
  revision: 0,

  hydrate: async () => {
    if (get().hydrated) return;
    set({ loading: true });
    const [items, counts] = await Promise.all([
      itemsRepo.queryItems({ scope: 'all', sort: 'recent' }),
      itemsRepo.getCounts(),
    ]);
    set({ ...indexItems(items), counts, hydrated: true, loading: false });
  },

  refresh: async () => {
    const [items, counts] = await Promise.all([
      itemsRepo.queryItems({ scope: 'all', sort: 'recent' }),
      itemsRepo.getCounts(),
    ]);
    set((state) => ({
      ...indexItems(items),
      counts,
      hydrated: true,
      revision: state.revision + 1,
    }));
  },

  add: async (input) => {
    const created = await itemsRepo.createItem(input);

    // Schedule the reminder after the row exists, so a notification failure can
    // never prevent the save itself.
    if (created.reminderAt) {
      const result = await scheduleReminder({
        itemId: created.id,
        title: created.title,
        fireAt: created.reminderAt,
      });
      if (result.notificationId) {
        await itemsRepo.setReminder(created.id, created.reminderAt, result.notificationId);
        created.reminderNotificationId = result.notificationId;
      }
    }

    set((state) => ({
      byId: { ...state.byId, [created.id]: created },
      activeIds: [created.id, ...state.activeIds],
      counts: {
        ...state.counts,
        active: state.counts.active + 1,
        total: state.counts.total + 1,
        favorites: state.counts.favorites + (created.isFavorite ? 1 : 0),
        withReminders: state.counts.withReminders + (created.reminderAt ? 1 : 0),
      },
      revision: state.revision + 1,
    }));

    return created;
  },

  update: async (id, changes) => {
    const previous = get().byId[id];

    // Reminder edits must keep the OS scheduler in sync with the row.
    if (changes.reminderAt !== undefined && previous) {
      await cancelReminder(previous.reminderNotificationId);
      if (changes.reminderAt === null) {
        changes.reminderNotificationId = null;
      } else {
        const result = await scheduleReminder({
          itemId: id,
          title: changes.title ?? previous.title,
          fireAt: changes.reminderAt,
        });
        changes.reminderNotificationId = result.notificationId;
      }
    }

    const updated = await itemsRepo.updateItem(id, changes);
    if (!updated) return null;

    set((state) => {
      const wasArchived = previous?.isArchived ?? false;
      const nowArchived = updated.isArchived;
      let { activeIds, archivedIds } = state;

      if (wasArchived !== nowArchived) {
        activeIds = nowArchived
          ? activeIds.filter((itemId) => itemId !== id)
          : [id, ...activeIds.filter((itemId) => itemId !== id)];
        archivedIds = nowArchived
          ? [id, ...archivedIds.filter((itemId) => itemId !== id)]
          : archivedIds.filter((itemId) => itemId !== id);
      }

      return {
        byId: { ...state.byId, [id]: updated },
        activeIds,
        archivedIds,
        counts: recount(state.counts, previous, updated),
        revision: state.revision + 1,
      };
    });

    return updated;
  },

  remove: async (id) => {
    const item = get().byId[id];
    if (item?.reminderNotificationId) {
      await cancelReminder(item.reminderNotificationId);
    }
    await itemsRepo.deleteItem(id);

    set((state) => {
      const { [id]: removed, ...rest } = state.byId;
      return {
        byId: rest,
        activeIds: state.activeIds.filter((itemId) => itemId !== id),
        archivedIds: state.archivedIds.filter((itemId) => itemId !== id),
        counts: removed ? subtract(state.counts, removed) : state.counts,
        revision: state.revision + 1,
      };
    });

    return item ?? null;
  },

  restore: async (item) => {
    await itemsRepo.restoreItem(item);

    // Re-arm the reminder if it's still in the future.
    if (item.reminderAt && item.reminderAt > Date.now()) {
      const result = await scheduleReminder({
        itemId: item.id,
        title: item.title,
        fireAt: item.reminderAt,
      });
      if (result.notificationId) {
        await itemsRepo.setReminder(item.id, item.reminderAt, result.notificationId);
        item = { ...item, reminderNotificationId: result.notificationId };
      }
    }

    set((state) => ({
      byId: { ...state.byId, [item.id]: item },
      activeIds: item.isArchived
        ? state.activeIds
        : [item.id, ...state.activeIds.filter((id) => id !== item.id)],
      archivedIds: item.isArchived
        ? [item.id, ...state.archivedIds.filter((id) => id !== item.id)]
        : state.archivedIds,
      counts: add(state.counts, item),
      revision: state.revision + 1,
    }));
  },

  toggleFavorite: async (id) => {
    const current = get().byId[id];
    const next = !(current?.isFavorite ?? false);

    // Optimistic flip — the heart animates immediately.
    set((state) => {
      const item = state.byId[id];
      if (!item) return state;
      return {
        byId: { ...state.byId, [id]: { ...item, isFavorite: next, updatedAt: Date.now() } },
        counts: {
          ...state.counts,
          favorites: state.counts.favorites + (next ? 1 : -1),
        },
        revision: state.revision + 1,
      };
    });

    const result = await itemsRepo.toggleFavorite(id);
    if (result !== null && result !== next) {
      // Database disagreed (rare) — reconcile.
      await get().refresh();
    }
    return result ?? next;
  },

  setArchived: async (id, archived) => {
    set((state) => {
      const item = state.byId[id];
      if (!item) return state;
      const updated = { ...item, isArchived: archived, updatedAt: Date.now() };
      return {
        byId: { ...state.byId, [id]: updated },
        activeIds: archived
          ? state.activeIds.filter((itemId) => itemId !== id)
          : [id, ...state.activeIds.filter((itemId) => itemId !== id)],
        archivedIds: archived
          ? [id, ...state.archivedIds.filter((itemId) => itemId !== id)]
          : state.archivedIds.filter((itemId) => itemId !== id),
        counts: recount(state.counts, item, updated),
        revision: state.revision + 1,
      };
    });

    await itemsRepo.setArchived(id, archived);
  },

  setReminder: async (id, fireAt) => {
    const item = get().byId[id];
    if (!item) return 'failed';

    await cancelReminder(item.reminderNotificationId);

    if (fireAt === null) {
      await itemsRepo.setReminder(id, null, null);
      set((state) => {
        const current = state.byId[id];
        if (!current) return state;
        return {
          byId: {
            ...state.byId,
            [id]: { ...current, reminderAt: null, reminderNotificationId: null },
          },
          counts: {
            ...state.counts,
            withReminders: Math.max(0, state.counts.withReminders - (item.reminderAt ? 1 : 0)),
          },
          revision: state.revision + 1,
        };
      });
      return 'cleared';
    }

    const result = await scheduleReminder({ itemId: id, title: item.title, fireAt });
    // Persist the date even when the OS refused to schedule, so the reminder
    // still shows in "Coming Up" and the user can fix permissions later.
    await itemsRepo.setReminder(id, fireAt, result.notificationId);

    set((state) => {
      const current = state.byId[id];
      if (!current) return state;
      return {
        byId: {
          ...state.byId,
          [id]: { ...current, reminderAt: fireAt, reminderNotificationId: result.notificationId },
        },
        counts: {
          ...state.counts,
          withReminders: state.counts.withReminders + (item.reminderAt ? 0 : 1),
        },
        revision: state.revision + 1,
      };
    });

    return result.notificationId ? 'scheduled' : 'failed';
  },

  query: async (query) => itemsRepo.queryItems(query),

  clearArchive: async () => {
    const removed = await itemsRepo.deleteArchived();
    await get().refresh();
    return removed;
  },

  reset: async () => {
    set({
      byId: {},
      activeIds: [],
      archivedIds: [],
      counts: EMPTY_COUNTS,
      hydrated: false,
      revision: get().revision + 1,
    });
  },
}));

// ─── Count bookkeeping helpers ─────────────────────────────────────────────

function recount(
  counts: LibraryCounts,
  previous: SavedItem | undefined,
  next: SavedItem
): LibraryCounts {
  if (!previous) return counts;
  return {
    active: counts.active + (previous.isArchived ? 0 : -1) + (next.isArchived ? 0 : 1),
    archived: counts.archived + (previous.isArchived ? -1 : 0) + (next.isArchived ? 1 : 0),
    favorites:
      counts.favorites +
      (previous.isFavorite && !previous.isArchived ? -1 : 0) +
      (next.isFavorite && !next.isArchived ? 1 : 0),
    withReminders:
      counts.withReminders +
      (previous.reminderAt && !previous.isArchived ? -1 : 0) +
      (next.reminderAt && !next.isArchived ? 1 : 0),
    total: counts.total,
  };
}

function subtract(counts: LibraryCounts, item: SavedItem): LibraryCounts {
  return {
    active: counts.active - (item.isArchived ? 0 : 1),
    archived: counts.archived - (item.isArchived ? 1 : 0),
    favorites: counts.favorites - (item.isFavorite && !item.isArchived ? 1 : 0),
    withReminders: counts.withReminders - (item.reminderAt && !item.isArchived ? 1 : 0),
    total: Math.max(0, counts.total - 1),
  };
}

function add(counts: LibraryCounts, item: SavedItem): LibraryCounts {
  return {
    active: counts.active + (item.isArchived ? 0 : 1),
    archived: counts.archived + (item.isArchived ? 1 : 0),
    favorites: counts.favorites + (item.isFavorite && !item.isArchived ? 1 : 0),
    withReminders: counts.withReminders + (item.reminderAt && !item.isArchived ? 1 : 0),
    total: counts.total + 1,
  };
}

// ─── Selectors ─────────────────────────────────────────────────────────────

export const selectCounts = (state: ItemsState) => state.counts;
export const selectHydrated = (state: ItemsState) => state.hydrated;
export const selectRevision = (state: ItemsState) => state.revision;
export const selectItem = (id: string) => (state: ItemsState) => state.byId[id];
