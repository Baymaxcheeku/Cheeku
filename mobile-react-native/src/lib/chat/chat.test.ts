import { describe, expect, it } from "vitest";

import { longevityAreas, recordSignals } from "@/lib/longevity/areas";
import { buildSeries, type Series, type SeriesPoint } from "@/lib/memory/series";
import type { MemoryDigest, ModelRequest } from "@/lib/memory/model";
import { emptyWorld, sparrowTurn } from "@/lib/memory/sparrow";

import { activityFromText } from "./activity";
import { safeActions } from "./safe-actions";
import { longevityDigest } from "@/lib/longevity/digest";

const TODAY = "2026-11-11";

function series(key: string, values: [string, number][]): Series {
  const pts: SeriesPoint[] = values.map(([date, value]) => ({ date, value, source: "record", documentId: null, factId: null, refRange: null, flag: null }));
  return buildSeries(key, key, null, pts)!;
}

const DIGEST: MemoryDigest = {
  person: { firstName: "Arjun", clock: "34 years", age: "34", edd: null, stage: "adult", modifiers: [], ageYears: 34, bloodGroup: null, conditions: [], allergies: [] },
  notes: [], readings: [], medicines: [], flags: [], loops: [], records: [], symptoms: [], logged: [], changes: [], askForReadings: [], stats: { records: 3, messages: 0, since: null }, cover: [],
};

function ask(question: string, world = emptyWorld(), tier: ModelRequest["floor"]["tier"] = null): ModelRequest {
  return { question, history: [], memory: { ...DIGEST, world }, floor: { tier, reasons: [] } };
}

describe("activity said in chat", () => {
  it("reads steps in the ways people say them", () => {
    expect(activityFromText("walked 6k today").steps).toBe(6000);
    expect(activityFromText("did 6,200 steps").steps).toBe(6200);
    expect(activityFromText("8500 steps").steps).toBe(8500);
  });
  it("reads sleep, in English and Hinglish", () => {
    expect(activityFromText("slept 5 hours").sleepMinutes).toBe(300);
    expect(activityFromText("only slept 6.5 hrs last night").sleepMinutes).toBe(390);
    expect(activityFromText("kal raat soya 7 ghante").sleepMinutes).toBe(420);
  });
  it("does not log a question or a silly number", () => {
    expect(activityFromText("should I walk 10k steps?").steps).toBeNull();
    expect(activityFromText("slept 30 hours").sleepMinutes).toBeNull();
    expect(activityFromText("my HbA1c is 6.1").steps).toBeNull();
  });
});

describe("longevity areas", () => {
  it("marks each area by its worst signal, with the person's own number", () => {
    const s = new Map([
      ["bp_systolic", series("bp_systolic", [["2026-10-01", 142]])],
      ["bp_diastolic", series("bp_diastolic", [["2026-10-01", 88]])],
      ["hba1c", series("hba1c", [["2026-09-01", 5.9]])],
    ]);
    const signals = recordSignals({ series: s, loops: [], today: TODAY, ageYears: 34, pregnant: false });
    signals.push({ area: "heart", mark: "on_track", line: "Resting heart rate steady.", source: "device", date: TODAY });
    const areas = longevityAreas(signals);
    expect(areas.find((a) => a.key === "heart")?.status).toBe("act");
    expect(areas.find((a) => a.key === "heart")?.line).toContain("142/88");
    expect(areas.find((a) => a.key === "sugar")?.status).toBe("watch");
    expect(areas.find((a) => a.key === "sleep")?.status).toBe("unknown");
  });
  it("drops numbers older than eighteen months and skips adult numbers for a child", () => {
    const s = new Map([["hba1c", series("hba1c", [["2024-01-01", 7.2]])]]);
    expect(recordSignals({ series: s, loops: [], today: TODAY, ageYears: 40, pregnant: false }).some((x) => x.area === "sugar")).toBe(false);
    const k = new Map([["bp_systolic", series("bp_systolic", [["2026-10-01", 150]])]]);
    expect(recordSignals({ series: k, loops: [], today: TODAY, ageYears: 9, pregnant: false }).some((x) => x.area === "heart")).toBe(false);
  });
  it("lists act and watch before on track, and flags sample data", () => {
    const d = longevityDigest([
      { area: "sleep", mark: "on_track", line: "7h 10m a night.", source: "device", date: TODAY, sample: true },
      { area: "sugar", mark: "act", line: "HbA1c 6.8%.", source: "report", date: TODAY },
    ]);
    expect(d.map((a) => a.area)).toEqual(["sugar", "sleep"]);
    expect(d[1]!.sample).toBe(true);
  });
});

describe("the sparrow's turns", () => {
  const world = { ...emptyWorld(), longevity: longevityDigest([{ area: "sugar", mark: "watch", line: "Average sugar (HbA1c) 5.9% is in the early-warning band.", source: "report", date: TODAY }]) };

  it("answers the big picture with areas and offers the matching goal", () => {
    const r = sparrowTurn(ask("How am I doing overall?", world))!;
    expect(r.paragraphs.join("\n")).toContain("Sugar: worth watching");
    expect(r.actions?.[0]).toMatchObject({ type: "set_goal", goal: "sugar" });
  });
  it("turns a wish into a goal button", () => {
    const r = sparrowTurn(ask("I want to lose weight", world))!;
    expect(r.actions?.[0]).toMatchObject({ type: "set_goal", goal: "weight" });
  });
  it("says what was logged from the message", () => {
    const w = { ...world, today: { ...world.today, justLogged: ["6,000 steps today"], stepsToday: 6000 } };
    const r = sparrowTurn(ask("walked 6k today", w))!;
    expect(r.paragraphs[0]).toContain("6,000 steps today");
    expect(r.paragraphs[1]).toContain("2,000 more");
  });
  it("gives the family round-up only when the world carries one", () => {
    const w = { ...world, family: [{ name: "Priya", relation: "spouse", you: false, line: "Check-ups: Thyroid test is overdue." }] };
    expect(sparrowTurn(ask("how is everyone", w))!.paragraphs.join("\n")).toContain("Priya (spouse)");
  });
  it("stays out of the way when something is worrying or there is no world", () => {
    expect(sparrowTurn(ask("How am I doing overall?", world, "contact_today"))).toBeNull();
    expect(sparrowTurn({ ...ask("How am I doing overall?"), memory: DIGEST })).toBeNull();
  });
});

describe("actions a model may propose", () => {
  it("keeps known goals and allowed screens only", () => {
    const out = safeActions([
      { type: "set_goal", goal: "sleep", label: "Make sleep my goal" },
      { type: "set_goal", goal: "fly", label: "Fly" },
      { type: "open", route: "/wearables", label: "Open" },
      { type: "open", route: "https://evil.example", label: "Go" },
      { type: "delete_account", label: "Bye" },
    ]);
    expect(out.map((a) => a.label)).toEqual(["Make sleep my goal", "Open"]);
  });
});
