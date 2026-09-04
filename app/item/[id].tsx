import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Pressable } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useItemActions } from '@/hooks/useItemActions';
import { useTheme } from '@/hooks/useTheme';
import { formatDateTime, formatFullDate, isPast, relativeTime } from '@/lib/datetime';
import { haptics } from '@/lib/haptics';
import { getDomain, normalizeUrl } from '@/lib/url';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { useItemsStore } from '@/store/useItemsStore';
import { useUiStore } from '@/store/useUiStore';

/**
 * Item detail. A reading view first, with actions kept to a quiet row.
 */
export default function ItemDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const item = useItemsStore((state) => (id ? state.byId[id] : undefined));
  const resolveCategory = useCategoriesStore((state) => state.resolve);
  const setReminder = useItemsStore((state) => state.setReminder);
  const showSnackbar = useUiStore((state) => state.showSnackbar);

  const { toggleFavorite, archive, restore, deleteItem, share, openEdit } = useItemActions();

  const category = resolveCategory(item?.categoryId);
  const tone = theme.tones[category.tone];
  const domain = getDomain(item?.url);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  const handleOpenLink = useCallback(async () => {
    const target = normalizeUrl(item?.url);
    if (!target) return;
    haptics.light();

    try {
      // In-app browser on native keeps the user in context; web opens a tab.
      if (Platform.OS === 'web') {
        await Linking.openURL(target);
      } else {
        await WebBrowser.openBrowserAsync(target, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          controlsColor: theme.colors.accent,
          toolbarColor: theme.colors.surface,
        });
      }
    } catch {
      showSnackbar({ message: "Couldn't open that link", tone: 'danger' });
    }
  }, [item?.url, showSnackbar, theme.colors.accent, theme.colors.surface]);

  const handleClearReminder = useCallback(async () => {
    if (!item) return;
    haptics.selection();
    await setReminder(item.id, null);
    showSnackbar({ message: 'Reminder cleared', duration: 2200 });
  }, [item, setReminder, showSnackbar]);

  const handleDelete = useCallback(async () => {
    if (!item) return;
    // Leave the screen first so the user isn't looking at a deleted record.
    handleBack();
    await deleteItem(item);
  }, [deleteItem, handleBack, item]);

  const handleArchiveToggle = useCallback(async () => {
    if (!item) return;
    if (item.isArchived) {
      await restore(item);
    } else {
      handleBack();
      await archive(item);
    }
  }, [archive, handleBack, item, restore]);

  const dates = useMemo(() => {
    if (!item) return null;
    const edited = item.updatedAt - item.createdAt > 60_000;
    return {
      added: formatFullDate(item.createdAt),
      addedRelative: relativeTime(item.createdAt),
      edited: edited ? relativeTime(item.updatedAt) : null,
    };
  }, [item]);

  if (!item) {
    return (
      <Screen edgeTop>
        <View style={styles.missing}>
          <Text variant="title3" center>
            This one's gone.
          </Text>
          <Text variant="callout" color="muted" center>
            It may have been deleted.
          </Text>
          <Button label="Back" onPress={handleBack} variant="secondary" />
        </View>
      </Screen>
    );
  }

  const overdue = isPast(item.reminderAt);

  return (
    <Screen>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton
          name="arrow-left"
          onPress={handleBack}
          accessibilityLabel="Go back"
          variant="soft"
          size={19}
        />
        <View style={styles.topActions}>
          <FavoriteButton
            active={item.isFavorite}
            onToggle={() => void toggleFavorite(item)}
          />
          <IconButton
            name="share-2"
            onPress={() => void share(item)}
            accessibilityLabel="Share this item"
            variant="soft"
            size={18}
          />
          <IconButton
            name="pencil"
            onPress={() => openEdit(item)}
            accessibilityLabel="Edit this item"
            variant="soft"
            size={18}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Thumbnail ─────────────────────────────────────────── */}
        {item.imageUri ? (
          <Animated.View entering={FadeIn.duration(280)} style={styles.heroWrap}>
            <Image
              source={{ uri: item.imageUri }}
              style={[styles.hero, { backgroundColor: theme.colors.surfaceSunken }]}
              contentFit="cover"
              transition={200}
              accessible
              accessibilityLabel={`Image for ${item.title}`}
            />
          </Animated.View>
        ) : null}

        {/* ── Title block ───────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.titleBlock}>
          <Chip
            label={category.name}
            icon={category.icon}
            tone={tone}
            selected
            size="sm"
            onPress={() => router.push(`/category/${category.id}`)}
            accessibilityHint={`View everything in ${category.name}`}
            style={styles.categoryChip}
          />

          <Text variant="title1" style={styles.title} accessibilityRole="header">
            {item.title}
          </Text>

          {domain ? (
            <Pressable
              onPress={handleOpenLink}
              haptic={null}
              pressScale={0.97}
              style={styles.domainRow}
              accessibilityRole="link"
              accessibilityLabel={`Open ${domain}`}
              accessibilityHint="Opens the link in your browser"
            >
              <Icon name="link" size={14} color={theme.colors.accent} strokeWidth={2.2} />
              <Text variant="footnote" color="accent" numberOfLines={1} style={styles.domain}>
                {domain}
              </Text>
              <Icon name="square-arrow-out-up-right" size={13} color={theme.colors.accent} />
            </Pressable>
          ) : null}
        </Animated.View>

        {/* ── Open action ───────────────────────────────────────── */}
        {item.url ? (
          <Animated.View entering={FadeInDown.duration(300).delay(40)} style={styles.block}>
            <Button label="Open" onPress={handleOpenLink} icon="external-link" fullWidth />
          </Animated.View>
        ) : null}

        {/* ── Notes ─────────────────────────────────────────────── */}
        {item.notes ? (
          <Animated.View entering={FadeInDown.duration(300).delay(80)} style={styles.block}>
            <Text variant="overline" color="subtle" uppercase style={styles.blockLabel}>
              Notes
            </Text>
            <View
              style={[
                styles.notes,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Text variant="body" style={styles.notesText}>
                {item.notes}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Description (from an import or share) ─────────────── */}
        {item.description ? (
          <Animated.View entering={FadeInDown.duration(300).delay(90)} style={styles.block}>
            <Text variant="overline" color="subtle" uppercase style={styles.blockLabel}>
              Description
            </Text>
            <Text variant="body" color="muted">
              {item.description}
            </Text>
          </Animated.View>
        ) : null}

        {/* ── Tags ──────────────────────────────────────────────── */}
        {item.tags.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(300).delay(120)} style={styles.block}>
            <Text variant="overline" color="subtle" uppercase style={styles.blockLabel}>
              Tags
            </Text>
            <View style={styles.tags}>
              {item.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  icon="hash"
                  size="sm"
                  onPress={() => router.push({ pathname: '/search', params: { tag } })}
                />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Reminder ──────────────────────────────────────────── */}
        {item.reminderAt ? (
          <Animated.View entering={FadeInDown.duration(300).delay(150)} style={styles.block}>
            <Text variant="overline" color="subtle" uppercase style={styles.blockLabel}>
              Reminder
            </Text>
            <View
              style={[
                styles.reminder,
                {
                  backgroundColor: overdue ? theme.colors.dangerSoft : theme.colors.reminderSoft,
                  borderColor: overdue ? theme.colors.danger : theme.colors.reminder,
                },
              ]}
            >
              <Icon
                name={overdue ? 'circle-alert' : 'bell-ring'}
                size={17}
                color={overdue ? theme.colors.danger : theme.colors.reminder}
                strokeWidth={2.2}
              />
              <View style={styles.reminderBody}>
                <Text
                  variant="footnote"
                  style={{
                    color: overdue ? theme.colors.danger : theme.colors.reminder,
                    fontWeight: '600',
                  }}
                >
                  {overdue ? 'This one slipped past' : formatDateTime(item.reminderAt)}
                </Text>
                {overdue ? (
                  <Text variant="caption" color="muted">
                    {formatDateTime(item.reminderAt)}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={handleClearReminder}
                haptic={null}
                pressScale={0.94}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear this reminder"
              >
                <Icon name="x" size={16} color={theme.colors.textMuted} strokeWidth={2.4} />
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Meta ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(180)} style={styles.block}>
          <View style={[styles.metaCard, { borderColor: theme.colors.border }]}>
            <MetaRow label="Tucked" value={`${dates?.addedRelative} · ${dates?.added}`} />
            {dates?.edited ? <MetaRow label="Updated" value={dates.edited} /> : null}
            {item.isArchived ? <MetaRow label="Status" value="Archived" /> : null}
          </View>
        </Animated.View>

        {/* ── Destructive / lifecycle actions ───────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(210)} style={styles.footerActions}>
          <Button
            label={item.isArchived ? 'Restore to library' : 'Archive'}
            onPress={handleArchiveToggle}
            variant="secondary"
            icon={item.isArchived ? 'archive-restore' : 'archive'}
            fullWidth
          />
          <Button
            label="Delete"
            onPress={handleDelete}
            variant="danger"
            icon="trash-2"
            fullWidth
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text variant="footnote" color="subtle">
        {label}
      </Text>
      <Text variant="footnote" color="muted" style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding - spacing.sm,
    paddingBottom: spacing.sm,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  content: {
    paddingHorizontal: screenPadding,
  },
  heroWrap: {
    marginBottom: spacing.xl,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.lg,
  },
  titleBlock: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
  title: {
    marginTop: spacing.xs,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  domain: {
    maxWidth: 250,
  },
  block: {
    marginBottom: spacing.xl,
  },
  blockLabel: {
    marginBottom: spacing.sm,
  },
  notes: {
    padding: spacing.lg - 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notesText: {
    lineHeight: 23,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm - 2,
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reminderBody: {
    flex: 1,
    gap: 2,
  },
  metaCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.md - 2,
  },
  metaValue: {
    flexShrink: 1,
  },
  footerActions: {
    gap: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
});
