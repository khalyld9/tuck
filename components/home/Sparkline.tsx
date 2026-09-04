import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface SparklineProps {
  /** One entry per day, oldest first. */
  data: { day: number; count: number }[];
  /** Bar colour. */
  color: string;
  /** Colour for a day with nothing saved, so empty days still read as days. */
  emptyColor: string;
  height?: number;
}

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/**
 * Seven bars: how much you saved each day this week.
 *
 * Every bar is a real count from SQLite. The scale is the week's own maximum
 * rather than a fixed ceiling, so a quiet week still shows shape instead of
 * flattening to nothing — and a day with zero keeps a visible stub so the
 * week reads as seven days rather than a gap.
 */
export const Sparkline = memo(function Sparkline({
  data,
  color,
  emptyColor,
  height = 34,
}: SparklineProps) {
  const theme = useTheme();
  const max = Math.max(1, ...data.map((entry) => entry.count));

  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <View
      style={styles.host}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        total === 0
          ? 'Nothing saved in the last seven days'
          : `${total} saved over the last seven days`
      }
    >
      <View style={[styles.bars, { height }]}>
        {data.map((entry) => {
          const ratio = entry.count / max;
          return (
            <View key={entry.day} style={styles.column}>
              <View
                style={[
                  styles.bar,
                  {
                    // A floor of 3pt keeps an empty day visible as a day.
                    height: Math.max(3, ratio * height),
                    backgroundColor: entry.count > 0 ? color : emptyColor,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.labels}>
        {data.map((entry) => (
          <View key={entry.day} style={styles.column}>
            <Text
              variant="overline"
              style={[styles.dayLabel, { color: theme.colors.textSubtle }]}
            >
              {DAY_INITIALS[new Date(entry.day).getDay()]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    gap: spacing.xs,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs + 1,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: radius.xs / 2,
  },
  labels: {
    flexDirection: 'row',
    gap: spacing.xs + 1,
  },
  dayLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
});
