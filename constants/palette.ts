/**
 * Tuck — raw palette.
 *
 * These are the only literal colour values in the app. Everything else consumes
 * semantic tokens (see `theme.ts`) so light and dark are designed intentionally
 * rather than algorithmically inverted.
 *
 * The identity is built on warm paper: a soft oat/linen base, a clay accent
 * (the pouch), and muted secondary hues that stay quiet next to content.
 */

export const palette = {
  // ── Warm neutrals (light) ────────────────────────────────────────────────
  linen: '#FAF6F0',
  paper: '#FFFDFA',
  oat: '#F4EDE3',
  sand: '#EBE1D4',
  fawn: '#DED2C2',
  taupe: '#B9AB99',
  stone: '#8C8073',
  slate: '#5C544B',
  ink: '#2A2521',
  inkDeep: '#1A1613',

  // ── Warm neutrals (dark) ─────────────────────────────────────────────────
  espresso: '#14110F',
  cocoa: '#1C1815',
  bark: '#26211D',
  loam: '#332C27',
  driftwood: '#463D36',
  ash: '#7A6F65',
  smoke: '#A2968A',
  chalk: '#E8E0D6',
  chalkBright: '#F6F1EA',

  // ── Clay accent (brand) ──────────────────────────────────────────────────
  clay: '#C4703A',
  clayDeep: '#A85C2C',
  clayBright: '#E08A4E',
  claySoft: '#F5E2D2',
  clayGlow: '#FBEFE4',
  clayDim: '#3A2317',

  // ── Secondary hues, deliberately muted ───────────────────────────────────
  sage: '#6F8A6A',
  sageSoft: '#E4EBE0',
  sageDim: '#26302A',
  sageBright: '#8FAE89',

  plum: '#8B6B8F',
  plumSoft: '#EDE4EE',
  plumDim: '#2E2431',
  plumBright: '#AE8CB2',

  ocean: '#4F7B8A',
  oceanSoft: '#DFEAEE',
  oceanDim: '#1E2C32',
  oceanBright: '#78A3B2',

  amber: '#C89A3C',
  amberSoft: '#F7EBD3',
  amberDim: '#332A15',
  amberBright: '#E0B75C',

  rose: '#B95F60',
  roseSoft: '#F7E2E2',
  roseDim: '#331E1E',
  roseBright: '#D5817F',

  // ── Feedback ─────────────────────────────────────────────────────────────
  success: '#5B8C5A',
  successDark: '#7FAE7C',
  danger: '#B3453E',
  dangerDark: '#D9736B',
  warning: '#C08A2E',
  warningDark: '#DDAA53',

  // ── Absolutes ────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type PaletteColor = keyof typeof palette;
