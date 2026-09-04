import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { haptics } from '@/lib/haptics';
import { shareItem } from '@/lib/sharing/share';
import { useItemsStore } from '@/store/useItemsStore';
import { selectConfirmDeletion, useSettingsStore } from '@/store/useSettingsStore';
import { useUiStore } from '@/store/useUiStore';
import type { SavedItem } from '@/types/models';

/**
 * The shared verbs for acting on an item.
 *
 * Centralised so favourite/archive/delete behave identically — same haptics,
 * same snackbar copy, same Undo — whether they're triggered from a swipe, the
 * detail screen, or Surprise Me.
 */
export function useItemActions() {
  const toggleFavoriteInStore = useItemsStore((state) => state.toggleFavorite);
  const setArchivedInStore = useItemsStore((state) => state.setArchived);
  const removeFromStore = useItemsStore((state) => state.remove);
  const restoreToStore = useItemsStore((state) => state.restore);
  const showSnackbar = useUiStore((state) => state.showSnackbar);
  const confirmDeletion = useSettingsStore(selectConfirmDeletion);

  const toggleFavorite = useCallback(
    async (item: SavedItem) => {
      haptics.medium();
      const next = await toggleFavoriteInStore(item.id);
      showSnackbar({
        message: next ? 'Added to favourites' : 'Removed from favourites',
        tone: 'default',
        duration: 2200,
      });
      return next;
    },
    [showSnackbar, toggleFavoriteInStore]
  );

  const archive = useCallback(
    async (item: SavedItem) => {
      haptics.medium();
      await setArchivedInStore(item.id, true);
      showSnackbar({
        message: 'Tucked into the archive',
        action: {
          label: 'Undo',
          onPress: async () => {
            await setArchivedInStore(item.id, false);
            haptics.light();
          },
        },
      });
    },
    [setArchivedInStore, showSnackbar]
  );

  const restore = useCallback(
    async (item: SavedItem) => {
      haptics.light();
      await setArchivedInStore(item.id, false);
      showSnackbar({
        message: 'Back in your library',
        action: {
          label: 'Undo',
          onPress: async () => {
            await setArchivedInStore(item.id, true);
          },
        },
      });
    },
    [setArchivedInStore, showSnackbar]
  );

  /**
   * Soft delete with Undo. The full item (including tags) is held in the
   * closure, so restoring re-inserts it verbatim — same id, same timestamps.
   */
  const deleteItem = useCallback(
    async (item: SavedItem, options?: { skipConfirm?: boolean }) => {
      const performDelete = async () => {
        haptics.warning();
        await removeFromStore(item.id);
        showSnackbar({
          message: 'Deleted',
          tone: 'danger',
          action: {
            label: 'Undo',
            onPress: async () => {
              await restoreToStore(item);
              haptics.success();
            },
          },
        });
      };

      if (confirmDeletion && !options?.skipConfirm) {
        Alert.alert(
          'Delete this?',
          `"${truncate(item.title, 60)}" will be removed from your library.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void performDelete() },
          ]
        );
        return;
      }

      await performDelete();
    },
    [confirmDeletion, removeFromStore, restoreToStore, showSnackbar]
  );

  const share = useCallback(async (item: SavedItem) => {
    haptics.light();
    await shareItem(item);
  }, []);

  const openDetail = useCallback((item: SavedItem) => {
    router.push(`/item/${item.id}`);
  }, []);

  const openEdit = useCallback((item: SavedItem) => {
    router.push(`/edit/${item.id}`);
  }, []);

  return { toggleFavorite, archive, restore, deleteItem, share, openDetail, openEdit };
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
