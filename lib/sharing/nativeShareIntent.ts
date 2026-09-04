import { Platform } from 'react-native';

/**
 * Native share-sheet bridge — the platform-specific seam.
 *
 * ## What is actually true today
 *
 * Receiving a payload from the OS share sheet requires native code that lives
 * *outside* the JS bundle:
 *
 * - **iOS** needs a Share Extension target (a second bundle) added to the
 *   Xcode project.
 * - **Android** needs the `ACTION_SEND` intent's `EXTRA_TEXT`, which is not
 *   exposed by `expo-linking` (that only surfaces the intent's *data* URI).
 *   The intent filter is already declared in `app.json`, so Tuck appears in
 *   the Android share sheet — but reading the extra needs a native module.
 *
 * Neither is available in Expo Go or on web. Rather than fake it, this module
 * binds to a share-intent native module **only if one is present in the
 * binary**, and otherwise does nothing. The app's other share path — the
 * `tuck://add?url=…` deep link — works everywhere, right now, with no native
 * code at all.
 *
 * ## Adding the real extension later
 *
 * Install `expo-share-intent` (or a custom module), add its config plugin, and
 * rebuild. This file will pick it up automatically: no other part of Tuck
 * needs to change, because everything downstream consumes `SharePayload`.
 */

export interface SharePayload {
  url?: string | null;
  title?: string | null;
  text?: string | null;
}

export type ShareIntentListener = (payload: SharePayload) => void;

type Unsubscribe = () => void;

/** Shape we expect from a share-intent module, kept minimal on purpose. */
interface ShareIntentModule {
  addListener?: (event: string, handler: (payload: unknown) => void) => { remove: () => void };
  getInitialShareIntent?: () => Promise<unknown>;
}

function coercePayload(raw: unknown): SharePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;

  const asString = (key: string): string | null => {
    const candidate = value[key];
    return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
  };

  const payload: SharePayload = {
    url: asString('url') ?? asString('weburl'),
    title: asString('title') ?? asString('subject'),
    text: asString('text') ?? asString('value'),
  };

  return payload.url || payload.title || payload.text ? payload : null;
}

/**
 * Resolves a share-intent native module if the binary ships one.
 * The require is dynamic and guarded so a missing module is a no-op rather
 * than a crash.
 */
function resolveModule(): ShareIntentModule | null {
  if (Platform.OS === 'web') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const candidate = require('expo-share-intent') as ShareIntentModule | undefined;
    if (candidate && (candidate.addListener || candidate.getInitialShareIntent)) {
      return candidate;
    }
  } catch {
    // Not installed in this binary — expected in Expo Go and the default build.
  }

  return null;
}

/**
 * Subscribes to share-sheet payloads.
 * Returns an unsubscribe function; safe to call when no module exists.
 */
export function subscribeToNativeShareIntent(listener: ShareIntentListener): Unsubscribe {
  const module = resolveModule();
  if (!module) return () => undefined;

  let active = true;

  // Cold start: the app was launched by the share sheet.
  module
    .getInitialShareIntent?.()
    .then((raw) => {
      if (!active) return;
      const payload = coercePayload(raw);
      if (payload) listener(payload);
    })
    .catch(() => undefined);

  const subscription = module.addListener?.('onChangeShareIntent', (raw) => {
    if (!active) return;
    const payload = coercePayload(raw);
    if (payload) listener(payload);
  });

  return () => {
    active = false;
    subscription?.remove();
  };
}

/** True when this build can receive payloads from the OS share sheet. */
export function isNativeShareIntentAvailable(): boolean {
  return resolveModule() !== null;
}
