import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

import { FAB_SIZE, TAB_BAR_HEIGHT, tabBarBottom, tabBarInset } from './metrics';

export interface FloatingAddButtonProps {
  onPress: () => void;
}

/**
 * The primary action of the whole app, floating beside the tab bar.
 *
 * Deliberately *not* part of the bar: it is a create action, not a
 * destination, and folding it into a row of tabs would imply it navigates
 * somewhere. It sits at the same vertical centre as the bar so the two read
 * as one control cluster, with the bar stopping short to make room.
 */
export const FloatingAddButton = memo(function FloatingAddButton({
  onPress,
}: FloatingAddButtonProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(120)}
      style={[
        styles.wrap,
        {
          right: tabBarInset,
          // Centred against the bar rather than aligned to its bottom edge.
          bottom: tabBarBottom(insets.bottom) + (TAB_BAR_HEIGHT - FAB_SIZE) / 2,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        haptic="medium"
        pressScale={0.92}
        accessibilityRole="button"
        accessibilityLabel="Tuck something away"
        accessibilityHint="Opens a list of things you can save"
        style={[
          styles.button,
          { backgroundColor: theme.colors.accent, shadowColor: theme.colors.shadow },
        ]}
      >
        <Icon name="plus" size={25} color={theme.colors.textOnAccent} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
