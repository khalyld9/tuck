import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Tuck — the mascot.
 *
 * Five hand-illustrated poses, used sparingly: the mascot is a companion, not
 * a mascot-driven interface. Each pose has a matching idle motion so it feels
 * alive without ever demanding attention.
 */
export type MascotPose = 'idle' | 'empty' | 'celebrate' | 'searching' | 'tucking';

const SOURCES = {
  idle: require('@/assets/mascot/tuck-idle.png'),
  empty: require('@/assets/mascot/tuck-empty.png'),
  celebrate: require('@/assets/mascot/tuck-celebrate.png'),
  searching: require('@/assets/mascot/tuck-searching.png'),
  tucking: require('@/assets/mascot/tuck-tucking.png'),
} as const;

export interface MascotProps {
  pose?: MascotPose;
  size?: number;
  /** Plays the pose's signature motion once on mount. */
  animate?: boolean;
  /** Gentle continuous breathing/float. */
  idle?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Screen readers describe the mascot only when it carries meaning. */
  accessibilityLabel?: string;
}

export const Mascot = memo(function Mascot({
  pose = 'idle',
  size = 140,
  animate = true,
  idle = true,
  style,
  accessibilityLabel,
}: MascotProps) {
  const scale = useSharedValue(animate ? 0.86 : 1);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(animate ? 0 : 1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      opacity.value = 1;
      translateY.value = 0;
      rotate.value = 0;
      return;
    }

    if (animate) {
      opacity.value = withTiming(1, { duration: motion.base });
      scale.value = withSpring(1, motion.bounce);

      if (pose === 'celebrate') {
        // A little hop.
        translateY.value = withSequence(
          withSpring(-14, { damping: 8, stiffness: 300 }),
          withSpring(0, { damping: 9, stiffness: 220 })
        );
      } else if (pose === 'searching') {
        // Looks left, then right.
        rotate.value = withSequence(
          withTiming(-5, { duration: motion.slow, easing: Easing.inOut(Easing.quad) }),
          withTiming(5, { duration: motion.lazy, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: motion.slow, easing: Easing.inOut(Easing.quad) })
        );
      } else if (pose === 'tucking') {
        rotate.value = withSequence(
          withTiming(3, { duration: motion.base }),
          withSpring(0, motion.bounce)
        );
      }
    } else {
      opacity.value = 1;
      scale.value = 1;
    }

    if (idle) {
      // Slow float, offset so it never syncs with the entrance animation.
      translateY.value = withDelay(
        motion.lazy,
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          false
        )
      );
    }
  }, [animate, idle, opacity, pose, reducedMotion, rotate, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <View
      style={style}
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? 'image' : 'none'}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <Animated.View style={animatedStyle}>
        <Image
          source={SOURCES[pose]}
          style={[styles.image, { width: size, height: size }]}
          contentFit="contain"
          transition={160}
          // The mascot is decorative chrome — keep it out of the memory cache
          // pressure path but instant on repeat views.
          cachePolicy="memory-disk"
          accessible={false}
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
  },
});
