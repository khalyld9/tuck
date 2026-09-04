import { Platform, type TextStyle } from 'react-native';

/**
 * Non-colour design tokens: spacing, radii, type scale, motion, elevation.
 * A 4pt base grid keeps rhythm consistent across every screen.
 */

export const spacing = {
  /** 2 — hairline nudges */
  xxs: 2,
  /** 4 */
  xs: 4,
  /** 8 */
  sm: 8,
  /** 12 */
  md: 12,
  /** 16 — default gutter inside components */
  lg: 16,
  /** 20 — screen horizontal gutter */
  xl: 20,
  /** 24 */
  xxl: 24,
  /** 32 — section separation */
  xxxl: 32,
  /** 48 — generous breathing room */
  huge: 48,
  /** 64 */
  massive: 64,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

/** Screen edge gutter used by every scrollable surface. */
export const screenPadding = spacing.xl;

/**
 * Type scale. Line heights are pre-computed so vertical rhythm never depends
 * on the platform's default leading.
 */
export const typography = {
  /** Big brand moment — "Tuck" wordmark, Surprise Me result. */
  display: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    fontWeight: '700',
  },
  /** Screen titles. */
  title1: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    fontWeight: '700',
  },
  /** Item detail titles. */
  title2: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    fontWeight: '700',
  },
  /** Section headers. */
  title3: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontWeight: '600',
  },
  /** Card titles and list rows. */
  headline: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    fontWeight: '600',
  },
  /** Default reading size. */
  body: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.1,
    fontWeight: '400',
  },
  /** Secondary copy. */
  callout: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.1,
    fontWeight: '400',
  },
  /** Metadata, timestamps. */
  footnote: {
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0,
    fontWeight: '500',
  },
  /** Chips, badges and counts — short, emphatic, never a sentence. */
  caption: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.1,
    fontWeight: '600',
  },
  /**
   * Small prose: helper text, section footers, fine print. Same size as
   * `caption` but a quieter weight, because sentences set at 600 shout.
   */
  label: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: '500',
  },
  /** Section eyebrow labels — uppercase. */
  overline: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    fontWeight: '700',
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/**
 * Motion. Micro-interactions live in the 150–300ms band so the app always
 * feels immediate.
 */
export const motion = {
  instant: 110,
  fast: 160,
  base: 220,
  slow: 300,
  lazy: 420,
  /** Spring for pressable feedback — quick, barely any overshoot. */
  press: { damping: 18, stiffness: 320, mass: 0.7 },
  /** Spring for entering elements. */
  enter: { damping: 20, stiffness: 220, mass: 0.9 },
  /** Bouncier spring reserved for playful moments (favourite, mascot). */
  bounce: { damping: 11, stiffness: 260, mass: 0.7 },
  /** Sheet/drawer spring. */
  sheet: { damping: 26, stiffness: 260, mass: 0.9 },
} as const;

/** Minimum tappable area (Apple HIG / Material both land at 44–48). */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouchTarget = 44;

/**
 * Elevation. Shadows stay whisper-soft — the brief explicitly rejects
 * heavy drop shadows.
 */
export function elevation(level: 0 | 1 | 2 | 3, shadowColor: string, isDark: boolean) {
  if (level === 0) return {};
  const config = {
    1: { opacity: isDark ? 0.3 : 0.05, radius: 8, offset: 2, android: 1 },
    2: { opacity: isDark ? 0.38 : 0.07, radius: 16, offset: 4, android: 3 },
    3: { opacity: isDark ? 0.46 : 0.1, radius: 28, offset: 10, android: 8 },
  }[level];

  return Platform.select({
    ios: {
      shadowColor,
      shadowOpacity: config.opacity,
      shadowRadius: config.radius,
      shadowOffset: { width: 0, height: config.offset },
    },
    android: {
      elevation: config.android,
      shadowColor,
    },
    default: {
      boxShadow: `0px ${config.offset}px ${config.radius}px rgba(0,0,0,${config.opacity})`,
    },
  });
}

/** Fixed card geometry so lists stay visually even. */
export const cardMetrics = {
  /**
   * Fixed row height, not a minimum: 2 title lines (21×2) + 5 gap + 17 meta
   * + 12 padding top and bottom. Every list row is identical whether the
   * title wraps or not, so scrolling never jitters.
   */
  listHeight: 88,
  listThumb: 56,
  gridImageAspect: 1.3,
  /**
   * Fixed text block under a grid tile: 12 padding × 2 + two `callout` lines
   * (19 × 2) + 3 gap + one `label` line (16) = 80. Fixed rather than
   * minimum so every tile in a row lines up exactly.
   */
  gridBodyHeight: 80,
  radius: radius.lg,
  gap: spacing.md,
} as const;

/**
 * Suppresses the browser's default focus ring on web.
 *
 * Every focusable surface in the app already draws its own accent-coloured
 * focus state, so the UA outline is a duplicate that clashes with the palette.
 * Native platforms ignore this key entirely.
 */
export const noWebOutline = { outlineStyle: 'none' } as unknown as TextStyle;
