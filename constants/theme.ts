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
  /** Icon / text colour. */
  fg: string;
  /** Chip background. */
  bg: string;
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
    textMuted: palette.stone,
    textSubtle: palette.taupe,
    textOnAccent: palette.white,

    accent: palette.clay,
    accentPressed: palette.clayDeep,
    accentSoft: palette.claySoft,
    accentGlow: palette.clayGlow,

    favorite: palette.rose,
    danger: palette.danger,
    dangerSoft: palette.roseSoft,
    success: palette.success,
    reminder: palette.ocean,
    reminderSoft: palette.oceanSoft,

    scrim: 'rgba(26, 22, 19, 0.32)',
    skeleton: palette.sand,

    swipeArchive: palette.slate,
    swipeFavorite: palette.rose,

    shadow: 'rgba(58, 44, 32, 1)',
  },
  tones: {
    clay: { fg: palette.clayDeep, bg: palette.claySoft },
    sage: { fg: palette.sage, bg: palette.sageSoft },
    plum: { fg: palette.plum, bg: palette.plumSoft },
    ocean: { fg: palette.ocean, bg: palette.oceanSoft },
    amber: { fg: '#9C7526', bg: palette.amberSoft },
    rose: { fg: palette.rose, bg: palette.roseSoft },
    neutral: { fg: palette.slate, bg: palette.sand },
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
    textMuted: palette.smoke,
    textSubtle: palette.ash,
    textOnAccent: '#22150C',

    accent: palette.clayBright,
    accentPressed: palette.clay,
    accentSoft: palette.clayDim,
    accentGlow: '#2A1A11',

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
  tones: {
    clay: { fg: palette.clayBright, bg: palette.clayDim },
    sage: { fg: palette.sageBright, bg: palette.sageDim },
    plum: { fg: palette.plumBright, bg: palette.plumDim },
    ocean: { fg: palette.oceanBright, bg: palette.oceanDim },
    amber: { fg: palette.amberBright, bg: palette.amberDim },
    rose: { fg: palette.roseBright, bg: palette.roseDim },
    neutral: { fg: palette.smoke, bg: palette.loam },
  },
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
