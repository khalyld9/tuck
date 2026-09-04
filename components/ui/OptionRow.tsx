import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Symbol, type SymbolName } from './Symbol';
import { Text } from './Text';

export interface OptionRowProps {
  label: string;
  description?: string;
  /** SF Symbol (preferred). */
  symbol?: SymbolName;
  /** Raw icon name — used where the value comes from the database. */
  icon?: IconName | string;
  selected?: boolean;
  onPress: () => void;
  destructive?: boolean;
}

/**
 * Selectable row inside a sheet.
 *
 * Follows the iOS convention of marking the current choice with a trailing
 * checkmark in the accent colour rather than filling the row with a coloured
 * pill — selection is a state, not a button.
 */
export const OptionRow = memo(function OptionRow({
  label,
  description,
  symbol,
  icon,
  selected,
  onPress,
  destructive,
}: OptionRowProps) {
  const theme = useTheme();
  const color = destructive ? theme.colors.danger : theme.colors.text;
  const glyphColor = destructive
    ? theme.colors.danger
    : selected
      ? theme.colors.accent
      : theme.colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      pressScale={1}
      pressedBackgroundColor={theme.colors.surfacePressed}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint={description}
      style={styles.row}
    >
      {symbol ? (
        <View style={styles.glyph}>
          <Symbol name={symbol} size={21} color={glyphColor} />
        </View>
      ) : icon ? (
        <View style={styles.glyph}>
          <Icon name={icon} size={20} color={glyphColor} strokeWidth={1.9} />
        </View>
      ) : null}

      <View style={styles.body}>
        <Text variant="body" style={{ color }} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text variant="footnote" color="subtle" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>

      {selected ? (
        <Symbol name="check" size={17} weight="semibold" color={theme.colors.accent} />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  glyph: {
    width: 28,
    alignItems: 'flex-start',
  },
  body: {
    flex: 1,
    gap: 1,
  },
});
