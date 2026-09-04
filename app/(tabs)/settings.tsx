import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { OptionRow } from '@/components/ui/OptionRow';
import { Pressable } from '@/components/ui/Pressable';
import { HeroHeader } from '@/components/ui/HeroHeader';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Toggle } from '@/components/ui/Toggle';
import { Text } from '@/components/ui/Text';
import { radius, screenPadding, spacing, tabBarClearance } from '@/constants/tokens';
import { resetUserData } from '@/db/database';
import { useTheme } from '@/hooks/useTheme';
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

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IconName; hint: string }[] = [
  { value: 'system', label: 'Match device', icon: 'sun-moon', hint: 'Follows your system setting' },
  { value: 'light', label: 'Light', icon: 'sun', hint: 'Always light' },
  { value: 'dark', label: 'Dark', icon: 'moon', hint: 'Always dark' },
];

/**
 * Settings — deliberately short. Preferences, data, and an honest privacy note.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            // The hero panel absorbs the top inset itself.
            paddingBottom: insets.bottom + tabBarClearance + spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HeroHeader insideGutter title="Settings" subtitle="Yours, and only yours" />

        <View style={styles.afterHero} />

        {/* ── Appearance ─────────────────────────────────────────── */}
        <Section title="Appearance">
          <Row
            icon="palette"
            label="Theme"
            value={THEME_OPTIONS.find((option) => option.value === settings.themePreference)?.label}
            onPress={() => setThemeSheet(true)}
          />
        </Section>

        {/* ── Preferences ────────────────────────────────────────── */}
        <Section title="Preferences">
          <Row
            icon="vibrate"
            label="Haptic feedback"
            description={Platform.OS === 'web' ? 'Not available in the browser' : undefined}
            control={
              <Toggle
                value={settings.hapticsEnabled}
                onValueChange={(value) => void settings.set('hapticsEnabled', value)}
                disabled={Platform.OS === 'web'}
                accessibilityLabel="Haptic feedback"
                accessibilityHint="Small vibrations when you save, favourite or archive"
              />
            }
          />
          <Divider />
          <Row
            icon="bookmark"
            label="Default category"
            value={defaultCategory?.name}
            onPress={() => setCategorySheet(true)}
          />
          <Divider />
          <Row
            icon="trash-2"
            label="Confirm before deleting"
            control={
              <Toggle
                value={settings.confirmDeletion}
                onValueChange={(value) => void settings.set('confirmDeletion', value)}
                accessibilityLabel="Confirm before deleting"
                accessibilityHint="Ask for confirmation before permanently deleting an item"
              />
            }
          />
        </Section>

        {/* ── Notifications ──────────────────────────────────────── */}
        <Section
          title="Notifications"
          footer={
            permission === 'denied'
              ? 'Notifications are turned off for Tuck in your device settings.'
              : permission === 'unsupported'
                ? 'Reminders run on the phone app, not in a browser.'
                : 'Reminders are scheduled on this device. Nothing is sent to a server.'
          }
        >
          <Row
            icon="bell"
            label="Reminders"
            control={
              <Toggle
                value={settings.remindersEnabled && permission !== 'denied'}
                onValueChange={(value) => void handleRemindersToggle(value)}
                disabled={permission === 'unsupported'}
                accessibilityLabel="Enable reminders"
                accessibilityHint="Schedule local notifications for items with a reminder"
              />
            }
          />
        </Section>

        {/* ── Data ───────────────────────────────────────────────── */}
        <Section title="Data" footer="Backups are plain JSON files saved to your device.">
          <Row
            icon="file-down"
            label="Export data"
            description={`${counts.total} item${counts.total === 1 ? '' : 's'}`}
            onPress={handleExport}
            loading={busy === 'export'}
          />
          <Divider />
          <Row
            icon="file-up"
            label="Import data"
            description="Merge a Tuck backup"
            onPress={handleImport}
            loading={busy === 'import'}
          />
          <Divider />
          <Row
            icon="archive"
            label="Clear archive"
            description={`${counts.archived} archived`}
            onPress={handleClearArchive}
          />
          <Divider />
          <Row
            icon="trash-2"
            label="Delete all data"
            destructive
            onPress={handleDeleteAll}
          />
        </Section>

        {/* ── About ──────────────────────────────────────────────── */}
        <Section title="About">
          <Row icon="lock" label="Privacy" onPress={() => router.push('/privacy')} />
          <Divider />
          <Row icon="info" label="Version" value={version} />
        </Section>

        {/* Development-only helper, clearly labelled and never shipped. */}
        {__DEV__ ? <DevTools /> : null}

        <View style={styles.colophon}>
          <Text variant="label" color="subtle" center>
            Tuck keeps your things on your device.
          </Text>
        </View>
      </ScrollView>

      {/* ── Sheets ───────────────────────────────────────────────── */}
      <Sheet visible={themeSheet} onClose={() => setThemeSheet(false)} title="Theme">
        {THEME_OPTIONS.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            description={option.hint}
            icon={option.icon}
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
      >
        <ScrollView style={styles.sheetScroll}>
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
        </ScrollView>
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
    <Section title="Development" footer="Only visible in development builds.">
      <Row
        icon="sparkles"
        label="Add sample data"
        description="Twelve realistic saved things"
        onPress={handleSeed}
        loading={seeding}
      />
    </Section>
  );
}

// ─── Layout primitives ─────────────────────────────────────────────────────

function Section({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <Text variant="overline" color="subtle" uppercase style={styles.sectionTitle}>
        {title}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {children}
      </View>
      {footer ? (
        <Text variant="label" color="subtle" style={styles.sectionFooter}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />;
}

function Row({
  icon,
  label,
  value,
  description,
  onPress,
  control,
  destructive,
  loading,
}: {
  icon: IconName;
  label: string;
  value?: string;
  description?: string;
  onPress?: () => void;
  control?: ReactNode;
  destructive?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  const color = destructive ? theme.colors.danger : theme.colors.text;

  const body = (
    <>
      <Icon
        name={icon}
        size={19}
        color={destructive ? theme.colors.danger : theme.colors.textMuted}
        strokeWidth={2}
      />
      <View style={styles.rowBody}>
        <Text variant="body" style={{ color }}>
          {label}
        </Text>
        {description ? (
          <Text variant="label" color="subtle">
            {description}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text variant="footnote" color="muted">
          {value}
        </Text>
      ) : null}

      {control}

      {onPress && !control ? (
        <Icon
          name={loading ? 'loader' : 'chevron-right'}
          size={17}
          color={theme.colors.textSubtle}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={`${label}${value ? `, ${value}` : ''}`}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      pressScale={0.99}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description ?? value}
      style={styles.row}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: screenPadding,
  },
  afterHero: {
    height: spacing.xl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    marginBottom: spacing.sm + 2,
    marginLeft: spacing.xs,
  },
  sectionFooter: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    lineHeight: 17,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.md + 2,
    minHeight: 54,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.huge,
  },
  sheetScroll: {
    maxHeight: 400,
  },
  colophon: {
    paddingVertical: spacing.xl,
  },
});
