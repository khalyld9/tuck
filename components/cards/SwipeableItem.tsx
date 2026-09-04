import { memo, useCallback, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { cardMetrics, motion, spacing } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

/** Distance the row must travel before an action commits. */
const COMMIT_THRESHOLD = 96;
/** Cap so the row can't be dragged off-screen. */
const MAX_TRANSLATION = 132;

export interface SwipeableItemProps {
  children: ReactNode;
  /** Swipe right → favourite. */
  onFavorite?: () => void;
  /** Swipe left → archive (or restore, in the Archive screen). */
  onArchive?: () => void;
  isFavorite?: boolean;
  archiveLabel?: string;
  archiveIcon?: IconName;
  enabled?: boolean;
}

/**
 * Swipe actions.
 *
 * Deliberately conservative: the row must travel ~96pt before anything
 * commits, actions fire on release rather than on crossing, and neither
 * direction is destructive — archive is reversible and favourite is a toggle.
 * Permanent deletion is never wired to a swipe.
 */
export const SwipeableItem = memo(function SwipeableItem({
  children,
  onFavorite,
  onArchive,
  isFavorite = false,
  archiveLabel = 'Archive',
  archiveIcon = 'archive',
  enabled = true,
}: SwipeableItemProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  const translateX = useSharedValue(0);
  const hasPassedThreshold = useSharedValue(false);

  const triggerHaptic = useCallback(() => haptics.medium(), []);

  const runFavorite = useCallback(() => onFavorite?.(), [onFavorite]);
  const runArchive = useCallback(() => onArchive?.(), [onArchive]);

  const pan = Gesture.Pan()
    .enabled(enabled && (Boolean(onFavorite) || Boolean(onArchive)))
    // Only claim the gesture once it's clearly horizontal, so vertical
    // scrolling in the list always wins.
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      const raw = event.translationX;
      const allowed =
        (raw > 0 && onFavorite) || (raw < 0 && onArchive) ? raw : raw * 0.18;

      // Rubber-band past the cap instead of hard-stopping.
      const clamped =
        Math.sign(allowed) *
        Math.min(Math.abs(allowed), MAX_TRANSLATION + Math.abs(allowed) * 0.08);
      translateX.value = clamped;

      const passed = Math.abs(clamped) >= COMMIT_THRESHOLD;
      if (passed !== hasPassedThreshold.value) {
        hasPassedThreshold.value = passed;
        if (passed) runOnJS(triggerHaptic)();
      }
    })
    .onEnd(() => {
      const travelled = translateX.value;

      if (travelled >= COMMIT_THRESHOLD && onFavorite) {
        runOnJS(runFavorite)();
      } else if (travelled <= -COMMIT_THRESHOLD && onArchive) {
        runOnJS(runArchive)();
      }

      hasPassedThreshold.value = false;
      translateX.value = withSpring(0, motion.sheet);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reducedMotion ? 0 : translateX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Action backdrops sit behind the row and fade in as it moves. */}
      <ActionBackdrop
        translateX={translateX}
        side="left"
        visible={Boolean(onFavorite)}
        color={theme.colors.swipeFavorite}
        icon={isFavorite ? 'heart' : 'heart'}
        label={isFavorite ? 'Unfavourite' : 'Favourite'}
        fillIcon={isFavorite}
      />
      <ActionBackdrop
        translateX={translateX}
        side="right"
        visible={Boolean(onArchive)}
        color={theme.colors.swipeArchive}
        icon={archiveIcon}
        label={archiveLabel}
      />

      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
});

interface ActionBackdropProps {
  translateX: SharedValue<number>;
  side: 'left' | 'right';
  visible: boolean;
  color: string;
  icon: IconName;
  label: string;
  fillIcon?: boolean;
}

function ActionBackdrop({
  translateX,
  side,
  visible,
  color,
  icon,
  label,
  fillIcon,
}: ActionBackdropProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const travelled = side === 'left' ? translateX.value : -translateX.value;
    const progress = Math.max(0, Math.min(1, travelled / COMMIT_THRESHOLD));
    return {
      opacity: progress,
      // The icon grows slightly as the action becomes committable.
      transform: [{ scale: interpolate(progress, [0, 0.7, 1], [0.7, 0.94, 1.06]) }],
    };
  });

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.backdrop,
        { backgroundColor: color },
        side === 'left' ? styles.backdropLeft : styles.backdropRight,
      ]}
    >
      <Animated.View style={[styles.backdropContent, animatedStyle]}>
        <Icon name={icon} size={19} color="#FFFFFF" strokeWidth={2.2} fill={fillIcon ? '#FFFFFF' : 'none'} />
        <Text variant="caption" style={styles.backdropLabel}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: cardMetrics.radius,
    justifyContent: 'center',
  },
  backdropLeft: {
    alignItems: 'flex-start',
    paddingLeft: spacing.xl,
  },
  backdropRight: {
    alignItems: 'flex-end',
    paddingRight: spacing.xl,
  },
  backdropContent: {
    alignItems: 'center',
    gap: 3,
  },
  backdropLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
