import { memo, useMemo } from 'react';
import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { fontFamily, weightFromNumeric, weightIsInFamily } from '@/constants/fonts';
import { typography, type TypographyVariant } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

type ColorRole = 'default' | 'muted' | 'subtle' | 'accent' | 'onAccent' | 'danger' | 'success';

/** Variants large enough to want the Display cut of SF Pro. */
const DISPLAY_VARIANTS = new Set<TypographyVariant>(['display', 'title1', 'title2']);

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorRole;
  /** Force uppercase — used by overline labels. */
  uppercase?: boolean;
  center?: boolean;
}

/**
 * Typed text primitive. Every string in the app goes through this so the type
 * scale stays consistent, colours always come from tokens, and the correct
 * typeface is resolved per platform (SF Pro on iOS, Inter elsewhere).
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

  // Resolve the typeface from the variant's weight.
  //
  // Where the weight lives in the family name (Inter ships as four separate
  // files, each registered at `normal`), the numeric `fontWeight` must be
  // deleted rather than set to undefined: leaving 700 on an already-bold face
  // makes the engine synthesise a *second* bolding, which smears the glyphs.
  // So the variant style is rebuilt without that key instead of layered over.
  const face = useMemo(() => {
    const { fontWeight, ...rest } = typography[variant];
    const weight = weightFromNumeric(fontWeight);
    const role = DISPLAY_VARIANTS.has(variant) ? 'display' : 'text';
    const family = fontFamily(weight, role);
    return weightIsInFamily
      ? { ...rest, fontFamily: family }
      : { ...rest, fontWeight, fontFamily: family };
  }, [variant]);

  return (
    <RNText
      {...rest}
      // Cap system font scaling so large-text users get bigger type without
      // shattering fixed-height cards.
      maxFontSizeMultiplier={rest.maxFontSizeMultiplier ?? 1.6}
      style={[
        face,
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
