import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ItemList } from '@/components/lists/ItemList';
import { EmptyState } from '@/components/ui/EmptyState';
import { NavBar } from '@/components/ios/NavBar';
import { LargeTitleHeader } from '@/components/ios/LargeTitleHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { useItemActions } from '@/hooks/useItemActions';
import { useItemQuery } from '@/hooks/useItemQuery';
import { haptics } from '@/lib/haptics';
import { selectSavedViewMode, useSettingsStore } from '@/store/useSettingsStore';

/** The things worth keeping close. */
export default function FavoritesScreen() {
  const viewMode = useSettingsStore(selectSavedViewMode);
  const setSetting = useSettingsStore((state) => state.set);

  const { items, loading } = useItemQuery({ scope: 'favorites', sort: 'recent' });
  const { toggleFavorite, archive, openDetail } = useItemActions();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/browse');
  }, []);

  const theme = useTheme();

  const handleToggleView = useCallback(() => {
    haptics.selection();
    void setSetting('savedViewMode', viewMode === 'list' ? 'grid' : 'list');
  }, [setSetting, viewMode]);

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <LargeTitleHeader
          title="Favourites"
          subtitle={
            items.length === 0
              ? 'Nothing starred yet'
              : `${items.length} thing${items.length === 1 ? '' : 's'} you love`
          }
          actions={
            items.length > 0 ? (
              <IconButton
                name={viewMode === 'list' ? 'grid-2x2' : 'list'}
                onPress={handleToggleView}
                accessibilityLabel={
                  viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'
                }
                color={theme.colors.accent}
                size={20}
              />
            ) : null
          }
        />
      </View>
    ),
    [items.length, handleToggleView, viewMode, theme.colors.accent]
  );

  return (
    <Screen>
      <NavBar leading="back" leadingLabel="Browse" onLeadingPress={handleBack} />

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
  header: {
    paddingBottom: spacing.lg,
    // The list applies the horizontal gutter; the header's children each
    // supply their own, so this bleeds back out to the screen edges.
    marginHorizontal: -screenPadding,
  },
});
