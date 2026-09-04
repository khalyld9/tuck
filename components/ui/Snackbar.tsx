import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { elevation, motion, radius, spacing } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
import { useUiStore } from '@/store/useUiStore';

import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

/**
 * Global snackbar. Mounted once at the root so any screen — including ones
 * that unmount right after acting, like a delete — can still show feedback
 * and an Undo affordance.
 */
export function Snackbar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const snack = useUiStore((state) => state.snackbar);
  const dismiss = useUiStore((state) => state.dismissSnackbar);
  const reducedMotion = useReducedMotion();

  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!snack) {
      opacity.value = withTiming(0, { duration: motion.fast });
      translateY.value = withTiming(120, { duration: motion.fast });
      return;
    }

    const duration = reducedMotion ? 0 : motion.base;
    opacity.value = withTiming(1, { duration });
    translateY.value = withTiming(0, {
      duration,
      easing: Easing.out(Easing.cubic),
    });

    // Auto-dismiss, animating out first so it never disappears abruptly.
    opacity.value = withDelay(
      snack.duration,
      withTiming(0, { duration: motion.base }, (finished) => {
        if (finished) runOnJS(dismiss)();
      })
    );
    translateY.value = withDelay(snack.duration, withTiming(120, { duration: motion.base }));
  }, [dismiss, opacity, reducedMotion, snack, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!snack) return null;

  const accent =
    snack.tone === 'danger'
      ? theme.colors.danger
      : snack.tone === 'success'
        ? theme.colors.success
        : theme.colors.accent;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { paddingBottom: insets.bottom + spacing.md },
        animatedStyle,
      ]}
    >
      <View
        accessibilityLiveRegion="polite"
        accessible
        accessibilityLabel={snack.message}
        style={[
          styles.bar,
          {
            backgroundColor: theme.dark ? theme.colors.surfaceElevated : theme.colors.text,
            borderColor: theme.colors.border,
          },
          elevation(3, theme.colors.shadow, theme.dark),
        ]}
      >
        {snack.tone !== 'default' ? (
          <Icon
            name={snack.tone === 'success' ? 'check' : 'circle-alert'}
            size={17}
            color={accent}
            strokeWidth={2.4}
          />
        ) : null}

        <Text
          variant="callout"
          numberOfLines={2}
          style={[styles.message, { color: theme.dark ? theme.colors.text : theme.colors.background }]}
        >
          {snack.message}
        </Text>

        {snack.action ? (
          <Pressable
            onPress={() => {
              void snack.action?.onPress();
              dismiss();
            }}
            haptic="light"
            pressScale={0.94}
            hitSlop={8}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={snack.action.label}
          >
            <Text variant="footnote" style={{ color: accent, fontWeight: '700' }}>
              {snack.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  message: {
    flex: 1,
  },
  action: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
});
