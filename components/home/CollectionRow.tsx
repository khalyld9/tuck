import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import type { CollectionDef } from '@/constants/collections';
import { radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface CollectionRowProps {
  collection: CollectionDef;
  /** Live count of active items across the collection's categories. */
  count: number;
  onPress: (collection: CollectionDef) => void;
}

/**
 * One shelf in "Come back to".
 *
 * A row inside a grouped list rather than a card of its own, so three of
 * them read as one object instead of three competing panels. The count is
 * the real number of active items in the collection — shown even at zero,
 * because an empty shelf is still somewhere to put things.
 */
export const CollectionRow = memo(function CollectionRow({
  collection,
  count,
  onPress,
}: CollectionRowProps) {
  const theme = useTheme();
  const tone = theme.tones[collection.tone];

  const handlePress = useCallback(() => onPress(collection), [collection, onPress]);

  const countLabel = `${count} item${count === 1 ? '' : 's'}`;

  return (
    <Pressable
      onPress={handlePress}
      haptic="light"
      pressScale={1}
      pressedBackgroundColor={theme.colors.surfacePressed}
      accessibilityRole="button"
      accessibilityLabel={`${collection.name}, ${countLabel}`}
      accessibilityHint={collection.blurb}
      style={styles.row}
    >
      <View style={[styles.glyph, { backgroundColor: tone.bg }]}>
        <Icon name={collection.icon} size={19} color={tone.fg} strokeWidth={2} />
      </View>

      <View style={styles.body}>
        <Text variant="headline" numberOfLines={1}>
          {collection.name}
        </Text>
        <Text variant="footnote" color="muted" numberOfLines={1}>
          {countLabel}
        </Text>
      </View>

      <Icon name="chevron-right" size={17} color={theme.colors.textSubtle} strokeWidth={2.2} />
    </Pressable>
  );
});

/** Separator inset that clears the leading glyph. */
export const collectionSeparatorInset = spacing.lg + 38 + spacing.md;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  glyph: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 1,
  },
});
