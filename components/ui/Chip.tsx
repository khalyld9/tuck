import { memo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/tokens';
import type { CategoryTone } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  icon?: IconName | string;
  /** Trailing count, e.g. a category's item total. */
  count?: number;
  /** Explicit colours override the default surface treatment. */
  tone?: CategoryTone;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/**
 * Pill control used for categories, tags and filters.
 * Selection is signalled by fill *and* a check-style weight change — never by
 * colour alone.
 */
export const Chip = memo(function Chip({
  label,
  onPress,
  selected = false,
  icon,
  count,
  tone,
  size = 'md',
  style,
  accessibilityHint,
}: ChipProps) {
  const theme = useTheme();

  const background = selected
    ? (tone?.bg ?? theme.colors.accentSoft)
    : theme.colors.surfaceSunken;
  // Icons and the border can use the lighter hue; the label uses `ink`, the
  // AA-safe variant, because it sits on the tonal fill as text.
  const foreground = selected
    ? (tone?.fg ?? theme.colors.accent)
    : theme.colors.textMuted;
  const labelColor = selected
    ? (tone?.ink ?? tone?.fg ?? theme.colors.accent)
    : theme.colors.textMuted;
  const borderColor = selected
    ? (tone?.fg ?? theme.colors.accent)
    : theme.colors.border;

  const sizing =
    size === 'sm'
      ? { paddingV: 6, paddingH: spacing.md, gap: 5, icon: 13 }
      : { paddingV: spacing.sm + 1, paddingH: spacing.lg - 2, gap: spacing.xs + 2, icon: 15 };

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      haptic="selection"
      pressScale={0.95}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={count !== undefined ? `${label}, ${count} items` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderColor,
          // The selected state also thickens the border so it reads without colour.
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          paddingVertical: sizing.paddingV,
          paddingHorizontal: sizing.paddingH,
          gap: sizing.gap,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={sizing.icon} color={foreground} strokeWidth={2} /> : null}
      <Text
        variant={size === 'sm' ? 'caption' : 'footnote'}
        style={[{ color: labelColor }, selected && styles.selectedLabel]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined ? (
        <Text variant="caption" style={{ color: labelColor, opacity: 0.7 }}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  selectedLabel: {
    fontWeight: '700',
  },
});
