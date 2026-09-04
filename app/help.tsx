import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow, ListSection } from '@/components/ios/List';
import { NavBar } from '@/components/ios/NavBar';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/constants/tokens';

/**
 * Help — short answers to the questions the interface can't answer by itself.
 * Written as prose under grouped headings rather than an FAQ accordion, which
 * is how Apple's own help content reads.
 */
const TOPICS: { title: string; body: string }[] = [
  {
    title: 'Saving something',
    body: 'Tap the + button. A title is all you need — everything else is optional. Paste a link and Tuck fills in the title and category for you.',
  },
  {
    title: 'Finding it again',
    body: 'Search looks through titles, notes, tags, categories and web addresses at once. Browse groups everything by category, and Saved holds the full library with filters and sorting.',
  },
  {
    title: 'Swipe actions',
    body: 'Swipe a row right to favourite it, left to archive it. Archived things leave your library but stay in the archive until you delete them.',
  },
  {
    title: 'Reminders',
    body: 'Give anything a reminder and your phone will nudge you — tomorrow, this weekend, next week, or a date you pick. Reminders are scheduled locally; nothing is sent anywhere.',
  },
  {
    title: 'Surprise me',
    body: "Can't decide? Surprise Me picks something from your library at random. Good for the things you saved and forgot.",
  },
  {
    title: 'Backups',
    body: 'Settings → Export Data writes a JSON file you can keep anywhere. Import merges a backup back in and asks what to do about anything that already exists.',
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/settings');
  }, []);

  return (
    <Screen>
      <NavBar title="Help" leading="back" leadingLabel="Settings" onLeadingPress={handleBack} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {TOPICS.map((topic) => (
          <View key={topic.title} style={styles.topic}>
            <Text variant="headline" style={styles.topicTitle}>
              {topic.title}
            </Text>
            <Text variant="body" color="muted" style={styles.topicBody}>
              {topic.body}
            </Text>
          </View>
        ))}

        <View style={styles.groups}>
          <ListSection
            title="More"
            footer="Tuck works entirely offline. There's nothing to sign in to and no support account to create."
          >
            <ListRow symbol="privacy" label="Privacy" onPress={() => router.push('/privacy')} />
            <ListRow symbol="about" label="About Tuck" onPress={() => router.push('/about')} />
          </ListSection>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
  topic: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xl,
  },
  topicTitle: {
    marginBottom: spacing.xs,
  },
  topicBody: {
    lineHeight: 22,
  },
  groups: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
});
