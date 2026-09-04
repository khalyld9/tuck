import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local reminders.
 *
 * Everything here is on-device: expo-notifications schedules against the OS
 * scheduler, so reminders fire with no server, no push token, and no network.
 */

export const REMINDER_CHANNEL_ID = 'reminders';

let handlerConfigured = false;

/** Foreground presentation + Android channel. Safe to call more than once. */
export async function configureNotifications(): Promise<void> {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: '#A85C2C',
      sound: null,
      showBadge: false,
    }).catch(() => undefined);
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermissionState(): Promise<PermissionState> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    // Simulators can schedule notifications on iOS but not deliver reliably;
    // web has no scheduling API in Expo. Report honestly instead of pretending.
    if (Platform.OS === 'web') return 'unsupported';
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unsupported';
  }
}

/** Requests permission, returning the resulting state. */
export async function requestPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return 'granted';

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    if (status === 'granted') return 'granted';
    return status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'unsupported';
  }
}

export interface ScheduleResult {
  notificationId: string | null;
  /** Why scheduling didn't happen, when it didn't. */
  reason?: 'permission-denied' | 'unsupported' | 'in-past' | 'error';
}

/**
 * Schedules the reminder notification for an item.
 * Returns the notification id so it can be cancelled or rescheduled later.
 */
export async function scheduleReminder(params: {
  itemId: string;
  title: string;
  fireAt: number;
}): Promise<ScheduleResult> {
  const { itemId, title, fireAt } = params;

  if (Platform.OS === 'web') return { notificationId: null, reason: 'unsupported' };
  if (fireAt <= Date.now() + 1000) return { notificationId: null, reason: 'in-past' };

  const permission = await requestPermission();
  if (permission !== 'granted') {
    return {
      notificationId: null,
      reason: permission === 'unsupported' ? 'unsupported' : 'permission-denied',
    };
  }

  await configureNotifications();

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tuck',
        body: `You saved "${truncate(title, 60)}" to check out later.`,
        data: { itemId, url: `tuck://item/${itemId}` },
        sound: undefined,
        ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireAt),
        ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
      },
    });
    return { notificationId };
  } catch {
    return { notificationId: null, reason: 'error' };
  }
}

export async function cancelReminder(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already fired or cancelled — nothing to do.
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export async function getScheduledCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
