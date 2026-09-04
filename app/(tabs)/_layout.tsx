import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { elevation, radius, spacing, typography } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';

function TabIcon({
  name,
  color,
  focused,
  activeBackground,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
  activeBackground: string;
}) {
  return (
    <View
      style={[
        styles.iconWrap,
        // A soft brown pill behind the active icon. Shape carries the state
        // alongside the tint and the fill, so it survives greyscale.
        focused && { backgroundColor: activeBackground },
      ]}
    >
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
          // 8 pad + 30 icon pill + 2 gap + 14 label line + 10 pad = 64, plus
          // headroom so a scaled label is never clipped.
          // Keep in sync with `tabBarClearance` in constants/tokens.ts.
          height: 74,
          borderRadius: radius.xl,
          backgroundColor: theme.colors.surfaceElevated,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          paddingTop: 8,
          paddingBottom: 10,
          paddingHorizontal: spacing.xs,
          ...elevation(2, theme.colors.shadow, theme.dark),
        },
        tabBarLabelStyle: {
          ...typography.overline,
          fontSize: 10,
          letterSpacing: 0.2,
          marginTop: 2,
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
            <TabIcon
              name="house"
              color={color}
              focused={focused}
              activeBackground={theme.colors.accentSoft}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarAccessibilityLabel: 'Browse categories tab',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="layout-grid"
              color={color}
              focused={focused}
              activeBackground={theme.colors.accentSoft}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarAccessibilityLabel: 'Saved library tab',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="bookmark"
              color={color}
              focused={focused}
              activeBackground={theme.colors.accentSoft}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="settings"
              color={color}
              focused={focused}
              activeBackground={theme.colors.accentSoft}
            />
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
    // Fixed size whether or not the pill is drawn, so the row never shifts
    // when the selection moves.
    height: 30,
    width: 46,
    borderRadius: radius.pill,
  },
});
