import { Image } from 'expo-image';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { cardMetrics, elevation, radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { isPast, relativeTime } from '@/lib/datetime';
import { getDomain } from '@/lib/url';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import type { SavedItem } from '@/types/models';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

export interface ItemCardProps {
  item: SavedItem;
  onPress: (item: SavedItem) => void;
  onLongPress?: (item: SavedItem) => void;
  /**
   * Renders as a row inside an `InsetGroup` — no fill, no radius, no shadow,
   * because the group draws the surface. This is the iOS grouped-list form;
   * the standalone card form is kept for contexts with no group around it.
   */
  inset?: boolean;
}

/**
 * List-view card.
 *
 * Height is fixed by construction: the thumbnail is a fixed square, the title
 * is capped at two lines and the meta row at one, so a long description can
 * never make one card taller than its neighbours.
 */
export const ItemCard = memo(
  function ItemCard({ item, onPress, onLongPress, inset }: ItemCardProps) {
    const theme = useTheme();
    const category = useCategoriesStore((state) => state.byId[item.categoryId]);
    const tone = theme.tones[category?.tone ?? 'neutral'];
    const domain = getDomain(item.url);
    const overdue = isPast(item.reminderAt);

    const handlePress = useCallback(() => onPress(item), [item, onPress]);
    const handleLongPress = useCallback(() => onLongPress?.(item), [item, onLongPress]);

    const subtitle = domain ?? category?.name ?? 'Other';

    return (
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        pressScale={inset ? 1 : 0.985}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={`${category?.name ?? 'Other'}${
          domain ? `, ${domain}` : ''
        }. Tucked ${relativeTime(item.createdAt)}.${overdue ? ' Reminder overdue.' : ''}${
          item.isFavorite ? ' Favourite.' : ''
        }`}
        pressedBackgroundColor={inset ? theme.colors.surfacePressed : undefined}
        style={
          inset
            ? styles.row
            : [
                styles.card,
                // Depth instead of a hairline: cards are separated from the
                // page by light, not by a drawn edge. The border is kept only
                // in dark mode, where a shadow on near-black is invisible.
                elevation(1, theme.colors.shadow, theme.dark),
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.dark ? theme.colors.border : 'transparent',
                },
              ]
        }
      >
        {/* Thumbnail — the saved image if there is one, otherwise the
            category glyph on a soft tonal tile. Same size either way. */}
        <View
          style={[
            styles.thumb,
            { backgroundColor: item.imageUri ? theme.colors.surfaceSunken : tone.bg },
          ]}
        >
          {item.imageUri ? (
            <Image
              source={{ uri: item.imageUri }}
              style={styles.thumbImage}
              contentFit="cover"
              transition={140}
              cachePolicy="memory-disk"
              accessible={false}
            />
          ) : (
            <Icon name={category?.icon ?? 'bookmark'} size={22} color={tone.fg} strokeWidth={2} />
          )}
        </View>

        <View style={styles.body}>
          <Text variant="headline" numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.meta}>
            <Text variant="footnote" color="subtle" numberOfLines={1} style={styles.metaText}>
              {subtitle}
            </Text>
            <View style={[styles.dot, { backgroundColor: theme.colors.textSubtle }]} />
            <Text variant="footnote" color="subtle" numberOfLines={1} style={styles.metaTime}>
              {relativeTime(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Status badges. Reminder first, then favourite. */}
        <View style={styles.badges}>
          {item.reminderAt ? (
            overdue ? (
              // A missed reminder is worth interrupting for, so it gets a
              // labelled pill rather than another small glyph. The word
              // carries the meaning; the colour only reinforces it.
              <View style={[styles.duePill, { backgroundColor: theme.colors.dangerSoft }]}>
                <Text variant="caption" style={{ color: theme.colors.danger }}>
                  Due
                </Text>
              </View>
            ) : (
              <Icon name="bell" size={14} color={theme.colors.reminder} strokeWidth={2.2} />
            )
          ) : null}
          {item.isFavorite ? (
            <Icon
              name="heart"
              size={15}
              color={theme.colors.favorite}
              fill={theme.colors.favorite}
              strokeWidth={2}
            />
          ) : null}
        </View>
      </Pressable>
    );
  },
  // Cards are pure functions of the item — skip re-render unless a visible
  // field actually changed. This is what keeps long lists smooth.
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.title === next.item.title &&
    prev.item.url === next.item.url &&
    prev.item.imageUri === next.item.imageUri &&
    prev.item.categoryId === next.item.categoryId &&
    prev.item.isFavorite === next.item.isFavorite &&
    prev.item.isArchived === next.item.isArchived &&
    prev.item.reminderAt === next.item.reminderAt &&
    prev.item.createdAt === next.item.createdAt &&
    prev.inset === next.inset &&
    prev.onPress === next.onPress
);

const styles = StyleSheet.create({
  /** Grouped-list form: the InsetGroup owns the surface and the separators. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    height: cardMetrics.listHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    height: cardMetrics.listHeight,
    padding: spacing.md,
    borderRadius: cardMetrics.radius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: cardMetrics.listThumb,
    height: cardMetrics.listThumb,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
  },
  metaText: {
    // The domain yields first; the timestamp is short and always readable.
    flexShrink: 1,
  },
  metaTime: {
    flexShrink: 0,
  },
  dot: {
    flexShrink: 0,
    width: 2.5,
    height: 2.5,
    borderRadius: 2,
    opacity: 0.6,
  },
  duePill: {
    paddingHorizontal: spacing.sm - 1,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badges: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    paddingLeft: spacing.xs,
  },
});
