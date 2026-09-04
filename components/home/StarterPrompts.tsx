import { memo, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import type { CategoryToneName } from '@/constants/theme';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

interface Prompt {
  categoryId: string;
  label: string;
  icon: string;
  tone: CategoryToneName;
}

/**
 * Three examples of what Tuck is for.
 *
 * Phrased as things rather than instructions, because the point is to answer
 * "what would I even put in here?". Each one opens the Add form with that
 * category chosen, so a suggestion is a starting point rather than a poster.
 */
const PROMPTS: readonly Prompt[] = [
  { categoryId: 'movies', label: 'Something to watch', icon: 'clapperboard', tone: 'plum' },
  { categoryId: 'places', label: 'A place to visit', icon: 'map-pin', tone: 'sage' },
  { categoryId: 'ideas', label: 'An idea to remember', icon: 'lightbulb', tone: 'amber' },
] as const;

export interface StarterPromptsProps {
  onPick: (categoryId: string) => void;
}

export const StarterPrompts = memo(function StarterPrompts({ onPick }: StarterPromptsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      decelerationRate="fast"
    >
      {PROMPTS.map((prompt) => (
        <PromptCard key={prompt.categoryId} prompt={prompt} onPick={onPick} />
      ))}
    </ScrollView>
  );
});

const PromptCard = memo(function PromptCard({
  prompt,
  onPick,
}: {
  prompt: Prompt;
  onPick: (categoryId: string) => void;
}) {
  const theme = useTheme();
  const tone = theme.tones[prompt.tone];

  const handlePress = useCallback(() => onPick(prompt.categoryId), [onPick, prompt.categoryId]);

  return (
    <Pressable
      onPress={handlePress}
      haptic="light"
      pressScale={0.97}
      accessibilityRole="button"
      accessibilityLabel={prompt.label}
      accessibilityHint="Opens the form with this category chosen"
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.glyph, { backgroundColor: tone.bg }]}>
        <Icon name={prompt.icon} size={17} color={tone.fg} strokeWidth={2} />
      </View>
      <Text variant="footnote" numberOfLines={2} style={styles.label}>
        {prompt.label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.sm,
  },
  card: {
    width: 132,
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  glyph: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    lineHeight: 18,
  },
});
