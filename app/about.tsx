import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow, ListSection } from '@/components/ios/List';
import { NavBar } from '@/components/ios/NavBar';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/constants/tokens';
import { selectCounts, useItemsStore } from '@/store/useItemsStore';

const MASCOT = require('@/assets/mascot/tuck-idle.png');

/** About Tuck — what it is, who it's for, and what it deliberately isn't. */
export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const counts = useItemsStore(selectCounts);

  const version = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/settings');
  }, []);

  return (
    <Screen>
      <NavBar leading="back" leadingLabel="Settings" onLeadingPress={handleBack} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.masthead}>
          <Image source={MASCOT} style={styles.mascot} accessibilityIgnoresInvertColors />
          <Text variant="title1" center style={styles.name}>
            Tuck
          </Text>
          <Text variant="callout" color="muted" center>
            Version {version}
          </Text>
        </View>

        <Text variant="body" color="muted" style={styles.blurb}>
          Tuck is a quiet place for the things you want to come back to — a film
          someone mentioned, a restaurant worth trying, a link you don&apos;t
          have time for yet. Save it, forget it, find it when you&apos;re ready.
        </Text>

        <View style={styles.groups}>
          <ListSection title="This copy">
            <ListRow label="Things saved" value={String(counts.total)} chevron={false} />
            <ListRow label="Archived" value={String(counts.archived)} chevron={false} />
            <ListRow label="Version" value={version} chevron={false} />
          </ListSection>

          <ListSection
            title="How it works"
            footer="No account, no sync, no servers. Everything lives in a database on this device."
          >
            <ListRow
              symbol="privacy"
              label="Privacy"
              onPress={() => router.push('/privacy')}
            />
            <ListRow symbol="help" label="Help" onPress={() => router.push('/help')} />
          </ListSection>
        </View>

        <Text variant="footnote" color="subtle" center style={styles.colophon}>
          Made for people with too many tabs open.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
  },
  masthead: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  mascot: {
    width: 96,
    height: 96,
    marginBottom: spacing.md,
  },
  name: {
    marginBottom: 2,
  },
  blurb: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xxl,
    lineHeight: 22,
  },
  groups: {
    paddingHorizontal: screenPadding,
  },
  colophon: {
    paddingTop: spacing.sm,
    paddingHorizontal: screenPadding,
  },
});
