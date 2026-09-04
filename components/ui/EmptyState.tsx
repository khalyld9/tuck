import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { Mascot, type MascotPose } from '@/components/mascot/Mascot';

import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  pose?: MascotPose;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  size?: 'sm' | 'md' | 'lg';
  /** Screen-reader description of the illustration. */
  mascotLabel?: string;
}

/**
 * Empty states. The mascot carries the emotion so the copy can stay short.
 */
export const EmptyState = memo(function EmptyState({
  pose = 'empty',
  title,
  message,
  actionLabel,
  onAction,
  size = 'md',
  mascotLabel,
}: EmptyStateProps) {
  const mascotSize = { sm: 110, md: 158, lg: 196 }[size];

  return (
    <View style={styles.container}>
      <Mascot pose={pose} size={mascotSize} accessibilityLabel={mascotLabel} />

      <View style={styles.copy}>
        <Text variant="title3" center>
          {title}
        </Text>
        {message ? (
          <Text variant="callout" color="muted" center style={styles.message}>
            {message}
          </Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} icon="plus" size="md" />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },
  copy: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  message: {
    maxWidth: 300,
  },
});
