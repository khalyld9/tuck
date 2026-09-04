import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { useCategoriesStore } from '@/store/useCategoriesStore';

import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';

export interface CategoryPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  label?: string;
}

/**
 * Wrapping grid of category chips.
 * Wrapping (rather than a horizontal rail) means every option is reachable
 * without scrolling while the keyboard is up.
 */
export const CategoryPicker = memo(function CategoryPicker({
  selectedId,
  onSelect,
  label = 'Category',
}: CategoryPickerProps) {
  const theme = useTheme();
  const categories = useCategoriesStore((state) => state.categories);

  const handleSelect = useCallback((id: string) => () => onSelect(id), [onSelect]);

  return (
    <View style={styles.container}>
      <Text variant="overline" color="subtle" uppercase>
        {label}
      </Text>

      <View style={styles.grid} accessibilityRole="radiogroup">
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            icon={category.icon}
            selected={selectedId === category.id}
            onPress={handleSelect(category.id)}
            tone={theme.tones[category.tone]}
            size="sm"
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
