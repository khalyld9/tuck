import { FlashList } from '@shopify/flash-list';
import { memo, useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

import { ItemCard } from '@/components/cards/ItemCard';
import { ItemGridCard } from '@/components/cards/ItemGridCard';
import { SwipeableItem } from '@/components/cards/SwipeableItem';
import { cardMetrics, radius, screenPadding, spacing } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
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
  const theme = useTheme();

  // Two columns on phones, three on wider screens (tablets, landscape).
  const columns = viewMode === 'grid' ? (width >= 700 ? 3 : 2) : 1;
  const gridItemWidth =
    viewMode === 'grid'
      ? Math.floor((width - screenPadding * 2 - cardMetrics.gap * (columns - 1)) / columns)
      : width - screenPadding * 2;

  const renderItem = useCallback(
    ({ item, index }: { item: SavedItem; index: number }) => {
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

      // The list reads as one continuous inset group, so each row paints the
      // shared surface itself and only the first/last rows round their outer
      // corners. A virtualised list can't be wrapped in a container, so the
      // grouping has to be reconstructed per row.
      const isFirst = index === 0;
      const isLast = index === items.length - 1;

      const card = (
        <View
          style={[
            styles.groupRow,
            { backgroundColor: theme.colors.surface },
            isFirst && styles.groupRowFirst,
            isLast && styles.groupRowLast,
          ]}
        >
          <ItemCard item={item} onPress={onPressItem} inset />
          {!isLast ? (
            <View style={styles.separatorTrack}>
              <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            </View>
          ) : null}
        </View>
      );

      // Swipes only make sense when there's something to swipe to.
      if (!swipeEnabled || (!onFavorite && !onArchive)) {
        return card;
      }

      return (
        <Animated.View
          layout={reducedMotion ? undefined : Layout.springify().damping(22).stiffness(220)}
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
      items.length,
      reducedMotion,
      swipeEnabled,
      theme.colors.border,
      theme.colors.surface,
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
  groupRow: {
    overflow: 'hidden',
  },
  groupRowFirst: {
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  groupRowLast: {
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  separatorTrack: {
    paddingLeft: spacing.lg + cardMetrics.listThumb + spacing.md,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  gridCell: {
    marginBottom: cardMetrics.gap,
  },
});
