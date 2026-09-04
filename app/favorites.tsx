import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { selectSavedViewMode, useSettingsStore } from '@/store/useSettingsStore';

/** The things worth keeping close. */
export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const viewMode = useSettingsStore(selectSavedViewMode);
  const setSetting = useSettingsStore((state) => state.set);

  const { items, loading } = useItemQuery({ scope: 'favorites', sort: 'recent' });
  const { toggleFavorite, archive, openDetail } = useItemActions();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/browse');
  }, []);

  const handleToggleView = useCallback(() => {
    haptics.selection();
    void setSetting('savedViewMode', viewMode === 'list' ? 'grid' : 'list');
  }, [setSetting, viewMode]);

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <Text variant="title1" accessibilityRole="header">
          Favourites
        </Text>
        <Text variant="footnote" color="muted">
          {items.length === 0
            ? 'Nothing starred yet'
            : `${items.length} thing${items.length === 1 ? '' : 's'} you love`}
        </Text>
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
            name={viewMode === 'list' ? 'grid-2x2' : 'list'}
            onPress={handleToggleView}
            accessibilityLabel={
              viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'
            }
            size={19}
          />
        ) : null}
      </View>

      <ItemList
        items={items}
        viewMode={viewMode}
        onPressItem={openDetail}
        onFavorite={toggleFavorite}
        onArchive={archive}
        ListHeaderComponent={header}
        swipeEnabled={viewMode === 'list'}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              pose="idle"
              title="No favourites yet."
              message="Tap the heart on anything you want to keep close."
              size="sm"
              mascotLabel="Tuck waiting patiently"
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
  header: {
    paddingBottom: spacing.lg,
    gap: 2,
  },
});
