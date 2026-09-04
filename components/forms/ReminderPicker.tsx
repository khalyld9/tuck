import { memo, useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { formatDateTime, REMINDER_PRESETS } from '@/lib/datetime';
import { haptics } from '@/lib/haptics';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

export interface ReminderPickerProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

/**
 * Reminder presets plus a custom option.
 *
 * The presets resolve to real dates at press time (not at render), so
 * "Tomorrow" is always tomorrow relative to when it's tapped.
 */
export const ReminderPicker = memo(function ReminderPicker({
  value,
  onChange,
}: ReminderPickerProps) {
  const theme = useTheme();
  const [showCustom, setShowCustom] = useState(false);

  // Resolve each preset once per render so labels can show the target time.
  const presets = useMemo(
    () =>
      REMINDER_PRESETS.map((preset) => {
        const date = preset.resolve();
        return { ...preset, date, description: preset.describe(date) };
      }),
    []
  );

  const handlePreset = useCallback(
    (timestamp: number) => () => {
      haptics.selection();
      // Tapping the active preset clears it.
      onChange(value === timestamp ? null : timestamp);
      setShowCustom(false);
    },
    [onChange, value]
  );

  const handleClear = useCallback(() => {
    haptics.selection();
    onChange(null);
    setShowCustom(false);
  }, [onChange]);

  const matchesPreset = presets.some((preset) => preset.date.getTime() === value);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text variant="overline" color="subtle" uppercase>
          Remind me · optional
        </Text>
        {value !== null ? (
          <Pressable
            onPress={handleClear}
            haptic={null}
            pressScale={0.94}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear reminder"
          >
            <Text variant="caption" color="accent">
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.grid}>
        {presets.map((preset) => {
          const selected = value === preset.date.getTime();
          return (
            <Pressable
              key={preset.id}
              onPress={handlePreset(preset.date.getTime())}
              haptic={null}
              pressScale={0.96}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${preset.label}, ${formatDateTime(preset.date.getTime())}`}
              style={[
                styles.preset,
                {
                  backgroundColor: selected ? theme.colors.reminderSoft : theme.colors.surface,
                  borderColor: selected ? theme.colors.reminder : theme.colors.border,
                  borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Icon
                name={selected ? 'bell-ring' : 'bell'}
                size={15}
                color={selected ? theme.colors.reminder : theme.colors.textSubtle}
                strokeWidth={2.1}
              />
              <View style={styles.presetText}>
                <Text
                  variant="footnote"
                  style={{
                    color: selected ? theme.colors.reminder : theme.colors.text,
                    fontWeight: selected ? '700' : '500',
                  }}
                >
                  {preset.label}
                </Text>
                <Text variant="label" color="subtle">
                  {preset.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Custom date/time. On native this uses the platform picker; on web the
          native input type="datetime-local" is used instead. */}
      <CustomReminderRow
        value={matchesPreset ? null : value}
        onChange={onChange}
        expanded={showCustom}
        onToggle={() => {
          haptics.selection();
          setShowCustom((previous) => !previous);
        }}
      />
    </View>
  );
});

interface CustomReminderRowProps {
  value: number | null;
  onChange: (value: number | null) => void;
  expanded: boolean;
  onToggle: () => void;
}

function CustomReminderRow({ value, onChange, expanded, onToggle }: CustomReminderRowProps) {
  const theme = useTheme();

  const handleWebChange = useCallback(
    (raw: string) => {
      const parsed = new Date(raw).getTime();
      if (!Number.isNaN(parsed)) onChange(parsed);
    },
    [onChange]
  );

  return (
    <View style={styles.customWrap}>
      <Pressable
        onPress={onToggle}
        haptic={null}
        pressScale={0.98}
        accessibilityRole="button"
        accessibilityLabel="Choose a custom reminder date and time"
        accessibilityState={{ expanded }}
        style={[
          styles.custom,
          {
            backgroundColor: value ? theme.colors.reminderSoft : theme.colors.surface,
            borderColor: value ? theme.colors.reminder : theme.colors.border,
            borderWidth: value ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <Icon
          name="calendar"
          size={15}
          color={value ? theme.colors.reminder : theme.colors.textSubtle}
          strokeWidth={2.1}
        />
        <Text
          variant="footnote"
          style={{ color: value ? theme.colors.reminder : theme.colors.text, flex: 1 }}
        >
          {value ? formatDateTime(value) : 'Pick a date & time'}
        </Text>
        <Icon
          name={expanded ? 'chevron-down' : 'chevron-right'}
          size={16}
          color={theme.colors.textSubtle}
        />
      </Pressable>

      {expanded ? (
        <View
          style={[
            styles.pickerHost,
            { backgroundColor: theme.colors.surfaceSunken, borderColor: theme.colors.border },
          ]}
        >
          <DateTimeControl value={value} onChange={onChange} onWebChange={handleWebChange} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Platform-specific date/time entry, isolated so the native picker dependency
 * never leaks into the rest of the form.
 */
function DateTimeControl({
  value,
  onChange,
  onWebChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
  onWebChange: (raw: string) => void;
}) {
  const theme = useTheme();
  const base = value ? new Date(value) : defaultCustomDate();

  if (Platform.OS === 'web') {
    // react-native-web passes unknown props through to the DOM node, so this
    // renders a real <input type="datetime-local">.
    return (
      <WebDateTimeInput value={base} onChange={onWebChange} color={theme.colors.text} />
    );
  }

  // Native: offer day and hour steppers built from primitives. This keeps the
  // dependency surface small while remaining fully functional offline.
  return <StepperDateTime value={base} onChange={(next) => onChange(next.getTime())} />;
}

function defaultCustomDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

function WebDateTimeInput({
  value,
  onChange,
  color,
}: {
  value: Date;
  onChange: (raw: string) => void;
  color: string;
}) {
  const theme = useTheme();
  const local = toLocalInputValue(value);

  return (
    <input
      type="datetime-local"
      value={local}
      onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
      style={{
        width: '100%',
        padding: 12,
        borderRadius: radius.sm,
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        color,
        fontSize: 15,
        fontFamily: 'inherit',
      }}
      aria-label="Reminder date and time"
    />
  );
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Simple, accessible +/- steppers for date and time on native. */
function StepperDateTime({
  value,
  onChange,
}: {
  value: Date;
  onChange: (value: Date) => void;
}) {
  const theme = useTheme();

  const shift = useCallback(
    (unit: 'day' | 'hour', amount: number) => () => {
      haptics.selection();
      const next = new Date(value);
      if (unit === 'day') next.setDate(next.getDate() + amount);
      else next.setHours(next.getHours() + amount);
      // Never allow a reminder in the past.
      if (next.getTime() <= Date.now()) return;
      onChange(next);
    },
    [onChange, value]
  );

  return (
    <View style={styles.stepperGroup}>
      <StepperRow
        label={value.toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
        onDecrease={shift('day', -1)}
        onIncrease={shift('day', 1)}
        decreaseLabel="Previous day"
        increaseLabel="Next day"
        theme={theme}
      />
      <StepperRow
        label={value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        onDecrease={shift('hour', -1)}
        onIncrease={shift('hour', 1)}
        decreaseLabel="One hour earlier"
        increaseLabel="One hour later"
        theme={theme}
      />
    </View>
  );
}

function StepperRow({
  label,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  theme,
}: {
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.stepperRow}>
      <Pressable
        onPress={onDecrease}
        haptic={null}
        pressScale={0.9}
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
        style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}
      >
        <Text variant="headline" color="muted">
          −
        </Text>
      </Pressable>

      <Text variant="footnote" style={styles.stepperLabel}>
        {label}
      </Text>

      <Pressable
        onPress={onIncrease}
        haptic={null}
        pressScale={0.9}
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}
      >
        <Text variant="headline" color="muted">
          +
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  preset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexGrow: 1,
    flexBasis: '46%',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  presetText: {
    gap: 1,
  },
  customWrap: {
    gap: spacing.sm,
  },
  custom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  pickerHost: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepperGroup: {
    gap: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stepperButton: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  stepperLabel: {
    flex: 1,
    textAlign: 'center',
  },
});
