import { describe, expect, it } from "vitest";

import { gestationalAge, resolveClock } from "./clock";
import { describeChange, notableChanges, seriesFrom } from "./series";
import { analyteKey, readThreshold } from "./thresholds";
import type { Pregnancy, Subject } from "./types";

function must<T>(v: T | null | undefined): T {
  if (v === null || v === undefined) throw new Error("expected a value");
  return v;
}

const baby: Pick<Subject, "dob" | "sex" | "birth"> = {
  dob: "2026-09-01",
  sex: "male",
  birth: { pregnancyId: "p1", motherId: "m1", gaAtBirthDays: 274, deliveryMode: "c-section", birthWeightKg: 3.5, maternalBloodGroup: "O+", inUteroMedicines: [] },
};

const pregnancy = (over: Partial<Pregnancy> = {}): Pregnancy => ({
  id: "p1",
  profileId: "m1",
  lmp: "2026-03-01",
  edd: null,
  datings: [],
  babyName: null,
  status: "ongoing",
  deliveredOn: null,
  deliveryMode: null,
  childProfileId: null,
  ...over,
});

describe("resolveClock", () => {
  it("counts a newborn in days, born at term", () => {
    const c = resolveClock(baby, "2026-09-07");
    expect(c.relative).toEqual({ kind: "day_of_life", day: 6, term: "term" });
    expect(c.modifiers).toContain("term");
    expect(c.label).toBe("Day 6 of life");
  });

  it("marks a baby born before 37 weeks as preterm", () => {
    const c = resolveClock({ ...baby, birth: { ...must(baby.birth), gaAtBirthDays: 250 } }, "2026-09-04");
    expect(c.modifiers).toContain("preterm");
  });

  it("puts a mother on the gestational clock with her trimester", () => {
    const c = resolveClock({ dob: "1992-08-11", sex: "female", birth: null }, "2026-09-01", [pregnancy()]);
    expect(c.relative?.kind).toBe("gestational");
    expect(c.modifiers).toEqual(expect.arrayContaining(["pregnant", "trimester_2"]));
    expect(c.label).toBe("Week 26 + 2 of pregnancy");
  });

  it("switches to postpartum after delivery, for six weeks", () => {
    const p = pregnancy({ status: "delivered", deliveredOn: "2026-09-01" });
    expect(resolveClock({ dob: "1992-08-11", sex: "female", birth: null }, "2026-09-10", [p]).relative).toEqual({ kind: "postpartum", day: 9 });
    expect(resolveClock({ dob: "1992-08-11", sex: "female", birth: null }, "2026-11-01", [p]).relative).toBeNull();
  });
});

describe("gestationalAge", () => {
  it("lets scan dating win and surfaces the gap instead of hiding it", () => {
    // LMP says 31 weeks on 1 Oct; a scan on 1 Sep dated the baby at 30w.
    const p = pregnancy({ lmp: "2026-03-05", datings: [{ date: "2026-09-01", gaDays: 210, source: "scan", label: "Growth scan", documentId: "d1" }] });
    const ga = must(gestationalAge(p, "2026-10-01"));
    expect(ga.weeks).toBe(34);
    expect(ga.source).toBe("scan");
    expect(ga.discrepancy).toEqual({ lmpDays: 210, scanDays: 240, differenceDays: 30, scanLabel: "Growth scan" });
  });

  it("uses the earliest scan when there are several", () => {
    const p = pregnancy({
      lmp: null,
      datings: [
        { date: "2026-08-01", gaDays: 150, source: "scan", label: "Anomaly", documentId: null },
        { date: "2026-05-01", gaDays: 84, source: "scan", label: "NT scan", documentId: null },
      ],
    });
    expect(must(gestationalAge(p, "2026-05-08")).totalDays).toBe(91);
  });
});

describe("thresholds follow the clock", () => {
  it("reads the same bilirubin as under on day 3 and over on day 6", () => {
    const day3 = readThreshold("bilirubin_total", 11.0, resolveClock(baby, "2026-09-04"));
    const day6 = readThreshold("bilirubin_total", 11.0, resolveClock(baby, "2026-09-07"));
    expect(day3?.verdict).toBe("within");
    expect(day6?.verdict).toBe("over");
    expect(day6?.tier).toBe("contact_today");
  });

  it("never reassures from a limit that is only an example", () => {
    const day3 = readThreshold("bilirubin_total", 11.0, resolveClock(baby, "2026-09-04"));
    expect(day3?.tier).toBe("monitor");
    expect(day3?.text).toMatch(/ask which chart/);
  });

  it("uses trimester limits for haemoglobin in pregnancy, and says the printed range is general", () => {
    const c = resolveClock({ dob: "1992-08-11", sex: "female", birth: null }, "2026-06-15", [pregnancy()]);
    const r = readThreshold("haemoglobin", 10.7, c, "12.0-15.0");
    expect(r?.threshold.id).toBe("hb-preg-t2");
    expect(r?.tier).toBe("reassure");
    expect(r?.printedDiffers).toMatch(/general range/);
  });

  it("goes straight to go-now for a fever under three months", () => {
    const r = readThreshold("temperature", 38.2, resolveClock(baby, "2026-09-20"));
    expect(r?.tier).toBe("go_now");
  });

  it("has nothing to say for an adult value with no clock-specific limit", () => {
    expect(readThreshold("haemoglobin", 10, resolveClock({ dob: "1990-01-01", sex: "male", birth: null }, "2026-09-01"))).toBeNull();
  });

  it("folds the names labs print into one key", () => {
    expect(analyteKey("Hb")).toBe("haemoglobin");
    expect(analyteKey("Total Bilirubin")).toBe("bilirubin_total");
    expect(analyteKey("Fasting blood sugar", "fbs")).toBe("glucose_fasting");
    expect(analyteKey("Vitamin D (25-OH)", null)).toBe("vitamin_d");
  });
});

describe("series", () => {
  const bp = (date: string, s: number) => ({ id: date, key: "bp_systolic", label: "BP (top)", value: s, unit: "mmHg", observedOn: date, source: "chat" as const, supersededBy: null });

  it("reads a pressure drop against the baseline, not the last value", () => {
    const all = seriesFrom([], [bp("2026-06-01", 132), bp("2026-06-08", 131), bp("2026-06-15", 133), bp("2026-06-22", 99)]);
    const s = must(all.get("bp_systolic"));
    expect(s.baseline).toBe(132);
    expect(s.fromBaseline).toBe(-33);
    expect(notableChanges(all, "adult", 12000)[0]?.text).toMatch(/33-point drop from the usual 132/);
  });

  it("states a newborn's weight change with its percentage", () => {
    const w = (date: string, v: number) => ({ id: date, key: "weight", label: "Weight", value: v, unit: "kg", observedOn: date, source: "chat" as const, supersededBy: null });
    const all = seriesFrom([], [w("2026-09-01", 3.5), w("2026-09-07", 3.3)]);
    expect(describeChange(must(all.get("weight")))).toBe("3.5 to 3.3 kg, down 0.2 (5.7%) in 6 days");
    expect(notableChanges(all, "neonate", 6)).toEqual([]);
  });

  it("drops a superseded chat reading", () => {
    const all = seriesFrom([], [{ ...bp("2026-06-01", 132), supersededBy: "x" }]);
    expect(all.size).toBe(0);
  });

  it("merges a record's value and a chat reading into one series", () => {
    const all = seriesFrom(
      [{ kind: "lab_value", name: "Total Bilirubin", canonical_name: null, value: 11, unit: "mg/dL", event_date: "2026-09-04", document_id: "d1", ref_range: "0.3-1.2", flag: "high" }],
      [{ id: "f1", key: "bilirubin_total", label: "Bilirubin", value: 12.4, unit: "mg/dL", observedOn: "2026-09-07", source: "chat", supersededBy: null }],
    );
    const s = must(all.get("bilirubin_total"));
    expect(s.points.map((p) => p.source)).toEqual(["record", "chat"]);
    expect(s.delta).toBe(1.4);
  });
});
