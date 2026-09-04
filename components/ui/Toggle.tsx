import { memo, useCallback } from 'react';
import { Platform, Switch, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

/**
 * The app's only switch.
 *
 * Wraps the platform `Switch` so every toggle is brand-coloured rather than
 * iOS green / Android teal, and so the haptic tick is consistent. On web,
 * react-native-web reads `activeThumbColor` instead of `thumbColor` when the
 * switch is on — passing both keeps the knob the same colour everywhere.
 */
export const Toggle = memo(function Toggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
  accessibilityHint,
}: ToggleProps) {
  const theme = useTheme();

  const handleChange = useCallback(
    (next: boolean) => {
      haptics.selection();
      onValueChange(next);
    },
    [onValueChange]
  );

  const knob = theme.dark ? theme.colors.text : theme.colors.surface;

  return (
    <Switch
      value={value}
      onValueChange={handleChange}
      disabled={disabled}
      trackColor={{ false: theme.colors.borderStrong, true: theme.colors.accent }}
      thumbColor={knob}
      // Web-only prop; ignored by the native Switch.
      {...(Platform.OS === 'web' ? { activeThumbColor: knob } : null)}
      ios_backgroundColor={theme.colors.borderStrong}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[styles.switch, disabled ? styles.disabled : undefined]}
    />
  );
});

const styles = StyleSheet.create({
  switch: {
    // Keeps the 51×31 iOS switch from dictating row height on Android/web.
    transform: [{ scaleX: 0.92 }, { scaleY: 0.92 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
