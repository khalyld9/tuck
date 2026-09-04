import { memo, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { QUICK_TUCK, type QuickTuckDef } from '@/constants/collections';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface QuickTuckRailProps {
  /** Receives the category id to preselect in the Add form. */
  onPick: (categoryId: string) => void;
}

/**
 * Shortcuts into the Add form with a category already chosen.
 *
 * These are the five things people reach for most; everything else is one
 * more tap away through the "+" button, which still opens the full picker.
 * Each pill is the same form with a parameter, never a separate flow.
 */
export const QuickTuckRail = memo(function QuickTuckRail({ onPick }: QuickTuckRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      decelerationRate="fast"
    >
      {QUICK_TUCK.map((entry) => (
        <QuickTuckPill key={entry.categoryId} entry={entry} onPick={onPick} />
      ))}
    </ScrollView>
  );
});

const QuickTuckPill = memo(function QuickTuckPill({
  entry,
  onPick,
}: {
  entry: QuickTuckDef;
  onPick: (categoryId: string) => void;
}) {
  const theme = useTheme();
  const tone = theme.tones[entry.tone];

  const handlePress = useCallback(() => onPick(entry.categoryId), [entry.categoryId, onPick]);

  return (
    <Pressable
      onPress={handlePress}
      haptic="light"
      pressScale={0.96}
      accessibilityRole="button"
      accessibilityLabel={`Tuck a ${entry.label.toLowerCase()}`}
      accessibilityHint="Opens the form with this category chosen"
      style={[styles.pill, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.glyph, { backgroundColor: tone.bg }]}>
        <Icon name={entry.icon} size={16} color={tone.fg} strokeWidth={2} />
      </View>
      <Text variant="callout">{entry.label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm - 1,
    paddingRight: spacing.md + 2,
    paddingVertical: spacing.sm - 1,
    borderRadius: radius.pill,
    // Comfortably past the 44pt minimum once the glyph is included.
    minHeight: 44,
  },
  glyph: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
