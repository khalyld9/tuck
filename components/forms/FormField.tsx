import { forwardRef, memo, useCallback, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

type FocusHandler = NonNullable<TextInputProps['onFocus']>;
type BlurHandler = NonNullable<TextInputProps['onBlur']>;

import { noWebOutline, radius, spacing, typography } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

import { Text } from '@/components/ui/Text';

export interface FormFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string;
  /** Marks the field visually and for screen readers. */
  optional?: boolean;
  /** Rendered to the right of the label — e.g. a "Paste" shortcut. */
  accessory?: ReactNode;
  /** Larger multi-line input. */
  multiline?: boolean;
  minHeight?: number;
  error?: string;
  helper?: string;
}

/**
 * Labelled text input used by the Add and Edit forms.
 * Focus is signalled by border weight and colour together.
 */
export const FormField = memo(
  forwardRef<TextInput, FormFieldProps>(function FormField(
    { label, optional, accessory, multiline, minHeight, error, helper, onFocus, onBlur, ...rest },
    ref
  ) {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);

    const handleFocus = useCallback<FocusHandler>(
      (event) => {
        setFocused(true);
        onFocus?.(event);
      },
      [onFocus]
    );

    const handleBlur = useCallback<BlurHandler>(
      (event) => {
        setFocused(false);
        onBlur?.(event);
      },
      [onBlur]
    );

    const borderColor = error
      ? theme.colors.danger
      : focused
        ? theme.colors.accent
        : theme.colors.border;

    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Text variant="overline" color="subtle" uppercase>
            {label}
            {optional ? ' · optional' : ''}
          </Text>
          {accessory}
        </View>

        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={theme.colors.textSubtle}
          maxFontSizeMultiplier={1.4}
          accessibilityLabel={label}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            styles.input,
            noWebOutline,
            {
              backgroundColor: theme.colors.surface,
              borderColor,
              borderWidth: focused || error ? 1.5 : StyleSheet.hairlineWidth,
              color: theme.colors.text,
              minHeight: minHeight ?? (multiline ? 96 : 50),
              paddingTop: multiline ? spacing.md : undefined,
            },
          ]}
        />

        {error ? (
          <Text variant="label" color="danger">
            {error}
          </Text>
        ) : helper ? (
          <Text variant="label" color="subtle">
            {helper}
          </Text>
        ) : null}
      </View>
    );
  })
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 18,
  },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.md,
    ...typography.body,
  },
});
