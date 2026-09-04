import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { elevation, radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import type { CategoryWithCount } from '@/types/models';

export interface CategoryColorCardProps {
  category: CategoryWithCount;
  onPress: (category: CategoryWithCount) => void;
  /** Long press opens the quick-action menu. */
  onLongPress?: (category: CategoryWithCount) => void;
}

/**
 * A category as a solid block of colour.
 *
 * Each card is filled with its category's own hue and captioned in white:
 * the icon says what it is, the number says how much is in it. Every fill
 * clears WCAG AA against white text (see scripts/test-contrast.js), which is
 * the constraint that keeps a colourful grid from becoming an unreadable one.
 */
export const CategoryColorCard = memo(
  function CategoryColorCard({
    category,
    onPress,
    onLongPress,
  }: CategoryColorCardProps) {
    const theme = useTheme();
    const tone = theme.tones[category.tone];

    const handlePress = useCallback(() => onPress(category), [category, onPress]);
    const handleLongPress = useCallback(
      () => onLongPress?.(category),
      [category, onLongPress]
    );

    const countLabel = `${category.itemCount} ${category.itemCount === 1 ? 'thing' : 'things'}`;

    return (
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        haptic="light"
        pressScale={0.97}
        accessibilityRole="button"
        accessibilityLabel={`${category.name}, ${countLabel}`}
        accessibilityHint={
          onLongPress ? 'Double tap to open. Long press for more actions.' : undefined
        }
        style={[
          styles.card,
          { backgroundColor: tone.solid },
          elevation(1, theme.colors.shadow, theme.dark),
        ]}
      >
        <View style={styles.top}>
          <View style={[styles.glyph, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Icon name={category.icon} size={18} color={tone.onSolid} strokeWidth={2.1} />
          </View>
        </View>

        <View style={styles.body}>
          <Text
            variant="footnote"
            numberOfLines={1}
            style={[styles.name, { color: tone.onSolid }]}
          >
            {category.name}
          </Text>
          <Text variant="title3" style={[styles.count, { color: tone.onSolid }]}>
            {category.itemCount}
          </Text>
        </View>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.category.id === next.category.id &&
    prev.category.itemCount === next.category.itemCount &&
    prev.category.name === next.category.name &&
    prev.category.tone === next.category.tone &&
    prev.onPress === next.onPress &&
    prev.onLongPress === next.onLongPress
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 108,
    justifyContent: 'space-between',
    padding: spacing.md + 2,
    borderRadius: radius.lg,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  glyph: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 0,
  },
  name: {
    opacity: 0.9,
  },
  count: {
    fontSize: 22,
    lineHeight: 27,
  },
});
