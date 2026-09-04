import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import type { CategoryWithCount } from '@/types/models';

export interface AddTuckSheetProps {
  visible: boolean;
  onClose: () => void;
  categories: CategoryWithCount[];
  /** Called with a category id, or null for a blank form. */
  onPick: (categoryId: string | null) => void;
}

/**
 * The shortcuts shown in the sheet, in the order a person is most likely to
 * reach for them. These are ids of the built-in categories; any that a user
 * has removed simply won't render.
 */
const QUICK_IDS = ['places', 'movies', 'books', 'products', 'ideas', 'websites'] as const;

/** One-line hints. Keyed by id so renaming a category can't break the copy. */
const HINTS: Record<string, string> = {
  places: 'Somewhere to go',
  movies: 'Something to watch',
  books: 'Something to read',
  products: 'Something to buy',
  ideas: 'Something to think about',
  websites: 'Somewhere to revisit',
};

/**
 * "Tuck something" — the sheet behind the floating button.
 *
 * It is a set of shortcuts into the existing Add form, not a second way to
 * create things: every row pushes `/add` with a category preselected, so the
 * save path, validation and snackbar are all unchanged. The last row opens
 * the form with nothing chosen, which is still the fastest route for a bare
 * title.
 */
export const AddTuckSheet = memo(function AddTuckSheet({
  visible,
  onClose,
  categories,
  onPick,
}: AddTuckSheetProps) {
  const theme = useTheme();

  const quick = useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    return QUICK_IDS.map((id) => byId.get(id)).filter(
      (category): category is CategoryWithCount => Boolean(category)
    );
  }, [categories]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Tuck something">
      <View style={styles.list}>
        {quick.map((category) => {
          const tone = theme.tones[category.tone] ?? theme.tones.neutral;
          return (
            <Pressable
              key={category.id}
              onPress={() => onPick(category.id)}
              haptic="light"
              pressScale={0.98}
              accessibilityRole="button"
              accessibilityLabel={category.name}
              accessibilityHint={HINTS[category.id] ?? 'Opens the save form'}
              style={styles.row}
            >
              <View style={[styles.icon, { backgroundColor: tone.bg }]}>
                <Icon name={category.icon} size={19} color={tone.fg} strokeWidth={2} />
              </View>

              <View style={styles.rowText}>
                <Text variant="headline">{category.name}</Text>
                {HINTS[category.id] ? (
                  <Text variant="label" color="muted">
                    {HINTS[category.id]}
                  </Text>
                ) : null}
              </View>

              <Icon name="chevron-right" size={17} color={theme.colors.textSubtle} />
            </Pressable>
          );
        })}

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <Pressable
          onPress={() => onPick(null)}
          haptic="light"
          pressScale={0.98}
          accessibilityRole="button"
          accessibilityLabel="Something else"
          accessibilityHint="Opens the save form with nothing preselected"
          style={styles.row}
        >
          <View style={[styles.icon, { backgroundColor: theme.colors.accentSoft }]}>
            <Icon name="plus" size={19} color={theme.colors.accent} strokeWidth={2.2} />
          </View>

          <View style={styles.rowText}>
            <Text variant="headline">Something else</Text>
            <Text variant="label" color="muted">
              Start with a blank note
            </Text>
          </View>

          <Icon name="chevron-right" size={17} color={theme.colors.textSubtle} />
        </Pressable>
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    minHeight: 56,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
});
