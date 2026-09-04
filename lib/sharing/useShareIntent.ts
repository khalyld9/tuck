import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { extractUrl, isLikelyUrl, titleFromUrl } from '@/lib/url';

import { subscribeToNativeShareIntent } from './nativeShareIntent';

/**
 * Share-to-Tuck.
 *
 * Two real delivery paths, no pretending:
 *
 * 1. **Deep link** — `tuck://add?url=…&title=…`. Always available, in every
 *    build, on both platforms. This is what Shortcuts, other apps, and an iOS
 *    share extension would call into.
 *
 * 2. **Native share sheet** — handled by `nativeShareIntent`, which binds to a
 *    real share-extension module when one is present in the binary. It is a
 *    no-op in Expo Go and on web, where no such module exists.
 *
 * Anything that isn't one of those is ignored — notably the app's own page URL
 * on web, which must never be mistaken for shared content.
 */

interface ParsedShare {
  url?: string;
  title?: string;
  text?: string;
}

/** Route paths that mean "the user is handing us something to save". */
const SHARE_PATHS = new Set(['add', 'share']);

/**
 * Parses a *link* into a share payload.
 *
 * Only explicit share links qualify. A bare `https://…` is deliberately NOT
 * treated as a share: on web `getInitialURL()` returns the page's own address,
 * and hijacking that would push the Add screen on every cold load.
 */
function parseLink(incoming: string): ParsedShare | null {
  if (!incoming) return null;

  try {
    const parsed = Linking.parse(incoming);
    const path = (parsed.path ?? '').replace(/^\/+/, '').toLowerCase();
    if (!SHARE_PATHS.has(path)) return null;

    const params = parsed.queryParams ?? {};
    const pick = (key: string): string | undefined => {
      const value = params[key];
      if (typeof value === 'string' && value.trim().length > 0) return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
      return undefined;
    };

    const text = pick('text') ?? pick('body');
    const url = pick('url') ?? pick('link') ?? (text ? (extractUrl(text) ?? undefined) : undefined);
    const title = pick('title') ?? pick('subject');

    if (!url && !title && !text) return null;
    return { url, title, text };
  } catch {
    return null;
  }
}

/** Parses raw shared text (the payload an OS share sheet hands over). */
function parseText(raw: string): ParsedShare | null {
  const text = raw.trim();
  if (text.length === 0) return null;
  const url = extractUrl(text);
  return { url: url ?? undefined, text };
}

function routeShare(parsed: ParsedShare): void {
  const url = parsed.url && isLikelyUrl(parsed.url) ? parsed.url : undefined;

  // Title preference: an explicit title, then non-URL shared text, then a
  // title derived locally from the link. Never a network lookup — the Add
  // screen must open instantly.
  const explicit = parsed.title?.trim();
  const textTitle =
    parsed.text && !isLikelyUrl(parsed.text.trim()) ? parsed.text.trim().slice(0, 140) : '';
  const title = explicit || textTitle || (url ? titleFromUrl(url) : '');

  if (!url && !title) return;

  router.push({
    pathname: '/add',
    params: {
      ...(url ? { sharedUrl: url } : {}),
      ...(title ? { sharedTitle: title } : {}),
      shared: '1',
    },
  });
}

export function useShareIntent(ready: boolean): void {
  const handledInitial = useRef(false);

  useEffect(() => {
    if (!ready) return;

    // Cold start via deep link.
    if (!handledInitial.current) {
      handledInitial.current = true;
      Linking.getInitialURL()
        .then((initial) => {
          if (!initial) return;
          const parsed = parseLink(initial);
          if (parsed) routeShare(parsed);
        })
        .catch(() => undefined);
    }

    // Warm deep link.
    const linkSubscription = Linking.addEventListener('url', ({ url: incoming }) => {
      const parsed = parseLink(incoming);
      if (parsed) routeShare(parsed);
    });

    // Native share sheet, when a share-extension module is present.
    const unsubscribeNative = subscribeToNativeShareIntent((payload) => {
      const parsed = payload.text
        ? { ...parseText(payload.text), title: payload.title ?? undefined }
        : { url: payload.url ?? undefined, title: payload.title ?? undefined };
      if (parsed) routeShare(parsed);
    });

    return () => {
      linkSubscription.remove();
      unsubscribeNative();
    };
  }, [ready]);
}
