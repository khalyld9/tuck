import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Mascot, type MascotPose } from '@/components/mascot/Mascot';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import type { LibraryPulse } from '@/db/repositories/itemsRepository';

export interface MascotNote {
  message: string;
  pose: MascotPose;
  /** Where tapping the note goes, when there's somewhere useful to go. */
  href?: string;
}

/**
 * Picks what Tuck says.
 *
 * Every line is derived from the actual contents of the library — never a
 * random fortune. The order is a priority list: the most useful observation
 * wins, so a nudge about something overdue beats a compliment about a good
 * week. Returns null when there is genuinely nothing worth remarking on,
 * because a mascot that always talks stops being read.
 */
export function pickNote(pulse: LibraryPulse, activeCount: number): MascotNote | null {
  if (activeCount === 0) return null;

  if (pulse.overdue > 0) {
    return {
      message:
        pulse.overdue === 1
          ? 'One reminder slipped past. Want to take a look?'
          : `${pulse.overdue} reminders slipped past. No rush.`,
      pose: 'searching',
      href: '/saved',
    };
  }

  if (pulse.dueSoon > 0) {
    return {
      message:
        pulse.dueSoon === 1
          ? 'Something is due in the next day.'
          : `${pulse.dueSoon} things are due in the next day.`,
      pose: 'idle',
    };
  }

  if (pulse.savedThisWeek >= 5) {
    return {
      message: `${pulse.savedThisWeek} new things this week. Busy one.`,
      pose: 'celebrate',
    };
  }

  // Only mention the dusty pile once it's actually a pile, and only when it's
  // most of the library — otherwise it's just nagging.
  if (pulse.gatheringDust >= 5 && pulse.gatheringDust >= activeCount * 0.6) {
    return {
      message: `${pulse.gatheringDust} things have been waiting a while.`,
      pose: 'empty',
      href: '/saved',
    };
  }

  if (pulse.topCategory && pulse.topCategoryCount >= 4) {
    return {
      message: `Mostly ${pulse.topCategory.toLowerCase()} in here lately.`,
      pose: 'idle',
    };
  }

  if (pulse.savedThisWeek > 0) {
    return {
      message:
        pulse.savedThisWeek === 1
          ? 'One new thing this week.'
          : `${pulse.savedThisWeek} new things this week.`,
      pose: 'tucking',
    };
  }

  return null;
}

export interface MascotNoteCardProps {
  note: MascotNote;
  onPress?: () => void;
}

/**
 * Tuck, with something to say.
 *
 * A speech bubble rather than a stat card: the number is embedded in a
 * sentence, so Home stays a personal overview instead of turning into a
 * dashboard.
 */
export const MascotNoteCard = memo(function MascotNoteCard({
  note,
  onPress,
}: MascotNoteCardProps) {
  const theme = useTheme();

  const body = (
    <>
      <Mascot pose={note.pose} size={54} idle accessibilityLabel="" />

      <View style={styles.bubbleWrap}>
        {/* Little tail pointing back at the mascot. */}
        <View
          style={[
            styles.tail,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        />
        <View
          style={[
            styles.bubble,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text variant="callout" style={styles.message}>
            {note.message}
          </Text>
        </View>
      </View>
    </>
  );

  if (!onPress) {
    return (
      <Animated.View entering={FadeIn.duration(320).delay(80)} style={styles.row} accessible>
        {body}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(320).delay(80)}>
      <Pressable
        onPress={onPress}
        haptic="light"
        pressScale={0.99}
        accessibilityRole="button"
        accessibilityLabel={note.message}
        accessibilityHint="Opens your library"
        style={styles.row}
      >
        {body}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bubbleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.lg - 2,
  },
  tail: {
    position: 'absolute',
    left: -4,
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    transform: [{ rotate: '45deg' }],
  },
  message: {
    lineHeight: 20,
  },
});
