import { palette } from './palette';

/**
 * Semantic design tokens.
 *
 * UI code never reaches for `palette` directly — it asks for the role
 * ("surface", "textMuted", "accent") so both schemes stay coherent.
 */
export interface ThemeColors {
  /** App background — the paper the content sits on. */
  background: string;
  /** Slightly raised background used behind grouped content. */
  backgroundAlt: string;
  /** Card / sheet surface. */
  surface: string;
  /** A surface nested inside another surface (input inside a card). */
  surfaceSunken: string;
  /** Pressed/hover state for interactive surfaces. */
  surfacePressed: string;
  /** Elevated surface such as a modal or bottom sheet. */
  surfaceElevated: string;

  /** Hairline separators. */
  border: string;
  /** Slightly stronger border for inputs and outlined controls. */
  borderStrong: string;

  /** Primary reading colour. */
  text: string;
  /** Secondary copy, timestamps, helper text. */
  textMuted: string;
  /** Tertiary copy and placeholders. */
  textSubtle: string;
  /** Text drawn on top of the accent colour. */
  textOnAccent: string;

  /** Brand clay. */
  accent: string;
  /** Pressed accent. */
  accentPressed: string;
  /** Very soft accent wash for chips and highlights. */
  accentSoft: string;
  /** Even softer wash, used for large fills. */
  accentGlow: string;

  /**
   * The masthead panel: a deep warm slab that the first cards overlap, giving
   * the top of a screen real depth instead of a flat wash. Text placed on it
   * must use `heroText` / `heroTextMuted`, never the normal text tokens,
   * because the panel inverts the usual light/dark relationship.
   */
  heroSurface: string;
  /** Secondary fill inside the hero panel — inset chips, bars, wells. */
  heroSurfaceAlt: string;
  /** Primary text on `heroSurface`. */
  heroText: string;
  /** Secondary text on `heroSurface`. */
  heroTextMuted: string;

  /** Favourite (heart) colour. */
  favorite: string;
  /** Destructive actions. */
  danger: string;
  /** Soft destructive wash. */
  dangerSoft: string;
  /** Positive confirmation. */
  success: string;
  /** Reminder / time-based accents. */
  reminder: string;
  reminderSoft: string;

  /** Scrim behind modals. */
  scrim: string;
  /** Skeleton loading blocks. */
  skeleton: string;

  /** Swipe action backgrounds. */
  swipeArchive: string;
  swipeFavorite: string;

  /** Shadow colour (kept extremely subtle). */
  shadow: string;
}

export interface CategoryTone {
  /** Icon and stroke colour. Not bound by text contrast rules. */
  fg: string;
  /** Chip and tile background. */
  bg: string;
  /**
   * Text colour for labels sitting on `bg`. Darker than `fg` in light mode so
   * coloured type clears WCAG AA (4.5:1); identical to `fg` in dark mode,
   * where the lighter hue already passes against a deep background.
   */
  ink: string;
  /**
   * Saturated edge-to-edge fill for a solid colour card, with `onSolid` text
   * on top. Distinct from `bg`, which is a tint that sits *behind* dark text.
   */
  solid: string;
  /** Pressed state for `solid`. */
  solidPressed: string;
  /** Text and icons drawn on `solid`. Always clears AA against it. */
  onSolid: string;
}

export type CategoryToneName = 'clay' | 'sage' | 'plum' | 'ocean' | 'amber' | 'rose' | 'neutral';

export type CategoryTones = Record<CategoryToneName, CategoryTone>;

export interface Theme {
  name: 'light' | 'dark';
  dark: boolean;
  colors: ThemeColors;
  tones: CategoryTones;
}

export const lightTheme: Theme = {
  name: 'light',
  dark: false,
  colors: {
    background: palette.linen,
    backgroundAlt: palette.oat,
    surface: palette.paper,
    surfaceSunken: palette.oat,
    surfacePressed: palette.sand,
    surfaceElevated: palette.paper,

    border: 'rgba(42, 37, 33, 0.08)',
    borderStrong: 'rgba(42, 37, 33, 0.16)',

    text: palette.ink,
    textMuted: palette.stoneText,
    textSubtle: palette.taupeText,
    textOnAccent: palette.white,

    accent: palette.clay,
    accentPressed: palette.clayDeep,
    accentSoft: palette.claySoft,
    accentGlow: palette.clayGlow,

    heroSurface: palette.cacao,
    heroSurfaceAlt: palette.cacaoTint,
    heroText: palette.chalkBright,
    heroTextMuted: 'rgba(246, 241, 234, 0.72)',

    favorite: palette.rose,
    danger: palette.danger,
    dangerSoft: palette.roseSoft,
    success: palette.success,
    reminder: palette.ocean,
    reminderSoft: palette.oceanSoft,

    scrim: 'rgba(58, 39, 29, 0.42)',
    skeleton: palette.sand,

    swipeArchive: palette.slate,
    swipeFavorite: palette.rose,

    shadow: 'rgba(58, 44, 32, 1)',
  },
  tones: {
    clay: {
      fg: palette.clayDeep, bg: palette.claySoft, ink: palette.clayInk,
      solid: palette.vividClay, solidPressed: palette.vividClayOn, onSolid: palette.white,
    },
    sage: {
      fg: palette.sage, bg: palette.sageSoft, ink: palette.sageInk,
      solid: palette.vividSage, solidPressed: palette.vividSageOn, onSolid: palette.white,
    },
    plum: {
      fg: palette.plum, bg: palette.plumSoft, ink: palette.plumInk,
      solid: palette.vividPlum, solidPressed: palette.vividPlumOn, onSolid: palette.white,
    },
    ocean: {
      fg: palette.ocean, bg: palette.oceanSoft, ink: palette.oceanInk,
      solid: palette.vividOcean, solidPressed: palette.vividOceanOn, onSolid: palette.white,
    },
    amber: {
      fg: '#9C7526', bg: palette.amberSoft, ink: palette.amberInk,
      solid: palette.vividAmber, solidPressed: palette.vividAmberOn, onSolid: palette.white,
    },
    rose: {
      fg: palette.rose, bg: palette.roseSoft, ink: palette.roseInk,
      solid: palette.vividRose, solidPressed: palette.vividRoseOn, onSolid: palette.white,
    },
    neutral: {
      fg: palette.slate, bg: palette.sand, ink: palette.slate,
      solid: palette.vividNeutral, solidPressed: palette.vividNeutralOn, onSolid: palette.white,
    },
  },
};

export const darkTheme: Theme = {
  name: 'dark',
  dark: true,
  colors: {
    background: palette.espresso,
    backgroundAlt: palette.cocoa,
    surface: palette.bark,
    surfaceSunken: palette.cocoa,
    surfacePressed: palette.loam,
    surfaceElevated: palette.loam,

    border: 'rgba(232, 224, 214, 0.09)',
    borderStrong: 'rgba(232, 224, 214, 0.18)',

    text: palette.chalkBright,
    textMuted: palette.smokeText,
    textSubtle: palette.ashText,
    textOnAccent: '#22150C',

    accent: palette.clayBright,
    accentPressed: palette.clay,
    accentSoft: palette.clayDim,
    accentGlow: '#2A1A11',

    // Dark mode already sits on near-black, so the hero panel lifts *up*
    // instead of down — a raised warm slab rather than a deep one.
    heroSurface: palette.cacaoDark,
    heroSurfaceAlt: palette.cacaoDarkTint,
    heroText: palette.chalkBright,
    heroTextMuted: 'rgba(246, 241, 234, 0.66)',

    favorite: palette.roseBright,
    danger: palette.dangerDark,
    dangerSoft: palette.roseDim,
    success: palette.successDark,
    reminder: palette.oceanBright,
    reminderSoft: palette.oceanDim,

    scrim: 'rgba(0, 0, 0, 0.58)',
    skeleton: palette.loam,

    swipeArchive: palette.driftwood,
    swipeFavorite: palette.roseBright,

    shadow: 'rgba(0, 0, 0, 1)',
  },
  // In dark mode the bright hues already clear AA on their deep backgrounds,
  // so text and icons can share one colour.
  tones: {
    clay: {
      fg: palette.clayBright, bg: palette.clayDim, ink: palette.clayBright,
      solid: palette.vividClay, solidPressed: palette.vividClayOn, onSolid: palette.white,
    },
    sage: {
      fg: palette.sageBright, bg: palette.sageDim, ink: palette.sageBright,
      solid: palette.vividSage, solidPressed: palette.vividSageOn, onSolid: palette.white,
    },
    plum: {
      fg: palette.plumBright, bg: palette.plumDim, ink: palette.plumBright,
      solid: palette.vividPlum, solidPressed: palette.vividPlumOn, onSolid: palette.white,
    },
    ocean: {
      fg: palette.oceanBright, bg: palette.oceanDim, ink: palette.oceanBright,
      solid: palette.vividOcean, solidPressed: palette.vividOceanOn, onSolid: palette.white,
    },
    amber: {
      fg: palette.amberBright, bg: palette.amberDim, ink: palette.amberBright,
      solid: palette.vividAmber, solidPressed: palette.vividAmberOn, onSolid: palette.white,
    },
    rose: {
      fg: palette.roseBright, bg: palette.roseDim, ink: palette.roseBright,
      solid: palette.vividRose, solidPressed: palette.vividRoseOn, onSolid: palette.white,
    },
    neutral: {
      fg: palette.smoke, bg: palette.loam, ink: palette.smoke,
      solid: palette.vividNeutral, solidPressed: palette.vividNeutralOn, onSolid: palette.white,
    },
  },
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
