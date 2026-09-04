import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type Theme } from '@/constants/theme';
import { selectThemePreference, useSettingsStore } from '@/store/useSettingsStore';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore(selectThemePreference);

  const theme = useMemo(() => {
    const resolved = preference === 'system' ? (systemScheme ?? 'light') : preference;
    return resolved === 'dark' ? darkTheme : lightTheme;
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** The active theme (colours + tones). */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Shorthand when a component only needs colours. */
export function useColors() {
  return useContext(ThemeContext).colors;
}

/**
 * Memoised stylesheet factory.
 *
 * Usage:
 *   const styles = useThemedStyles(createStyles);
 *   const createStyles = (theme: Theme) => StyleSheet.create({ ... });
 *
 * The factory only re-runs when the theme changes, so switching to dark mode
 * doesn't rebuild styles on every render.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useContext(ThemeContext);
  return useMemo(() => factory(theme), [factory, theme]);
}
