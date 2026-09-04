import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  /** Optional trailing action, e.g. "See all". */
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  actionLabel,
  onAction,
  actionIcon = 'chevron-right',
  style,
}: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, style]}>
      <Text
        variant="title3"
        style={styles.title}
        accessibilityRole="header"
        numberOfLines={1}
      >
        {title}
      </Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          haptic="selection"
          pressScale={0.94}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}, ${title}`}
        >
          <Text variant="footnote" color="accent">
            {actionLabel}
          </Text>
          <Icon name={actionIcon} size={15} color={theme.colors.accent} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    flexShrink: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
  },
});
