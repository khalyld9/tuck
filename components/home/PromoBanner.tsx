import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Mascot } from '@/components/mascot/Mascot';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface PromoBannerProps {
  headline: string;
  supporting: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * The closing panel.
 *
 * Full-bleed colour with a large white headline, which gives the page a
 * definite end instead of trailing off into background. It states what Tuck
 * is for rather than advertising anything — there is nothing to upsell.
 */
export const PromoBanner = memo(function PromoBanner({
  headline,
  supporting,
  actionLabel,
  onAction,
}: PromoBannerProps) {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={[theme.colors.heroSurfaceAlt, theme.colors.heroSurface]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.banner}
    >
      <View style={styles.copy}>
        <Text
          variant="title2"
          style={[styles.headline, { color: theme.colors.heroText }]}
        >
          {headline}
        </Text>
        <Text
          variant="callout"
          style={[styles.supporting, { color: theme.colors.heroTextMuted }]}
        >
          {supporting}
        </Text>

        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            haptic="light"
            pressScale={0.97}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={[styles.action, { backgroundColor: theme.colors.heroText }]}
          >
            <Text
              variant="footnote"
              style={[styles.actionLabel, { color: theme.colors.heroSurface }]}
            >
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Mascot pose="celebrate" size={92} idle accessibilityLabel="" />
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: screenPadding,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  headline: {
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.6,
  },
  supporting: {
    lineHeight: 20,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  actionLabel: {
    fontWeight: '700',
  },
});
