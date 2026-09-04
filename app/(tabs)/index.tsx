import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemCard } from '@/components/cards/ItemCard';
import { CategoryRail } from '@/components/categories/CategoryRail';
import { AddTuckSheet } from '@/components/home/AddTuckSheet';
import { MascotNoteCard, pickNote } from '@/components/home/MascotNote';
import { SummaryStrip } from '@/components/home/SummaryStrip';
import { UpcomingCard } from '@/components/home/UpcomingCard';
import { Mascot } from '@/components/mascot/Mascot';
import { EmptyState } from '@/components/ui/EmptyState';
import { InsetGroup, thumbSeparatorInset } from '@/components/ios/InsetGroup';
import { tabBarClearanceFor } from '@/components/navigation/metrics';
import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import {
  CompactNavBar,
  LargeTitleHeader,
  useLargeTitleTopInset,
} from '@/components/ios/LargeTitleHeader';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { itemsRepo } from '@/db/repositories';
import type { LibraryPulse } from '@/db/repositories/itemsRepository';
import { useItemActions } from '@/hooks/useItemActions';
import { useTheme } from '@/hooks/useTheme';
import { greeting } from '@/lib/datetime';
import { haptics } from '@/lib/haptics';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { selectCounts, selectRevision, useItemsStore } from '@/store/useItemsStore';
import { selectHasOnboarded, useSettingsStore } from '@/store/useSettingsStore';
import { useItemQuery } from '@/hooks/useItemQuery';
import type { SavedItem } from '@/types/models';

const ScrollView = Animated.ScrollView;

/**
 * Home — a personal overview, not a dashboard.
 *
 * The order is deliberate: search first (the fastest way back to something),
 * then what you just saved, then what's coming up, then a way to wander.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const counts = useItemsStore(selectCounts);
  const revision = useItemsStore(selectRevision);
  const categories = useCategoriesStore((state) => state.categories);
  const hasOnboarded = useSettingsStore(selectHasOnboarded);
  const { openDetail } = useItemActions();
  const topInset = useLargeTitleTopInset();

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

  const { items: recent } = useItemQuery({ scope: 'active', sort: 'recent', limit: 5 });
  const upcoming = useUpcoming(revision);
  const pulse = usePulse(revision);

  // What Tuck has to say about the library right now, if anything.
  const note = pulse ? pickNote(pulse, counts.active) : null;

  const handleOpen = useCallback((item: SavedItem) => openDetail(item), [openDetail]);

  const handleCategory = useCallback((id: string | null) => {
    if (id) router.push(`/category/${id}`);
  }, []);

  const handleSurprise = useCallback(() => {
    haptics.medium();
    router.push('/surprise');
  }, []);

  const [addSheetOpen, setAddSheetOpen] = useState(false);

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
      <CompactNavBar title="Tuck" scrollY={scrollY} />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset,
            paddingBottom: tabBarClearanceFor(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Masthead ─────────────────────────────────────────────── */}
        {/*
          An iOS large title, not a coloured panel: "Tuck" is the navigation
          title and the greeting sits beneath it as a subtitle. The mascot is
          a trailing accessory rather than a graphic inside a slab.
        */}
        <LargeTitleHeader
          title="Tuck"
          subtitle={`${greeting()} — what are you tucking away today?`}
          scrollY={scrollY}
          actions={
            note ? null : (
              <Mascot
                pose="idle"
                size={54}
                animate
                idle
                accessibilityLabel="Tuck, your saving companion"
              />
            )
          }
        />

        <View style={styles.searchWrap}>
          <Animated.View entering={FadeInDown.duration(300).delay(60)}>
            <SearchField
              value=""
              onChangeText={() => undefined}
              readOnlyPressTarget={() => router.push('/search')}
              placeholder="Search your tucked things…"
            />
          </Animated.View>
        </View>

        {/* What Tuck noticed. */}
        {note ? (
          <View style={styles.noteWrap}>
            <MascotNoteCard
              note={note}
              onPress={note.href ? () => router.push(note.href as '/saved') : undefined}
            />
          </View>
        ) : null}

        {/* ── The library at a glance ──────────────────────────────── */}
        {isEmpty ? null : (
          <Animated.View
            entering={FadeInDown.duration(300).delay(80)}
            style={styles.summaryWrap}
          >
            <SummaryStrip
              total={counts.active}
              addedThisWeek={pulse?.savedThisWeek ?? 0}
              categories={categories}
              onPressTotal={() => router.push('/saved')}
              onPressCategory={(id) => router.push(`/category/${id}`)}
            />
          </Animated.View>
        )}

        {isEmpty ? (
          <Animated.View entering={FadeIn.duration(360).delay(120)} style={styles.emptyWrap}>
            <EmptyState
              card
              pose="empty"
              title="Nothing tucked away yet."
              message="Save the things you want to come back to — a film, a place, a half-formed idea."
              actionLabel="Tuck something"
              onAction={() => setAddSheetOpen(true)}
              mascotLabel="Tuck sitting beside an empty pouch"
            />
          </Animated.View>
        ) : (
          <>
            {/* ── Recently tucked ────────────────────────────────── */}
            {recent.length > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(300).delay(100)}
                style={styles.section}
              >
                <SectionHeader
                  title="Recently tucked"
                  actionLabel={counts.active > recent.length ? 'See all' : undefined}
                  onAction={() => router.push('/saved')}
                  style={styles.sectionHeader}
                />
                <InsetGroup separatorInset={thumbSeparatorInset}>
                  {recent.map((item) => (
                    <ItemCard key={item.id} item={item} onPress={handleOpen} inset />
                  ))}
                </InsetGroup>
              </Animated.View>
            ) : null}

            {/* ── Coming up ──────────────────────────────────────── */}
            {upcoming.length > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(300).delay(140)}
                style={styles.section}
              >
                <SectionHeader title="Coming up" style={styles.sectionHeader} />
                <InsetGroup separatorInset={spacing.lg + 38 + spacing.md}>
                  {upcoming.map((item) => (
                    <UpcomingCard key={item.id} item={item} onPress={handleOpen} inset />
                  ))}
                </InsetGroup>
              </Animated.View>
            ) : null}

            {/* ── Categories ─────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(300).delay(180)} style={styles.section}>
              <SectionHeader
                title="Categories"
                actionLabel="Browse"
                onAction={() => router.push('/browse')}
                style={styles.sectionHeader}
              />
              <CategoryRail
                categories={categories}
                selectedId={null}
                onSelect={handleCategory}
                includeAll={false}
                hideEmpty
              />
            </Animated.View>

            {/* ── Surprise me ────────────────────────────────────── */}
            {counts.active > 1 ? (
              <Animated.View entering={FadeInDown.duration(300).delay(220)} style={styles.section}>
                <Pressable
                  onPress={handleSurprise}
                  haptic={null}
                  pressScale={0.98}
                  accessibilityRole="button"
                  accessibilityLabel="Surprise me"
                  accessibilityHint="Picks one saved thing at random"
                  style={[
                    styles.surprise,
                    { backgroundColor: theme.colors.accentGlow, borderColor: theme.colors.accentSoft },
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
          </>
        )}
      </ScrollView>

      <AddTuckSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        categories={categories}
        onPick={handlePickCategory}
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

/** The few aggregate numbers behind Tuck's note. One query, refetched on change. */
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
  content: {
    paddingBottom: spacing.huge,
  },
  searchWrap: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xl,
  },
  noteWrap: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xl,
  },
  summaryWrap: {
    marginBottom: spacing.xxl,
  },
  emptyWrap: {
    paddingTop: spacing.lg,
    paddingHorizontal: screenPadding,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    paddingHorizontal: screenPadding,
  },
  stack: {
    paddingHorizontal: screenPadding,
    gap: spacing.sm + 2,
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
