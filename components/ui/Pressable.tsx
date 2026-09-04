import { forwardRef, useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
    haptic = 'light',
    onPressIn,
    onPressOut,
    disabled,
    ...rest
  },
  ref
) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const handlePressIn = useCallback<NonNullable<RNPressableProps['onPressIn']>>(
    (event) => {
      if (!disabled) {
        if (!reducedMotion && pressScale !== 1) {
          scale.value = withSpring(pressScale, motion.press);
        }
        if (pressOpacity !== 1) {
          opacity.value = withTiming(pressOpacity, { duration: motion.instant });
        }
        if (haptic) haptics[haptic]();
      }
      onPressIn?.(event);
    },
    [disabled, haptic, onPressIn, opacity, pressOpacity, pressScale, reducedMotion, scale]
  );

  const handlePressOut = useCallback<NonNullable<RNPressableProps['onPressOut']>>(
    (event) => {
      scale.value = withSpring(1, motion.press);
      opacity.value = withTiming(1, { duration: motion.fast });
      onPressOut?.(event);
    },
    [onPressOut, opacity, scale]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle, disabled && { opacity: 0.45 }]}
      {...rest}
    />
  );
});
