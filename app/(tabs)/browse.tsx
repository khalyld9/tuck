import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { tabBarClearanceFor } from '@/components/navigation/metrics';
import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { elevation, radius, screenPadding, spacing } from '@/constants/tokens';
import { tagsRepo } from '@/db/repositories';
import type { CategoryTone } from '@/constants/theme';
import { HeroHeader } from '@/components/ui/HeroHeader';
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
          {
            // The hero panel absorbs the top inset itself.
            paddingBottom: tabBarClearanceFor(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* The two collection tiles ride the bottom edge of the panel. */}
        <HeroHeader
          title="Browse"
          subtitle="Everything, sorted into pockets"
          overlap={
            <Animated.View entering={FadeInDown.duration(280)} style={styles.collections}>
            <CollectionTile
              icon="heart"
              label="Favourites"
              count={counts.favorites}
              tone={theme.tones.rose}
              onPress={() => router.push('/favorites')}
            />
            <CollectionTile
              icon="archive"
              label="Archive"
              count={counts.archived}
              tone={theme.tones.neutral}
              onPress={() => router.push('/archive')}
            />
            </Animated.View>
          }
        />

        <View style={styles.afterHero} />

        {/* ── Categories ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(280).delay(60)} style={styles.section}>
          <SectionHeader title="Categories" style={styles.sectionHeader} />

          <View style={styles.categoryGrid}>
            {withItems.map((category) => (
              <CategoryTile
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

/**
 * Favourites and Archive, as tonal blocks.
 *
 * Same treatment as the category tiles below so the whole screen reads as
 * one colour-coded surface rather than two competing card styles.
 */
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
  tone: CategoryTone;
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
      // Lifted, because these float over the hero panel rather than sitting
      // on the page like the category grid below them.
      style={[
        styles.tile,
        { backgroundColor: tone.bg },
        elevation(2, theme.colors.shadow, theme.dark),
      ]}
    >
      <Icon
        name={icon}
        size={20}
        color={tone.fg}
        strokeWidth={2}
        fill={icon === 'heart' ? tone.fg : 'none'}
      />

      <View style={styles.tileText}>
        <Text variant="headline" style={{ color: tone.ink }}>
          {label}
        </Text>
        <Text variant="label" style={{ color: tone.ink, opacity: 0.8 }}>
          {count} item{count === 1 ? '' : 's'}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * A category as a tonal tile.
 *
 * Each category owns a colour, so the grid becomes scannable by hue — you
 * find Food by looking for the pink one, not by reading thirteen labels. The
 * count sits large because it's the useful number; the name labels it.
 */
function CategoryTile({
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
      pressScale={0.96}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category.itemCount} item${
        category.itemCount === 1 ? '' : 's'
      }`}
      style={[styles.categoryTile, { backgroundColor: tone.bg }]}
    >
      <Icon name={category.icon} size={20} color={tone.fg} strokeWidth={2} />

      <View style={styles.categoryTileText}>
        <Text variant="footnote" numberOfLines={1} style={{ color: tone.ink }}>
          {category.name}
        </Text>
        <Text variant="title3" style={{ color: tone.ink }}>
          {category.itemCount}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.massive,
  },
  /** Space between the overlapping collection tiles and the first section. */
  afterHero: {
    height: spacing.xxl,
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
    // Matches the category tiles' internal rhythm: glyph up top, text at the
    // bottom, with the space between doing the work.
    height: 104,
    padding: spacing.md,
    borderRadius: radius.lg,
    justifyContent: 'space-between',
  },
  tileText: {
    gap: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: screenPadding,
    gap: spacing.sm,
  },
  categoryTile: {
    // Three across, sized by percentage so it adapts to any screen width.
    width: '31.6%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  categoryTileText: {
    gap: 1,
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
