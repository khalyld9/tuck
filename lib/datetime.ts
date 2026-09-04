import type { Timestamp } from '@/types/models';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * "Tucked this 2 minutes ago" — warm, human relative time.
 * Deliberately vague past a week; exact dates live on the detail screen.
 */
export function relativeTime(timestamp: Timestamp, now: number = Date.now()): string {
  const diff = now - timestamp;

  if (diff < 0) return futureRelativeTime(timestamp, now);
  if (diff < 45 * 1000) return 'just now';
  if (diff < HOUR) {
    const minutes = Math.max(1, Math.round(diff / MINUTE));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const hours = Math.round(diff / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diff < 2 * DAY) return 'yesterday';
  if (diff < WEEK) {
    const days = Math.round(diff / DAY);
    return `${days} days ago`;
  }
  if (diff < 4 * WEEK) {
    const weeks = Math.round(diff / WEEK);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** "in 3 hours", "tomorrow", "in 2 weeks" — used for upcoming reminders. */
export function futureRelativeTime(timestamp: Timestamp, now: number = Date.now()): string {
  const diff = timestamp - now;
  if (diff <= 0) return 'now';
  if (diff < HOUR) {
    const minutes = Math.max(1, Math.round(diff / MINUTE));
    return `in ${minutes} min`;
  }
  if (diff < DAY) {
    const hours = Math.round(diff / HOUR);
    return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  if (diff < 2 * DAY) return 'tomorrow';
  if (diff < WEEK) {
    const days = Math.round(diff / DAY);
    return `in ${days} days`;
  }
  const weeks = Math.round(diff / WEEK);
  if (weeks < 5) return `in ${weeks} week${weeks === 1 ? '' : 's'}`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Full, unambiguous date for detail screens: "12 March 2025". */
export function formatFullDate(timestamp: Timestamp): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "Sat 14 Jun, 09:00" — reminder rows. */
export function formatDateTime(timestamp: Timestamp): string {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function formatTime(timestamp: Timestamp): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Time-of-day greeting used on Home. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Winding down';
}

// ─── Reminder presets ──────────────────────────────────────────────────────

export interface ReminderPreset {
  id: string;
  label: string;
  /** Short description shown under the label, e.g. "Sat, 10:00". */
  describe: (date: Date) => string;
  resolve: (from?: Date) => Date;
}

function atHour(date: Date, hour: number, minute = 0): Date {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export const REMINDER_PRESETS: readonly ReminderPreset[] = [
  {
    id: 'later-today',
    label: 'Later today',
    describe: (date) => formatTime(date.getTime()),
    resolve: (from = new Date()) => {
      const evening = atHour(from, 19);
      // If it's already evening, fall forward three hours instead.
      return evening.getTime() - from.getTime() > 45 * MINUTE
        ? evening
        : new Date(from.getTime() + 3 * HOUR);
    },
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow',
    describe: (date) => formatTime(date.getTime()),
    resolve: (from = new Date()) => atHour(addDays(from, 1), 9),
  },
  {
    id: 'this-weekend',
    label: 'This weekend',
    describe: (date) => date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
    resolve: (from = new Date()) => {
      const day = from.getDay(); // 0 Sun … 6 Sat
      // Aim for Saturday morning; if it's already the weekend, use next Saturday.
      const daysUntilSaturday = day === 6 ? 7 : (6 - day + 7) % 7 || 7;
      return atHour(addDays(from, daysUntilSaturday), 10);
    },
  },
  {
    id: 'next-week',
    label: 'Next week',
    describe: (date) => date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
    resolve: (from = new Date()) => atHour(addDays(from, 7), 9),
  },
] as const;

/** True when the reminder is in the past (so the UI can mark it as missed). */
export function isPast(timestamp: Timestamp | null, now: number = Date.now()): boolean {
  return timestamp !== null && timestamp <= now;
}

export function isToday(timestamp: Timestamp, now: number = Date.now()): boolean {
  const a = new Date(timestamp);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
