import { memo, useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { elevation, radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface SegmentOption {
  id: string;
  label: string;
}

export interface SegmentedPillsProps {
  options: readonly SegmentOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Scrolls horizontally when the options don't fit. */
  scrollable?: boolean;
}

/**
 * A row of solid segmented pills.
 *
 * Selection is carried by a filled brand pill with a lift, against plain
 * surface for the rest — so the active option is legible from fill, weight
 * and elevation together rather than colour alone.
 */
export const SegmentedPills = memo(function SegmentedPills({
  options,
  selectedId,
  onSelect,
  scrollable = true,
}: SegmentedPillsProps) {
  const content = options.map((option) => (
    <Segment
      key={option.id}
      option={option}
      selected={option.id === selectedId}
      onSelect={onSelect}
    />
  ));

  if (!scrollable) {
    return <ScrollView horizontal={false} contentContainerStyle={styles.row}>{content}</ScrollView>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      decelerationRate="fast"
      accessibilityRole="tablist"
    >
      {content}
    </ScrollView>
  );
});

const Segment = memo(function Segment({
  option,
  selected,
  onSelect,
}: {
  option: SegmentOption;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  const handlePress = useCallback(() => onSelect(option.id), [onSelect, option.id]);

  return (
    <Pressable
      onPress={handlePress}
      haptic="selection"
      pressScale={0.96}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
        },
        selected
          ? elevation(1, theme.colors.shadow, theme.dark)
          : undefined,
      ]}
    >
      <Text
        variant="footnote"
        style={[
          styles.label,
          {
            color: selected ? theme.colors.textOnAccent : theme.colors.textMuted,
            fontWeight: selected ? '700' : '600',
          },
        ]}
      >
        {option.label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  label: {
    textAlign: 'center',
  },
});
