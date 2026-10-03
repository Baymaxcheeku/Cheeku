import type { InboxFilter, InboxItem } from "./types";

/*
 * Pure helpers behind the inbox screen and the reminders. No React, no
 * network, so every rule here has a test.
 */

export function unreadCount(items: readonly InboxItem[]): number {
  return items.reduce((n, i) => (i.readAt ? n : n + 1), 0);
}

/**
 * New first, read after. The inbox shows new ones in full and folds the read
 * ones into one group you can open, so a busy week does not bury what still
 * needs a look. Newest first inside each.
 */
export function splitByRead(items: readonly InboxItem[]): { fresh: InboxItem[]; seen: InboxItem[] } {
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { fresh: sorted.filter((i) => !i.readAt), seen: sorted.filter((i) => Boolean(i.readAt)) };
}

/** The ids "Clear read" removes: everything already read, nothing new. */
export function readIds(items: readonly InboxItem[]): string[] {
  return items.filter((i) => Boolean(i.readAt)).map((i) => i.id);
}

export function applyFilter(items: readonly InboxItem[], filter: InboxFilter): InboxItem[] {
  if (filter === "all") return [...items];
  if (filter === "unread") return items.filter((i) => !i.readAt);
  return items.filter((i) => i.category === filter);
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export type InboxSection = { title: string; items: InboxItem[] };

/**
 * Today, Yesterday, Earlier this week, Earlier. Newest first inside each, and
 * empty sections are left out rather than shown with nothing under them.
 */
export function groupByDay(items: readonly InboxItem[], now = new Date()): InboxSection[] {
  const today = startOfDay(now);
  const day = 86_400_000;
  const buckets: InboxSection[] = [
    { title: "Today", items: [] },
    { title: "Yesterday", items: [] },
    { title: "Earlier this week", items: [] },
    { title: "Earlier", items: [] },
  ];
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const item of sorted) {
    const t = new Date(item.createdAt).getTime();
    const idx = t >= today ? 0 : t >= today - day ? 1 : t >= today - 6 * day ? 2 : 3;
    buckets[idx]?.items.push(item);
  }
  return buckets.filter((b) => b.items.length > 0);
}

/** "Just now", "5 min", "3 h", "Yesterday", "Mon", "4 Aug". */
export function relativeTime(iso: string, now = new Date()): string {
  const t = new Date(iso);
  const mins = Math.floor((now.getTime() - t.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min`;
  if (t.getTime() >= startOfDay(now)) return `${Math.floor(mins / 60)} h`;
  const days = Math.round((startOfDay(now) - startOfDay(t)) / 86_400_000);
  if (days === 1) return "Yesterday";
  if (days < 7) return t.toLocaleDateString("en-IN", { weekday: "short" });
  return t.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ----------------------------------------------------------- reminders --

export type Reminder = {
  /** Stable, so a reschedule replaces rather than duplicates. */
  id: string;
  at: Date;
  title: string;
  body: string;
};

/*
 * Nobody wants "your appointment is tomorrow" at 2 am. A reminder that would
 * land between 10 pm and 7 am moves to 8 pm the evening before the visit.
 */
function outOfQuietHours(at: Date, start: Date): Date {
  const h = at.getHours();
  if (h < 22 && h >= 7) return at;
  const moved = new Date(start);
  moved.setDate(moved.getDate() - 1);
  moved.setHours(20, 0, 0, 0);
  return moved;
}

/**
 * The phone reminders for one booking. Generic on purpose: the text shows on
 * a locked screen, so it says "video call" or "clinic visit" and a time, never
 * the doctor, the department or what it is about.
 *
 * Online: the day before, an hour before, and when the room opens.
 * Clinic: the day before, and two hours before, to leave time to travel.
 * Anything already in the past, or less than a minute away, is skipped.
 */
export function reminderPlan(
  appt: { id: string; mode: "online" | "clinic"; start: Date; time: string },
  now = new Date(),
): Reminder[] {
  const s = appt.start.getTime();
  const online = appt.mode === "online";
  const what = online ? "video call" : "clinic visit";
  const plan: Reminder[] = [
    {
      id: `appt-${appt.id}-day`,
      at: outOfQuietHours(new Date(s - 24 * 3_600_000), appt.start),
      title: `Tomorrow: your ${what}`,
      body: online ? `Starts at ${appt.time}. I'll ping you when the room opens.` : `Be there by ${appt.time}. Tap for directions.`,
    },
    online
      ? {
          id: `appt-${appt.id}-hour`,
          at: new Date(s - 60 * 60_000),
          title: "Your video call is in an hour",
          body: "Keep your reports handy. Tap to see the details.",
        }
      : {
          id: `appt-${appt.id}-leave`,
          at: new Date(s - 2 * 60 * 60_000),
          title: "Clinic visit in 2 hours",
          body: `Time to plan the trip. Your slot starts at ${appt.time}.`,
        },
  ];
  if (online) {
    plan.push({
      id: `appt-${appt.id}-join`,
      at: new Date(s - 15 * 60_000),
      title: "Your call room is open",
      body: "Tap to join. Find a quiet spot with good network.",
    });
  }
  return plan.filter((r) => r.at.getTime() > now.getTime() + 60_000);
}
