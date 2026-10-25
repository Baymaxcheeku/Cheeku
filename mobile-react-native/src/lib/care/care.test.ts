import { describe, expect, it } from "vitest";

import { doseKey, medsToday, readMedPrefs } from "@/lib/home/meds";
import type { LoopView } from "@/lib/memory/loops";
import type { Series } from "@/lib/memory/series";

import { carePlan, careSummary, planSignature, readCareAlerts, verdict } from "./care";

const TODAY = "2026-10-25";

const entry = (key: string, schedule: [number, number, number] | null) => ({
  key,
  name: key,
  status: "active" as const,
  schedule,
  dose: "1 tablet",
  timing: "after_food" as const,
  asNeeded: false,
  unitsPerDay: schedule ? schedule[0] + schedule[1] + schedule[2] : null,
});
const tick = (stepKey: string, day = TODAY, profileId = "papa") => ({ profileId, day, stepKey, status: "done" as const });

const meds = (actions = [] as ReturnType<typeof tick>[], prefs = readMedPrefs({})) =>
  medsToday({ profileId: "papa", today: TODAY, ledger: [entry("telma_40", [1, 0, 1]), entry("metformin_500", [1, 0, 0])], actions, prefs });

function series(key: string, value: number, date: string, flag: string | null = "normal", unit = "mmHg"): Series {
  const p = { date, value, source: "record" as const, documentId: null, factId: null, refRange: null, flag };
  return { key, name: key, unit, points: [p], latest: p, previous: null, delta: null, direction: null, ratePerDay: null } as unknown as Series;
}

const loop = (over: Partial<LoopView>): LoopView => ({
  key: "kft",
  type: "test_ordered",
  title: "Kidney function test",
  detail: null,
  openedOn: "2026-09-01",
  dueBy: "2026-10-20",
  status: "open",
  closedBy: null,
  sourceDocumentId: null,
  relatesTo: [],
  daysOpen: 50,
  daysToDue: -5,
  overdue: true,
  ...over,
});

describe("the plan the server checks", () => {
  it("carries slot times and ledger keys, never a medicine's name", () => {
    const p = carePlan(meds(), readMedPrefs({}), true);
    expect(p.slots).toEqual([
      { slot: "morning", time: "08:00", keys: ["metformin_500", "telma_40"] },
      { slot: "night", time: "21:00", keys: ["telma_40"] },
    ]);
    expect(p.remind).toBe(true);
    expect(p.alerts).toBe(true);
    expect(JSON.stringify(p)).not.toMatch(/tablet|after_food/);
  });

  it("adds the last day a counted strip lasts", () => {
    const p = carePlan(meds([], readMedPrefs({ stock: { telma_40: { left: 6, on: TODAY } } })), readMedPrefs({}), true);
    expect(p.refills).toEqual([{ key: "telma_40", last: "2026-10-27" }]);
  });

  it("stays small enough for the 2,000-byte column, and is stable", () => {
    const many = medsToday({ profileId: "papa", today: TODAY, ledger: Array.from({ length: 12 }, (_, i) => entry(`medicine_number_${i}_long_key`, [1, 1, 1])), actions: [], prefs: readMedPrefs({}) });
    const sig = planSignature(carePlan(many, readMedPrefs({}), true));
    expect(new TextEncoder().encode(sig).length).toBeLessThan(2000);
    expect(planSignature(carePlan(meds(), readMedPrefs({}), true))).toBe(planSignature(carePlan(meds(), readMedPrefs({}), true)));
  });

  it("is empty when they take nothing on a schedule, so the server stops checking", () => {
    expect(carePlan(null, readMedPrefs({}), true).slots).toEqual([]);
  });

  it("reads the alerts switch: on unless switched off", () => {
    expect(readCareAlerts(undefined)).toBe(true);
    expect(readCareAlerts({ alerts: false })).toBe(false);
    expect(readCareAlerts("junk")).toBe(true);
  });
});

describe("a member at a glance", () => {
  const base = (over: Partial<Parameters<typeof careSummary>[0]> = {}) =>
    careSummary({ profileId: "papa", today: TODAY, nowMin: 9 * 60 + 45, meds: meds([tick(doseKey("telma_40", "morning")), tick(doseKey("telma_40", "night"), "2026-10-24")]), loops: [], series: new Map(), actions: [tick(doseKey("telma_40", "morning")), tick(doseKey("telma_40", "night"), "2026-10-24")], ...over });

  it("counts today's doses and flags a slot 90 minutes late", () => {
    const s = base();
    expect(s.doses).toEqual({ taken: 1, total: 3 });
    expect(s.slots.find((x) => x.slot === "morning")).toMatchObject({ taken: 1, total: 2, late: true });
    expect(s.attention[0]).toMatchObject({ kind: "late_dose", text: "Morning doses not ticked yet" });
    expect(s.status).toBe("attention");
    expect(verdict(s)).toBe("1 thing needs you");
  });

  it("is not late before the 90 minutes are up", () => {
    expect(base({ nowMin: 9 * 60 }).attention).toEqual([]);
    expect(verdict(base({ nowMin: 9 * 60 }))).toBe("On track today");
  });

  it("raises two quiet days, a low strip and an overdue test, most urgent first", () => {
    const old = [tick(doseKey("telma_40", "morning"), "2026-10-21")];
    const s = careSummary({
      profileId: "papa",
      today: TODAY,
      nowMin: 8 * 60,
      meds: meds(old, readMedPrefs({ stock: { telma_40: { left: 4, on: TODAY } } })),
      loops: [loop({}), loop({ key: "lipid", title: "Lipid profile", daysToDue: 3, overdue: false })],
      series: new Map(),
      actions: old,
    });
    expect(s.attention.map((a) => a.kind)).toEqual(["overdue", "refill", "quiet", "due_soon"]);
    expect(s.attention.find((a) => a.kind === "quiet")?.text).toBe("No doses ticked for 4 days");
    expect(s.attention.find((a) => a.kind === "overdue")?.text).toBe("Kidney function test, 5 days overdue");
    expect(s.attention.find((a) => a.kind === "refill")?.text).toBe("A medicine runs out in 2 days");
  });

  it("shows their latest BP and sugar, flagged when out of range", () => {
    const s = base({
      series: new Map([
        ["bp_systolic", series("bp_systolic", 148, "2026-10-20", "high")],
        ["bp_diastolic", series("bp_diastolic", 92, "2026-10-20", "high")],
        ["hba1c", series("hba1c", 6.4, "2026-09-01", "high", "%")],
        ["weight", series("weight", 70, "2026-10-01", null, "kg")],
      ]),
    });
    expect(s.readings).toEqual([
      { key: "bp", label: "BP", value: "148/92", unit: "mmHg", date: "2026-10-20", flagged: true },
      { key: "sugar", label: "HbA1c", value: "6.4", unit: "%", date: "2026-09-01", flagged: true },
    ]);
  });

  it("says when nothing is tracked yet", () => {
    const s = careSummary({ profileId: "nani", today: TODAY, nowMin: 600, meds: null, loops: [], series: new Map(), actions: [] });
    expect(s.status).toBe("idle");
    expect(verdict(s)).toBe("Nothing tracked yet");
  });

  it("never counts another member's ticks", () => {
    const s = careSummary({ profileId: "papa", today: TODAY, nowMin: 600, meds: meds(), loops: [], series: new Map(), actions: [tick(doseKey("telma_40", "morning"), TODAY, "ma")] });
    expect(s.lastTick).toBeNull();
  });
});
