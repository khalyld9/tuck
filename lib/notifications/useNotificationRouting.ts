import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Opens the relevant item when the user taps a reminder notification.
 *
 * Handles both the cold-start case (app launched *by* the notification) and
 * the warm case (app already running).
 */
export function useNotificationRouting(ready: boolean): void {
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;

    let cancelled = false;

    function openItem(response: Notifications.NotificationResponse | null) {
      if (!response || cancelled) return;
      const data = response.notification.request.content.data as { itemId?: unknown };
      const itemId = typeof data?.itemId === 'string' ? data.itemId : null;
      if (!itemId) return;
      router.push(`/item/${itemId}`);
    }

    // Cold start: the app was launched by tapping the notification.
    Notifications.getLastNotificationResponseAsync()
      .then(openItem)
      .catch(() => undefined);

    // Warm: tapped while the app is running or backgrounded.
    const subscription = Notifications.addNotificationResponseReceivedListener(openItem);

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [ready]);
}
