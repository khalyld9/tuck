import { Image } from 'expo-image';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { cardMetrics, radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { relativeTime } from '@/lib/datetime';
import { getDomain } from '@/lib/url';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import type { SavedItem } from '@/types/models';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

export interface ItemGridCardProps {
  item: SavedItem;
  onPress: (item: SavedItem) => void;
  onLongPress?: (item: SavedItem) => void;
  width: number;
}

/**
 * Grid-view card. The media area uses a fixed aspect ratio and the text block
 * has a fixed line budget, so every tile in a row is exactly the same height.
 */
export const ItemGridCard = memo(
  function ItemGridCard({ item, onPress, onLongPress, width }: ItemGridCardProps) {
    const theme = useTheme();
    const category = useCategoriesStore((state) => state.byId[item.categoryId]);
    const tone = theme.tones[category?.tone ?? 'neutral'];
    const domain = getDomain(item.url);

    const handlePress = useCallback(() => onPress(item), [item, onPress]);
    const handleLongPress = useCallback(() => onLongPress?.(item), [item, onLongPress]);

    const mediaHeight = Math.round(width / cardMetrics.gridImageAspect);

    return (
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        pressScale={0.975}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={`${category?.name ?? 'Other'}${domain ? `, ${domain}` : ''}. Tucked ${relativeTime(
          item.createdAt
        )}.${item.isFavorite ? ' Favourite.' : ''}`}
        style={[
          styles.card,
          {
            width,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.media,
            {
              height: mediaHeight,
              backgroundColor: item.imageUri ? theme.colors.surfaceSunken : tone.bg,
            },
          ]}
        >
          {item.imageUri ? (
            <Image
              source={{ uri: item.imageUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={140}
              cachePolicy="memory-disk"
              accessible={false}
            />
          ) : (
            <Icon name={category?.icon ?? 'bookmark'} size={26} color={tone.fg} strokeWidth={1.9} />
          )}

          {(item.isFavorite || item.reminderAt) && (
            <View style={styles.badges}>
              {item.reminderAt ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
                  <Icon name="bell" size={12} color={theme.colors.reminder} strokeWidth={2.4} />
                </View>
              ) : null}
              {item.isFavorite ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
                  <Icon
                    name="heart"
                    size={12}
                    color={theme.colors.favorite}
                    fill={theme.colors.favorite}
                    strokeWidth={2}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text variant="callout" numberOfLines={2} style={styles.title}>
            {item.title}
          </Text>
          <Text variant="label" color="subtle" numberOfLines={1} style={styles.meta}>
            {domain ?? category?.name ?? 'Other'}
          </Text>
        </View>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.title === next.item.title &&
    prev.item.url === next.item.url &&
    prev.item.imageUri === next.item.imageUri &&
    prev.item.categoryId === next.item.categoryId &&
    prev.item.isFavorite === next.item.isFavorite &&
    prev.item.reminderAt === next.item.reminderAt &&
    prev.width === next.width &&
    prev.onPress === next.onPress
);

const styles = StyleSheet.create({
  card: {
    borderRadius: cardMetrics.radius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.md,
    gap: 3,
    height: cardMetrics.gridBodyHeight,
    justifyContent: 'flex-start',
  },
  title: {
    fontWeight: '600',
    flexShrink: 1,
  },
  meta: {
    // Always sits on the last line of the fixed block, whether the title
    // above it ran to one line or two.
    marginTop: 'auto',
  },
});
