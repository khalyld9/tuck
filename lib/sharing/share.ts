import * as Clipboard from 'expo-clipboard';
import { Share, type ShareContent } from 'react-native';

import { snackbar } from '@/store/useUiStore';
import type { SavedItem } from '@/types/models';

/**
 * Sharing *out* of Tuck, using the OS share sheet.
 * Falls back to the clipboard when the sheet is unavailable.
 */
export async function shareItem(item: SavedItem): Promise<void> {
  const body = item.url ? `${item.title}\n${item.url}` : item.title;

  const content: ShareContent = item.url
    ? { title: item.title, message: body, url: item.url }
    : { title: item.title, message: body };

  try {
    await Share.share(content, { subject: item.title, dialogTitle: 'Share' });
  } catch {
    try {
      await Clipboard.setStringAsync(body);
      snackbar.show('Copied to clipboard');
    } catch {
      snackbar.error("Couldn't share this item");
    }
  }
}

export async function copyToClipboard(value: string, message = 'Copied'): Promise<void> {
  try {
    await Clipboard.setStringAsync(value);
    snackbar.show(message);
  } catch {
    snackbar.error("Couldn't copy");
  }
}

/** Reads a URL from the clipboard, for the Add screen's paste affordance. */
export async function readClipboardUrl(): Promise<string | null> {
  try {
    const hasUrl = await Clipboard.hasUrlAsync().catch(() => false);
    const text = await Clipboard.getStringAsync();
    if (!text) return null;
    const trimmed = text.trim();
    if (hasUrl || /^https?:\/\//i.test(trimmed)) return trimmed;
    return null;
  } catch {
    return null;
  }
}
