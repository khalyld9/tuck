import type { ReactNode } from 'react';
import { Modal, Pressable as RNPressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { elevation, motion, radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import { Text } from './Text';

/** Drag distance past which releasing dismisses the sheet. */
const DISMISS_THRESHOLD = 96;
/** Downward flick speed that dismisses regardless of distance. */
const DISMISS_VELOCITY = 900;

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Caps the body height and scrolls it — for long option lists. */
  scrollable?: boolean;
  children: ReactNode;
}

/**
 * iOS-style bottom sheet: grabber, deep top corners, spring presentation and
 * swipe-to-dismiss. Built on the native Modal so it sits above the tab bar
 * and inherits Android's back-button handling.
 */
export function Sheet({ visible, onClose, title, scrollable, children }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const translateY = useSharedValue(0);

  // Dragging the sheet down follows the finger, then either springs back or
  // hands off to the exit animation — the interaction iOS users expect from
  // anything with a grabber.
  const pan = Gesture.Pan()
    .onChange((event) => {
      // Resist upward drags: a sheet doesn't travel above its resting point.
      translateY.value = Math.max(0, translateY.value + event.changeY);
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_THRESHOLD || event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        translateY.value = withTiming(600, { duration: motion.fast }, (finished) => {
          if (finished) {
            translateY.value = 0;
            runOnJS(onClose)();
          }
        });
      } else {
        translateY.value = withSpring(0, { damping: 30, stiffness: 320 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const body = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      onShow={() => {
        translateY.value = 0;
      }}
    >
      <Animated.View
        entering={FadeIn.duration(motion.fast)}
        exiting={FadeOut.duration(motion.fast)}
        style={[styles.scrim, { backgroundColor: theme.colors.scrim }]}
      >
        <RNPressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>

      <View style={styles.host} pointerEvents="box-none">
        <GestureDetector gesture={pan}>
          <Animated.View
            entering={
              reducedMotion
                ? FadeIn.duration(motion.fast)
                : SlideInDown.springify().damping(26).stiffness(260)
            }
            exiting={reducedMotion ? FadeOut.duration(motion.fast) : SlideOutDown.duration(motion.base)}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
              },
              elevation(3, theme.colors.shadow, theme.dark),
              sheetStyle,
            ]}
          >
            {/* The grabber doubles as the drag affordance and the visual cue
                that this panel can be flicked away. */}
            <View
              style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />

            {title ? (
              <Text variant="headline" center style={styles.title} accessibilityRole="header">
                {title}
              </Text>
            ) : null}

            {body}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  host: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    // Modern iOS sheet corners are noticeably deeper than a card's, and the
    // panel carries no border — elevation and the scrim separate it.
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  scroll: {
    maxHeight: 380,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
});
