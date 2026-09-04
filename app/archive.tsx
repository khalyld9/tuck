import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemList } from '@/components/lists/ItemList';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/constants/tokens';
import { useItemActions } from '@/hooks/useItemActions';
import { useItemQuery } from '@/hooks/useItemQuery';
import { haptics } from '@/lib/haptics';
import { useItemsStore } from '@/store/useItemsStore';
import { useUiStore } from '@/store/useUiStore';
import type { SavedItem } from '@/types/models';

/**
 * Archive — finished things.
 * Swiping left restores here (rather than archiving again), and permanent
 * deletion always asks first.
 */
export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const clearArchive = useItemsStore((state) => state.clearArchive);
  const showSnackbar = useUiStore((state) => state.showSnackbar);

  const { items, loading } = useItemQuery({ scope: 'archived', sort: 'updated' });
  const { restore, deleteItem, openDetail } = useItemActions();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/browse');
  }, []);

  const handleClear = useCallback(() => {
    if (items.length === 0) return;

    Alert.alert(
      'Clear the archive?',
      `${items.length} item${items.length === 1 ? '' : 's'} will be permanently deleted. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const removed = await clearArchive();
            haptics.warning();
            showSnackbar({ message: `Cleared ${removed} item${removed === 1 ? '' : 's'}` });
          },
        },
      ]
    );
  }, [clearArchive, items.length, showSnackbar]);

  const handleDelete = useCallback(
    (item: SavedItem) => {
      void deleteItem(item);
    },
    [deleteItem]
  );

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <Text variant="title1" accessibilityRole="header">
          Archive
        </Text>
        <Text variant="footnote" color="muted">
          {items.length === 0
            ? 'Nothing archived'
            : `${items.length} finished thing${items.length === 1 ? '' : 's'}`}
        </Text>

        {items.length > 0 ? (
          <Text variant="label" color="subtle" style={styles.hint}>
            Swipe a row to put it back.
          </Text>
        ) : null}
      </View>
    ),
    [items.length]
  );

  return (
    <Screen>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton
          name="arrow-left"
          onPress={handleBack}
          accessibilityLabel="Go back"
          size={19}
        />
        {items.length > 0 ? (
          <IconButton
            name="trash-2"
            onPress={handleClear}
            accessibilityLabel="Permanently delete everything in the archive"
            size={18}
          />
        ) : null}
      </View>

      <ItemList
        items={items}
        viewMode="list"
        onPressItem={openDetail}
        onFavorite={undefined}
        onArchive={restore}
        archiveLabel="Restore"
        archiveIcon="archive-restore"
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              pose="celebrate"
              title="Your finished things will live here."
              message="Archive something when you're done with it — it stays searchable, just out of the way."
              size="sm"
              mascotLabel="Tuck celebrating"
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding - spacing.sm,
    paddingBottom: spacing.sm,
  },
  hint: {
    marginTop: spacing.xs,
  },
  header: {
    paddingBottom: spacing.lg,
    gap: 2,
  },
});
