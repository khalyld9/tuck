import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow, ListSection, ListToggleRow } from '@/components/ios/List';
import {
  CompactNavBar,
  LargeTitleHeader,
  useLargeTitleTopInset,
} from '@/components/ios/LargeTitleHeader';
import { tabBarClearanceFor } from '@/components/navigation/metrics';
import { OptionRow } from '@/components/ui/OptionRow';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { SymbolName } from '@/components/ui/Symbol';
import { screenPadding, spacing } from '@/constants/tokens';
import { resetUserData } from '@/db/database';
import { haptics } from '@/lib/haptics';
import {
  exportBackup,
  importBackupFromFile,
  type DuplicateStrategy,
} from '@/lib/import-export/backup';
import {
  cancelAllReminders,
  getPermissionState,
  requestPermission,
  type PermissionState,
} from '@/lib/notifications/reminders';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { selectCounts, useItemsStore } from '@/store/useItemsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUiStore } from '@/store/useUiStore';
import type { ThemePreference } from '@/types/models';

const THEME_OPTIONS: { value: ThemePreference; label: string; symbol: SymbolName; hint: string }[] =
  [
    {
      value: 'system',
      label: 'Automatic',
      symbol: 'systemTheme',
      hint: 'Follows your device setting',
    },
    { value: 'light', label: 'Light', symbol: 'light', hint: 'Always light' },
    { value: 'dark', label: 'Dark', symbol: 'dark', hint: 'Always dark' },
  ];

const ScrollView = Animated.ScrollView;

/**
 * Settings, built as an iOS grouped list: a large title that collapses into a
 * compact bar, then labelled sections of hairline-separated rows. No hero
 * panel, no cards — the brown appears only as symbol tint and control accent.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useLargeTitleTopInset();

  const settings = useSettingsStore();
  const categories = useCategoriesStore((state) => state.categories);
  const counts = useItemsStore(selectCounts);
  const refreshItems = useItemsStore((state) => state.refresh);
  const clearArchive = useItemsStore((state) => state.clearArchive);
  const showSnackbar = useUiStore((state) => state.showSnackbar);

  const [themeSheet, setThemeSheet] = useState(false);
  const [categorySheet, setCategorySheet] = useState(false);
  const [busy, setBusy] = useState<null | 'export' | 'import'>(null);
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    getPermissionState().then(setPermission).catch(() => undefined);
  }, []);

  const defaultCategory =
    categories.find((category) => category.id === settings.defaultCategoryId) ?? categories[0];

  // ── Notifications ────────────────────────────────────────────────────
  const handleRemindersToggle = useCallback(
    async (value: boolean) => {
      haptics.selection();

      if (value) {
        const result = await requestPermission();
        setPermission(result);
        if (result !== 'granted') {
          await settings.set('remindersEnabled', false);
          showSnackbar({
            message:
              result === 'unsupported'
                ? 'Reminders need the mobile app'
                : 'Allow notifications in your device settings to use reminders',
            tone: 'danger',
          });
          return;
        }
        await settings.set('remindersEnabled', true);
        return;
      }

      // Turning reminders off cancels everything already scheduled, so the
      // switch tells the truth.
      await cancelAllReminders();
      await settings.set('remindersEnabled', false);
      showSnackbar({ message: 'Scheduled reminders cancelled', duration: 2600 });
    },
    [settings, showSnackbar]
  );

  // ── Data ─────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (busy) return;
    setBusy('export');
    haptics.light();

    const result = await exportBackup();
    setBusy(null);

    if (result.ok) {
      showSnackbar({
        message: `Exported ${result.itemCount} item${result.itemCount === 1 ? '' : 's'}`,
        tone: 'success',
      });
    } else {
      showSnackbar({ message: result.reason ?? "Couldn't export", tone: 'danger' });
    }
  }, [busy, showSnackbar]);

  const runImport = useCallback(
    async (strategy: DuplicateStrategy) => {
      setBusy('import');
      const result = await importBackupFromFile(strategy);
      setBusy(null);

      if (!result) return; // cancelled

      if (!result.ok) {
        haptics.error();
        showSnackbar({ message: result.reason ?? "Couldn't import that file", tone: 'danger' });
        return;
      }

      await refreshItems();
      await useCategoriesStore.getState().refresh();
      haptics.success();

      const parts = [
        result.itemsAdded > 0 ? `${result.itemsAdded} added` : null,
        result.itemsUpdated > 0 ? `${result.itemsUpdated} updated` : null,
        result.itemsSkipped > 0 ? `${result.itemsSkipped} already here` : null,
        result.invalidRecords > 0 ? `${result.invalidRecords} skipped` : null,
      ].filter(Boolean);

      showSnackbar({
        message: parts.length > 0 ? parts.join(' · ') : 'Nothing new to import',
        tone: 'success',
        duration: 5000,
      });
    },
    [refreshItems, showSnackbar]
  );

  const handleImport = useCallback(() => {
    if (busy) return;
    haptics.light();

    // Importing never overwrites silently — the user picks what happens to
    // records that already exist.
    Alert.alert(
      'Import a backup',
      'If a saved thing already exists, what should happen?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Keep mine', onPress: () => void runImport('skip') },
        { text: 'Use the file’s', onPress: () => void runImport('replace') },
      ],
      { cancelable: true }
    );
  }, [busy, runImport]);

  const handleClearArchive = useCallback(() => {
    if (counts.archived === 0) {
      showSnackbar({ message: 'The archive is already empty', duration: 2200 });
      return;
    }

    Alert.alert(
      'Clear the archive?',
      `${counts.archived} archived item${
        counts.archived === 1 ? '' : 's'
      } will be permanently deleted. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const removed = await clearArchive();
            haptics.warning();
            showSnackbar({ message: `Cleared ${removed} item${removed === 1 ? '' : 's'}` });
          },
        },
      ]
    );
  }, [clearArchive, counts.archived, showSnackbar]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert(
      'Delete everything?',
      'Every saved thing, tag and custom category will be permanently removed from this device. Export a backup first if you want to keep any of it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => {
            // Two-step confirmation for the only truly irreversible action.
            Alert.alert('Really delete everything?', 'There is no undo for this.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete everything',
                style: 'destructive',
                onPress: async () => {
                  await cancelAllReminders();
                  await resetUserData();
                  await refreshItems();
                  await useCategoriesStore.getState().refresh();
                  haptics.warning();
                  showSnackbar({ message: 'Everything deleted', tone: 'danger' });
                },
              },
            ]);
          },
        },
      ]
    );
  }, [refreshItems, showSnackbar]);

  const version =
    (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';
  const themeLabel = THEME_OPTIONS.find(
    (option) => option.value === settings.themePreference
  )?.label;

  return (
    <Screen>
      <CompactNavBar title="Settings" scrollY={scrollY} />

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
      >
        <LargeTitleHeader title="Settings" scrollY={scrollY} />

        <View style={styles.groups}>
          <ListSection title="Appearance">
            <ListRow
              symbol="appearance"
              label="Appearance"
              value={themeLabel}
              onPress={() => setThemeSheet(true)}
            />
          </ListSection>

          <ListSection title="Preferences">
            <ListToggleRow
              symbol="haptics"
              label="Haptic Feedback"
              description={Platform.OS === 'web' ? 'Not available in the browser' : undefined}
              value={settings.hapticsEnabled}
              onValueChange={(value) => void settings.set('hapticsEnabled', value)}
              disabled={Platform.OS === 'web'}
              accessibilityHint="Small vibrations when you save, favourite or archive"
            />
            <ListRow
              symbol="category"
              label="Default Category"
              value={defaultCategory?.name}
              onPress={() => setCategorySheet(true)}
            />
            <ListToggleRow
              symbol="confirmDelete"
              label="Confirm Before Deleting"
              value={settings.confirmDeletion}
              onValueChange={(value) => void settings.set('confirmDeletion', value)}
              accessibilityHint="Ask for confirmation before permanently deleting an item"
            />
          </ListSection>

          <ListSection
            title="Notifications"
            footer={
              permission === 'denied'
                ? 'Notifications are turned off for Tuck in your device settings.'
                : permission === 'unsupported'
                  ? 'Reminders run on the phone app, not in a browser.'
                  : 'Reminders are scheduled on this device. Nothing is sent to a server.'
            }
          >
            <ListToggleRow
              symbol="bell"
              label="Reminders"
              value={settings.remindersEnabled && permission !== 'denied'}
              onValueChange={(value) => void handleRemindersToggle(value)}
              disabled={permission === 'unsupported'}
              accessibilityHint="Schedule local notifications for items with a reminder"
            />
          </ListSection>

          <ListSection title="Data" footer="Backups are plain JSON files saved to your device.">
            <ListRow
              symbol="export"
              label="Export Data"
              value={`${counts.total} item${counts.total === 1 ? '' : 's'}`}
              onPress={handleExport}
              loading={busy === 'export'}
            />
            <ListRow
              symbol="import"
              label="Import Data"
              onPress={handleImport}
              loading={busy === 'import'}
            />
            <ListRow
              symbol="archive"
              label="Clear Archive"
              value={counts.archived > 0 ? String(counts.archived) : undefined}
              onPress={handleClearArchive}
            />
            <ListRow
              symbol="trash"
              label="Delete All Data"
              destructive
              chevron={false}
              onPress={handleDeleteAll}
            />
          </ListSection>

          <ListSection title="About">
            <ListRow symbol="about" label="About Tuck" onPress={() => router.push('/about')} />
            <ListRow symbol="help" label="Help" onPress={() => router.push('/help')} />
            <ListRow symbol="privacy" label="Privacy" onPress={() => router.push('/privacy')} />
            <ListRow label="Version" value={version} chevron={false} reserveSymbolSlot />
          </ListSection>

          {__DEV__ ? <DevTools /> : null}
        </View>

        <Text variant="footnote" color="subtle" center style={styles.colophon}>
          Tuck keeps your things on your device.
        </Text>
      </ScrollView>

      {/* ── Sheets ───────────────────────────────────────────────── */}
      <Sheet visible={themeSheet} onClose={() => setThemeSheet(false)} title="Appearance">
        {THEME_OPTIONS.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            description={option.hint}
            symbol={option.symbol}
            selected={settings.themePreference === option.value}
            onPress={() => {
              void settings.set('themePreference', option.value);
              setThemeSheet(false);
            }}
          />
        ))}
      </Sheet>

      <Sheet
        visible={categorySheet}
        onClose={() => setCategorySheet(false)}
        title="Default category"
        scrollable
      >
        {categories.map((category) => (
          <OptionRow
            key={category.id}
            label={category.name}
            icon={category.icon}
            selected={settings.defaultCategoryId === category.id}
            onPress={() => {
              void settings.set('defaultCategoryId', category.id);
              setCategorySheet(false);
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

/** Sample-data helper. Only rendered in development builds. */
function DevTools() {
  const refreshItems = useItemsStore((state) => state.refresh);
  const showSnackbar = useUiStore((state) => state.showSnackbar);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      const { seedDemoData } = await import('@/db/seed');
      const result = await seedDemoData();
      await refreshItems();
      await useCategoriesStore.getState().refresh();
      showSnackbar({ message: `Added ${result.created} sample items`, tone: 'success' });
    } catch {
      showSnackbar({ message: "Couldn't add sample data", tone: 'danger' });
    } finally {
      setSeeding(false);
    }
  }, [refreshItems, showSnackbar]);

  return (
    <ListSection title="Development" footer="Only visible in development builds.">
      <ListRow
        symbol="sparkles"
        label="Add sample data"
        description="Twelve realistic saved things"
        onPress={handleSeed}
        loading={seeding}
      />
    </ListSection>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
  },
  groups: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
  colophon: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    paddingHorizontal: screenPadding,
  },
});
