import { memo, useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import type { CategoryWithCount } from '@/types/models';

import { Chip } from '@/components/ui/Chip';

export interface CategoryRailProps {
  categories: CategoryWithCount[];
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  /** Adds an "All" chip at the head of the rail. */
  includeAll?: boolean;
  allLabel?: string;
  allCount?: number;
  /** Hides categories with no items (used on Home). */
  hideEmpty?: boolean;
}

/**
 * Horizontal category picker used on Home and Saved.
 * Scrolls edge-to-edge with the screen gutter applied as content padding, so
 * chips can bleed to the edge while staying aligned with the rest of the page.
 */
export const CategoryRail = memo(function CategoryRail({
  categories,
  selectedId,
  onSelect,
  includeAll = true,
  allLabel = 'All',
  allCount,
  hideEmpty = false,
}: CategoryRailProps) {
  const theme = useTheme();

  const visible = hideEmpty ? categories.filter((category) => category.itemCount > 0) : categories;

  const handleSelect = useCallback(
    (id: string | null) => () => onSelect(id === selectedId ? null : id),
    [onSelect, selectedId]
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      // Chips are small targets; a little extra scroll responsiveness helps.
      decelerationRate="fast"
      accessibilityRole="tablist"
    >
      {includeAll ? (
        <Chip
          label={allLabel}
          count={allCount}
          selected={!selectedId}
          onPress={handleSelect(null)}
          tone={{ fg: theme.colors.accent, bg: theme.colors.accentSoft }}
        />
      ) : null}

      {visible.map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          icon={category.icon}
          count={category.itemCount}
          selected={selectedId === category.id}
          onPress={handleSelect(category.id)}
          tone={theme.tones[category.tone]}
        />
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.sm,
    paddingVertical: 2,
  },
});
