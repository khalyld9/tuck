import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryRail } from '@/components/categories/CategoryRail';
import { ItemList } from '@/components/lists/ItemList';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { OptionRow } from '@/components/ui/OptionRow';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing, tabBarClearance } from '@/constants/tokens';
import { useDebounced, useItemQuery } from '@/hooks/useItemQuery';
import { useItemActions } from '@/hooks/useItemActions';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { selectCounts, useItemsStore } from '@/store/useItemsStore';
import {
  selectSavedSort,
  selectSavedViewMode,
  useSettingsStore,
} from '@/store/useSettingsStore';
import { SORT_LABELS, type SortOption } from '@/types/models';

import { AddButton } from './index';

/**
 * Saved — the full library.
 *
 * Search, category filter, favourites filter, sort and list/grid all compose
 * into one SQLite query; nothing is filtered in JavaScript, so the screen
 * behaves the same at 10 items and at 10,000.
 */
export default function SavedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const counts = useItemsStore(selectCounts);
  const categories = useCategoriesStore((state) => state.categories);

  const viewMode = useSettingsStore(selectSavedViewMode);
  const sort = useSettingsStore(selectSavedSort);
  const setSetting = useSettingsStore((state) => state.set);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const debouncedSearch = useDebounced(search, 140);
  const { items, loading } = useItemQuery({
    scope: 'active',
    search: debouncedSearch,
    categoryId,
    favoritesOnly,
    sort,
  });

  const { toggleFavorite, archive, openDetail } = useItemActions();

  const handleToggleView = useCallback(() => {
    haptics.selection();
    void setSetting('savedViewMode', viewMode === 'list' ? 'grid' : 'list');
  }, [setSetting, viewMode]);

  const handleToggleFavorites = useCallback(() => {
    haptics.selection();
    setFavoritesOnly((previous) => !previous);
  }, []);

  const handleSort = useCallback(
    (option: SortOption) => () => {
      void setSetting('savedSort', option);
      setSortSheetOpen(false);
    },
    [setSetting]
  );

  const hasFilters = Boolean(debouncedSearch) || Boolean(categoryId) || favoritesOnly;

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text variant="title1" accessibilityRole="header">
              Saved
            </Text>
            <Text variant="footnote" color="muted">
              {counts.active === 0
                ? 'Nothing tucked away yet'
                : `${counts.active} thing${counts.active === 1 ? '' : 's'} tucked away`}
            </Text>
          </View>

          <View style={styles.actions}>
            <IconButton
              name="heart"
              onPress={handleToggleFavorites}
              accessibilityLabel={favoritesOnly ? 'Show all items' : 'Show favourites only'}
              accessibilityState={{ selected: favoritesOnly }}
              variant={favoritesOnly ? 'soft' : 'plain'}
              color={favoritesOnly ? theme.colors.favorite : theme.colors.textMuted}
              fill={favoritesOnly ? theme.colors.favorite : 'none'}
              size={19}
            />
            <IconButton
              name="arrow-up-down"
              onPress={() => setSortSheetOpen(true)}
              accessibilityLabel={`Sort. Currently ${SORT_LABELS[sort]}`}
              size={19}
            />
            <IconButton
              name={viewMode === 'list' ? 'grid-2x2' : 'list'}
              onPress={handleToggleView}
              accessibilityLabel={
                viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'
              }
              size={19}
            />
          </View>
        </View>

        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search your tucked things…"
          style={styles.search}
        />

        <View style={styles.rail}>
          <CategoryRail
            categories={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
            allCount={counts.active}
          />
        </View>

        {/* A quiet result count, only while filtering. */}
        {hasFilters ? (
          <Text variant="label" color="subtle" style={styles.resultCount}>
            {items.length} result{items.length === 1 ? '' : 's'}
            {favoritesOnly ? ' · favourites' : ''}
          </Text>
        ) : null}
      </View>
    ),
    [
      categories,
      categoryId,
      counts.active,
      favoritesOnly,
      handleToggleFavorites,
      handleToggleView,
      hasFilters,
      items.length,
      search,
      sort,
      theme.colors.favorite,
      theme.colors.textMuted,
      viewMode,
    ]
  );

  const empty = useMemo(() => {
    if (loading) return null;

    if (hasFilters) {
      return (
        <EmptyState
          pose="searching"
          title="Nothing found."
          message={
            favoritesOnly && !debouncedSearch
              ? 'No favourites in this filter yet.'
              : 'Try a different word, or clear the filters.'
          }
          size="sm"
          mascotLabel="Tuck looking around, confused"
        />
      );
    }

    return (
      <EmptyState
        pose="empty"
        title="Nothing tucked away yet."
        message="Anything you save will show up here."
        actionLabel="Tuck something"
        onAction={() => router.push('/add')}
        mascotLabel="Tuck sitting beside an empty pouch"
      />
    );
  }, [debouncedSearch, favoritesOnly, hasFilters, loading]);

  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: insets.top + spacing.md }}>
        <ItemList
          items={items}
          viewMode={viewMode}
          onPressItem={openDetail}
          onFavorite={toggleFavorite}
          onArchive={archive}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          swipeEnabled={viewMode === 'list'}
          contentContainerStyle={{ paddingBottom: insets.bottom + tabBarClearance + spacing.xl }}
        />
      </View>

      <AddButton />

      <Sheet visible={sortSheetOpen} onClose={() => setSortSheetOpen(false)} title="Sort by">
        {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
          <OptionRow
            key={option}
            label={SORT_LABELS[option]}
            selected={sort === option}
            onPress={handleSort(option)}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing.lg,
    // The list applies the horizontal gutter; the rail needs to bleed past it.
    marginHorizontal: -screenPadding,
    paddingHorizontal: screenPadding,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  titleText: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -spacing.sm,
  },
  search: {
    marginBottom: spacing.lg,
  },
  rail: {
    marginHorizontal: -screenPadding,
  },
  resultCount: {
    marginTop: spacing.md,
  },
});
