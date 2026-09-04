import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { elevation, motion, radius, screenPadding, spacing } from '@/constants/tokens';
import { itemsRepo } from '@/db/repositories';
import { useItemActions } from '@/hooks/useItemActions';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { getDomain, normalizeUrl } from '@/lib/url';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { useItemsStore } from '@/store/useItemsStore';
import { useUiStore } from '@/store/useUiStore';
import type { SavedItem } from '@/types/models';

/** How long each title flashes past during the shuffle. */
const SHUFFLE_INTERVAL = 110;
const SHUFFLE_STEPS = 9;

/**
 * Surprise Me.
 *
 * Pulls a real random row from SQLite, riffles through a few candidates for
 * the theatre of it, then settles on one. Playful, but over in under a second.
 */
export default function SurpriseScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const resolveCategory = useCategoriesStore((state) => state.resolve);
  const items = useItemsStore((state) => state.byId);
  const showSnackbar = useUiStore((state) => state.showSnackbar);
  const { toggleFavorite, archive } = useItemActions();

  const [phase, setPhase] = useState<'shuffling' | 'revealed' | 'empty'>('shuffling');
  const [displayed, setDisplayed] = useState<SavedItem | null>(null);
  const [result, setResult] = useState<SavedItem | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cardScale = useSharedValue(0.9);
  const cardOpacity = useSharedValue(0);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  const runShuffle = useCallback(async () => {
    clearTimers();
    setPhase('shuffling');
    setResult(null);
    cardOpacity.value = 0;
    cardScale.value = 0.9;

    // Pull real candidates — the animation shows actual saved things.
    const candidates = await itemsRepo.getRandomItems(SHUFFLE_STEPS + 1);

    if (candidates.length === 0) {
      setPhase('empty');
      return;
    }

    const winner = candidates[0] ?? null;

    if (reducedMotion || candidates.length === 1) {
      setDisplayed(winner);
      setResult(winner);
      setPhase('revealed');
      cardOpacity.value = withTiming(1, { duration: motion.base });
      cardScale.value = withSpring(1, motion.enter);
      haptics.success();
      return;
    }

    cardOpacity.value = withTiming(1, { duration: motion.fast });

    // Riffle through the candidates, easing out as it slows to a stop.
    let delay = 0;
    for (let step = 0; step < SHUFFLE_STEPS; step += 1) {
      const candidate = candidates[step % candidates.length] ?? winner;
      delay += SHUFFLE_INTERVAL + step * 16;
      timers.current.push(
        setTimeout(() => {
          setDisplayed(candidate);
          haptics.selection();
        }, delay)
      );
    }

    timers.current.push(
      setTimeout(() => {
        setDisplayed(winner);
        setResult(winner);
        setPhase('revealed');
        cardScale.value = withSequence(
          withTiming(1.05, { duration: motion.fast }),
          withSpring(1, motion.bounce)
        );
        haptics.heavy();
      }, delay + 260)
    );
  }, [cardOpacity, cardScale, clearTimers, reducedMotion]);

  useEffect(() => {
    void runShuffle();
    return clearTimers;
  }, [clearTimers, runShuffle]);

  const handleClose = useCallback(() => {
    clearTimers();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [clearTimers]);

  const handleOpen = useCallback(async () => {
    if (!result) return;
    const target = normalizeUrl(result.url);

    if (!target) {
      // No link — go to the detail screen instead of doing nothing.
      clearTimers();
      router.replace(`/item/${result.id}`);
      return;
    }

    haptics.light();
    try {
      if (Platform.OS === 'web') await Linking.openURL(target);
      else
        await WebBrowser.openBrowserAsync(target, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          controlsColor: theme.colors.accent,
        });
    } catch {
      showSnackbar({ message: "Couldn't open that link", tone: 'danger' });
    }
  }, [clearTimers, result, showSnackbar, theme.colors.accent]);

  const handleArchive = useCallback(async () => {
    if (!result) return;
    handleClose();
    await archive(result);
  }, [archive, handleClose, result]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  // Read the live record so the heart reflects a toggle immediately.
  const live = result ? (items[result.id] ?? result) : null;
  const category = resolveCategory(displayed?.categoryId);
  const tone = theme.tones[category.tone];
  const domain = getDomain(displayed?.url);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.scrim }]}>
      <RNPressable
        style={StyleSheet.absoluteFill}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />

      <View
        style={[styles.host, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        pointerEvents="box-none"
      >
        {phase === 'empty' ? (
          <Animated.View
            entering={FadeIn.duration(motion.base)}
            style={[
              styles.card,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
              elevation(3, theme.colors.shadow, theme.dark),
            ]}
          >
            <EmptyState
              pose="empty"
              title="Nothing to pull out yet."
              message="Save a few things first and Tuck will surprise you."
              size="sm"
              mascotLabel="Tuck beside an empty pouch"
            />
            <Button label="Close" onPress={handleClose} variant="secondary" fullWidth />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(motion.base)}
            exiting={FadeOut.duration(motion.fast)}
            style={[
              styles.card,
              cardStyle,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
              elevation(3, theme.colors.shadow, theme.dark),
            ]}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.eyebrow}>
                <Icon name="shuffle" size={14} color={theme.colors.accent} strokeWidth={2.4} />
                <Text variant="overline" color="accent" uppercase>
                  {phase === 'shuffling' ? 'Rummaging…' : 'How about this'}
                </Text>
              </View>
              <IconButton
                name="x"
                onPress={handleClose}
                accessibilityLabel="Close"
                size={18}
                haptic="light"
              />
            </View>

            <Mascot
              pose={phase === 'revealed' ? 'celebrate' : 'tucking'}
              size={104}
              animate={phase === 'revealed'}
              idle={phase === 'shuffling'}
              style={styles.mascot}
            />

            {/* The item */}
            <View
              style={styles.result}
              accessibilityLiveRegion="polite"
              accessible
              accessibilityLabel={
                phase === 'revealed' && displayed
                  ? `Suggested: ${displayed.title}, ${category.name}`
                  : 'Choosing something at random'
              }
            >
              <Chip
                label={category.name}
                icon={category.icon}
                tone={tone}
                selected
                size="sm"
                style={styles.chip}
              />

              <Text variant="title2" center numberOfLines={3} style={styles.title}>
                {displayed?.title ?? '…'}
              </Text>

              {domain ? (
                <Text variant="footnote" color="subtle" center numberOfLines={1}>
                  {domain}
                </Text>
              ) : null}
            </View>

            {/* Actions — only once a real result has landed. */}
            {phase === 'revealed' && live ? (
              <Animated.View entering={FadeIn.duration(motion.base).delay(80)} style={styles.actions}>
                <Button
                  label={live.url ? 'Open' : 'View'}
                  onPress={handleOpen}
                  icon={live.url ? 'external-link' : 'eye'}
                  fullWidth
                />

                <View style={styles.secondaryRow}>
                  <FavoriteButton
                    active={live.isFavorite}
                    onToggle={() => void toggleFavorite(live)}
                  />
                  <IconButton
                    name="archive"
                    onPress={handleArchive}
                    accessibilityLabel="Archive this item"
                    variant="soft"
                    size={18}
                  />
                  <IconButton
                    name="shuffle"
                    onPress={() => void runShuffle()}
                    accessibilityLabel="Pick something else"
                    variant="soft"
                    size={18}
                  />
                </View>
              </Animated.View>
            ) : (
              <View style={styles.actionsPlaceholder} />
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  host: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenPadding,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: -spacing.sm,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  mascot: {
    alignSelf: 'center',
  },
  result: {
    alignItems: 'center',
    gap: spacing.sm,
    // Fixed height so the card doesn't jump as titles change length.
    minHeight: 132,
    justifyContent: 'center',
  },
  chip: {
    alignSelf: 'center',
  },
  title: {
    paddingHorizontal: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionsPlaceholder: {
    height: 100,
  },
});
