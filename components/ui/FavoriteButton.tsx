import { memo, useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, radius } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';

import { Icon } from './Icon';
import { Pressable } from './Pressable';

export interface FavoriteButtonProps {
  active: boolean;
  onToggle: () => void;
  size?: number;
  variant?: 'plain' | 'soft';
}

/**
 * The heart. Toggling gives a small pop — a quick overshoot and settle — plus
 * a filled shape, so the state reads without relying on colour.
 */
export const FavoriteButton = memo(function FavoriteButton({
  active,
  onToggle,
  size = 19,
  variant = 'soft',
}: FavoriteButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    if (active) {
      // Pop on activation only — un-favouriting stays quiet.
      scale.value = withSequence(
        withTiming(1.28, { duration: motion.instant }),
        withSpring(1, motion.bounce)
      );
    }
  }, [active, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    onToggle();
  }, [onToggle]);

  return (
    <Pressable
      onPress={handlePress}
      haptic={null}
      pressScale={0.88}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Remove from favourites' : 'Add to favourites'}
      accessibilityState={{ selected: active }}
      style={[
        styles.button,
        variant === 'soft' ? { backgroundColor: theme.colors.surface } : undefined,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <Icon
          name="heart"
          size={size}
          color={active ? theme.colors.favorite : theme.colors.textMuted}
          fill={active ? theme.colors.favorite : 'none'}
          strokeWidth={2.1}
        />
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
