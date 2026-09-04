import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface CompactEmptyProps {
  onAction: () => void;
}

/**
 * The empty "Recently tucked" slot.
 *
 * Deliberately small: on a Home screen that now has other things to offer,
 * a full-height empty state would push all of them below the fold and make
 * an app with nothing in it feel like an app that is broken. The mascot sits
 * beside the copy rather than above it, which keeps the whole block to about
 * the height of two list rows.
 */
export const CompactEmpty = memo(function CompactEmpty({ onAction }: CompactEmptyProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.row}>
        <Mascot
          pose="empty"
          size={56}
          idle
          accessibilityLabel="Tuck sitting beside an empty pouch"
        />
        <View style={styles.copy}>
          <Text variant="headline">Nothing tucked yet</Text>
          <Text variant="footnote" color="muted" style={styles.message}>
            Start with something you want to come back to.
          </Text>
        </View>
      </View>

      <Button
        label="Tuck something"
        onPress={onAction}
        icon="plus"
        size="sm"
        fullWidth
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: screenPadding,
    padding: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  message: {
    lineHeight: 18,
  },
});
