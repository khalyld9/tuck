import { Platform } from 'react-native';

/**
 * Typeface strategy.
 *
 * iOS ships SF Pro as the system face, and Apple's own apps get their
 * characteristic feel from it — optical sizing, tight tracking on large
 * titles, tabular figures. Bundling a copy would be both redundant and a
 * licensing problem, so on iOS we ask for the system font by its family
 * aliases and let the OS do the right thing:
 *
 *   - `SF Pro Display` is metric-tuned for large type (titles, numerals)
 *   - `SF Pro Text` is tuned for small type (body, labels, buttons)
 *
 * React Native maps the reserved family name `System` to SF Pro, but that
 * loses the Display/Text distinction, so the aliases are named explicitly
 * with a `System` fallback.
 *
 * Everywhere else — Android, web — Inter is the closest widely-available
 * neo-grotesque to SF Pro and is bundled as a real font file. Its weights are
 * addressed by family name rather than `fontWeight`, because on Android
 * synthetic weights look muddy.
 */

/** A weight step. Only the four the app actually uses are modelled. */
export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

/** Large-type face: screen titles, numerals, the wordmark. */
export type FontRole = 'display' | 'text';

const INTER_FAMILY: Record<FontWeight, string> = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

/**
 * Font assets to hand to `useFonts`. Empty on iOS — the system already has
 * SF Pro, so there is nothing to download or parse at launch.
 */
export const fontAssets =
  Platform.OS === 'ios'
    ? {}
    : {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
      };

/**
 * Resolves a family name for a weight and role.
 *
 * On iOS this returns an SF Pro alias and the caller keeps its numeric
 * `fontWeight`, which is how the system picks the real cut. On Android and
 * web it returns a concrete Inter family, and the caller must drop
 * `fontWeight` entirely so the platform doesn't synthesise a second bolding
 * on top of an already-bold file.
 */
export function fontFamily(weight: FontWeight, role: FontRole = 'text'): string {
  if (Platform.OS === 'ios') {
    return role === 'display' ? 'SF Pro Display' : 'SF Pro Text';
  }
  if (Platform.OS === 'web') {
    // Web can fall back through a stack; the system faces come first so a
    // Mac or iPhone browser gets the real SF Pro.
    return `${INTER_FAMILY[weight]}, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`;
  }
  return INTER_FAMILY[weight];
}

/**
 * True when the platform needs `fontWeight` stripped from text styles.
 *
 * Inter is loaded as four separate files, so weight is already encoded in the
 * family. Leaving a numeric weight alongside it makes Android double-bold and
 * makes web pick a synthetic face over the real one.
 */
export const weightIsInFamily = Platform.OS !== 'ios';

/** Maps a numeric CSS weight onto the four cuts the app ships. */
export function weightFromNumeric(value: string | number | undefined): FontWeight {
  const n = typeof value === 'string' ? parseInt(value, 10) : (value ?? 400);
  if (n >= 700) return 'bold';
  if (n >= 600) return 'semibold';
  if (n >= 500) return 'medium';
  return 'regular';
}
