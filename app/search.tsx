import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemList } from '@/components/lists/ItemList';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/constants/tokens';
import { useDebounced, useItemQuery } from '@/hooks/useItemQuery';
import { useItemActions } from '@/hooks/useItemActions';
import { tagsRepo } from '@/db/repositories';
import { selectSavedViewMode, useSettingsStore } from '@/store/useSettingsStore';

/**
 * Full-screen search.
 *
 * Runs entirely against the local SQLite haystack, which covers titles, notes,
 * descriptions, tags, category names and domains. No network, no latency.
 */
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tag?: string; q?: string }>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState(params.q ?? '');
  const [tag, setTag] = useState<string | null>(params.tag ?? null);
  const [recentTags, setRecentTags] = useState<string[]>([]);

  const viewMode = useSettingsStore(selectSavedViewMode);
  const debounced = useDebounced(query, 120);
  const { toggleFavorite, archive, openDetail } = useItemActions();

  const { items, loading } = useItemQuery({
    scope: 'active',
    search: debounced,
    tag,
    sort: 'recent',
  });

  useEffect(() => {
    // Skip the autofocus when arriving from a tag tap — the results are the point.
    if (params.tag) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(timer);
  }, [params.tag]);

  useEffect(() => {
    tagsRepo
      .listTagsWithCounts()
      .then((result) => setRecentTags(result.slice(0, 8).map((entry) => entry.name)))
      .catch(() => undefined);
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  const hasQuery = debounced.trim().length > 0 || Boolean(tag);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton
          name="arrow-left"
          onPress={handleBack}
          accessibilityLabel="Close search"
          size={19}
        />
        <SearchField
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search your tucked things…"
          style={styles.field}
        />
      </View>

      {/* Active tag filter */}
      {tag ? (
        <View style={styles.tagRow}>
          <Chip
            label={tag}
            icon="hash"
            selected
            size="sm"
            onPress={() => setTag(null)}
            accessibilityHint="Remove this tag filter"
          />
          <Text variant="label" color="subtle">
            Tap to clear
          </Text>
        </View>
      ) : null}

      {/* Tag suggestions before anything has been typed */}
      {!hasQuery && recentTags.length > 0 ? (
        <View style={styles.suggestions}>
          <Text variant="overline" color="subtle" uppercase style={styles.suggestionsLabel}>
            Jump to a tag
          </Text>
          <View style={styles.tagCloud}>
            {recentTags.map((name) => (
              <Chip key={name} label={name} icon="hash" size="sm" onPress={() => setTag(name)} />
            ))}
          </View>
        </View>
      ) : null}

      <ItemList
        items={hasQuery ? items : []}
        viewMode={viewMode}
        onPressItem={openDetail}
        onFavorite={toggleFavorite}
        onArchive={archive}
        swipeEnabled={viewMode === 'list'}
        ListEmptyComponent={
          hasQuery && !loading ? (
            <EmptyState
              pose="searching"
              title="Nothing found."
              message={`No saved things match "${debounced || tag}".`}
              size="sm"
              mascotLabel="Tuck looking around, confused"
            />
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: screenPadding - spacing.sm,
    paddingBottom: spacing.md,
  },
  field: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.md,
  },
  suggestions: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  suggestionsLabel: {
    marginBottom: spacing.xs,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm - 2,
  },
});
