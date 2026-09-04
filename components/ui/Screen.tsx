import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

export interface ScreenProps {
  children: ReactNode;
  /** Applies the top safe-area inset (off when a header already handles it). */
  edgeTop?: boolean;
  /** Applies the bottom safe-area inset. */
  edgeBottom?: boolean;
  /** Uses the alternate background (for grouped/settings-style screens). */
  alt?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen container: themed background plus opt-in safe-area padding.
 * Insets come from the device at runtime — nothing here is hardcoded, so
 * notches, Dynamic Island and Android nav bars are all respected.
 */
export function Screen({ children, edgeTop, edgeBottom, alt, style }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: alt ? theme.colors.backgroundAlt : theme.colors.background,
          paddingTop: edgeTop ? insets.top : 0,
          paddingBottom: edgeBottom ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
