import { memo, useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { noWebOutline, radius, spacing, typography } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { normalizeTagName } from '@/db/repositories/tagsRepository';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Existing tags offered as quick suggestions. */
  suggestions?: string[];
  max?: number;
}

/**
 * Token-style tag entry. Commas and the return key both commit a tag, and
 * backspace on an empty field removes the last one.
 */
export const TagInput = memo(function TagInput({
  tags,
  onChange,
  suggestions = [],
  max = 8,
}: TagInputProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  const commit = useCallback(
    (raw: string) => {
      const name = normalizeTagName(raw);
      if (name.length === 0) return;
      if (tags.length >= max) return;
      if (tags.some((tag) => tag.toLowerCase() === name.toLowerCase())) {
        setDraft('');
        return;
      }
      haptics.selection();
      onChange([...tags, name]);
      setDraft('');
    },
    [max, onChange, tags]
  );

  const handleChange = useCallback(
    (value: string) => {
      // Typing a comma commits the tag immediately.
      if (value.includes(',')) {
        const [first, ...rest] = value.split(',');
        commit(first ?? '');
        setDraft(rest.join(',').trimStart());
        return;
      }
      setDraft(value);
    },
    [commit]
  );

  const handleKeyPress = useCallback(
    ({ nativeEvent }: { nativeEvent: { key: string } }) => {
      if (nativeEvent.key === 'Backspace' && draft.length === 0 && tags.length > 0) {
        haptics.selection();
        onChange(tags.slice(0, -1));
      }
    },
    [draft.length, onChange, tags]
  );

  const remove = useCallback(
    (tag: string) => () => {
      haptics.selection();
      onChange(tags.filter((existing) => existing !== tag));
    },
    [onChange, tags]
  );

  const unusedSuggestions = suggestions
    .filter((suggestion) => !tags.some((tag) => tag.toLowerCase() === suggestion.toLowerCase()))
    .slice(0, 6);

  return (
    <View style={styles.container}>
      <Text variant="overline" color="subtle" uppercase>
        Tags · optional
      </Text>

      <View
        style={[
          styles.field,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {tags.map((tag) => (
          <Pressable
            key={tag}
            onPress={remove(tag)}
            haptic={null}
            pressScale={0.92}
            accessibilityRole="button"
            accessibilityLabel={`Remove tag ${tag}`}
            style={[styles.token, { backgroundColor: theme.colors.accentSoft }]}
          >
            <Text variant="caption" style={{ color: theme.colors.accent }}>
              {tag}
            </Text>
            <Icon name="x" size={12} color={theme.colors.accent} strokeWidth={2.6} />
          </Pressable>
        ))}

        {tags.length < max ? (
          <TextInput
            value={draft}
            onChangeText={handleChange}
            onKeyPress={handleKeyPress}
            onSubmitEditing={() => commit(draft)}
            onBlur={() => commit(draft)}
            placeholder={tags.length === 0 ? 'Add a tag…' : ''}
            placeholderTextColor={theme.colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            blurOnSubmit={false}
            maxFontSizeMultiplier={1.4}
            accessibilityLabel="Add a tag"
            style={[styles.input, noWebOutline, { color: theme.colors.text }]}
          />
        ) : null}
      </View>

      {unusedSuggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {unusedSuggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => commit(suggestion)}
              haptic={null}
              pressScale={0.94}
              accessibilityRole="button"
              accessibilityLabel={`Add tag ${suggestion}`}
              style={[styles.suggestion, { borderColor: theme.colors.border }]}
            >
              <Icon name="plus" size={11} color={theme.colors.textSubtle} strokeWidth={2.6} />
              <Text variant="label" color="subtle">
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm - 2,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  input: {
    flex: 1,
    minWidth: 110,
    paddingVertical: 4,
    ...typography.body,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
