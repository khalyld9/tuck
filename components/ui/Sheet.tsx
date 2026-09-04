import type { ReactNode } from 'react';
import { Modal, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { elevation, motion, radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Bottom sheet built on the native Modal, so it sits above everything
 * (including the tab bar) and inherits the platform's back-button handling.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(motion.fast)}
        exiting={FadeOut.duration(motion.fast)}
        style={[styles.scrim, { backgroundColor: theme.colors.scrim }]}
      >
        <RNPressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>

      <View style={styles.host} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.springify().damping(26).stiffness(260)}
          exiting={SlideOutDown.duration(motion.base)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceElevated,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              borderColor: theme.colors.border,
            },
            elevation(3, theme.colors.shadow, theme.dark),
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />

          {title ? (
            <Text variant="title3" style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          ) : null}

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  host: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.lg,
  },
});
