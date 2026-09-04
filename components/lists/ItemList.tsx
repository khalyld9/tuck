import { FlashList } from '@shopify/flash-list';
import { memo, useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

import { ItemCard } from '@/components/cards/ItemCard';
import { ItemGridCard } from '@/components/cards/ItemGridCard';
import { SwipeableItem } from '@/components/cards/SwipeableItem';
import { cardMetrics, screenPadding, spacing } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { IconName } from '@/components/ui/Icon';
import type { SavedItem, ViewMode } from '@/types/models';

export interface ItemListProps {
  items: SavedItem[];
  viewMode: ViewMode;
  onPressItem: (item: SavedItem) => void;
  onFavorite?: (item: SavedItem) => void;
  onArchive?: (item: SavedItem) => void;
  /** Swipe-left label — "Archive" normally, "Restore" in the Archive screen. */
  archiveLabel?: string;
  archiveIcon?: IconName;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Disables swipe gestures (grid mode, where they'd fight the layout). */
  swipeEnabled?: boolean;
}

/**
 * The single list surface used by Saved, Category, Favourites and Archive.
 *
 * FlashList recycles rows, so a library of thousands stays at 60fps. Cards are
 * memoised and the row wrappers are stable callbacks, which keeps scrolling
 * free of avoidable re-renders.
 */
export const ItemList = memo(function ItemList({
  items,
  viewMode,
  onPressItem,
  onFavorite,
  onArchive,
  archiveLabel = 'Archive',
  archiveIcon = 'archive',
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  swipeEnabled = true,
}: ItemListProps) {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // Two columns on phones, three on wider screens (tablets, landscape).
  const columns = viewMode === 'grid' ? (width >= 700 ? 3 : 2) : 1;
  const gridItemWidth =
    viewMode === 'grid'
      ? Math.floor((width - screenPadding * 2 - cardMetrics.gap * (columns - 1)) / columns)
      : width - screenPadding * 2;

  const renderItem = useCallback(
    ({ item }: { item: SavedItem }) => {
      if (viewMode === 'grid') {
        return (
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(200)}
            style={styles.gridCell}
          >
            <ItemGridCard item={item} onPress={onPressItem} width={gridItemWidth} />
          </Animated.View>
        );
      }

      const card = <ItemCard item={item} onPress={onPressItem} />;

      // Swipes only make sense when there's something to swipe to.
      if (!swipeEnabled || (!onFavorite && !onArchive)) {
        return <View style={styles.listCell}>{card}</View>;
      }

      return (
        <Animated.View
          layout={reducedMotion ? undefined : Layout.springify().damping(22).stiffness(220)}
          style={styles.listCell}
        >
          <SwipeableItem
            onFavorite={onFavorite ? () => onFavorite(item) : undefined}
            onArchive={onArchive ? () => onArchive(item) : undefined}
            isFavorite={item.isFavorite}
            archiveLabel={archiveLabel}
            archiveIcon={archiveIcon}
          >
            {card}
          </SwipeableItem>
        </Animated.View>
      );
    },
    [
      archiveIcon,
      archiveLabel,
      gridItemWidth,
      onArchive,
      onFavorite,
      onPressItem,
      reducedMotion,
      swipeEnabled,
      viewMode,
    ]
  );

  const keyExtractor = useCallback((item: SavedItem) => item.id, []);

  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={columns}
      // Remount the list when the column count changes so FlashList can
      // recompute its layout cleanly.
      key={`${viewMode}-${columns}`}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={{
        paddingHorizontal: screenPadding,
        paddingBottom: spacing.massive,
        ...contentContainerStyle,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // Keep a modest window; cards are cheap but images are not.
      drawDistance={600}
    />
  );
});

const styles = StyleSheet.create({
  listCell: {
    marginBottom: spacing.sm + 2,
  },
  gridCell: {
    marginBottom: cardMetrics.gap,
  },
});
