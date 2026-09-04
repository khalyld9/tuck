import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface HeaderBannerProps {
  children: ReactNode;
  /**
   * Extra space at the foot of the banner for content that overlaps its lower
   * edge — the mascot, and the hero card that sits half on, half off.
   */
  overlap?: number;
}

/**
 * The coloured masthead.
 *
 * A saturated brand block rather than the page background, with its bottom
 * corners rounded so the content below reads as a tray sliding underneath it.
 * The gradient is a two-stop shift within the same hue — deep to slightly
 * deeper — which gives the block dimension without turning into the rainbow
 * wash the brief warns against elsewhere.
 *
 * It owns the top safe-area inset, so whatever contains it must not add one.
 */
export const HeaderBanner = memo(function HeaderBanner({
  children,
  overlap = 0,
}: HeaderBannerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[theme.colors.heroSurfaceAlt, theme.colors.heroSurface]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[
        styles.banner,
        {
          paddingTop: insets.top + spacing.sm,
          paddingBottom: overlap,
        },
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  banner: {
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  inner: {
    paddingHorizontal: screenPadding,
  },
});
