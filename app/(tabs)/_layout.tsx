import { router, Tabs } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddTuckSheet } from '@/components/home/AddTuckSheet';
import { FloatingAddButton } from '@/components/navigation/FloatingAddButton';
import { useCategoriesStore } from '@/store/useCategoriesStore';

import {
  TAB_BAR_HEIGHT,
  tabBarBottom,
  tabBarInset,
  tabBarRightGutter,
} from '@/components/navigation/metrics';
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
  const categories = useCategoriesStore((state) => state.categories);

  // The add button lives beside the bar on every tab, so it and its sheet are
  // owned here rather than duplicated per screen.
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const handlePick = useCallback((categoryId: string | null) => {
    setAddSheetOpen(false);
    // Let the sheet finish dismissing before the form slides up, otherwise
    // the two transitions fight each other.
    setTimeout(() => {
      router.push(categoryId ? `/add?categoryId=${categoryId}` : '/add');
    }, 180);
  }, []);

  return (
    <>
    <Tabs
      screenListeners={{
        tabPress: () => haptics.selection(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        // A floating, inset bar rather than a docked full-width footer: the
        // content scrolls beneath it, which keeps the warm background visible
        // at the edges. It stops short on the right so the add button can sit
        // beside it as a separate control — see components/navigation/metrics.
        tabBarStyle: {
          position: 'absolute',
          left: tabBarInset,
          right: tabBarInset + tabBarRightGutter,
          bottom: tabBarBottom(insets.bottom),
          height: TAB_BAR_HEIGHT,
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
          // The bar is narrower than a full-width footer because the add
          // button sits beside it. React Navigation pads each item by 5pt on
          // an inner pressable that tabBarItemStyle can't reach, and caps the
          // label at 100% of that padded box — which ellipsises "Settings" to
          // "Setti…" on a 320pt screen. Bleeding back into the padding and
          // lifting the cap to match buys the ~6pt the longest label needs.
          marginHorizontal: -spacing.xs,
          maxWidth: '120%',
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

      <FloatingAddButton onPress={() => setAddSheetOpen(true)} />

      <AddTuckSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        categories={categories}
        onPick={handlePick}
      />
    </>
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
