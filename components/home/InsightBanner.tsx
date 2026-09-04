import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import type { LibraryPulse } from '@/db/repositories/itemsRepository';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface Insight {
  /** Short lead-in, e.g. "Waiting". */
  kicker: string;
  message: string;
  icon: string;
  href: string;
}

/**
 * Picks the one observation worth surfacing.
 *
 * Ordered by usefulness, not by novelty: something overdue beats something
 * due soon, which beats a note about the shape of the library. Returns null
 * when there is nothing true to say — a banner that always has an opinion is
 * one people stop reading, and inventing an insight to fill the slot would
 * make the number beside it meaningless.
 */
export function pickInsight(
  pulse: LibraryPulse | null,
  activeCount: number
): Insight | null {
  if (!pulse || activeCount === 0) return null;

  if (pulse.overdue > 0) {
    return {
      kicker: 'Overdue',
      message:
        pulse.overdue === 1
          ? 'One reminder has already passed'
          : `${pulse.overdue} reminders have already passed`,
      icon: 'bell-ring',
      href: '/saved',
    };
  }

  if (pulse.dueSoon > 0) {
    return {
      kicker: 'Due soon',
      message:
        pulse.dueSoon === 1
          ? 'Something is due in the next day'
          : `${pulse.dueSoon} things are due in the next day`,
      icon: 'clock',
      href: '/saved',
    };
  }

  if (pulse.gatheringDust >= 5 && pulse.gatheringDust >= activeCount * 0.6) {
    return {
      kicker: 'Waiting',
      message: `${pulse.gatheringDust} things have been sitting a while`,
      icon: 'clock',
      href: '/saved',
    };
  }

  if (pulse.topCategory && pulse.topCategoryCount >= 4) {
    return {
      kicker: 'Mostly',
      message: `${pulse.topCategory.toLowerCase()} lately — ${pulse.topCategoryCount} of them`,
      icon: 'sparkles',
      href: '/browse',
    };
  }

  return null;
}

export interface InsightBannerProps {
  insight: Insight;
  onPress: () => void;
}

/**
 * A single-line observation about the library, tinted apart from the page.
 */
export const InsightBanner = memo(function InsightBanner({
  insight,
  onPress,
}: InsightBannerProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      pressScale={0.99}
      accessibilityRole="button"
      accessibilityLabel={`${insight.kicker}: ${insight.message}`}
      style={[styles.banner, { backgroundColor: theme.colors.accentGlow }]}
    >
      <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon name={insight.icon} size={16} color={theme.colors.accent} strokeWidth={2.2} />
      </View>

      <View style={styles.body}>
        <Text variant="overline" style={{ color: theme.colors.accent }}>
          {insight.kicker.toUpperCase()}
        </Text>
        <Text variant="footnote" numberOfLines={1}>
          {insight.message}
        </Text>
      </View>

      <Icon name="chevron-right" size={16} color={theme.colors.accent} strokeWidth={2.2} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: screenPadding,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.md,
  },
  glyph: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 1,
  },
});
