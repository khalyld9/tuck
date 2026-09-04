import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/ui/Pressable';
import { Symbol } from '@/components/ui/Symbol';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

/**
 * Standard iOS navigation bar for pushed and presented screens.
 *
 * Apple's layout: a centred title with leading and trailing slots of equal
 * width, so the title stays optically centred whatever the buttons contain.
 * Back is a chevron plus a word; a presented sheet gets "Done" instead.
 */
export interface NavBarProps {
  title?: string;
  /** `back` for a pushed screen, `close` for a presented one. */
  leading?: 'back' | 'close' | 'none';
  leadingLabel?: string;
  onLeadingPress?: () => void;
  /** Trailing control, typically a text button. */
  trailing?: ReactNode;
  /** Draws the hairline under the bar. */
  bordered?: boolean;
}

const BAR_HEIGHT = 44;

export function NavBar({
  title,
  leading = 'back',
  leadingLabel = 'Back',
  onLeadingPress,
  trailing,
  bordered = false,
}: NavBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.background,
          borderBottomWidth: bordered ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {leading !== 'none' && onLeadingPress ? (
            <Pressable
              onPress={onLeadingPress}
              pressScale={1}
              pressOpacity={0.45}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={leading === 'back' ? leadingLabel : 'Close'}
              style={styles.leading}
            >
              {leading === 'back' ? (
                <>
                  <Symbol name="back" size={19} weight="semibold" color={theme.colors.accent} />
                  <Text variant="body" style={{ color: theme.colors.accent }} numberOfLines={1}>
                    {leadingLabel}
                  </Text>
                </>
              ) : (
                <Text variant="body" style={{ color: theme.colors.accent }}>
                  Done
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>

        <View style={styles.titleSlot} pointerEvents="none">
          {title ? (
            <Text variant="headline" numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
        </View>

        <View style={[styles.side, styles.sideTrailing]}>{trailing}</View>
      </View>
    </View>
  );
}

export const navBarHeight = BAR_HEIGHT;

const styles = StyleSheet.create({
  bar: {
    width: '100%',
  },
  row: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding - spacing.xs,
  },
  side: {
    // Equal side slots keep the title centred regardless of button width.
    minWidth: 76,
    justifyContent: 'center',
  },
  sideTrailing: {
    alignItems: 'flex-end',
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  titleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
