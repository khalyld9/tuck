import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/forms/CategoryPicker';
import { FormField } from '@/components/forms/FormField';
import { ReminderPicker } from '@/components/forms/ReminderPicker';
import { TagInput } from '@/components/forms/TagInput';
import { Button } from '@/components/ui/Button';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/constants/tokens';
import { tagsRepo } from '@/db/repositories';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { useItemsStore } from '@/store/useItemsStore';
import { useUiStore } from '@/store/useUiStore';

/** Edit an existing item. Every change is written straight to SQLite on save. */
export default function EditScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const item = useItemsStore((state) => (id ? state.byId[id] : undefined));
  const updateItem = useItemsStore((state) => state.update);
  const showSnackbar = useUiStore((state) => state.showSnackbar);

  const [title, setTitle] = useState(item?.title ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? 'other');
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [reminderAt, setReminderAt] = useState<number | null>(item?.reminderAt ?? null);
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    tagsRepo
      .listTagsWithCounts()
      .then((result) => setSuggestions(result.map((tag) => tag.name)))
      .catch(() => undefined);
  }, []);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  const handleSave = useCallback(async () => {
    if (!item || saving) return;

    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setError('A title keeps this findable.');
      haptics.error();
      return;
    }

    setSaving(true);
    try {
      await updateItem(item.id, {
        title: trimmed,
        url: url.trim() || null,
        notes: notes.trim() || null,
        categoryId,
        tags,
        // Only touch the reminder when it actually changed, so we don't
        // needlessly cancel and reschedule the OS notification.
        ...(reminderAt !== item.reminderAt ? { reminderAt } : {}),
        isFavorite,
      });

      haptics.success();
      handleClose();
      showSnackbar({ message: 'Changes saved', tone: 'success', duration: 2200 });
    } catch {
      setSaving(false);
      haptics.error();
      showSnackbar({ message: "Couldn't save those changes", tone: 'danger' });
    }
  }, [
    categoryId,
    handleClose,
    isFavorite,
    item,
    notes,
    reminderAt,
    saving,
    showSnackbar,
    tags,
    title,
    updateItem,
    url,
  ]);

  if (!item) {
    return (
      <Screen edgeTop>
        <View style={styles.missing}>
          <Text variant="title3" center>
            This one's gone.
          </Text>
          <Button label="Back" onPress={handleClose} variant="secondary" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text variant="title2" style={styles.headerTitle} accessibilityRole="header">
            Edit
          </Text>

          <View style={styles.headerActions}>
            <FavoriteButton
              active={isFavorite}
              onToggle={() => {
                haptics.medium();
                setIsFavorite((previous) => !previous);
              }}
            />
            <IconButton
              name="x"
              onPress={handleClose}
              accessibilityLabel="Discard changes"
              variant="soft"
              size={19}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing.huge }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <FormField
            label="Title"
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              if (error) setError(null);
            }}
            placeholder="What do you want to remember?"
            error={error ?? undefined}
            maxLength={200}
          />

          <FormField
            label="Link"
            optional
            value={url}
            onChangeText={setUrl}
            placeholder="Paste a link"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <CategoryPicker selectedId={categoryId} onSelect={setCategoryId} />

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

        <View
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
            label="Save changes"
            onPress={handleSave}
            icon="check"
            size="lg"
            fullWidth
            loading={saving}
            haptic={null}
          />
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: -spacing.sm,
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
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
});
