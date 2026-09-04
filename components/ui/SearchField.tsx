import { forwardRef, memo, useCallback, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion, noWebOutline, radius, spacing, typography } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';

import { Icon } from './Icon';
import { Pressable } from './Pressable';

export interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Renders as a non-editable button that navigates elsewhere on tap. */
  readOnlyPressTarget?: () => void;
}

/**
 * Search input. The border warms up on focus (a 160ms tint, no layout shift)
 * so the field feels responsive without drawing attention when idle.
 */
export const SearchField = memo(
  forwardRef<TextInput, SearchFieldProps>(function SearchField(
    { value, onChangeText, placeholder = 'Search your tucked things…', onSubmit, autoFocus, style, readOnlyPressTarget },
    ref
  ) {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);
    const focus = useSharedValue(0);

    const handleFocus = useCallback(() => {
      setFocused(true);
      focus.value = withTiming(1, { duration: motion.fast });
    }, [focus]);

    const handleBlur = useCallback(() => {
      setFocused(false);
      focus.value = withTiming(0, { duration: motion.fast });
    }, [focus]);

    const handleClear = useCallback(() => {
      haptics.selection();
      onChangeText('');
    }, [onChangeText]);

    const animatedStyle = useAnimatedStyle(() => ({
      borderColor: focus.value > 0.5 ? theme.colors.accent : theme.colors.border,
      opacity: 1,
    }));

    const body = (
      <>
        <Icon
          name="search"
          size={18}
          color={focused ? theme.colors.accent : theme.colors.textSubtle}
          strokeWidth={2.1}
        />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSubtle}
          autoFocus={autoFocus}
          editable={!readOnlyPressTarget}
          pointerEvents={readOnlyPressTarget ? 'none' : 'auto'}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          maxFontSizeMultiplier={1.4}
          accessibilityLabel={placeholder}
          accessibilityRole="search"
          style={[styles.input, noWebOutline, { color: theme.colors.text }]}
        />
        {value.length > 0 && !readOnlyPressTarget ? (
          <Pressable
            onPress={handleClear}
            haptic={null}
            pressScale={0.86}
            hitSlop={10}
            style={styles.clear}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Icon name="x" size={15} color={theme.colors.textMuted} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </>
    );

    if (readOnlyPressTarget) {
      return (
        <Pressable
          onPress={readOnlyPressTarget}
          haptic="selection"
          pressScale={0.985}
          accessibilityRole="search"
          accessibilityLabel={placeholder}
          style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, style]}
        >
          {body}
        </Pressable>
      );
    }

    return (
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: theme.colors.surface },
          animatedStyle,
          style,
        ]}
      >
        {body}
      </Animated.View>
    );
  })
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.lg - 2,
    height: 50,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    padding: 0,
    ...typography.body,
  },
  clear: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
