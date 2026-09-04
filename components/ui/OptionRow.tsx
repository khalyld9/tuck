import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface OptionRowProps {
  label: string;
  description?: string;
  icon?: IconName | string;
  selected?: boolean;
  onPress: () => void;
  destructive?: boolean;
}

/** Selectable row used inside sheets (sort options, theme choice, actions). */
export const OptionRow = memo(function OptionRow({
  label,
  description,
  icon,
  selected,
  onPress,
  destructive,
}: OptionRowProps) {
  const theme = useTheme();
  const color = destructive ? theme.colors.danger : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.985}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint={description}
      style={[
        styles.row,
        selected ? { backgroundColor: theme.colors.accentSoft } : undefined,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={19}
          color={selected ? theme.colors.accent : destructive ? theme.colors.danger : theme.colors.textMuted}
          strokeWidth={2}
        />
      ) : null}

      <View style={styles.body}>
        <Text
          variant="body"
          style={{
            color: selected ? theme.colors.accent : color,
            fontWeight: selected ? '600' : '400',
          }}
        >
          {label}
        </Text>
        {description ? (
          <Text variant="label" color="subtle">
            {description}
          </Text>
        ) : null}
      </View>

      {selected ? (
        <Icon name="check" size={18} color={theme.colors.accent} strokeWidth={2.6} />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    minHeight: 52,
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
