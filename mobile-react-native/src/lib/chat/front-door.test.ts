import { describe, expect, it } from "vitest";

import { areaQuestion, longevityAreas, type Signal } from "@/lib/longevity/areas";
import type { MemoryDigest, ModelRequest, WorldDigest } from "@/lib/memory/model";
import { emptyWorld, sparrowTurn } from "@/lib/memory/sparrow";

import { areasView, dailyNote, dayLabel, shortcuts } from "./daily";

const DIGEST: MemoryDigest = {
  person: { firstName: "Arjun", clock: "34 years", age: "34", edd: null, stage: "adult", modifiers: [], ageYears: 34, bloodGroup: null, conditions: [], allergies: [] },
  notes: [], readings: [], medicines: [], flags: [], loops: [], records: [], symptoms: [], logged: [], changes: [], askForReadings: [], stats: { records: 3, messages: 0, since: null }, cover: [],
};

function ask(question: string, world: WorldDigest = emptyWorld()): ModelRequest {
  return { question, history: [], memory: { ...DIGEST, world }, floor: { tier: null, reasons: [] } };
}

const SUGAR_WATCH: WorldDigest = { ...emptyWorld(), longevity: [{ area: "sugar", label: "Sugar", status: "watch", line: "Average sugar (HbA1c) 5.9% is in the early-warning band.", sample: false }] };
const signals: Signal[] = [{ area: "sugar", mark: "watch", line: "HbA1c 5.9% is in the early-warning band.", source: "report", date: "2026-10-11" }];
// A Monday, 9 am.
const MONDAY = new Date(2026, 10, 16, 9, 0);
const SUNDAY = new Date(2026, 10, 15, 19, 0);

describe("the daily note", () => {
  it("names the one area to work on, with a button that asks about it", () => {
    const n = dailyNote({ name: "Arjun", self: true, areas: areasView(longevityAreas(signals)), now: MONDAY });
    expect(n.greeting).toBe("Good morning, Arjun.");
    expect(n.line).toContain("One thing today: sugar.");
    expect(n.primary.send).toBe("How is my sugar doing?");
  });
  it("is the weekly check-in on Sundays", () => {
    const n = dailyNote({ name: "Priya", self: false, areas: null, now: SUNDAY });
    expect(n.key).toBe("checkin");
    expect(n.greeting).toBe("Good evening. Here's Priya's day.");
    expect(n.primary.send).toBe("How was my week?");
  });
  it("asks for a report when there is nothing to go on", () => {
    const n = dailyNote({ name: "Arjun", self: true, areas: areasView(longevityAreas([])), now: MONDAY });
    expect(n.key).toBe("empty");
    expect(n.primary.route).toBe("/scan");
  });
});

describe("the shortcuts", () => {
  it("are the five agreed ones, family only for the account holder with family", () => {
    expect(shortcuts(true).map((s) => s.label)).toEqual(["Weekly check-in", "Log", "Goals", "Book", "Family"]);
    expect(shortcuts(false).map((s) => s.key)).not.toContain("family");
  });
  it("each one the sparrow can answer", () => {
    for (const s of shortcuts(false)) {
      if (!s.send) continue;
      expect(sparrowTurn(ask(s.send, SUGAR_WATCH)), s.send).not.toBeNull();
    }
  });
});

describe("the sparrow, per area", () => {
  it("answers an area tapped on Home with its status and a fitting goal", () => {
    const r = sparrowTurn(ask(areaQuestion({ key: "sugar", label: "Sugar" }), SUGAR_WATCH))!;
    expect(r.paragraphs[0]).toBe("Sugar, for Arjun: keep an eye on it.");
    expect(r.actions?.map((a) => a.type)).toContain("set_goal");
  });
  it("says so when an area has nothing to go on", () => {
    const r = sparrowTurn(ask("How is my sleep doing?"))!;
    expect(r.basis).toBe("silent");
    expect(r.actions?.[0]).toMatchObject({ route: "/wearables/connect" });
  });
  it("suggests the goal from the worst area when asked to change goals", () => {
    const r = sparrowTurn(ask("Change my goal", SUGAR_WATCH))!;
    expect(r.actions?.[0]).toMatchObject({ type: "set_goal", goal: "sugar" });
    expect(r.followUps).not.toContain("I want to control my sugar");
  });
  it("offers what can be booked", () => {
    const r = sparrowTurn(ask("I want to book something"))!;
    expect(r.actions?.map((a) => (a.type === "open" ? a.route : ""))).toEqual(["/labs", "/fitness", "/services"]);
  });
  it("does not promise a result for a class", () => {
    const w = { ...emptyWorld(), care: { upcoming: [], recent: ["Yoga at Aum Yoga House, Fri 13 Nov"] } };
    const r = sparrowTurn(ask("Any appointments?", w))!;
    expect(r.paragraphs.join(" ")).not.toContain("result comes back");
  });
});

describe("dates in bookings", () => {
  it("read short and the same everywhere", () => {
    expect(dayLabel("2026-11-13")).toBe("Fri 13 Nov");
  });
});
