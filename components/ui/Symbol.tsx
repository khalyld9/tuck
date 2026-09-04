import { memo } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

import { Icon, type IconName } from './Icon';
import { useTheme } from '@/hooks/useTheme';

/**
 * The app's icon vocabulary, expressed as SF Symbols.
 *
 * On iOS these render as genuine SF Symbols, so they carry Apple's optical
 * sizing, weight matching and baseline alignment — the thing that makes an
 * interface read as native rather than as a web app that imported an icon set.
 *
 * Everywhere else we fall back to the Lucide glyph that most closely matches
 * the symbol's silhouette. Keeping the mapping in one table is what stops the
 * app from drifting into "random icon library" territory: a screen asks for a
 * *role* ("export"), never for a particular vendor's drawing of it.
 */
const SYMBOLS = {
  // ── Navigation ──────────────────────────────────────────────────────
  home: { ios: 'house', lucide: 'house' },
  browse: { ios: 'square.grid.2x2', lucide: 'layout-grid' },
  saved: { ios: 'bookmark', lucide: 'bookmark' },
  settings: { ios: 'gearshape', lucide: 'settings' },

  // ── Settings rows ───────────────────────────────────────────────────
  appearance: { ios: 'paintpalette', lucide: 'palette' },
  haptics: { ios: 'iphone.radiowaves.left.and.right', lucide: 'vibrate' },
  category: { ios: 'bookmark', lucide: 'bookmark' },
  confirmDelete: { ios: 'exclamationmark.triangle', lucide: 'circle-alert' },
  reminders: { ios: 'bell.badge', lucide: 'bell-ring' },
  bell: { ios: 'bell', lucide: 'bell' },
  export: { ios: 'square.and.arrow.up', lucide: 'file-up' },
  import: { ios: 'square.and.arrow.down', lucide: 'file-down' },
  archive: { ios: 'archivebox', lucide: 'archive' },
  trash: { ios: 'trash', lucide: 'trash-2' },
  about: { ios: 'info.circle', lucide: 'info' },
  privacy: { ios: 'lock', lucide: 'lock' },
  help: { ios: 'questionmark.circle', lucide: 'circle-question' },
  sparkles: { ios: 'sparkles', lucide: 'sparkles' },

  // ── Appearance options ──────────────────────────────────────────────
  light: { ios: 'sun.max', lucide: 'sun' },
  dark: { ios: 'moon', lucide: 'moon' },
  systemTheme: { ios: 'circle.lefthalf.filled', lucide: 'sun-moon' },

  // ── Actions ─────────────────────────────────────────────────────────
  plus: { ios: 'plus', lucide: 'plus' },
  search: { ios: 'magnifyingglass', lucide: 'search' },
  close: { ios: 'xmark', lucide: 'x' },
  check: { ios: 'checkmark', lucide: 'check' },
  chevronRight: { ios: 'chevron.right', lucide: 'chevron-right' },
  chevronDown: { ios: 'chevron.down', lucide: 'chevron-down' },
  back: { ios: 'chevron.left', lucide: 'arrow-left' },
  heart: { ios: 'heart', lucide: 'heart' },
  heartFilled: { ios: 'heart.fill', lucide: 'heart' },
  share: { ios: 'square.and.arrow.up', lucide: 'share-2' },
  edit: { ios: 'pencil', lucide: 'pencil' },
  open: { ios: 'safari', lucide: 'external-link' },
  restore: { ios: 'arrow.uturn.backward', lucide: 'archive-restore' },
  shuffle: { ios: 'shuffle', lucide: 'shuffle' },
  sort: { ios: 'arrow.up.arrow.down', lucide: 'arrow-up-down' },
  list: { ios: 'list.bullet', lucide: 'list' },
  grid: { ios: 'square.grid.2x2', lucide: 'grid-2x2' },
  more: { ios: 'ellipsis', lucide: 'ellipsis' },
  link: { ios: 'link', lucide: 'link' },
  tag: { ios: 'number', lucide: 'hash' },
  clock: { ios: 'clock', lucide: 'clock' },
  calendar: { ios: 'calendar', lucide: 'calendar' },
} as const satisfies Record<string, { ios: SFSymbol; lucide: IconName }>;

export type SymbolName = keyof typeof SYMBOLS;

export function isSymbolName(value: string): value is SymbolName {
  return value in SYMBOLS;
}

export interface SymbolProps {
  name: SymbolName;
  size?: number;
  color?: string;
  /**
   * SF Symbol weight. Defaults to `regular`, matching the weight Apple uses
   * for settings rows and toolbars — heavier weights are reserved for
   * emphasis, never applied wholesale.
   */
  weight?: SymbolWeight;
  /** Renders the filled variant where one exists (selected tab, favourite). */
  filled?: boolean;
}

/**
 * A single icon, drawn as an SF Symbol on iOS and a matched Lucide glyph
 * elsewhere. Sizes are the *font* size of the symbol, so a 17pt symbol sits
 * next to 17pt text the way it does in Apple's own apps.
 */
export const Symbol = memo(function Symbol({
  name,
  size = 20,
  color,
  weight = 'regular',
  filled = false,
}: SymbolProps) {
  const theme = useTheme();
  const entry = SYMBOLS[name];
  const tint = color ?? theme.colors.text;

  if (Platform.OS === 'ios') {
    // `.fill` variants are a naming convention in SF Symbols rather than a
    // flag, so we append it only when asked and only if not already filled.
    const iosName = (
      filled && !entry.ios.endsWith('.fill') ? `${entry.ios}.fill` : entry.ios
    ) as SFSymbol;

    return (
      <SymbolView
        name={iosName}
        size={size}
        tintColor={tint}
        weight={weight}
        resizeMode="scaleAspectFit"
        // The view is square and centred so symbols of differing intrinsic
        // widths still occupy one consistent slot in a row.
        style={{ width: size, height: size }}
        fallback={
          <Icon
            name={entry.lucide}
            size={size}
            color={tint}
            fill={filled ? tint : 'none'}
            strokeWidth={strokeFor(weight)}
          />
        }
      />
    );
  }

  return (
    <View style={[styles.slot, { width: size, height: size }]}>
      <Icon
        name={entry.lucide}
        size={size}
        color={tint}
        fill={filled ? tint : 'none'}
        strokeWidth={strokeFor(weight)}
      />
    </View>
  );
});

/**
 * Lucide is stroke-based and SF Symbols are weight-based, so the fallback
 * approximates the requested weight with a stroke width. Without this the
 * non-iOS icons all render at one flat weight and look pasted in.
 */
function strokeFor(weight: SymbolWeight): number {
  switch (weight) {
    case 'ultraLight':
    case 'thin':
      return 1.2;
    case 'light':
      return 1.5;
    case 'medium':
      return 2;
    case 'semibold':
      return 2.2;
    case 'bold':
    case 'heavy':
    case 'black':
      return 2.5;
    default:
      return 1.8;
  }
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
