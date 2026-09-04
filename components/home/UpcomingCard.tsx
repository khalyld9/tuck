import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { futureRelativeTime, isPast, formatDateTime } from '@/lib/datetime';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import type { SavedItem } from '@/types/models';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

export interface UpcomingCardProps {
  item: SavedItem;
  onPress: (item: SavedItem) => void;
  /** Renders as a row inside an `InsetGroup` rather than a standalone card. */
  inset?: boolean;
}

/**
 * Compact reminder row for Home's "Coming Up".
 * A missed reminder is marked with both a colour change and an explicit
 * "Missed" label, so the state never relies on colour alone.
 */
export const UpcomingCard = memo(function UpcomingCard({
  item,
  onPress,
  inset,
}: UpcomingCardProps) {
  const theme = useTheme();
  const category = useCategoriesStore((state) => state.byId[item.categoryId]);
  const tone = theme.tones[category?.tone ?? 'neutral'];

  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  const overdue = isPast(item.reminderAt);
  const when = item.reminderAt
    ? overdue
      ? 'Missed'
      : futureRelativeTime(item.reminderAt)
    : '';

  return (
    <Pressable
      onPress={handlePress}
      pressScale={inset ? 1 : 0.98}
      pressedBackgroundColor={inset ? theme.colors.surfacePressed : undefined}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint={
        item.reminderAt
          ? `Reminder ${overdue ? 'was' : 'set for'} ${formatDateTime(item.reminderAt)}`
          : undefined
      }
      style={
        inset
          ? styles.row
          : [
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]
      }
    >
      <View style={[styles.icon, { backgroundColor: tone.bg }]}>
        <Icon name={category?.icon ?? 'bookmark'} size={17} color={tone.fg} strokeWidth={2.1} />
      </View>

      <View style={styles.body}>
        <Text variant="callout" numberOfLines={1} style={styles.title}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Icon
            name={overdue ? 'circle-alert' : 'bell'}
            size={12}
            color={overdue ? theme.colors.danger : theme.colors.reminder}
            strokeWidth={2.4}
          />
          <Text
            variant="caption"
            style={{ color: overdue ? theme.colors.danger : theme.colors.reminder }}
          >
            {when}
          </Text>
        </View>
      </View>

      <Icon name="chevron-right" size={17} color={theme.colors.textSubtle} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  /** Grouped-list form — the InsetGroup draws the surface. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
