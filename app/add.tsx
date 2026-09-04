import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/forms/CategoryPicker';
import { FormField } from '@/components/forms/FormField';
import { ReminderPicker } from '@/components/forms/ReminderPicker';
import { TagInput } from '@/components/forms/TagInput';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { guessCategoryFromUrl } from '@/constants/categories';
import { screenPadding, spacing } from '@/constants/tokens';
import { tagsRepo } from '@/db/repositories';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { readClipboardUrl } from '@/lib/sharing/share';
import { isLikelyUrl, titleFromUrl } from '@/lib/url';
import { useItemsStore } from '@/store/useItemsStore';
import { selectDefaultCategoryId, useSettingsStore } from '@/store/useSettingsStore';
import { useUiStore } from '@/store/useUiStore';

import { Pressable } from '@/components/ui/Pressable';

/**
 * Add — "Tuck something away".
 *
 * Optimised for speed: the title field is focused on open and a title alone is
 * enough to save. Everything else is optional and can be filled in later.
 */
export default function AddScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    sharedUrl?: string;
    sharedTitle?: string;
    shared?: string;
  }>();

  const defaultCategoryId = useSettingsStore(selectDefaultCategoryId);
  const addItem = useItemsStore((state) => state.add);
  const showSnackbar = useUiStore((state) => state.showSnackbar);

  const titleRef = useRef<TextInput>(null);

  const [title, setTitle] = useState(params.sharedTitle ?? '');
  const [url, setUrl] = useState(params.sharedUrl ?? '');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [reminderAt, setReminderAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // A URL guesses at a category, but only until the user picks one themselves.
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [categoryId, setCategoryId] = useState(
    () => guessCategoryFromUrl(params.sharedUrl) ?? defaultCategoryId
  );

  const isShared = params.shared === '1';

  useEffect(() => {
    // Autofocus the title unless we arrived from a share with one already set.
    if (isShared && params.sharedTitle) return;
    const timer = setTimeout(() => titleRef.current?.focus(), 320);
    return () => clearTimeout(timer);
  }, [isShared, params.sharedTitle]);

  useEffect(() => {
    tagsRepo
      .listTagsWithCounts()
      .then((result) => setSuggestions(result.map((tag) => tag.name)))
      .catch(() => undefined);
  }, []);

  const handleUrlChange = useCallback(
    (value: string) => {
      setUrl(value);
      if (!categoryTouched) {
        const guess = guessCategoryFromUrl(value);
        if (guess) setCategoryId(guess);
      }
    },
    [categoryTouched]
  );

  const handleCategory = useCallback((id: string) => {
    setCategoryTouched(true);
    setCategoryId(id);
  }, []);

  const handlePaste = useCallback(async () => {
    const clipboard = await readClipboardUrl();
    if (!clipboard) {
      showSnackbar({ message: 'No link on the clipboard', duration: 2000 });
      return;
    }
    haptics.selection();
    handleUrlChange(clipboard);
    // Offer a title derived from the link when the field is still empty.
    if (title.trim().length === 0) setTitle(titleFromUrl(clipboard));
  }, [handleUrlChange, showSnackbar, title]);

  const canSave = title.trim().length > 0 || isLikelyUrl(url);

  const handleSave = useCallback(async () => {
    if (saving) return;

    // A link with no title still saves — we derive one locally.
    const resolvedTitle = title.trim() || (isLikelyUrl(url) ? titleFromUrl(url) : '');
    if (resolvedTitle.length === 0) {
      setError('Give it a name so you can find it later.');
      haptics.error();
      titleRef.current?.focus();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await addItem({
        title: resolvedTitle,
        url: url.trim() || null,
        categoryId,
        notes: notes.trim() || null,
        tags,
        reminderAt,
      });

      haptics.success();
      router.dismissTo('/(tabs)');
      // Land the user on the thing they just saved.
      router.push(`/item/${created.id}`);

      showSnackbar({ message: 'Tucked away ✓', tone: 'success', duration: 2600 });
    } catch {
      setSaving(false);
      haptics.error();
      showSnackbar({ message: "Couldn't save that — try again", tone: 'danger' });
    }
  }, [addItem, categoryId, notes, reminderAt, saving, showSnackbar, tags, title, url]);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  const headerTitle = useMemo(() => (isShared ? 'Tuck this away' : 'Tuck something away'), [isShared]);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.headerText}>
            <Text variant="title2" accessibilityRole="header">
              {headerTitle}
            </Text>
            {isShared ? (
              <Text variant="footnote" color="muted">
                Shared from another app
              </Text>
            ) : null}
          </View>
          <IconButton
            name="x"
            onPress={handleClose}
            accessibilityLabel="Close without saving"
            variant="soft"
            size={19}
          />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing.huge }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <FormField
            ref={titleRef}
            label="Title"
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              if (error) setError(null);
            }}
            placeholder="What do you want to remember?"
            returnKeyType="next"
            autoCapitalize="sentences"
            error={error ?? undefined}
            maxLength={200}
          />

          <FormField
            label="Link"
            optional
            value={url}
            onChangeText={handleUrlChange}
            placeholder="Paste a link"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            accessory={
              <Pressable
                onPress={handlePaste}
                haptic={null}
                pressScale={0.94}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Paste link from clipboard"
              >
                <Text variant="caption" color="accent">
                  Paste
                </Text>
              </Pressable>
            }
          />

          <CategoryPicker selectedId={categoryId} onSelect={handleCategory} />

          <FormField
            label="Notes"
            optional
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note…"
            multiline
            maxLength={2000}
          />

          <TagInput tags={tags} onChange={setTags} suggestions={suggestions} />

          <ReminderPicker value={reminderAt} onChange={setReminderAt} />
        </ScrollView>

        {/* Primary action pinned above the keyboard. */}
        <Animated.View
          entering={FadeIn.duration(220)}
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <Button
            label="Tuck it away"
            onPress={handleSave}
            icon="check"
            size="lg"
            fullWidth
            loading={saving}
            disabled={!canSave}
            haptic={null}
            accessibilityHint="Saves this item to your library"
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: 2,
    paddingTop: spacing.xs,
  },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.xl,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
