import { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { elevation, radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import type { CategoryWithCount } from '@/types/models';

export interface SummaryStripProps {
  /** Total active (non-archived) items. */
  total: number;
  /** Saved in the last seven days. Omitted when zero. */
  addedThisWeek: number;
  categories: CategoryWithCount[];
  onPressTotal: () => void;
  onPressCategory: (id: string) => void;
}

/** How many category tiles to show before the rest are folded into Browse. */
const VISIBLE_CATEGORIES = 4;

/**
 * The library at a glance: one headline figure, then the biggest categories.
 *
 * Every number here is a real count from SQLite — nothing is derived, averaged
 * or projected. The brief asked for the density of a dashboard, but Tuck is a
 * personal collection, not an analytics product, so this stays to counts a
 * person would actually recognise as their own and each tile is a shortcut to
 * the thing it counts rather than a read-only statistic.
 */
export const SummaryStrip = memo(function SummaryStrip({
  total,
  addedThisWeek,
  categories,
  onPressTotal,
  onPressCategory,
}: SummaryStripProps) {
  const theme = useTheme();

  // Only categories that actually hold something, biggest first.
  const top = useMemo(
    () =>
      categories
        .filter((category) => category.itemCount > 0)
        .sort((a, b) => b.itemCount - a.itemCount)
        .slice(0, VISIBLE_CATEGORIES),
    [categories]
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      // The strip bleeds to both screen edges so the last tile can scroll
      // fully into view instead of stopping at the gutter.
      style={styles.scroll}
    >
      <Pressable
        onPress={onPressTotal}
        haptic="light"
        pressScale={0.97}
        accessibilityRole="button"
        accessibilityLabel={`${total} thing${total === 1 ? '' : 's'} tucked away.${
          addedThisWeek > 0 ? ` ${addedThisWeek} added this week.` : ''
        }`}
        accessibilityHint="Opens your library"
        style={[
          styles.headline,
          elevation(1, theme.colors.shadow, theme.dark),
          { backgroundColor: theme.colors.accent },
        ]}
      >
        <Text variant="overline" style={{ color: theme.colors.textOnAccent, opacity: 0.8 }}>
          Tucked away
        </Text>
        <Text variant="title1" style={{ color: theme.colors.textOnAccent }}>
          {total}
        </Text>
        <Text variant="label" style={{ color: theme.colors.textOnAccent, opacity: 0.85 }}>
          {addedThisWeek > 0 ? `${addedThisWeek} added this week` : 'All of it, in one place'}
        </Text>
      </Pressable>

      {top.map((category) => {
        const tone = theme.tones[category.tone] ?? theme.tones.neutral;
        return (
          <Pressable
            key={category.id}
            onPress={() => onPressCategory(category.id)}
            haptic="light"
            pressScale={0.97}
            accessibilityRole="button"
            accessibilityLabel={`${category.name}, ${category.itemCount} item${
              category.itemCount === 1 ? '' : 's'
            }`}
            style={[
              styles.tile,
              elevation(1, theme.colors.shadow, theme.dark),
              { backgroundColor: tone.bg },
            ]}
          >
            <Icon name={category.icon} size={17} color={tone.fg} strokeWidth={2} />
            <View>
              <Text variant="title3" style={{ color: tone.ink }}>
                {category.itemCount}
              </Text>
              <Text variant="label" numberOfLines={1} style={{ color: tone.ink, opacity: 0.8 }}>
                {category.name}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -screenPadding,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: screenPadding,
  },
  headline: {
    minWidth: 150,
    justifyContent: 'space-between',
    gap: spacing.xxs,
    padding: spacing.lg - 2,
    borderRadius: radius.lg,
  },
  tile: {
    width: 104,
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
  },
});
