import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { elevation, radius, spacing, typography } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';

function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Icon
        name={name}
        size={21}
        color={String(color)}
        strokeWidth={focused ? 2.4 : 1.9}
        // The active tab is filled as well as tinted, so the state doesn't
        // depend on colour perception alone.
        fill={focused ? String(color) : 'none'}
      />
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenListeners={{
        tabPress: () => haptics.selection(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        // A floating bar rather than a docked one: the list scrolls beneath
        // it, which keeps the warm background visible at the edges and stops
        // the app bottoming out in a hard grey slab.
        tabBarStyle: {
          position: 'absolute',
          left: spacing.md,
          right: spacing.md,
          bottom: Math.max(insets.bottom, spacing.md),
          // 10 pad + 22 icon + 3 gap + 13 label + 10 pad, rounded up.
          height: 72,
          borderRadius: radius.xl,
          backgroundColor: theme.colors.surfaceElevated,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          paddingTop: 10,
          paddingBottom: 10,
          paddingHorizontal: spacing.xs,
          ...elevation(2, theme.colors.shadow, theme.dark),
        },
        tabBarLabelStyle: {
          ...typography.overline,
          fontSize: 10,
          letterSpacing: 0.2,
          marginTop: 3,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          borderRadius: radius.lg,
        },
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="house" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarAccessibilityLabel: 'Browse categories tab',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="layout-grid" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarAccessibilityLabel: 'Saved library tab',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bookmark" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
});
