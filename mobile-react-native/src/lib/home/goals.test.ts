import { describe, expect, it } from "vitest";

import { GOALS, goalByKey, goalsFor, goalStreak, goalTaskKeys, goalTitle, readGoalPrefs, reminderHour } from "./goals";
import { buildPlan, nowTasks, type PlanInput } from "./plan";
import type { LoopView } from "@/lib/memory/loops";

const TODAY = "2026-10-14";

const plan = (over: Partial<PlanInput> = {}) =>
  buildPlan({ profileId: "me", today: TODAY, hour: 9, loops: [], series: new Map(), ledger: [], conditions: [], lifeStage: "adult", ageYears: 42, pregnant: false, actions: [], logs: [], prefs: {}, ...over });

const goal = (key: string, answers: Record<string, string> = {}, since = "2026-10-10") => ({ goal: { key, since, answers } });

const overdue: LoopView = {
  key: "kft",
  type: "test_ordered",
  title: "Kidney function test",
  detail: null,
  openedOn: "2026-09-01",
  dueBy: "2026-10-10",
  status: "open",
  closedBy: null,
  sourceDocumentId: null,
  relatesTo: [],
  daysOpen: 40,
  daysToDue: -4,
  overdue: true,
};

describe("goal copy", () => {
  it("keeps every title, line and chip inside the content system's slots", () => {
    for (const g of GOALS) {
      expect(g.title.length, g.title).toBeLessThanOrEqual(30);
      expect(g.line.length, g.line).toBeLessThanOrEqual(60);
      for (const q of g.questions) {
        expect(q.ask.length, q.ask).toBeLessThanOrEqual(40);
        for (const o of q.options) expect(o.label.length, o.label).toBeLessThanOrEqual(24);
      }
    }
  });
});

describe("who can pick which goal", () => {
  const all = () => true;
  it("offers all five to an adult", () => {
    expect(goalsFor({ baby: false, gentle: false, allowed: all }).map((g) => g.key)).toEqual(["sleep", "weight", "sugar", "legs", "calm"]);
  });
  it("never offers weight or sugar to a child or in pregnancy", () => {
    const keys = goalsFor({ baby: false, gentle: true, allowed: all }).map((g) => g.key);
    expect(keys).not.toContain("weight");
    expect(keys).not.toContain("sugar");
  });
  it("offers nothing for a baby", () => {
    expect(goalsFor({ baby: true, gentle: true, allowed: all })).toEqual([]);
  });
  it("drops a goal when none of its tasks are allowed for this person", () => {
    expect(goalsFor({ baby: false, gentle: false, allowed: (k) => !["chair_stands", "stand_hourly"].includes(k) }).map((g) => g.key)).not.toContain("legs");
  });
});

describe("goal tasks", () => {
  it("starts from the base and adds what the answers point to, at most four", () => {
    const sleep = goalByKey("sleep");
    expect(sleep).not.toBeNull();
    if (!sleep) return;
    expect(goalTaskKeys(sleep, { blocker: "phone" }, { allowed: () => true })).toEqual(["same_bedtime", "sleep:rating", "sleep_wind_down"]);
    const legs = goalByKey("legs");
    if (!legs) return;
    expect(goalTaskKeys(legs, { steady: "very" }, { allowed: () => true })).toHaveLength(4);
  });
  it("sets the reminder from the answer that has an hour, else the goal's own", () => {
    const sleep = goalByKey("sleep");
    if (!sleep) return;
    expect(reminderHour(sleep, { bedtime: "23" })).toBe(22);
    expect(reminderHour(sleep, {})).toBe(21);
  });
  it("names the weight goal by the amount", () => {
    const w = goalByKey("weight");
    if (!w) return;
    expect(goalTitle(w, { amount: "5" })).toBe("Lose 5 kg");
    expect(goalTitle(w, {})).toBe("Lose a few kilos");
  });
  it("ignores a goal blob it cannot trust", () => {
    expect(readGoalPrefs({ key: "fly", since: TODAY })).toBeNull();
    expect(readGoalPrefs({ key: "sleep", since: "yesterday" })).toBeNull();
    expect(readGoalPrefs("sleep")).toBeNull();
    expect(readGoalPrefs({ key: "sleep", since: TODAY, answers: { a: 1, b: "x" } })?.answers).toEqual({ b: "x" });
  });
});

describe("the plan with a goal", () => {
  it("tags the goal's tasks and adds the missing ones, without a reason line to repeat the pill", () => {
    const p = plan({ prefs: goal("sleep", { blocker: "chai" }) });
    const tagged = p.tasks.filter((t) => t.goal).map((t) => t.key);
    expect(tagged).toEqual(expect.arrayContaining(["same_bedtime", "sleep:rating", "no_late_chai"]));
    expect(p.tasks.find((t) => t.key === "no_late_chai")).toMatchObject({ personal: true, goal: true, reason: null });
    expect(new Set(p.tasks.map((t) => t.key)).size).toBe(p.tasks.length);
    expect(p.goal).toMatchObject({ key: "sleep", day: 5, totalToday: 3, doneToday: 0 });
  });

  it("still puts what is due first, then the goal's check-ins that fit now", () => {
    const p = plan({ loops: [overdue], prefs: goal("legs", { steady: "very" }) });
    const top = nowTasks(p);
    expect(top).toHaveLength(3);
    expect(top[0]?.due).toBe(true);
    expect(top.slice(1).every((t) => t.goal)).toBe(true);
  });

  it("does not run a weight goal in pregnancy, even if one was saved", () => {
    const p = plan({ pregnant: true, prefs: goal("weight", { amount: "5" }) });
    expect(p.goal).toBeNull();
    expect(p.tasks.some((t) => t.goal)).toBe(false);
    expect(p.goals.map((g) => g.key)).not.toContain("weight");
  });

  it("offers goals when none is set, and none for a baby", () => {
    expect(plan().goals.length).toBe(5);
    expect(plan({ lifeStage: "infant", ageYears: 0 }).goals).toEqual([]);
  });
});

describe("goal streak", () => {
  const keys = ["same_bedtime", "sleep:rating"];
  const done = (day: string, stepKey = "same_bedtime") => ({ profileId: "me", day, stepKey, status: "done" as const });

  it("counts days in a row with a check-in, and an open today does not break it", () => {
    expect(goalStreak({ profileId: "me", today: TODAY, since: "2026-10-01", taskKeys: keys, actions: [done("2026-10-13"), done("2026-10-12")], logs: [] })).toBe(2);
    expect(goalStreak({ profileId: "me", today: TODAY, since: "2026-10-01", taskKeys: keys, actions: [done(TODAY), done("2026-10-13")], logs: [] })).toBe(2);
  });
  it("breaks on a missed day and counts logs as check-ins", () => {
    const logs = [{ profileId: "me", day: "2026-10-13", taskKey: "sleep:rating" }];
    expect(goalStreak({ profileId: "me", today: TODAY, since: "2026-10-01", taskKeys: keys, actions: [done("2026-10-11")], logs })).toBe(1);
  });
  it("never counts before the goal started or another member's ticks", () => {
    expect(goalStreak({ profileId: "me", today: TODAY, since: TODAY, taskKeys: keys, actions: [done("2026-10-13")], logs: [] })).toBe(0);
    expect(goalStreak({ profileId: "me", today: TODAY, since: "2026-10-01", taskKeys: keys, actions: [{ ...done("2026-10-13"), profileId: "papa" }], logs: [] })).toBe(0);
  });
});
