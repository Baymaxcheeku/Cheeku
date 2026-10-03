import { describe, expect, it } from "vitest";

import { applyFilter, groupByDay, readIds, relativeTime, reminderPlan, splitByRead, unreadCount } from "./inbox";
import type { InboxItem } from "./types";

const NOW = new Date(2026, 8, 30, 15, 0); // Wed 30 Sep 2026, 3 pm local

function item(id: string, createdAt: Date, over: Partial<InboxItem> = {}): InboxItem {
  return {
    id,
    kind: "report_ready",
    category: "reports",
    title: id,
    body: "",
    route: null,
    profileId: null,
    documentId: null,
    data: {},
    createdAt: createdAt.toISOString(),
    readAt: null,
    ...over,
  };
}

describe("inbox helpers", () => {
  const items = [
    item("today", new Date(2026, 8, 30, 9)),
    item("yesterday", new Date(2026, 8, 29, 22), { readAt: "x", category: "account", kind: "plan_changed" }),
    item("week", new Date(2026, 8, 26, 10), { category: "appointments", kind: "appointment_booked" }),
    item("old", new Date(2026, 7, 4, 10), { readAt: "x" }),
  ];

  it("counts unread", () => {
    expect(unreadCount(items)).toBe(2);
  });

  it("filters by unread and by category", () => {
    expect(applyFilter(items, "unread").map((i) => i.id)).toEqual(["today", "week"]);
    expect(applyFilter(items, "account").map((i) => i.id)).toEqual(["yesterday"]);
    expect(applyFilter(items, "all")).toHaveLength(4);
  });

  it("groups into day sections, newest first, dropping empty ones", () => {
    const sections = groupByDay([...items].reverse(), NOW);
    expect(sections.map((s) => s.title)).toEqual(["Today", "Yesterday", "Earlier this week", "Earlier"]);
    expect(groupByDay([items[0] as InboxItem], NOW).map((s) => s.title)).toEqual(["Today"]);
  });

  it("writes short relative times", () => {
    expect(relativeTime(new Date(2026, 8, 30, 14, 59, 40).toISOString(), NOW)).toBe("Just now");
    expect(relativeTime(new Date(2026, 8, 30, 14, 40).toISOString(), NOW)).toBe("20 min");
    expect(relativeTime(new Date(2026, 8, 30, 9).toISOString(), NOW)).toBe("6 h");
    expect(relativeTime(new Date(2026, 8, 29, 23).toISOString(), NOW)).toBe("Yesterday");
  });
});

describe("reminderPlan", () => {
  it("gives an online call three reminders: day before, hour before, room open", () => {
    const start = new Date(2026, 9, 2, 10, 30);
    const plan = reminderPlan({ id: "a1", mode: "online", start, time: "10:30 am" }, NOW);
    expect(plan.map((r) => r.id)).toEqual(["appt-a1-day", "appt-a1-hour", "appt-a1-join"]);
    expect(plan[2]?.at.getTime()).toBe(start.getTime() - 15 * 60_000);
  });

  it("gives a clinic visit a day-before and a time-to-leave reminder", () => {
    const start = new Date(2026, 9, 2, 18, 0);
    const plan = reminderPlan({ id: "c1", mode: "clinic", start, time: "6:00 pm" }, NOW);
    expect(plan.map((r) => r.id)).toEqual(["appt-c1-day", "appt-c1-leave"]);
  });

  it("moves a night-time day-before reminder to 8 pm the evening before", () => {
    const start = new Date(2026, 9, 2, 6, 30); // 6:30 am, so 24 h before is 6:30 am
    const day = reminderPlan({ id: "e1", mode: "online", start, time: "6:30 am" }, NOW)[0];
    expect(day?.at.getHours()).toBe(20);
    expect(day?.at.getDate()).toBe(1);
  });

  it("skips reminders that are already in the past", () => {
    const start = new Date(2026, 8, 30, 15, 30); // in 30 minutes
    const plan = reminderPlan({ id: "s1", mode: "online", start, time: "3:30 pm" }, NOW);
    expect(plan.map((r) => r.id)).toEqual(["appt-s1-join"]);
  });

  it("never puts a doctor or a department in the text", () => {
    const start = new Date(2026, 9, 2, 10, 30);
    const text = reminderPlan({ id: "a1", mode: "online", start, time: "10:30 am" }, NOW)
      .map((r) => `${r.title} ${r.body}`)
      .join(" ");
    expect(text).not.toMatch(/Dr\.?\s|derm|gyn|cardio/i);
  });
});

describe("read and new", () => {
  const items = [
    item("old-read", new Date(2026, 7, 4, 10), { readAt: "x" }),
    item("new-1", new Date(2026, 8, 30, 9)),
    item("read-1", new Date(2026, 8, 29, 22), { readAt: "x" }),
    item("new-2", new Date(2026, 8, 30, 11)),
  ];

  it("splits new from read, newest first in each", () => {
    const { fresh, seen } = splitByRead(items);
    expect(fresh.map((i) => i.id)).toEqual(["new-2", "new-1"]);
    expect(seen.map((i) => i.id)).toEqual(["read-1", "old-read"]);
  });

  it("clears only what has been read", () => {
    expect(readIds(items).sort()).toEqual(["old-read", "read-1"]);
    expect(readIds(items.filter((i) => !i.readAt))).toEqual([]);
  });
});
