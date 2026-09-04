import { spacing } from '@/constants/tokens';

/**
 * Shared geometry for the floating navigation cluster.
 *
 * The tab bar and the add button are rendered by different components — the
 * bar by the Tabs navigator, the button by the root layout — but they have to
 * line up exactly, so every number they both depend on lives here rather than
 * being written twice.
 */

/** Diameter of the floating add button. */
export const FAB_SIZE = 56;

/**
 * Height of the bar itself.
 *
 * 8 top pad + 30 icon pill + 2 gap + 14 label line + 10 bottom pad = 64, with
 * headroom so a scaled label is never clipped.
 */
export const TAB_BAR_HEIGHT = 72;

/** Gap between the bar and the add button. */
export const FAB_GAP = spacing.md;

/** Horizontal inset from the screen edge, for both the bar and the button. */
export const tabBarInset = spacing.lg;

/**
 * Distance from the bottom of the screen to the bottom of the cluster.
 *
 * Clears the home indicator on devices that have one, and falls back to a
 * normal gutter on devices that don't.
 */
export function tabBarBottom(bottomInset: number): number {
  return Math.max(bottomInset, spacing.md);
}

/**
 * How much room the bar occupies at the bottom of a scrolling screen.
 *
 * Every scrollable surface adds this to its bottom padding so the last row
 * can scroll clear of the floating cluster instead of hiding behind it.
 */
export function tabBarClearanceFor(bottomInset: number): number {
  return tabBarBottom(bottomInset) + TAB_BAR_HEIGHT + spacing.lg;
}

/**
 * Width the bar gives up on its right-hand side so the add button can sit
 * beside it instead of on top of it.
 */
export const tabBarRightGutter = FAB_SIZE + FAB_GAP;
