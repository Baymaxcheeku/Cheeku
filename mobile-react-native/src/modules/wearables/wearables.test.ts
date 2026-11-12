import { describe, expect, it, vi } from "vitest";

vi.mock("expo-constants", () => ({ default: { executionEnvironment: "storeClient" } }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

import { addDays, dayKey, lastDays, startOfDay } from "./days";
import { chatNotes, hoursMinutes, lensTiles, series, snapshot, trend, trendLine, trendTone } from "./insights";
import { isBlank, mergeDays } from "./merge";
import { demo } from "./sources/demo";
import { emptyDay, type DaySummary } from "./types";

const TODAY = "2026-11-11";

function day(d: string, patch: Partial<DaySummary>): DaySummary {
  return { ...emptyDay(d), ...patch };
}

/** A fortnight where the second week differs from the first by the given amounts. */
function fortnight(week1: Partial<DaySummary>, week2: Partial<DaySummary>): DaySummary[] {
  return lastDays(14, TODAY).map((d, i) => day(d, { ...(i < 7 ? week1 : week2), sources: ["apple_health"] }));
}

describe("days", () => {
  it("keeps a day local and counts back across a month end", () => {
    expect(dayKey(startOfDay("2026-11-01"))).toBe("2026-11-01");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(lastDays(3, TODAY)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
  });
});

describe("merging sources", () => {
  it("never adds two step counts for the same day together", () => {
    const [m] = mergeDays([[day(TODAY, { steps: 6200, sources: ["apple_health"] })], [day(TODAY, { steps: 5900, sources: ["google_health"] })]]);
    expect(m?.steps).toBe(6200);
    expect(m?.sources).toEqual(["apple_health", "google_health"]);
  });

  it("takes a reading from the phone's own health store first", () => {
    const [m] = mergeDays([[day(TODAY, { restingHr: 71, sources: ["google_health"] })], [day(TODAY, { restingHr: 64, sources: ["apple_health"] })]]);
    expect(m?.restingHr).toBe(64);
  });

  it("falls back to another source when the first has no reading", () => {
    const [m] = mergeDays([[day(TODAY, { restingHr: null, sources: ["apple_health"] })], [day(TODAY, { restingHr: 70, sources: ["google_health"] })]]);
    expect(m?.restingHr).toBe(70);
  });

  it("only takes blood pressure as a pair", () => {
    const [m] = mergeDays([[day(TODAY, { systolic: 130, diastolic: null, sources: ["apple_health"] })], [day(TODAY, { systolic: 124, diastolic: 82, sources: ["google_health"] })]]);
    expect([m?.systolic, m?.diastolic]).toEqual([124, 82]);
  });

  it("counts a workout reported by two sources once", () => {
    const run = { type: "Run", minutes: 30, kcal: 280, km: 4, startedAt: "2026-11-11T01:15:00.000Z", app: "Strava" };
    const [m] = mergeDays([[day(TODAY, { workouts: [run], sources: ["apple_health"] })], [day(TODAY, { workouts: [{ ...run, startedAt: "2026-11-11T01:18:00.000Z", app: null }], sources: ["google_health"] })]]);
    expect(m?.workouts).toHaveLength(1);
  });

  it("knows an empty day", () => {
    expect(isBlank(emptyDay(TODAY))).toBe(true);
    expect(isBlank(day(TODAY, { steps: 0 }))).toBe(false);
  });
});

describe("what the numbers say", () => {
  it("formats time asleep", () => {
    expect(hoursMinutes(432)).toBe("7h 12m");
    expect(hoursMinutes(420)).toBe("7h");
  });

  it("compares this week with the one before", () => {
    const t = trend(fortnight({ steps: 5000 }, { steps: 6200 }), "steps", TODAY);
    expect(t.now).toBe(6200);
    expect(t.before).toBe(5000);
    expect(trendLine("steps", t)).toBe("up 1,200 on last week");
    expect(trendTone("steps", t)).toBe("good");
  });

  it("treats a lower resting heart rate as the good direction", () => {
    const t = trend(fortnight({ restingHr: 70 }, { restingHr: 64 }), "restingHr", TODAY);
    expect(trendLine("restingHr", t)).toBe("down 6 bpm on last week");
    expect(trendTone("restingHr", t)).toBe("good");
  });

  it("calls a small wobble the same, not a change", () => {
    const t = trend(fortnight({ steps: 6000 }, { steps: 6150 }), "steps", TODAY);
    expect(trendLine("steps", t)).toBe("steady on last week");
    expect(trendTone("steps", t)).toBe("plain");
  });

  it("says nothing on too little data", () => {
    const days = [day(TODAY, { steps: 9000 }), day(addDays(TODAY, -8), { steps: 3000 })];
    expect(trendLine("steps", trend(days, "steps", TODAY))).toBeNull();
  });

  it("leaves a gap where a day was not measured", () => {
    const s = series([day(TODAY, { steps: 4000 })], "steps", TODAY, 3);
    expect(s.map((p) => p.value)).toEqual([null, null, 4000]);
  });
});

describe("the Home snapshot", () => {
  it("shows today's steps against the goal", () => {
    const snap = snapshot(fortnight({ steps: 5000, sleepMinutes: 420, restingHr: 64 }, { steps: 6000, sleepMinutes: 420, restingHr: 64 }), TODAY, 8000);
    const steps = snap.tiles[0];
    expect(steps?.value).toBe("6,000");
    expect(steps?.line).toBe("2,000 to go");
    expect(steps?.progress).toBeCloseTo(0.75);
    expect(snap.hasData).toBe(true);
  });

  it("marks the goal as reached", () => {
    const snap = snapshot([day(TODAY, { steps: 9100 })], TODAY, 8000);
    expect(snap.tiles[0]?.line).toBe("Goal reached");
    expect(snap.tiles[0]?.tone).toBe("good");
  });

  it("leads with a resting heart rate that has climbed", () => {
    const snap = snapshot(fortnight({ restingHr: 62 }, { restingHr: 69 }), TODAY, 8000);
    expect(snap.headline).toMatch(/resting heart rate is running higher/);
  });

  it("is honest when there is nothing", () => {
    const snap = snapshot([], TODAY, 8000);
    expect(snap.hasData).toBe(false);
    expect(snap.tiles.map((t) => t.value)).toEqual(["–", "–", "–"]);
    expect(snap.headline).toBeNull();
  });
});

describe("what Cheeku is told", () => {
  it("gives dated, factual lines and never a diagnosis", () => {
    const notes = chatNotes(fortnight({ steps: 5000, sleepMinutes: 400, restingHr: 70 }, { steps: 6200, sleepMinutes: 350, restingHr: 64 }), TODAY);
    const text = notes.join(" ");
    expect(text).toContain("6,200 steps a day");
    expect(text).toContain("5h 50m sleep a night");
    expect(text).toContain(`Today (${TODAY})`);
    expect(text).not.toMatch(/diagnos|you have|should take|disease|disorder/i);
  });

  it("says a device reading is not a lab result", () => {
    const notes = chatNotes([day(TODAY, { steps: 3000, glucoseMgDl: 112, sources: ["apple_health"] })], TODAY);
    expect(notes.join(" ")).toContain("consumer device, not a lab");
  });

  it("stays silent with no recent data", () => {
    expect(chatNotes([day(addDays(TODAY, -20), { steps: 8000 })], TODAY)).toEqual([]);
    expect(chatNotes([], TODAY)).toEqual([]);
  });

  it("keeps every line short enough for the model's notes", () => {
    for (const n of chatNotes(fortnight({ steps: 5000, sleepMinutes: 400, restingHr: 70, hrvMs: 50, activeKcal: 300, weightKg: 78, spo2: 97 }, { steps: 6200, sleepMinutes: 350, restingHr: 64, hrvMs: 55, activeKcal: 340, weightKg: 77.5, spo2: 97 }), TODAY)) {
      expect(n.length).toBeLessThanOrEqual(240);
    }
  });
});

describe("sample data", () => {
  it("is the same every time for the same day", async () => {
    const days = lastDays(14, "2026-11-10");
    const a = await demo.read(days);
    const b = await demo.read(days);
    // The last day is "today" to the generator and scales with the clock, so compare the settled days.
    expect(a.slice(0, -1)).toEqual(b.slice(0, -1));
    expect(a).toHaveLength(14);
    expect(a.every((d) => d.sources.join() === "demo")).toBe(true);
  });

  it("looks like a real person's fortnight", async () => {
    const days = await demo.read(lastDays(14, "2026-11-10"));
    for (const d of days.slice(0, -1)) {
      expect(d.steps).toBeGreaterThan(3000);
      expect(d.steps).toBeLessThan(13000);
      expect(d.sleepMinutes).toBeGreaterThan(280);
      expect(d.sleepMinutes).toBeLessThan(540);
      expect(d.restingHr).toBeGreaterThan(55);
      expect(d.restingHr).toBeLessThan(80);
    }
  });
});

describe("lens tiles", () => {
  it("leads with today's three, then only metrics that have a reading", async () => {
    const days = await demo.read(lastDays(14, TODAY));
    const keys = lensTiles(days, TODAY, 8000).map((t) => t.key);
    expect(keys.slice(0, 3)).toEqual(["steps", "sleep", "restingHr"]);
    expect(keys.length).toBeGreaterThan(5);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("shows blood pressure as a pair and skips what was never recorded", () => {
    const d = { ...emptyDay(TODAY), steps: 4000, systolic: 128, diastolic: 84, sources: ["apple_health" as const] };
    const tiles = lensTiles([d], TODAY, 8000);
    expect(tiles.map((t) => t.key)).toEqual(["steps", "bp"]);
    expect(tiles[1]!.value).toBe("128/84");
  });
});
