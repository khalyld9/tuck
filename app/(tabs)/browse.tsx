import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { tagsRepo } from '@/db/repositories';
import { useTheme } from '@/hooks/useTheme';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { selectCounts, selectRevision, useItemsStore } from '@/store/useItemsStore';
import type { CategoryWithCount, TagWithCount } from '@/types/models';

/**
 * Browse — categories, collections and tags.
 * A calm index of the library rather than a stats page.
 */
export default function BrowseScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useCategoriesStore((state) => state.categories);
  const counts = useItemsStore(selectCounts);
  const revision = useItemsStore(selectRevision);
  const refreshCategories = useCategoriesStore((state) => state.refresh);

  const [tags, setTags] = useState<TagWithCount[]>([]);

  // Counts change as items are added or archived — keep this view in step.
  useEffect(() => {
    void refreshCategories();
    tagsRepo
      .listTagsWithCounts()
      .then(setTags)
      .catch(() => undefined);
  }, [refreshCategories, revision]);

  const openCategory = useCallback(
    (category: CategoryWithCount) => () => router.push(`/category/${category.id}`),
    []
  );

  const withItems = categories.filter((category) => category.itemCount > 0);
  const empty = categories.filter((category) => category.itemCount === 0);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.massive },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="title1" accessibilityRole="header">
            Browse
          </Text>
          <Text variant="footnote" color="muted">
            Everything, sorted into pockets
          </Text>
        </View>

        {/* ── Collections ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.section}>
          <View style={styles.collections}>
            <CollectionTile
              icon="heart"
              label="Favourites"
              count={counts.favorites}
              tone={{ fg: theme.colors.favorite, bg: theme.tones.rose.bg }}
              onPress={() => router.push('/favorites')}
            />
            <CollectionTile
              icon="archive"
              label="Archive"
              count={counts.archived}
              tone={theme.tones.neutral}
              onPress={() => router.push('/archive')}
            />
          </View>
        </Animated.View>

        {/* ── Categories ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(280).delay(60)} style={styles.section}>
          <SectionHeader title="Categories" style={styles.sectionHeader} />

          <View style={styles.categoryList}>
            {withItems.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onPress={openCategory(category)}
              />
            ))}
          </View>

          {/* Empty categories are still reachable, just de-emphasised. */}
          {empty.length > 0 ? (
            <View style={styles.emptyCategories}>
              <Text variant="label" color="subtle" style={styles.emptyLabel}>
                Nothing here yet
              </Text>
              <View style={styles.emptyChips}>
                {empty.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    icon={category.icon}
                    size="sm"
                    onPress={openCategory(category)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </Animated.View>

        {/* ── Tags ────────────────────────────────────────────────── */}
        {tags.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(280).delay(120)} style={styles.section}>
            <SectionHeader title="Tags" style={styles.sectionHeader} />
            <View style={styles.tagCloud}>
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  icon="hash"
                  count={tag.itemCount}
                  size="sm"
                  onPress={() => router.push({ pathname: '/search', params: { tag: tag.name } })}
                />
              ))}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function CollectionTile({
  icon,
  label,
  count,
  tone,
  onPress,
}: {
  icon: 'heart' | 'archive';
  label: string;
  count: number;
  tone: { fg: string; bg: string };
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      pressScale={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} item${count === 1 ? '' : 's'}`}
      style={[
        styles.tile,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: tone.bg }]}>
        <Icon
          name={icon}
          size={19}
          color={tone.fg}
          strokeWidth={2}
          fill={icon === 'heart' ? tone.fg : 'none'}
        />
      </View>
      <Text variant="headline">{label}</Text>
      <Text variant="label" color="subtle">
        {count} item{count === 1 ? '' : 's'}
      </Text>
    </Pressable>
  );
}

function CategoryRow({
  category,
  onPress,
}: {
  category: CategoryWithCount;
  onPress: () => void;
}) {
  const theme = useTheme();
  const tone = theme.tones[category.tone];

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      pressScale={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category.itemCount} item${
        category.itemCount === 1 ? '' : 's'
      }`}
      style={[
        styles.categoryRow,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={[styles.categoryIcon, { backgroundColor: tone.bg }]}>
        <Icon name={category.icon} size={18} color={tone.fg} strokeWidth={2} />
      </View>

      <Text variant="body" style={styles.categoryName}>
        {category.name}
      </Text>

      <Text variant="footnote" color="subtle">
        {category.itemCount}
      </Text>
      <Icon name="chevron-right" size={17} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.massive,
  },
  header: {
    paddingHorizontal: screenPadding,
    gap: 2,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    paddingHorizontal: screenPadding,
  },
  collections: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
  },
  tile: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryList: {
    paddingHorizontal: screenPadding,
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    flex: 1,
    fontWeight: '500',
  },
  emptyCategories: {
    paddingHorizontal: screenPadding,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  emptyLabel: {
    marginBottom: spacing.xs,
  },
  emptyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm - 2,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm - 2,
    paddingHorizontal: screenPadding,
  },
});
