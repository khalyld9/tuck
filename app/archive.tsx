import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ItemList } from '@/components/lists/ItemList';
import { EmptyState } from '@/components/ui/EmptyState';
import { LargeTitleHeader } from '@/components/ios/LargeTitleHeader';
import { NavBar } from '@/components/ios/NavBar';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
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
  const theme = useTheme();
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
        <LargeTitleHeader
          title="Archive"
          subtitle={
            items.length === 0
              ? 'Nothing archived'
              : `${items.length} finished thing${items.length === 1 ? '' : 's'}`
          }
          actions={
            items.length > 0 ? (
              <IconButton
                name="trash-2"
                onPress={handleClear}
                accessibilityLabel="Permanently delete everything in the archive"
                color={theme.colors.danger}
                size={19}
              />
            ) : null
          }
        />

        {items.length > 0 ? (
          <Text variant="label" color="subtle" style={styles.hint}>
            Swipe a row to put it back.
          </Text>
        ) : null}
      </View>
    ),
    [items.length, handleBack, handleClear, theme.colors.heroText]
  );

  return (
    <Screen>
      <NavBar leading="back" leadingLabel="Browse" onLeadingPress={handleBack} />

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
  hint: {
    marginTop: spacing.md,
  },
  header: {
    paddingBottom: spacing.lg,
  },
});
