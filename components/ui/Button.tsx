import { memo, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { minTouchTarget, radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  haptic?: 'selection' | 'light' | 'medium' | null;
  children?: ReactNode;
}

export const Button = memo(function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled,
  loading,
  fullWidth,
  style,
  accessibilityHint,
  haptic = 'light',
}: ButtonProps) {
  const theme = useTheme();

  const palette = {
    primary: {
      background: theme.colors.accent,
      text: theme.colors.textOnAccent,
      border: 'transparent',
    },
    secondary: {
      background: theme.colors.surfaceSunken,
      text: theme.colors.text,
      border: theme.colors.border,
    },
    ghost: {
      background: 'transparent',
      text: theme.colors.textMuted,
      border: 'transparent',
    },
    danger: {
      background: theme.colors.dangerSoft,
      text: theme.colors.danger,
      border: 'transparent',
    },
  }[variant];

  const sizing = {
    sm: { paddingV: spacing.sm, paddingH: spacing.md, gap: spacing.xs, icon: 15, minH: 36 },
    md: { paddingV: spacing.md, paddingH: spacing.lg, gap: spacing.sm, icon: 17, minH: minTouchTarget },
    lg: { paddingV: spacing.lg, paddingH: spacing.xl, gap: spacing.sm, icon: 19, minH: 54 },
  }[size];

  const iconNode = icon ? <Icon name={icon} size={sizing.icon} color={palette.text} /> : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          paddingVertical: sizing.paddingV,
          paddingHorizontal: sizing.paddingH,
          minHeight: sizing.minH,
          gap: sizing.gap,
        },
        fullWidth ? styles.fullWidth : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <View style={[styles.content, { gap: sizing.gap }]}>
          {iconPosition === 'left' ? iconNode : null}
          <Text
            variant={size === 'sm' ? 'footnote' : 'headline'}
            style={{ color: palette.text }}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconPosition === 'right' ? iconNode : null}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
