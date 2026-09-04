import { memo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';

export interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  /** Required — icon-only controls must announce themselves. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  size?: number;
  color?: string;
  fill?: string;
  variant?: 'plain' | 'surface' | 'soft';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: 'selection' | 'light' | 'medium' | null;
  accessibilityState?: { selected?: boolean; disabled?: boolean };
}

/** Circular icon control with a guaranteed 44pt tap target. */
export const IconButton = memo(function IconButton({
  name,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  size = 20,
  color,
  fill = 'none',
  variant = 'plain',
  disabled,
  style,
  haptic = 'light',
  accessibilityState,
}: IconButtonProps) {
  const theme = useTheme();

  const background = {
    plain: 'transparent',
    surface: theme.colors.surface,
    soft: theme.colors.surfaceSunken,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      pressScale={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderColor: variant === 'surface' ? theme.colors.border : 'transparent',
          borderWidth: variant === 'surface' ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      <Icon name={name} size={size} color={color ?? theme.colors.textMuted} fill={fill} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
