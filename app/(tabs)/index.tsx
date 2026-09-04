import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemCard } from '@/components/cards/ItemCard';
import { CategoryColorCard } from '@/components/categories/CategoryColorCard';
import { AddTuckSheet } from '@/components/home/AddTuckSheet';
import { CategoryActionSheet } from '@/components/categories/CategoryActionSheet';
import { CollectionRow, collectionSeparatorInset } from '@/components/home/CollectionRow';
import { CompactEmpty } from '@/components/home/CompactEmpty';
import { HeaderBanner } from '@/components/home/HeaderBanner';
import { HeroStatCard } from '@/components/home/HeroStatCard';
import { InsightBanner, pickInsight } from '@/components/home/InsightBanner';
import { QuickTuckRail } from '@/components/home/QuickTuckRail';
import { StarterPrompts } from '@/components/home/StarterPrompts';
import { PromoBanner } from '@/components/home/PromoBanner';
import { UpcomingCard } from '@/components/home/UpcomingCard';
import { Mascot } from '@/components/mascot/Mascot';
import { SpeechBubble } from '@/components/mascot/SpeechBubble';
import { InsetGroup, thumbSeparatorInset } from '@/components/ios/InsetGroup';
import { tabBarClearanceFor } from '@/components/navigation/metrics';
import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedPills, type SegmentOption } from '@/components/ui/SegmentedPills';
import { Text } from '@/components/ui/Text';
import { COLLECTIONS, type CollectionDef } from '@/constants/collections';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { itemsRepo } from '@/db/repositories';
import type { LibraryPulse } from '@/db/repositories/itemsRepository';
import { useItemActions } from '@/hooks/useItemActions';
import { useItemQuery } from '@/hooks/useItemQuery';
import { useTheme } from '@/hooks/useTheme';
import { greeting } from '@/lib/datetime';
import { haptics } from '@/lib/haptics';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { selectCounts, selectRevision, useItemsStore } from '@/store/useItemsStore';
import { selectHasOnboarded, useSettingsStore } from '@/store/useSettingsStore';
import type { CategoryWithCount, SavedItem } from '@/types/models';

const ScrollView = Animated.ScrollView;

/** How far the hero card rides up over the banner's lower edge. */
const HERO_OVERLAP = 52;

/** Filters for the category grid. Each one is a real subset of the library. */
const FILTERS: readonly SegmentOption[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'In use' },
  { id: 'empty', label: 'Empty' },
] as const;

/**
 * Home — a coloured masthead over a card-based overview.
 *
 * The banner carries the greeting and search; the hero card straddles its
 * lower edge so the header reads as a layer rather than a stripe. Below it
 * the library is expressed as colour: one saturated card per category, sized
 * by nothing and coloured by identity, so the grid is scannable by hue.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const counts = useItemsStore(selectCounts);
  const revision = useItemsStore(selectRevision);
  const categories = useCategoriesStore((state) => state.categories);
  const refreshCategories = useCategoriesStore((state) => state.refresh);
  const hasOnboarded = useSettingsStore(selectHasOnboarded);
  const { openDetail } = useItemActions();

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Send first-time users to onboarding before they see an empty library.
  useFocusEffect(
    useCallback(() => {
      if (!hasOnboarded) router.replace('/onboarding');
    }, [hasOnboarded])
  );

  const { items: recent } = useItemQuery({ scope: 'active', sort: 'recent', limit: 4 });
  const upcoming = useUpcoming(revision);
  const pulse = usePulse(revision);
  const week = useWeek(revision);
  const categoryCounts = useCategoryCounts(revision);

  // Category totals change as items are added or archived.
  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories, revision]);

  const insight = pickInsight(pulse, counts.active);

  const [filter, setFilter] = useState('all');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<CategoryWithCount | null>(null);

  const visibleCategories = useMemo(() => {
    const sorted = [...categories].sort((a, b) => b.itemCount - a.itemCount);
    if (filter === 'active') return sorted.filter((category) => category.itemCount > 0);
    if (filter === 'empty') return sorted.filter((category) => category.itemCount === 0);
    return sorted;
  }, [categories, filter]);

  const handleOpen = useCallback((item: SavedItem) => openDetail(item), [openDetail]);

  const handleCategory = useCallback((category: CategoryWithCount) => {
    router.push(`/category/${category.id}`);
  }, []);

  const handleCategoryLongPress = useCallback((category: CategoryWithCount) => {
    haptics.medium();
    setActionTarget(category);
  }, []);

  const handleSurprise = useCallback(() => {
    haptics.medium();
    router.push('/surprise');
  }, []);

  /** Quick tuck and the starter prompts both open Add with a category set. */
  const handleQuickTuck = useCallback((categoryId: string) => {
    router.push(`/add?categoryId=${categoryId}`);
  }, []);

  const handleCollection = useCallback((collection: CollectionDef) => {
    router.push(`/collection/${collection.id}`);
  }, []);

  const handlePickCategory = useCallback((categoryId: string | null) => {
    setAddSheetOpen(false);
    // Let the sheet finish dismissing before the form slides up, otherwise
    // the two transitions fight each other.
    setTimeout(() => {
      router.push(categoryId ? `/add?categoryId=${categoryId}` : '/add');
    }, 180);
  }, []);

  const isEmpty = counts.total === 0;

  return (
    <Screen>
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: tabBarClearanceFor(insets.bottom) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Masthead ─────────────────────────────────────────────── */}
        <HeaderBanner overlap={HERO_OVERLAP + spacing.xl}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingCopy}>
              <Text
                variant="title1"
                style={[styles.wordmark, { color: theme.colors.heroText }]}
                accessibilityRole="header"
              >
                Tuck
              </Text>
              <Text variant="callout" style={{ color: theme.colors.heroTextMuted }}>
                {greeting()} — what are you tucking away today?
              </Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <SearchField
              value=""
              onChangeText={() => undefined}
              readOnlyPressTarget={() => router.push('/search')}
              placeholder="Search your tucked things…"
              elevated
            />
          </View>
        </HeaderBanner>

        {/*
          The mascot straddles the banner's edge, and the hero card rides up
          to meet it. Both are pulled out of flow so the section beneath
          starts where the card ends rather than where the banner does.
        */}
        <View style={[styles.overlapZone, { marginTop: -(HERO_OVERLAP + spacing.xl) }]}>
          <Animated.View
            entering={FadeIn.duration(320).delay(80)}
            style={styles.mascotRow}
          >
            <Mascot
              pose="idle"
              size={92}
              animate
              idle
              accessibilityLabel="Tuck, your saving companion"
            />
            <SpeechBubble tail="left" tailOffset={22} style={styles.mascotBubble}>
              Got something to tuck away?
            </SpeechBubble>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(120)}>
            <HeroStatCard
              total={counts.active}
              addedThisWeek={pulse?.savedThisWeek ?? 0}
              week={week}
              onPress={() => router.push('/saved')}
            />
          </Animated.View>
        </View>

        {/* ── Insight ──────────────────────────────────────────────── */}
        {insight ? (
          <Animated.View
            entering={FadeInDown.duration(300).delay(150)}
            style={styles.insightWrap}
          >
            <InsightBanner
              insight={insight}
              onPress={() => router.push(insight.href as '/saved')}
            />
          </Animated.View>
        ) : null}

        {/* ── Quick tuck ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(170)} style={styles.section}>
          <SectionHeader title="Quick tuck" style={styles.sectionHeader} />
          <QuickTuckRail onPick={handleQuickTuck} />
        </Animated.View>

        {/* ── Categories, as colour ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(190)} style={styles.section}>
          <SectionHeader
            title="Your pockets"
            actionLabel="Browse"
            onAction={() => router.push('/browse')}
            style={styles.sectionHeader}
          />

          <View style={styles.pillsWrap}>
            <SegmentedPills options={FILTERS} selectedId={filter} onSelect={setFilter} />
          </View>

          <Text variant="caption" color="subtle" style={styles.gridHint}>
            Press and hold a pocket for quick actions.
          </Text>

          {visibleCategories.length > 0 ? (
            <View style={styles.grid}>
              {visibleCategories.map((category) => (
                <View key={category.id} style={styles.gridCell}>
                  <CategoryColorCard
                    category={category}
                    onPress={handleCategory}
                    onLongPress={handleCategoryLongPress}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Text variant="footnote" color="muted" style={styles.gridEmpty}>
              {filter === 'empty'
                ? 'Every pocket has something in it.'
                : 'Nothing in any pocket yet.'}
            </Text>
          )}
        </Animated.View>

        {/* ── Come back to ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(210)} style={styles.section}>
          <SectionHeader title="Come back to" style={styles.sectionHeader} />
          <Text variant="footnote" color="muted" style={styles.sectionNote}>
            Things waiting for you.
          </Text>
          <InsetGroup separatorInset={collectionSeparatorInset}>
            {COLLECTIONS.map((collection) => (
              <CollectionRow
                key={collection.id}
                collection={collection}
                count={collectionCount(collection, categoryCounts)}
                onPress={handleCollection}
              />
            ))}
          </InsetGroup>
        </Animated.View>

        {/* ── Recently tucked ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(230)} style={styles.section}>
          <SectionHeader
            title="Recently tucked"
            actionLabel={counts.active > recent.length ? 'See all' : undefined}
            onAction={() => router.push('/saved')}
            style={styles.sectionHeader}
          />
          {recent.length > 0 ? (
            <InsetGroup separatorInset={thumbSeparatorInset}>
              {recent.map((item) => (
                <ItemCard key={item.id} item={item} onPress={handleOpen} inset />
              ))}
            </InsetGroup>
          ) : (
            <CompactEmpty onAction={() => setAddSheetOpen(true)} />
          )}
        </Animated.View>

        {/* ── Coming up ────────────────────────────────────────────── */}
        {upcoming.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(300).delay(250)} style={styles.section}>
            <SectionHeader title="Coming up" style={styles.sectionHeader} />
            <InsetGroup separatorInset={spacing.lg + 38 + spacing.md}>
              {upcoming.map((item) => (
                <UpcomingCard key={item.id} item={item} onPress={handleOpen} inset />
              ))}
            </InsetGroup>
          </Animated.View>
        ) : null}

        {/* ── Not sure what to tuck? ───────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(260)} style={styles.section}>
          <SectionHeader title="Not sure what to tuck?" style={styles.sectionHeader} />
          <StarterPrompts onPick={handleQuickTuck} />
        </Animated.View>

        {/* ── Surprise me ──────────────────────────────────────────── */}
        {counts.active > 1 ? (
          <Animated.View entering={FadeInDown.duration(300).delay(270)} style={styles.section}>
            <Pressable
              onPress={handleSurprise}
              haptic={null}
              pressScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Surprise me"
              accessibilityHint="Picks one saved thing at random"
              style={[
                styles.surprise,
                {
                  backgroundColor: theme.colors.accentGlow,
                  borderColor: theme.colors.accentSoft,
                },
              ]}
            >
              <View style={[styles.surpriseIcon, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon name="shuffle" size={19} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <View style={styles.surpriseBody}>
                <Text variant="headline">Surprise me</Text>
                <Text variant="footnote" color="muted">
                  Pull one thing out of the pouch
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={theme.colors.accent} />
            </Pressable>
          </Animated.View>
        ) : null}

        {/* ── Closing panel ────────────────────────────────────────── */}
        <View style={styles.promoWrap}>
          <PromoBanner
            headline={isEmpty ? 'Everything worth remembering' : 'Future you will thank you'}
            supporting={
              isEmpty
                ? 'Films, places, ideas — one pouch, always offline.'
                : 'Every pocket stays on this phone, always offline.'
            }
            actionLabel={isEmpty ? 'Tuck something' : undefined}
            onAction={isEmpty ? () => setAddSheetOpen(true) : undefined}
          />
        </View>
      </ScrollView>

      <AddTuckSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        categories={categories}
        onPick={handlePickCategory}
      />

      <CategoryActionSheet
        category={actionTarget}
        onClose={() => setActionTarget(null)}
      />
    </Screen>
  );
}

/**
 * Upcoming reminders, refetched whenever items change.
 *
 * This is an indexed `reminderAt IS NOT NULL … LIMIT 3` query rather than a
 * client-side filter, so Home costs the same at 20 items or 20,000.
 */
function useUpcoming(revision: number): SavedItem[] {
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    let active = true;
    itemsRepo
      .listUpcomingReminders(3)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  return items;
}

/**
 * Active totals per category, refetched whenever items change.
 *
 * The categories store also holds counts, but it's only refreshed explicitly
 * by the screens that need it; Home reads the numbers directly so a save made
 * elsewhere is reflected the moment you come back.
 */
function useCategoryCounts(revision: number): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    itemsRepo
      .countByCategory()
      .then((next) => {
        if (active) setCounts(next);
      })
      .catch(() => {
        if (active) setCounts({});
      });
    return () => {
      active = false;
    };
  }, [revision]);

  return counts;
}

/** Per-day saves for the last week, driving the hero card's chart. */
function useWeek(revision: number): { day: number; count: number }[] {
  const [week, setWeek] = useState<{ day: number; count: number }[]>([]);

  useEffect(() => {
    let active = true;
    itemsRepo
      .countPerDay(7)
      .then((next) => {
        if (active) setWeek(next);
      })
      .catch(() => {
        if (active) setWeek([]);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  return week;
}

/** Sums a collection's categories from the per-category totals. */
function collectionCount(
  collection: CollectionDef,
  counts: Record<string, number>
): number {
  return collection.categoryIds.reduce((total, id) => total + (counts[id] ?? 0), 0);
}

/** The few aggregate numbers behind the insight banner. */
function usePulse(revision: number): LibraryPulse | null {
  const [pulse, setPulse] = useState<LibraryPulse | null>(null);

  useEffect(() => {
    let active = true;
    itemsRepo
      .getPulse()
      .then((next) => {
        if (active) setPulse(next);
      })
      .catch(() => {
        if (active) setPulse(null);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  return pulse;
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  greetingCopy: {
    flex: 1,
    gap: 2,
  },
  wordmark: {
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -1.1,
  },
  searchWrap: {
    paddingTop: spacing.lg,
  },
  /** Holds the mascot and hero card that overlap the banner's lower edge. */
  overlapZone: {
    paddingHorizontal: screenPadding,
    marginBottom: spacing.xl,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    // Lifts the mascot so it straddles the banner's lower edge rather than
    // sitting neatly inside it — but not so far that it reaches the search
    // field above.
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
  },
  /** The closing panel is full-bleed, so it needs its own top separation. */
  promoWrap: {
    marginTop: spacing.sm,
  },
  mascotBubble: {
    flexShrink: 1,
  },
  insightWrap: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    paddingHorizontal: screenPadding,
  },
  /** Supporting line under a section header, above its content. */
  sectionNote: {
    paddingHorizontal: screenPadding,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  pillsWrap: {
    marginBottom: spacing.md,
  },
  gridHint: {
    paddingHorizontal: screenPadding,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: screenPadding,
    gap: spacing.md,
  },
  /**
   * Two equal columns. `flexGrow` is deliberately off: a lone card on the
   * final row keeps its column width instead of stretching to fill the row.
   */
  gridCell: {
    width: '47.5%',
    flexGrow: 0,
    flexDirection: 'row',
  },
  gridEmpty: {
    paddingHorizontal: screenPadding,
  },
  surprise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: screenPadding,
    padding: spacing.lg - 2,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  surpriseIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surpriseBody: {
    flex: 1,
    gap: 2,
  },
});
