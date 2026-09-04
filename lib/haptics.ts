import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics wrapper.
 *
 * The user can switch haptics off in Settings, so every call routes through
 * here. The enabled flag is pushed in from the settings store rather than read
 * from it, which keeps this module free of store imports (no cycles) and lets
 * gesture handlers fire feedback from the UI thread without a subscription.
 */

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function getHapticsEnabled(): boolean {
  return enabled;
}

/** Web has no haptics API; calling into it throws, so short-circuit. */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function run(action: () => Promise<void>): void {
  if (!enabled || !supported) return;
  // Fire-and-forget: feedback must never block or reject into the UI.
  action().catch(() => undefined);
}

/** Light tap — chips, toggles, tab presses. */
export function selection(): void {
  run(() => Haptics.selectionAsync());
}

/** Card presses and secondary buttons. */
export function light(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Swipe action thresholds, favourite toggles. */
export function medium(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Reserved for the Surprise Me reveal. */
export function heavy(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

/** Successful save. */
export function success(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warning(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function error(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

export const haptics = {
  selection,
  light,
  medium,
  heavy,
  success,
  warning,
  error,
  setEnabled: setHapticsEnabled,
  isEnabled: getHapticsEnabled,
};
