import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

/**
 * iOS large-title navigation.
 *
 * Apple's pattern, reproduced honestly: the large title sits in the content
 * flow and scrolls away, while a compact bar with the same title fades in
 * behind a hairline once it passes under the status bar. Nothing here is a
 * decorative slab — the background matches the screen, so the title reads as
 * navigation chrome rather than as a coloured header graphic.
 *
 * Pass the scroll offset from an Animated.ScrollView to get the collapse
 * behaviour; omit it and you simply get a static large title.
 */

/** Distance over which the large title hands off to the compact bar. */
const COLLAPSE_DISTANCE = 32;
const COMPACT_BAR_HEIGHT = 44;

export interface LargeTitleHeaderProps {
  title: string;
  /** Optional line under the large title (a greeting, a count). */
  subtitle?: string;
  /** Trailing controls, aligned with the large title's baseline. */
  actions?: ReactNode;
  /** Scroll position driving the collapse. */
  scrollY?: SharedValue<number>;
  /** Content pinned below the title, above the scrolling body (e.g. search). */
  children?: ReactNode;
}

/**
 * The compact bar. Rendered absolutely so it overlays the content, with the
 * material and hairline only appearing once the large title has scrolled up.
 */
export function CompactNavBar({
  title,
  scrollY,
}: {
  title: string;
  scrollY?: SharedValue<number>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 0 };
    return {
      opacity: interpolate(
        scrollY.value,
        [COLLAPSE_DISTANCE * 0.6, COLLAPSE_DISTANCE],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.compactBar,
        {
          paddingTop: insets.top,
          height: insets.top + COMPACT_BAR_HEIGHT,
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.compactInner}>
        <Text variant="headline" numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Animated.View>
  );
}

export function LargeTitleHeader({
  title,
  subtitle,
  actions,
  scrollY,
  children,
}: LargeTitleHeaderProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    // The title fades as it leaves, rather than sliding under the bar — the
    // simpler of Apple's two behaviours and the one that survives a
    // non-native scroll view without jitter.
    return {
      opacity: interpolate(
        scrollY.value,
        [0, COLLAPSE_DISTANCE],
        [1, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <View style={styles.host}>
      <Animated.View style={[styles.titleRow, animatedStyle]}>
        <View style={styles.titleColumn}>
          <Text
            variant="title1"
            style={styles.title}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text variant="callout" color="muted" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </Animated.View>

      {children}
    </View>
  );
}

/** Top padding a scroll view needs so its content clears the status bar. */
export function useLargeTitleTopInset(): number {
  const insets = useSafeAreaInsets();
  return insets.top + spacing.sm;
}

export const compactNavBarHeight = COMPACT_BAR_HEIGHT;

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: screenPadding,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    // Apple's large title sits tight to the content below it and leaves a
    // generous gap above; these numbers mirror UINavigationBar's metrics.
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    // SF Pro's large title is 34pt; our title1 is 32 with tighter tracking,
    // which reads the same at device scale.
    ...Platform.select({
      ios: { fontSize: 34, lineHeight: 41, letterSpacing: -1.1 },
      default: {},
    }),
  },
  subtitle: {
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  compactBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-end',
  },
  compactInner: {
    height: COMPACT_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: screenPadding,
  },
});
