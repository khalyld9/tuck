import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ItemList } from '@/components/lists/ItemList';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { LargeTitleHeader } from '@/components/ios/LargeTitleHeader';
import { NavBar } from '@/components/ios/NavBar';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useDebounced, useItemQuery } from '@/hooks/useItemQuery';
import { useItemActions } from '@/hooks/useItemActions';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { selectSavedSort, selectSavedViewMode, useSettingsStore } from '@/store/useSettingsStore';

/** Everything inside one category. */
export default function CategoryScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const resolveCategory = useCategoriesStore((state) => state.resolve);
  const category = resolveCategory(id);
  const tone = theme.tones[category.tone];

  const viewMode = useSettingsStore(selectSavedViewMode);
  const sort = useSettingsStore(selectSavedSort);
  const setSetting = useSettingsStore((state) => state.set);

  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 140);

  const { items, loading } = useItemQuery({
    scope: 'active',
    categoryId: id ?? null,
    search: debounced,
    sort,
  });

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
        <LargeTitleHeader
          title={category.name}
          subtitle={`${items.length} thing${items.length === 1 ? '' : 's'} tucked away`}
          actions={
            <>
              {/* The category's own colour, kept as a small badge. */}
              <View style={[styles.icon, { backgroundColor: tone.bg }]}>
                <Icon name={category.icon} size={19} color={tone.fg} strokeWidth={2} />
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

        {/* Search only appears once the category is big enough to need it. */}
        {items.length > 6 || debounced.length > 0 ? (
          <View style={styles.searchWrap}>
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${category.name.toLowerCase()}…`}
            />
          </View>
        ) : null}
      </View>
    ),
    [
      category.icon,
      category.name,
      debounced.length,
      handleBack,
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
              title={`No ${category.name.toLowerCase()} yet.`}
              message="Anything you save here will show up in this pocket."
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
