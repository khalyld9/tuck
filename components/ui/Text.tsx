import { memo } from 'react';
import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { typography, type TypographyVariant } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

type ColorRole = 'default' | 'muted' | 'subtle' | 'accent' | 'onAccent' | 'danger' | 'success';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorRole;
  /** Force uppercase — used by overline labels. */
  uppercase?: boolean;
  center?: boolean;
}

/**
 * Typed text primitive. Every string in the app goes through this so the type
 * scale stays consistent and colours always come from tokens.
 */
export const Text = memo(function Text({
  variant = 'body',
  color = 'default',
  uppercase,
  center,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const colorValue = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    subtle: theme.colors.textSubtle,
    accent: theme.colors.accent,
    onAccent: theme.colors.textOnAccent,
    danger: theme.colors.danger,
    success: theme.colors.success,
  }[color];

  return (
    <RNText
      {...rest}
      // Cap system font scaling so large-text users get bigger type without
      // shattering fixed-height cards.
      maxFontSizeMultiplier={rest.maxFontSizeMultiplier ?? 1.6}
      style={[
        typography[variant],
        { color: colorValue },
        uppercase && styles.uppercase,
        center && styles.center,
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  uppercase: { textTransform: 'uppercase' },
  center: { textAlign: 'center' },
});
