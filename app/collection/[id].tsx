import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LargeTitleHeader } from '@/components/ios/LargeTitleHeader';
import { NavBar } from '@/components/ios/NavBar';
import { ItemList } from '@/components/lists/ItemList';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { findCollection } from '@/constants/collections';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useItemActions } from '@/hooks/useItemActions';
import { useDebounced, useItemQuery } from '@/hooks/useItemQuery';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { selectSavedSort, selectSavedViewMode, useSettingsStore } from '@/store/useSettingsStore';

/**
 * Everything inside one standing collection.
 *
 * The same surface as a category screen — collections are a view over several
 * categories, so they behave identically once you're inside one.
 */
export default function CollectionScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const collection = findCollection(id);

  const viewMode = useSettingsStore(selectSavedViewMode);
  const sort = useSettingsStore(selectSavedSort);
  const setSetting = useSettingsStore((state) => state.set);

  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 140);

  const { items, loading } = useItemQuery({
    scope: 'active',
    categoryIds: collection?.categoryIds ?? [],
    search: debounced,
    sort,
  });

  const { toggleFavorite, archive, openDetail } = useItemActions();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  const handleToggleView = useCallback(() => {
    haptics.selection();
    void setSetting('savedViewMode', viewMode === 'list' ? 'grid' : 'list');
  }, [setSetting, viewMode]);

  const tone = theme.tones[collection?.tone ?? 'neutral'];

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <LargeTitleHeader
          title={collection?.name ?? 'Collection'}
          subtitle={`${items.length} thing${items.length === 1 ? '' : 's'} waiting`}
          actions={
            <>
              <View style={[styles.icon, { backgroundColor: tone.bg }]}>
                <Icon
                  name={collection?.icon ?? 'bookmark'}
                  size={19}
                  color={tone.fg}
                  strokeWidth={2}
                />
              </View>
              <IconButton
                name={viewMode === 'list' ? 'grid-2x2' : 'list'}
                onPress={handleToggleView}
                accessibilityLabel={
                  viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'
                }
                color={theme.colors.accent}
                size={20}
              />
            </>
          }
        />

        {items.length > 6 || debounced.length > 0 ? (
          <View style={styles.searchWrap}>
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${(collection?.name ?? '').toLowerCase()}…`}
            />
          </View>
        ) : null}
      </View>
    ),
    [
      collection?.icon,
      collection?.name,
      debounced.length,
      handleToggleView,
      items.length,
      search,
      theme.colors.accent,
      tone.bg,
      tone.fg,
      viewMode,
    ]
  );

  return (
    <Screen>
      <NavBar leading="back" leadingLabel="Back" onLeadingPress={handleBack} />

      <ItemList
        items={items}
        viewMode={viewMode}
        onPressItem={openDetail}
        onFavorite={toggleFavorite}
        onArchive={archive}
        ListHeaderComponent={header}
        swipeEnabled={viewMode === 'list'}
        ListEmptyComponent={
          loading ? null : debounced.length > 0 ? (
            <EmptyState
              pose="searching"
              title="Nothing found."
              message="Try a different word."
              size="sm"
              mascotLabel="Tuck looking around, confused"
            />
          ) : (
            <EmptyState
              pose="empty"
              title="Nothing here yet."
              message={`${collection?.blurb ?? 'Anything you save'} will show up here.`}
              actionLabel="Tuck something"
              onAction={() => router.push('/add')}
              mascotLabel="Tuck sitting beside an empty pouch"
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
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xs,
  },
});
