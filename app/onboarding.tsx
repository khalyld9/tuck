import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/constants/tokens';
import { haptics } from '@/lib/haptics';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * First launch. One screen, one button — no carousel, no account, and no
 * permission prompts until a feature actually needs them.
 */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const [starting, setStarting] = useState(false);

  const handleStart = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    haptics.success();
    await completeOnboarding();
    router.replace('/(tabs)');
  }, [completeOnboarding, starting]);

  return (
    <Screen>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.hero}>
          <Animated.View entering={FadeIn.duration(420)}>
            <Mascot
              pose="idle"
              size={220}
              animate
              idle
              accessibilityLabel="Tuck, a small friendly creature with a pouch"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(380).delay(160)} style={styles.copy}>
            <Text variant="display" center>
              Meet Tuck
            </Text>
            <Text variant="body" color="muted" center style={styles.subtitle}>
              Save the things you want to come back to.
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.duration(380).delay(280)} style={styles.footer}>
          <Button
            label="Start tucking"
            onPress={handleStart}
            size="lg"
            fullWidth
            loading={starting}
            haptic={null}
            accessibilityHint="Finishes setup and opens your library"
          />
          <Text variant="label" color="subtle" center style={styles.note}>
            Everything stays on your device. No account, no tracking.
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: screenPadding,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  copy: {
    gap: spacing.md,
    alignItems: 'center',
  },
  subtitle: {
    maxWidth: 290,
    lineHeight: 23,
  },
  footer: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  note: {
    maxWidth: 280,
    alignSelf: 'center',
  },
});
