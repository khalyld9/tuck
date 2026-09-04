import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Snackbar } from '@/components/ui/Snackbar';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { useShareIntent } from '@/lib/sharing/useShareIntent';
import { useNotificationRouting } from '@/lib/notifications/useNotificationRouting';

// Keep the splash up until the database has migrated and the stores are warm,
// so the first frame the user sees is real content — never an empty shell.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const theme = useTheme();
  const { ready } = useAppBootstrap();

  // Share-to-Tuck and reminder taps both route into the app once it's ready.
  useShareIntent(ready);
  useNotificationRouting(ready);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme.colors.background]);

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) {
    return <View style={[styles.root, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]} onLayout={onLayout}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
          animationDuration: 260,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen
          name="edit/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="collection/[id]" />
        <Stack.Screen name="archive" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="search" options={{ animation: 'fade', animationDuration: 180 }} />
        <Stack.Screen
          name="surprise"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            animationDuration: 200,
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen name="privacy" options={{ presentation: 'modal' }} />
        {/* Pushed, not presented: these are destinations within Settings, so
            they slide in from the right and offer a Back button. */}
        <Stack.Screen name="about" />
        <Stack.Screen name="help" />
      </Stack>

      <Snackbar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
