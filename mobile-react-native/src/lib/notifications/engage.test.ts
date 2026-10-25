import { describe, expect, it } from "vitest";

import { DAILY_CAP, NUDGE_LIMIT, engagementPlan, nudgePrefix, type EngageInput } from "./engage";

// Wednesday 14 October 2026, local time.
const morning = new Date(2026, 9, 14, 7, 0);

const base = (over: Partial<EngageInput> = {}): EngageInput => ({
  now: morning,
  profileId: "me",
  name: null,
  primary: true,
  switches: { dailyNudges: true, medicineReminders: true },
  todayUnlocked: true,
  meds: {
    remind: true,
    slots: [
      { slot: "morning", time: "08:00", count: 2, taken: false },
      { slot: "night", time: "21:00", count: 1, taken: false },
    ],
    low: [],
  },
  plan: { openToday: 12, doneToday: 0, lunchLogged: false, stepsOpen: true, dueSoon: 1 },
  goal: { hour: 19, remind: true, doneToday: false },
  streak: 4,
  ...over,
});

const onDay = (list: ReturnType<typeof engagementPlan>, date: number) => list.filter((n) => n.at.getDate() === date);
const mins = (d: Date) => d.getHours() * 60 + d.getMinutes();

describe("the day's nudges", () => {
  it("reminds at each dose time and checks back an hour later", () => {
    const today = onDay(engagementPlan(base()), 14);
    const doses = today.filter((n) => n.kind === "dose").map((n) => mins(n.at));
    expect(doses).toEqual([8 * 60, 21 * 60]);
    expect(today.find((n) => n.kind === "dose_check")?.at.getHours()).toBe(9);
    // The night check would land at 10 pm: quiet hours.
    expect(today.filter((n) => n.kind === "dose_check")).toHaveLength(1);
  });

  it("drops a dose reminder and its check once the doses are ticked", () => {
    const meds = { remind: true, low: [], slots: [{ slot: "morning" as const, time: "08:00", count: 2, taken: true }] };
    expect(onDay(engagementPlan(base({ meds })), 14).some((n) => n.kind.startsWith("dose"))).toBe(false);
    // Tomorrow is planned as if nothing is done yet.
    expect(onDay(engagementPlan(base({ meds })), 15).some((n) => n.kind === "dose")).toBe(true);
  });

  it("keeps daily nudges to the cap, 90 minutes apart from everything, out of quiet hours", () => {
    for (const date of [14, 15]) {
      const day = onDay(engagementPlan(base()), date).sort((a, b) => a.at.getTime() - b.at.getTime());
      expect(day.filter((n) => !n.kind.startsWith("dose")).length).toBeLessThanOrEqual(DAILY_CAP);
      for (const n of day.filter((x) => !x.kind.startsWith("dose"))) {
        expect(mins(n.at)).toBeGreaterThanOrEqual(7 * 60 + 30);
        expect(mins(n.at)).toBeLessThan(22 * 60);
        for (const o of day) if (o !== n) expect(Math.abs(o.at.getTime() - n.at.getTime())).toBeGreaterThanOrEqual(90 * 60_000);
      }
    }
  });

  it("moves the morning nudge past a dose instead of stacking them", () => {
    const m = engagementPlan(base({ plan: { openToday: 5, doneToday: 0, lunchLogged: true, stepsOpen: false, dueSoon: 0 }, goal: null })).find((n) => n.kind === "morning");
    // The dose at 8 and its check at 9 both keep 90 minutes clear.
    expect(m && mins(m.at)).toBe(10 * 60 + 30);
  });

  it("only nudges about what still matters today", () => {
    const busy = onDay(engagementPlan(base({ plan: { openToday: 4, doneToday: 6, lunchLogged: true, stepsOpen: false, dueSoon: 0 }, goal: { hour: 19, remind: true, doneToday: true } })), 14).map((n) => n.kind);
    expect(busy).not.toContain("lunch");
    expect(busy).not.toContain("streak");
    expect(busy).not.toContain("goal");
    expect(busy).not.toContain("walk");
    expect(busy).not.toContain("due");
  });

  it("warns before a strip runs out", () => {
    const meds = { remind: true, slots: [], low: [3] };
    const r = engagementPlan(base({ meds })).filter((n) => n.kind === "refill");
    expect(r.map((n) => n.body)).toEqual(["About 3 days left. Tap to refill before it runs out.", "About 2 days left. Tap to refill before it runs out."]);
    expect(r[0]?.url).toBe("/medicines");
  });

  it("gives a family member their dose reminders and what's due; the check and refills come from the server", () => {
    const kinds = new Set(engagementPlan(base({ primary: false, name: "Papa Sharma", profileId: "papa" })).map((n) => n.kind));
    expect([...kinds].sort()).toEqual(["dose", "due"]);
    const title = engagementPlan(base({ primary: false, name: "Papa Sharma", profileId: "papa" })).find((n) => n.kind === "dose")?.title;
    expect(title).toBe("Papa's morning doses are due");
  });

  it("listens to both switches and to the member's own", () => {
    expect(engagementPlan(base({ switches: { dailyNudges: false, medicineReminders: true } })).every((n) => n.kind.startsWith("dose"))).toBe(true);
    expect(engagementPlan(base({ switches: { dailyNudges: true, medicineReminders: false } })).some((n) => n.kind.startsWith("dose"))).toBe(false);
    expect(engagementPlan(base({ meds: { remind: false, slots: [{ slot: "morning", time: "08:00", count: 1, taken: false }], low: [] } })).some((n) => n.kind.startsWith("dose"))).toBe(false);
    expect(engagementPlan(base({ todayUnlocked: false })).every((n) => n.kind.startsWith("dose"))).toBe(true);
  });

  it("names nothing on the lock screen, and stays inside the slot limits", () => {
    const all = [
      ...engagementPlan(base({ now: new Date(2026, 9, 18, 6, 0), meds: { remind: true, slots: [{ slot: "afternoon", time: "14:00", count: 1, taken: false }], low: [0] } })),
      // A quiet Sunday: nothing due, no goal, no streak, so the habit nudges get their turn.
      ...engagementPlan(base({ now: new Date(2026, 9, 18, 6, 0), meds: null, goal: null, streak: 0, plan: { openToday: 9, doneToday: 0, lunchLogged: false, stepsOpen: true, dueSoon: 0 } })),
      ...engagementPlan(base({ primary: false, name: "Abcdefghijklmnop Q", meds: { remind: true, slots: [{ slot: "afternoon", time: "14:00", count: 3, taken: false }], low: [1] } })),
    ];
    const kinds = new Set(all.map((n) => n.kind));
    for (const k of ["dose", "dose_check", "refill", "due", "goal", "streak", "morning", "lunch", "walk", "sunday"]) expect(kinds, k).toContain(k);
    for (const n of all) {
      expect(n.title.length, n.title).toBeLessThanOrEqual(NUDGE_LIMIT.title);
      expect(n.body.length, n.body).toBeLessThanOrEqual(NUDGE_LIMIT.body);
      expect(`${n.title} ${n.body}`).not.toMatch(/—|!!|don't forget|you missed|warning/i);
      expect(n.id.startsWith(nudgePrefix(n.id.includes("-me-") ? "me" : "papa")) || n.id.startsWith("eng-")).toBe(true);
    }
  });

  it("gives every nudge a stable id per day, so planning again replaces it", () => {
    const a = engagementPlan(base()).map((n) => n.id);
    const b = engagementPlan(base({ now: new Date(2026, 9, 14, 7, 30) })).map((n) => n.id);
    expect(new Set(a).size).toBe(a.length);
    expect(b.every((id) => a.includes(id))).toBe(true);
  });

  it("never schedules into the past", () => {
    const late = engagementPlan(base({ now: new Date(2026, 9, 14, 21, 30) }));
    expect(late.every((n) => n.at.getTime() > new Date(2026, 9, 14, 21, 31).getTime())).toBe(true);
  });
});
