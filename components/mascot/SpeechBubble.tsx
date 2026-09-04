import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { elevation, radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface SpeechBubbleProps {
  children: ReactNode;
  /** Which edge the tail points from, i.e. where the mascot is. */
  tail?: 'left' | 'right' | 'top';
  /**
   * Where a top tail sits along the bubble's width. Side tails are always
   * near the top, level with the mascot's head.
   */
  tailAlign?: 'start' | 'center' | 'end';
  /** Distance from the chosen edge, so the tail can meet the mascot. */
  tailOffset?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A small rounded bubble that reads as the mascot talking.
 *
 * The tail is a rotated square tucked under the bubble body rather than a
 * drawn triangle, so it inherits the same fill and shadow and stays seamless
 * in both themes. Kept deliberately plain — no border, no icon, no dismiss
 * control — because those are the details that would make it read as a
 * notification or a tooltip instead of speech.
 */
export const SpeechBubble = memo(function SpeechBubble({
  children,
  tail = 'left',
  tailAlign = 'center',
  tailOffset,
  style,
}: SpeechBubbleProps) {
  const theme = useTheme();

  const fill = theme.colors.surface;
  const shadow = elevation(1, theme.colors.shadow, theme.dark);

  const tailStyle: ViewStyle =
    tail === 'top'
      ? {
          top: -4,
          ...(tailAlign === 'center'
            ? { alignSelf: 'center' }
            : tailAlign === 'end'
              ? { right: tailOffset ?? 20 }
              : { left: tailOffset ?? 20 }),
        }
      : tail === 'right'
        ? { right: -4, top: tailOffset ?? 18 }
        : { left: -4, top: tailOffset ?? 18 };

  return (
    <View style={style}>
      {/* Tail first, so the bubble body paints over its inner corner. */}
      <View
        style={[styles.tail, tailStyle, { backgroundColor: fill }, shadow]}
        pointerEvents="none"
      />
      <View style={[styles.bubble, { backgroundColor: fill }, shadow]}>
        {typeof children === 'string' ? (
          <Text variant="footnote" style={styles.text}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.md,
  },
  tail: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 2.5,
    transform: [{ rotate: '45deg' }],
  },
  text: {
    lineHeight: 18,
  },
});
