import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

const POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'lock',
    title: 'Everything stays here',
    body: 'Your saved things live in a database on this device. Tuck has no server to send them to.',
  },
  {
    icon: 'globe',
    title: 'Links are never visited',
    body: "Tuck stores the link you paste and shows its domain. It doesn't fetch the page, so nobody learns what you saved.",
  },
  {
    icon: 'eye',
    title: 'No analytics',
    body: 'No tracking, no crash reporting, no usage stats, no advertising identifiers. Nothing is measured.',
  },
  {
    icon: 'bell',
    title: 'Reminders are local',
    body: "Reminders use your phone's own scheduler. There are no push notifications and no push tokens.",
  },
  {
    icon: 'file-down',
    title: 'Your data is portable',
    body: 'Export a plain JSON backup whenever you like, and delete everything in one action.',
  },
];

/** A short, plain-language privacy explanation. */
export default function PrivacyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/settings');
  }, []);

  return (
    <Screen>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Text variant="title2" accessibilityRole="header">
          Privacy
        </Text>
        <IconButton name="x" onPress={handleClose} accessibilityLabel="Close" variant="soft" size={19} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="body" color="muted" style={styles.intro}>
          Tuck is built to be boring about privacy: there is nothing to collect, because there is
          nowhere to send it.
        </Text>

        <View style={styles.list}>
          {POINTS.map((point) => (
            <View
              key={point.title}
              style={[
                styles.point,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={[styles.pointIcon, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon name={point.icon} size={17} color={theme.colors.accent} strokeWidth={2.1} />
              </View>
              <View style={styles.pointBody}>
                <Text variant="headline">{point.title}</Text>
                <Text variant="callout" color="muted" style={styles.pointText}>
                  {point.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text variant="label" color="subtle" style={styles.footer}>
          If you delete the app, your saved things go with it. Export a backup first if you want to
          keep them.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: screenPadding,
  },
  intro: {
    lineHeight: 23,
    marginBottom: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  point: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg - 2,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pointIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointBody: {
    flex: 1,
    gap: spacing.xs,
  },
  pointText: {
    lineHeight: 20,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
