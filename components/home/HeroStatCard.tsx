import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { elevation, radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

import { Sparkline } from './Sparkline';

export interface HeroStatCardProps {
  /** Total active items — the headline figure. */
  total: number;
  /** Saved in the last seven days, shown as the supporting delta. */
  addedThisWeek: number;
  /** Per-day counts driving the chart. */
  week: { day: number; count: number }[];
  onPress: () => void;
}

/**
 * The one number worth leading with.
 *
 * Sits half over the coloured banner and half on the page, which is what
 * makes the header read as a layer rather than a stripe. The figure is the
 * size of the library; the chart beside it is the same data over time, so
 * the card says one thing in two ways instead of listing four statistics.
 */
export const HeroStatCard = memo(function HeroStatCard({
  total,
  addedThisWeek,
  week,
  onPress,
}: HeroStatCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      pressScale={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${total} things tucked away, ${addedThisWeek} added this week`}
      accessibilityHint="Opens your library"
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface },
        elevation(2, theme.colors.shadow, theme.dark),
      ]}
    >
      <View style={styles.figures}>
        <Text variant="label" color="subtle" uppercase>
          Tucked away
        </Text>
        <Text variant="display" style={styles.total}>
          {total}
        </Text>
        <Text variant="footnote" color="muted">
          {addedThisWeek > 0
            ? `${addedThisWeek} added this week`
            : 'Nothing new this week'}
        </Text>
      </View>

      <View style={styles.chart}>
        <Sparkline
          data={week}
          color={theme.colors.accent}
          emptyColor={theme.colors.surfacePressed}
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  figures: {
    flex: 1,
    gap: 1,
  },
  total: {
    // The figure is the loudest thing on the screen; tighten it so a
    // three-digit library doesn't wrap.
    fontSize: 44,
    lineHeight: 48,
  },
  chart: {
    width: 104,
  },
});
