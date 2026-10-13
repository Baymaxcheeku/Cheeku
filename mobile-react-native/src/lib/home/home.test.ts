import { describe, expect, it } from "vitest";

import type { LoopView } from "@/lib/memory/loops";
import type { Series } from "@/lib/memory/series";

import { NUDGES, unlockRows, viaLine } from "./content";
import { decideStage, forward, readHomeState } from "./rules";
import { buildSteps, currentStep, dueRows, familyAlerts, pillarsThisWeek, streakOf, weekOf, type TodayInput } from "./today";

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

const input = (over: Partial<TodayInput> = {}): TodayInput => ({ loops: [], series: new Map(), ledger: [], conditions: [], lifeStage: "adult", pregnant: false, ...over });

describe("buildSteps", () => {
  it("puts an overdue test first, with a way to book it", () => {
    const steps = buildSteps(input({ loops: [loop()], series: new Map([["hba1c", series("hba1c", "high")]]) }), "me", TODAY);
    expect(steps[0]).toMatchObject({ kind: "due", chip: "Overdue", title: "Book your Kidney function test", cta: { route: "/labs" } });
    expect(steps[1]?.area).toBe("sugar");
  });

  it("aims habits at a flagged reading before general ones", () => {
    const steps = buildSteps(input({ series: new Map([["ldl_cholesterol", series("ldl_cholesterol", "high", "LDL Cholesterol")]]) }), "me", TODAY);
    expect(steps[0]?.area).toBe("lipids");
    expect(steps[0]?.chip).toBe("Heart health");
  });

  it("ignores readings in range", () => {
    const steps = buildSteps(input({ series: new Map([["hba1c", series("hba1c", "normal")]]) }), "me", TODAY);
    expect(steps.every((s) => s.area === "general")).toBe(true);
  });

  it("reads conditions from the profile", () => {
    expect(buildSteps(input({ conditions: ["Type 2 diabetes"] }), "me", TODAY)[0]?.area).toBe("sugar");
  });

  it("never offers more water to someone whose kidneys are flagged", () => {
    for (let d = 0; d < 30; d++) {
      const day = `2026-11-${String(d + 1).padStart(2, "0")}`;
      const keys = buildSteps(input({ conditions: ["CKD stage 3"] }), "me", day).map((s) => s.key);
      expect(keys).not.toContain("water_before_meals");
    }
  });

  it("only gives the thyroid tablet step to someone on one", () => {
    const off = buildSteps(input({ series: new Map([["tsh", series("tsh", "high")]]) }), "me", TODAY).map((s) => s.key);
    expect(off).not.toContain("thyroid_same_time");
    const on = buildSteps(input({ ledger: [{ name: "Thyronorm 50", status: "active" }] }), "me", TODAY).map((s) => s.key);
    expect(on).toContain("thyroid_same_time");
  });

  it("gives a baby no habit steps, only what is due", () => {
    expect(buildSteps(input({ lifeStage: "infant" }), "baby", TODAY)).toEqual([]);
    expect(buildSteps(input({ lifeStage: "infant", loops: [loop({ type: "vaccine_due", title: "MMR vaccine" })] }), "baby", TODAY)).toHaveLength(1);
  });

  it("keeps pregnancy and children to the gentle set", () => {
    const steps = buildSteps(input({ pregnant: true, conditions: ["diabetes"] }), "her", TODAY);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.map((s) => s.key)).not.toContain("no_alcohol_today");
    expect(steps.every((s) => s.area === "general")).toBe(true);
  });

  it("moves past a step done or put off today, and comes back tomorrow", () => {
    const first = currentStep(buildSteps(input(), "me", TODAY));
    expect(first).not.toBeNull();
    const log = [{ profileId: "me", day: TODAY, stepKey: first?.key ?? "", status: "later" as const }];
    const next = currentStep(buildSteps(input(), "me", TODAY, log));
    expect(next?.key).not.toBe(first?.key);
    // Another member's marks don't count.
    expect(currentStep(buildSteps(input(), "me", TODAY, log.map((x) => ({ ...x, profileId: "papa" }))))?.key).toBe(first?.key);
  });

  it("rotates the general step from day to day", () => {
    const days = ["2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"].map((d) => currentStep(buildSteps(input(), "me", d))?.key);
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it("keeps every step key inside the database's pattern", () => {
    const re = /^[a-z0-9_:.-]{1,80}$/;
    for (const n of NUDGES) expect(n.key).toMatch(re);
    const s = buildSteps(input({ loops: [loop({ key: "Lipid Profile / 3 months!" })] }), "me", TODAY);
    expect(s[0]?.key).toMatch(re);
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
