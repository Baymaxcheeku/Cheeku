import { describe, expect, it } from "vitest";

import type { LoopView } from "@/lib/memory/loops";
import type { Series } from "@/lib/memory/series";

import { NUDGES, unlockRows, viaLine } from "./content";
import { decideStage, forward, readHomeState } from "./rules";
import { CATALOG } from "./catalog";
import { dayPlate, PLATE_TAGS, readPlate } from "./meals";
import { buildPlan, stepsTarget, type DailyLog, type PlanInput } from "./plan";
import { dueRows, familyAlerts, pillarsThisWeek, streakOf, weekOf } from "./today";

const TODAY = "2026-10-14"; // a Wednesday

describe("decideStage mirrors home_decide in 0033", () => {
  it("starts a new family on starter", () => {
    expect(decideStage({})).toEqual({ stage: "starter", via: null, items: 0 });
  });

  it("keeps a chat-only family on building, however much they chat, while the chat unlock is off", () => {
    expect(decideStage({ asked: true, chats: 40, chat_days: 9, facts: 12 }).stage).toBe("building");
  });

  it("opens Today with one record, naming what unlocked it", () => {
    expect(decideStage({ report: true })).toEqual({ stage: "today", via: "report", items: 1 });
    expect(decideStage({ medicines: true, asked: true }).via).toBe("medicines");
    expect(decideStage({ prescription: true, report: true }).via).toBe("report");
  });

  it("puts a family with only a second member on building", () => {
    expect(decideStage({ family: true }).stage).toBe("building");
  });

  it("lets chat volume unlock only when config switches it on", () => {
    const on = { unlock_items: 1, chat_unlock: { enabled: true, chats: 5, days: 2, facts: 3 } };
    expect(decideStage({ asked: true, chats: 5, chat_days: 2, facts: 3 }, on)).toMatchObject({ stage: "today", via: "chat" });
    expect(decideStage({ asked: true, chats: 5, chat_days: 1, facts: 3 }, on).stage).toBe("building");
  });

  it("respects a higher threshold", () => {
    expect(decideStage({ report: true }, { unlock_items: 2 }).stage).toBe("building");
    expect(decideStage({ report: true, lab: true }, { unlock_items: 2 }).stage).toBe("today");
  });
});

describe("the ratchet", () => {
  it("never moves a family back", () => {
    expect(forward("today", "starter")).toBe("today");
    expect(forward("building", "starter")).toBe("building");
    expect(forward("starter", "today")).toBe("today");
    expect(forward(null, "building")).toBe("building");
  });
});

describe("readHomeState", () => {
  it("lands a malformed answer on starter instead of crashing", () => {
    expect(readHomeState(null).stage).toBe("starter");
    expect(readHomeState({ stage: "party" }).stage).toBe("starter");
  });

  it("reads the due list and drops rows missing what the screen needs", () => {
    const s = readHomeState({
      stage: "today",
      unlocked_via: "report",
      due: [
        { id: "1", source: "loop", type: "test_ordered", profile_id: "papa", title: "Kidney function test", detail: null, due_by: "2026-10-10" },
        { id: "2", source: "lab", type: "lab_visit", profile_id: "me", title: "", due_by: "2026-10-15" },
      ],
      done_days: ["2026-10-13", 4],
    });
    expect(s.due).toHaveLength(1);
    expect(s.due[0]?.dueBy).toBe("2026-10-10");
    expect(s.doneDays).toEqual(["2026-10-13"]);
  });
});

// ------------------------------------------------------------------ Today --

const series = (key: string, flag: string, name = key): Series => ({
  key,
  name,
  unit: null,
  points: [],
  latest: { date: "2026-09-01", value: 1, source: "record", documentId: null, factId: null, refRange: null, flag },
  previous: null,
  delta: null,
  direction: null,
  ratePerDay: null,
  baseline: null,
  fromBaseline: null,
  pctFromFirst: null,
});

const loop = (over: Partial<LoopView> = {}): LoopView => ({
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
  ...over,
});


const plan = (over: Partial<PlanInput> = {}) =>
  buildPlan({ profileId: "me", today: TODAY, hour: 9, loops: [], series: new Map(), ledger: [], conditions: [], lifeStage: "adult", ageYears: 42, pregnant: false, actions: [], logs: [], prefs: {}, ...over });

const log = (over: Partial<DailyLog>): DailyLog => ({ id: "x", profileId: "me", day: TODAY, taskKey: "steps", pillar: "move", kind: "steps", slot: null, value: null, valueText: null, unit: null, tags: [], photoPath: null, createdAt: "", ...over });

describe("buildPlan", () => {
  it("always carries the daily spine across all five pillars", () => {
    const p = plan();
    const keys = p.tasks.map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(["steps", "meal:breakfast", "meal:lunch", "meal:snacks", "meal:dinner", "sleep:rating", "mind:breathing"]));
    for (const pillar of ["move", "eat", "sleep", "mind", "check"] as const) expect(p.byPillar[pillar].length, pillar).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("puts an overdue test first and makes it the hero, with a way to book it", () => {
    const p = plan({ loops: [loop()] });
    expect(p.tasks[0]).toMatchObject({ due: true, title: "Book your Kidney function test", cta: { route: "/labs" } });
    expect(p.hero?.key).toBe(p.tasks[0]?.key);
  });

  it("adds personal checks and habits with the reason in their own numbers", () => {
    const p = plan({ series: new Map([["bp_systolic", series("bp_systolic", "high", "BP systolic")]]), today: "2026-10-14" });
    const bp = p.tasks.find((t) => t.key === "reading:bp");
    expect(bp).toMatchObject({ personal: true, kind: "reading" });
    expect(bp?.reason).toMatch(/BP systolic came back high/);
    expect(p.tasks.filter((t) => t.personal && t.kind === "habit" && t.area === "bp").length).toBeGreaterThan(0);
  });

  it("names the medicines behind the medicines task", () => {
    const p = plan({ ledger: [{ name: "Telma 40", status: "active" }, { name: "Metformin 500", status: "active" }] });
    expect(p.tasks.find((t) => t.key === "meds_taken")?.reason).toBe("You take Telma and Metformin");
  });

  it("caps personal habits at four", () => {
    const p = plan({ conditions: ["diabetes", "hypertension", "high cholesterol", "fatty liver"] });
    expect(p.tasks.filter((t) => t.personal && t.kind === "habit" && !t.due).length).toBe(4);
  });

  it("keeps one general habit per pillar alongside the personal ones", () => {
    const p = plan({ conditions: ["diabetes"] });
    for (const pillar of ["move", "eat", "sleep", "mind", "check"] as const) expect(p.byPillar[pillar].some((t) => !t.personal && t.kind === "habit"), pillar).toBe(true);
  });

  it("never offers more water to someone whose kidneys are flagged", () => {
    for (let d = 1; d <= 28; d++) {
      const keys = plan({ conditions: ["CKD stage 3"], today: `2026-11-${String(d).padStart(2, "0")}` }).tasks.map((t) => t.key);
      expect(keys).not.toContain("water_before_meals");
      expect(keys).not.toContain("water_glasses");
    }
  });

  it("only gives the thyroid tablet task to someone on one", () => {
    expect(plan({ series: new Map([["tsh", series("tsh", "high")]]) }).tasks.map((t) => t.key)).not.toContain("thyroid_same_time");
    expect(plan({ ledger: [{ name: "Thyronorm 50", status: "active" }] }).tasks.map((t) => t.key)).toContain("thyroid_same_time");
  });

  it("gives a baby only what is due", () => {
    expect(plan({ lifeStage: "infant" }).tasks).toEqual([]);
    expect(plan({ lifeStage: "infant", loops: [loop({ type: "vaccine_due", title: "MMR vaccine" })] }).tasks).toHaveLength(1);
  });

  it("gives a child active play instead of a step count, and nothing aimed at readings", () => {
    const p = plan({ lifeStage: "child", ageYears: 8, conditions: ["diabetes"] });
    const keys = p.tasks.map((t) => t.key);
    expect(keys).toContain("active_play");
    expect(keys).not.toContain("steps");
    expect(p.tasks.every((t) => !t.personal || t.due)).toBe(true);
  });

  it("keeps pregnancy gentle, with a doctor's caveat on steps", () => {
    const p = plan({ pregnant: true, conditions: ["diabetes"] });
    expect(p.steps?.goal).toBe(6000);
    expect(p.tasks.find((t) => t.key === "steps")?.why).toMatch(/doctor/);
    expect(p.tasks.map((t) => t.key)).not.toContain("no_alcohol_today");
  });

  it("orders for the hour: morning tasks first in the morning, evening ones in the evening", () => {
    const am = plan({ hour: 8 }).tasks.filter((t) => t.kind === "meal").map((t) => t.key);
    expect(am[0]).toBe("meal:breakfast");
    const pm = plan({ hour: 20 }).tasks.filter((t) => t.kind === "meal").map((t) => t.key);
    expect(pm[0]).toBe("meal:dinner");
  });

  it("marks steps done once the count reaches today's target", () => {
    const p = plan({ logs: [log({ value: 10200 })] });
    expect(p.tasks.find((t) => t.key === "steps")).toMatchObject({ status: "done", progress: { value: 10200, target: 10000 } });
    expect(plan({ logs: [log({ value: 4000 })] }).tasks.find((t) => t.key === "steps")?.status).toBe("open");
  });

  it("marks a meal done once its photo is in, and counts progress per pillar", () => {
    const p = plan({ logs: [log({ taskKey: "meal:breakfast", pillar: "eat", kind: "meal", slot: "breakfast", tags: ["roti", "dal"] })] });
    expect(p.tasks.find((t) => t.key === "meal:breakfast")?.status).toBe("done");
    expect(p.pillarProgress.eat.done).toBe(1);
    expect(p.done).toBe(1);
  });

  it("moves the hero past what is done or put off", () => {
    const first = plan().hero;
    expect(first).not.toBeNull();
    const next = plan({ actions: [{ profileId: "me", day: TODAY, stepKey: first?.key ?? "", status: "later" }] }).hero;
    expect(next?.key).not.toBe(first?.key);
  });

  it("rotates general habits from day to day", () => {
    const days = ["2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"].map((d) => plan({ today: d }).byPillar.mind.map((t) => t.key).join());
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it("keeps every task key inside the database's pattern", () => {
    const re = /^[a-z0-9_:.-]{1,80}$/;
    for (const t of CATALOG) expect(t.key).toMatch(re);
    expect(plan({ loops: [loop({ key: "Lipid Profile / 3 months!" })] }).tasks[0]?.key).toMatch(re);
  });
});

describe("stepsTarget", () => {
  it("uses the person's own goal when set", () => {
    expect(stepsTarget({ ageYears: 40, pregnant: false, prefs: { steps_goal: 8000 }, recent: [] })).toMatchObject({ goal: 8000, target: 8000, ramping: false });
  });

  it("sets a gentler goal with age", () => {
    expect(stepsTarget({ ageYears: 66, pregnant: false, prefs: {}, recent: [] }).goal).toBe(7000);
    expect(stepsTarget({ ageYears: 80, pregnant: false, prefs: {}, recent: [] }).goal).toBe(5000);
  });

  it("ramps from where the week actually is", () => {
    const t = stepsTarget({ ageYears: 40, pregnant: false, prefs: {}, recent: [4000, 5000, 4500] });
    expect(t).toMatchObject({ goal: 10000, target: 5000, ramping: true });
    expect(t.line).toMatch(/Building up to 10,000/);
  });
});

describe("readPlate", () => {
  it("praises a balanced plate", () => {
    expect(readPlate(["roti", "dal", "sabzi", "curd"], []).tone).toBe("great");
  });

  it("ties the tip to the person's own area", () => {
    const r = readPlate(["rice", "dal", "sabzi", "sweet"], ["sugar"]);
    expect(r.tone).not.toBe("great");
    expect(r.tips[0]).toMatch(/sugar/);
    expect(readPlate(["rice", "dal", "sabzi", "pickle_papad"], ["bp"]).tips[0]).toMatch(/BP/);
  });

  it("asks for protein and vegetables when they're missing, at most two tips", () => {
    const r = readPlate(["bakery", "chai_sugar"], ["sugar", "lipids", "weight"]);
    expect(r.tone).toBe("watch");
    expect(r.tips.length).toBeLessThanOrEqual(2);
  });

  it("sums up the day", () => {
    expect(dayPlate([["roti", "dal", "sabzi"], ["rice", "curd", "salad"]])?.line).toMatch(/every meal/);
    expect(dayPlate([["roti", "sabzi"], ["rice", "dal", "salad"]])?.line).toMatch(/Protein at 1 of 2/);
    expect(dayPlate([])).toBeNull();
  });

  it("has nothing judgemental or with em dashes in it", () => {
    for (const t of PLATE_TAGS) expect(t.label).not.toContain("\u2014");
    for (const t of CATALOG) expect(`${t.title} ${t.why}`).not.toMatch(/\u2014|bad food|junk|cheat/i);
  });
});

describe("streaks", () => {
  it("counts back from today when today is done", () => {
    expect(streakOf(["2026-10-14", "2026-10-13", "2026-10-12", "2026-10-10"], TODAY)).toMatchObject({ count: 3, todayDone: true });
  });

  it("keeps yesterday's streak alive until today is over", () => {
    expect(streakOf(["2026-10-13", "2026-10-12"], TODAY)).toMatchObject({ count: 2, todayDone: false });
  });

  it("is zero after a missed day", () => {
    expect(streakOf(["2026-10-12"], TODAY).count).toBe(0);
  });

  it("remembers the best run", () => {
    expect(streakOf(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-14"], TODAY).best).toBe(4);
  });

  it("lays out Monday to Sunday", () => {
    const w = weekOf(["2026-10-12", "2026-10-14"], TODAY);
    expect(w.map((d) => d.letter).join("")).toBe("MTWTFSS");
    expect(w[0]).toMatchObject({ iso: "2026-10-12", done: true });
    expect(w[2]).toMatchObject({ iso: TODAY, today: true, done: true });
    expect(w[3]?.future).toBe(true);
  });

  it("counts pillars trained this week", () => {
    const p = pillarsThisWeek(
      [
        { profileId: "me", day: TODAY, stepKey: "chair_stands", status: "done" },
        { profileId: "me", day: TODAY, stepKey: "due:kft", status: "done" },
        { profileId: "me", day: TODAY, stepKey: "sleep_wind_down", status: "later" },
        { profileId: "me", day: "2026-10-05", stepKey: "one_fruit", status: "done" },
      ],
      TODAY,
    );
    expect([...p].sort()).toEqual(["check", "move"]);
  });
});

describe("due rows and family alerts", () => {
  const names = new Map([
    ["me", "Aarav"],
    ["papa", "Papa"],
  ]);

  it("merges the server list with memory loops, once each, soonest first", () => {
    const rows = dueRows({
      server: [
        { id: "a", source: "loop", type: "test_ordered", profileId: "papa", title: "Kidney function test", detail: null, dueBy: "2026-10-10" },
        { id: "b", source: "loop", type: "followup_due", profileId: "me", title: "Diabetes follow-up", detail: null, dueBy: "2026-10-18" },
      ],
      loops: [loop({ key: "f", type: "followup_due", title: "diabetes follow-up", dueBy: "2026-10-18" }), loop({ key: "hba", title: "HbA1c", dueBy: "2026-10-16" })],
      activeId: "me",
      names,
      today: TODAY,
    });
    expect(rows.map((r) => r.title)).toEqual(["Kidney function test", "HbA1c", "Diabetes follow-up"]);
    expect(rows[0]).toMatchObject({ who: "Papa", overdue: true, when: "Overdue by 4 days", mine: false });
    expect(rows[1]?.when).toBe("In 2 days");
  });

  it("leaves out members it can't name and things too far off", () => {
    const rows = dueRows({
      server: [
        { id: "a", source: "loop", type: "test_ordered", profileId: "paused", title: "X", detail: null, dueBy: TODAY },
        { id: "b", source: "loop", type: "test_ordered", profileId: "me", title: "Y", detail: null, dueBy: "2026-12-30" },
      ],
      loops: [],
      activeId: "me",
      names,
      today: TODAY,
    });
    expect(rows).toEqual([]);
  });

  it("raises someone else's overdue item, not your own", () => {
    const rows = dueRows({
      server: [
        { id: "a", source: "loop", type: "test_ordered", profileId: "papa", title: "Kidney function test", detail: null, dueBy: "2026-10-10" },
        { id: "b", source: "loop", type: "test_ordered", profileId: "me", title: "Lipid profile", detail: null, dueBy: "2026-10-11" },
        { id: "c", source: "loop", type: "test_ordered", profileId: "papa", title: "Eye check", detail: null, dueBy: "2026-10-24" },
      ],
      loops: [],
      activeId: "me",
      names,
      today: TODAY,
    });
    expect(familyAlerts(rows).map((r) => r.title)).toEqual(["Kidney function test"]);
  });
});

describe("content", () => {
  it("marks the report row done for any record that unlocks Today", () => {
    expect(unlockRows({ lab: true })[0]?.done).toBe(true);
    expect(unlockRows({ medicines: true })[1]?.done).toBe(true);
    expect(unlockRows({})[0]?.route).toBe("/scan");
  });

  it("has a line for every way in", () => {
    for (const v of ["report", "prescription", "medicines", "due", "lab", "chat", "backfill", null] as const) expect(viaLine(v).length).toBeGreaterThan(20);
  });

  it("never tells anyone to stop, start or change a medicine", () => {
    for (const n of NUDGES) expect(`${n.title} ${n.why}`).not.toMatch(/\b(stop|start|increase|reduce|skip) (your |the )?(dose|medicine|tablet|insulin)/i);
  });

  it("is written without em dashes", () => {
    for (const n of NUDGES) expect(`${n.title}${n.why}`).not.toContain("—");
  });
});
