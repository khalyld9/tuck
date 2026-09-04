import { forwardRef, useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useSwipeGate } from '@/components/cards/swipeGate';
import { motion } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while held. 1 disables the scale. */
  pressScale?: number;
  /** Opacity while held. */
  pressOpacity?: number;
  /**
   * Fill painted across the element while held. This is how iOS list rows
   * highlight — the whole row tints rather than shrinking — so grouped rows
   * pass this and set `pressScale` to 1.
   */
  pressedBackgroundColor?: string;
  /** Haptic fired on press-in. `null` disables. */
  haptic?: 'selection' | 'light' | 'medium' | null;
}

/**
 * The app's standard tappable surface: a spring-backed press scale plus
 * optional haptic feedback, with Reduce Motion respected.
 */
export const Pressable = forwardRef<View, PressableProps>(function Pressable(
  {
    style,
    pressScale = 0.97,
    pressOpacity = 1,
    pressedBackgroundColor,
    haptic = 'light',
    onPress,
    onPressIn,
    onPressOut,
    disabled,
    ...rest
  },
  ref
) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const highlight = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  // Null everywhere except inside a swipeable row.
  const swipeGate = useSwipeGate();

  // Swiping a row must not also open it. The gate stays shut for the length
  // of the drag plus a short beat after release.
  const handlePress = useCallback<NonNullable<RNPressableProps['onPress']>>(
    (event) => {
      if (swipeGate?.isBlocked()) return;
      onPress?.(event);
    },
    [onPress, swipeGate]
  );

  const handlePressIn = useCallback<NonNullable<RNPressableProps['onPressIn']>>(
    (event) => {
      if (!disabled) {
        if (!reducedMotion && pressScale !== 1) {
          scale.value = withSpring(pressScale, motion.press);
        }
        if (pressOpacity !== 1) {
          opacity.value = withTiming(pressOpacity, { duration: motion.instant });
        }
        if (pressedBackgroundColor) {
          // Instant on, eased off — matching the way a UITableViewCell
          // snaps to its selected fill and then fades back.
          highlight.value = withTiming(1, { duration: motion.instant });
        }
        // Skip the tick too — a press-in that will be swallowed shouldn't
        // buzz, or a swipe would fire two haptics.
        if (haptic && !swipeGate?.isBlocked()) haptics[haptic]();
      }
      onPressIn?.(event);
    },
    [
      disabled,
      haptic,
      onPressIn,
      opacity,
      pressOpacity,
      pressScale,
      pressedBackgroundColor,
      highlight,
      reducedMotion,
      scale,
      swipeGate,
    ]
  );

  const handlePressOut = useCallback<NonNullable<RNPressableProps['onPressOut']>>(
    (event) => {
      scale.value = withSpring(1, motion.press);
      opacity.value = withTiming(1, { duration: motion.fast });
      highlight.value = withTiming(0, { duration: motion.fast });
      onPressOut?.(event);
    },
    [highlight, onPressOut, opacity, scale]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    // Interpolated rather than toggled: a boolean swap leaves the fill
    // painted if press-out is swallowed (a tap that navigates, say).
    ...(pressedBackgroundColor
      ? {
          backgroundColor: interpolateColor(
            highlight.value,
            [0, 1],
            ['transparent', pressedBackgroundColor]
          ),
        }
      : null),
  }));

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle, disabled && { opacity: 0.45 }]}
      {...rest}
    />
  );
});
