import { describe, expect, it } from "vitest";

import { buildLedger, parseFrequency } from "@/lib/memory/ledger";

import { buildPlan } from "./plan";
import { doseKey, medsToday, nextSlot, parseDoseKey, readMedPrefs, runsOutLine, stockView, writeMedPrefs } from "./meds";

const TODAY = "2026-10-14";

const entry = (key: string, schedule: [number, number, number] | null, over: Record<string, unknown> = {}) => ({
  key,
  name: key,
  status: "active" as const,
  schedule,
  dose: "1 tablet",
  timing: "after_food" as const,
  asNeeded: false,
  unitsPerDay: schedule ? schedule[0] + schedule[1] + schedule[2] : null,
  ...over,
});

const taken = (stepKey: string, day = TODAY, profileId = "me") => ({ profileId, day, stepKey, status: "done" as const });

describe("frequency as people write it", () => {
  it("reads the pattern, the abbreviations and the plain words", () => {
    expect(parseFrequency("1-0-1")).toEqual([1, 0, 1]);
    expect(parseFrequency("1 - 1 - 1 after food")).toEqual([1, 1, 1]);
    expect(parseFrequency("BD")).toEqual([1, 0, 1]);
    expect(parseFrequency("twice daily")).toEqual([1, 0, 1]);
    expect(parseFrequency("TDS")).toEqual([1, 1, 1]);
    expect(parseFrequency("once at night")).toEqual([0, 0, 1]);
    expect(parseFrequency("OD")).toEqual([1, 0, 0]);
    expect(parseFrequency("daily")).toEqual([1, 0, 0]);
  });
  it("says nothing rather than guess", () => {
    expect(parseFrequency("as directed")).toBeNull();
    expect(parseFrequency("once a week")).toBeNull();
    expect(parseFrequency("SOS")).toBeNull();
    expect(parseFrequency("0-0-0")).toBeNull();
    expect(parseFrequency("")).toBeNull();
    expect(parseFrequency(null)).toBeNull();
  });
  it("gives a declared medicine a schedule from its frequency", () => {
    const [m] = buildLedger([], [{ name: "Telma 40", dose: "1 tablet", frequency: "twice a day" }], TODAY);
    expect(m).toMatchObject({ schedule: [1, 0, 1], dose: "1 tablet", unitsPerDay: 2 });
  });
});

describe("dose keys", () => {
  it("fit today_actions' step key rule and read back", () => {
    const k = doseKey("a".repeat(90), "afternoon");
    expect(k.length).toBeLessThanOrEqual(80);
    expect(k).toMatch(/^[a-z0-9_:.-]{1,80}$/);
    expect(parseDoseKey(doseKey("telma_40", "night"))).toEqual({ medKey: "telma_40", slot: "night" });
    expect(parseDoseKey("meds_taken")).toBeNull();
  });
});

describe("med prefs", () => {
  it("keeps only what it can trust and defaults the rest", () => {
    const p = readMedPrefs({ times: { morning: "07:30", night: "25:00" }, stock: { telma: { left: 20, on: TODAY }, "bad key": { left: 3, on: TODAY }, x: { left: -1, on: TODAY } }, schedules: { telma: [1, 0, 1], y: [9, 0, 0] }, remind: "no" });
    expect(p.times).toEqual({ morning: "07:30", afternoon: "14:00", night: "21:00" });
    expect(Object.keys(p.stock)).toEqual(["telma"]);
    expect(p.schedules).toEqual({ telma: [1, 0, 1] });
    expect(p.remind).toBe(true);
    expect(readMedPrefs("junk").remind).toBe(true);
  });
  it("writes back only what differs, so daily_prefs stays small", () => {
    expect(writeMedPrefs(readMedPrefs({}))).toEqual({});
    expect(writeMedPrefs(readMedPrefs({ times: { night: "22:00" }, remind: false }))).toEqual({ times: { night: "22:00" }, remind: false });
  });
});

describe("today's doses", () => {
  const prefs = readMedPrefs({});

  it("splits medicines into slots and ticks each dose on its own", () => {
    const t = medsToday({ profileId: "me", today: TODAY, ledger: [entry("telma", [1, 0, 1]), entry("metformin", [1, 1, 1])], actions: [taken(doseKey("telma", "morning")), taken(doseKey("metformin", "morning"))], prefs });
    expect(t.slots.map((s) => [s.slot, s.doses.length, s.done])).toEqual([
      ["morning", 2, true],
      ["afternoon", 1, false],
      ["night", 2, false],
    ]);
  });

  it("leaves out ended, as-needed and unscheduled ones from the slots", () => {
    const t = medsToday({ profileId: "me", today: TODAY, ledger: [entry("old", [1, 0, 0], { status: "ended" }), entry("dolo", [1, 0, 0], { asNeeded: true }), entry("mystery", null)], actions: [], prefs });
    expect(t.slots).toEqual([]);
    expect(t.unscheduled.map((e) => e.key)).toEqual(["mystery"]);
  });

  it("uses the person's own schedule over the record's", () => {
    const t = medsToday({ profileId: "me", today: TODAY, ledger: [entry("mystery", null)], actions: [], prefs: readMedPrefs({ schedules: { mystery: [0, 0, 1] } }) });
    expect(t.meds[0]).toMatchObject({ slots: ["night"], ownSchedule: true });
  });

  it("never counts another member's doses", () => {
    const t = medsToday({ profileId: "me", today: TODAY, ledger: [entry("telma", [1, 0, 0])], actions: [taken(doseKey("telma", "morning"), TODAY, "papa")], prefs });
    expect(t.slots[0]?.done).toBe(false);
  });
});

describe("stock and refills", () => {
  it("counts down from the day it was counted", () => {
    expect(stockView({ left: 20, on: "2026-10-10" }, 2, TODAY)).toEqual({ daysLeft: 6, lastDay: "2026-10-19", low: false });
    expect(stockView({ left: 10, on: "2026-10-10" }, 2, TODAY)).toMatchObject({ daysLeft: 1, low: true });
    expect(stockView({ left: 4, on: "2026-10-01" }, 2, TODAY)?.daysLeft).toBe(0);
  });
  it("flags what is low on today's list", () => {
    const t = medsToday({ profileId: "me", today: TODAY, ledger: [entry("telma", [1, 0, 1])], actions: [], prefs: readMedPrefs({ stock: { telma: { left: 8, on: TODAY } } }) });
    expect(t.low.map((m) => m.key)).toEqual(["telma"]);
  });
  it("says it plainly", () => {
    expect(runsOutLine({ daysLeft: 0, lastDay: TODAY, low: true })).toBe("Ran out. Time to refill.");
    expect(runsOutLine({ daysLeft: 6, lastDay: "2026-10-19", low: false })).toBe("6 days left, lasts till 19 Oct.");
  });
});

describe("adherence", () => {
  it("counts from the first tick, not a week of misses before it", () => {
    const actions = [taken(doseKey("telma", "morning"), "2026-10-12"), taken(doseKey("telma", "night"), "2026-10-12"), taken(doseKey("telma", "morning"), "2026-10-13")];
    const t = medsToday({ profileId: "me", today: TODAY, ledger: [entry("telma", [1, 0, 1])], actions, prefs: readMedPrefs({}) });
    expect(t.meds[0]?.adherence).toEqual({ taken: 3, due: 4 });
  });
  it("is unknown before anything was ticked", () => {
    const t = medsToday({ profileId: "me", today: TODAY, ledger: [entry("telma", [1, 0, 1])], actions: [taken(doseKey("telma", "morning"))], prefs: readMedPrefs({}) });
    expect(t.meds[0]?.adherence).toBeNull();
  });
});

describe("the slot that is now", () => {
  const t = medsToday({ profileId: "me", today: TODAY, ledger: [entry("metformin", [1, 1, 1])], actions: [taken(doseKey("metformin", "morning"))], prefs: readMedPrefs({}) });
  it("skips what is done and moves on three hours after a slot's time", () => {
    expect(nextSlot(t.slots, { hour: 9, minute: 0 })?.slot).toBe("afternoon");
    expect(nextSlot(t.slots, { hour: 17, minute: 30 })?.slot).toBe("night");
    expect(nextSlot(t.slots, { hour: 23, minute: 59 })?.slot).toBe("night");
  });
});

describe("doses in the plan", () => {
  const plan = (ledger: Parameters<typeof buildPlan>[0]["ledger"], actions: Parameters<typeof buildPlan>[0]["actions"] = []) =>
    buildPlan({ profileId: "me", today: TODAY, hour: 9, loops: [], series: new Map(), ledger, conditions: [], lifeStage: "adult", ageYears: 52, pregnant: false, actions, logs: [], prefs: {} });

  it("gives each part of the day its own card in place of the single tick", () => {
    const p = plan([entry("telma", [1, 0, 1]), entry("metformin", [1, 0, 1])]);
    const doses = p.tasks.filter((t) => t.kind === "dose");
    expect(doses.map((t) => [t.key, t.window, t.dose?.doses.length])).toEqual(
      expect.arrayContaining([
        ["dose:morning", "morning", 2],
        ["dose:night", "evening", 2],
      ]),
    );
    expect(p.tasks.some((t) => t.key === "meds_taken")).toBe(false);
    for (const t of doses) {
      expect(t.title.length).toBeLessThanOrEqual(30);
      expect(t.why.length).toBeLessThanOrEqual(60);
      expect(t.title).not.toMatch(/telma|metformin/i);
    }
  });

  it("is done once every dose on it is taken", () => {
    const half = plan([entry("telma", [1, 0, 0]), entry("metformin", [1, 0, 0])], [taken(doseKey("telma", "morning"))]);
    expect(half.tasks.find((t) => t.key === "dose:morning")?.status).toBe("open");
    const all = plan([entry("telma", [1, 0, 0]), entry("metformin", [1, 0, 0])], [taken(doseKey("telma", "morning")), taken(doseKey("metformin", "morning"))]);
    expect(all.tasks.find((t) => t.key === "dose:morning")?.status).toBe("done");
  });

  it("keeps the single tick only while no schedule is known at all", () => {
    expect(plan([entry("mystery", null), entry("other", null)]).tasks.find((t) => t.key === "meds_taken")?.reason).toBe("mystery and 1 more");
    const p = plan([entry("telma", [1, 0, 0]), entry("weekly_d3", null)]);
    expect(p.tasks.some((t) => t.key === "meds_taken")).toBe(false);
    expect(p.meds?.unscheduled.map((e) => e.key)).toEqual(["weekly_d3"]);
  });
});
