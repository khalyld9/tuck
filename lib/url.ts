/**
 * URL helpers — entirely local. Tuck never sends a saved link anywhere.
 */

/** Extracts a display domain ("theverge.com") from a URL string. */
export function getDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  try {
    const parsed = new URL(hasScheme(trimmed) ? trimmed : `https://${trimmed}`);
    return parsed.hostname.replace(/^www\./i, '') || null;
  } catch {
    // Fall back to a regex for inputs `URL` rejects (rare, but never throw).
    const match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?([^/\s?#]+)/i);
    return match?.[1] ?? null;
  }
}

function hasScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

/** Adds https:// when the user typed a bare domain, so the link is openable. */
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;
  if (hasScheme(trimmed)) return trimmed;
  // Only prefix things that actually look like a host.
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/** True when the string can plausibly be opened in a browser. */
export function isLikelyUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || /\s/.test(trimmed)) return false;
  return hasScheme(trimmed) || /^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed);
}

/** Finds the first URL inside a block of shared text. */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s<>"')]+/i);
  if (match?.[0]) return match[0];
  const bare = text.match(/\b[\w-]+(?:\.[\w-]+)+(?:\/[^\s<>"')]*)?/);
  return bare?.[0] && isLikelyUrl(bare[0]) ? bare[0] : null;
}

/**
 * Derives a readable title from a URL when the share sheet gives us nothing
 * else — e.g. "https://theverge.com/2024/mac-mini-review" → "Mac Mini Review".
 * Purely string work: no network request, so it can never delay a save.
 */
export function titleFromUrl(url: string | null | undefined): string {
  const domain = getDomain(url);
  if (!url || !domain) return '';

  try {
    const parsed = new URL(hasScheme(url) ? url : `https://${url}`);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];

    if (last && last.length > 2) {
      const cleaned = last
        .replace(/\.(html?|php|aspx?)$/i, '')
        .replace(/[-_+]+/g, ' ')
        .replace(/\b\d{4,}\b/g, '')
        .trim();
      if (cleaned.length > 2) {
        return cleaned
          .split(/\s+/)
          .slice(0, 10)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
  } catch {
    // ignore — fall through to the domain
  }

  // Fall back to a capitalised domain name ("theverge.com" → "Theverge").
  const base = domain.split('.')[0] ?? domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
