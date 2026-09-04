import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface HeroHeaderProps {
  title: string;
  subtitle?: string;
  /** Rendered at the top-right of the panel — mascot, action buttons. */
  accessory?: ReactNode;
  /** Rendered inside the panel, below the title row. */
  children?: ReactNode;
  /**
   * Set when the parent scroll container already applies `screenPadding`
   * horizontally. The panel then cancels that gutter so it can still bleed to
   * the screen edges. Defaults to false because most screens here pad their
   * children individually rather than the container.
   */
  insideGutter?: boolean;
  /**
   * Content that hangs off the bottom of the panel and overlaps the screen
   * below it. This is what gives the header depth rather than making it a
   * coloured rectangle.
   */
  overlap?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The masthead used at the top of the primary tabs.
 *
 * This owns the top safe-area inset. Screens using it must NOT add
 * `insets.top` to their scroll container, or the colour stops short of the
 * status bar and the title sits too low.
 *
 * A deep warm slab bleeds up behind the status bar and curves in at the
 * bottom; the first card of the screen sits half on it, half off. That single
 * overlap is what reads as "layered" — without it a coloured header is just a
 * band. The panel extends `screenPadding` past its own corners horizontally
 * so the curve is visible against the page.
 *
 * Safe-area top inset is absorbed here rather than by the scroll view, so the
 * colour runs under the Dynamic Island instead of stopping short of it.
 */
export const HeroHeader = memo(function HeroHeader({
  title,
  subtitle,
  accessory,
  children,
  overlap,
  insideGutter = false,
  style,
}: HeroHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={style}>
      <View
        style={[
          styles.panel,
          insideGutter && styles.panelCancelGutter,
          {
            backgroundColor: theme.colors.heroSurface,
            paddingTop: insets.top + spacing.lg,
            borderBottomLeftRadius: radius.xxl,
            borderBottomRightRadius: radius.xxl,
          },
          // When something overlaps, the panel needs extra bottom padding so
          // its own text isn't crowded by the card sitting on its edge.
          overlap ? styles.panelWithOverlap : styles.panelPlain,
        ]}
      >
        <Animated.View entering={FadeIn.duration(320)} style={styles.row}>
          <View style={styles.titleBlock}>
            <Text
              variant="title1"
              accessibilityRole="header"
              style={{ color: theme.colors.heroText }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text variant="callout" style={{ color: theme.colors.heroTextMuted }}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
        </Animated.View>

        {children ? <View style={styles.children}>{children}</View> : null}
      </View>

      {overlap ? (
        <View style={[styles.overlap, !insideGutter && styles.overlapGutter]}>{overlap}</View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: screenPadding,
  },
  /** Cancels a gutter applied by the parent scroll container. */
  panelCancelGutter: {
    marginHorizontal: -screenPadding,
  },
  panelPlain: {
    paddingBottom: spacing.xxl,
  },
  /**
   * Deep enough that the overlapping card still has panel above and below the
   * point where it crosses the edge. Too shallow and the card looks like it
   * is escaping the header rather than resting on it.
   */
  panelWithOverlap: {
    paddingBottom: spacing.massive + spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xxs,
  },
  accessory: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  children: {
    marginTop: spacing.lg,
  },
  overlap: {
    // Roughly half the card rides on the panel, half on the page.
    marginTop: -spacing.huge,
  },
  overlapGutter: {
    paddingHorizontal: screenPadding,
  },
});
