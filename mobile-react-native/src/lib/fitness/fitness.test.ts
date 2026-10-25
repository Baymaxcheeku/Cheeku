import { describe, expect, it } from "vitest";

import { ACTIVITIES, activityIn, priceFor } from "./catalog";
import { allows, bmiFrom, fitFor, matchSessions, NEED_RULES, needsFor, rankStudios, varied, type FitnessProfile } from "./match";
import { distanceKm, distanceLabel, previewNetwork, sampleSessions, type Session, type Studio } from "./provider";

const BLR = { lat: 12.9716, lng: 77.5946 };
const NOW = new Date("2026-10-25T05:00:00+05:30");
const TOMORROW = new Date("2026-10-26T00:00:00+05:30");

const person = (over: Partial<FitnessProfile> = {}): FitnessProfile => ({ conditions: [], goal: null, ageYears: 34, pregnant: false, bmi: null, ...over });

describe("the price rule", () => {
  it("adds 15%, at least ₹25, rounded up to the next ₹10", () => {
    expect(priceFor(200)).toEqual({ base: 200, markup: 30, price: 230 });
    expect(priceFor(120)).toEqual({ base: 120, markup: 30, price: 150 });
    expect(priceFor(400)).toEqual({ base: 400, markup: 60, price: 460 });
    expect(priceFor(0).price).toBe(30);
  });

  it("follows a changed rule", () => {
    expect(priceFor(200, { pct: 10, min: 0 }).price).toBe(220);
  });
});

describe("distance", () => {
  it("measures a known pair within a few hundred metres", () => {
    // MG Road to Indiranagar, about 3.6 km.
    const km = distanceKm({ lat: 12.9756, lng: 77.6066 }, { lat: 12.9784, lng: 77.6408 });
    expect(km).toBeGreaterThan(3.3);
    expect(km).toBeLessThan(4);
  });

  it("reads short distances in metres", () => {
    expect(distanceLabel(0.43)).toBe("400 m");
    expect(distanceLabel(2.345)).toBe("2.3 km");
    expect(distanceLabel(12.4)).toBe("12 km");
  });
});

describe("the preview network", () => {
  it("shows the same studios for the same place, all marked sample", async () => {
    const a = await previewNetwork.studiosNear(BLR);
    const b = await previewNetwork.studiosNear({ lat: BLR.lat + 0.001, lng: BLR.lng });
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
    expect(a.length).toBeGreaterThan(5);
    expect(a.every((s) => s.sample && s.area === "Sample")).toBe(true);
    expect(a.every((s) => distanceKm(BLR, s) <= 8)).toBe(true);
  });

  it("gives stable sessions and never one starting within 30 minutes", async () => {
    const [s] = await previewNetwork.studiosNear(BLR);
    if (!s) throw new Error("no sample studio");
    const first = sampleSessions(s, NOW, NOW);
    expect(sampleSessions(s, NOW, NOW)).toEqual(first);
    for (const x of first) expect(Date.parse(x.startsAt)).toBeGreaterThan(NOW.getTime() + 30 * 60_000);
  });
});

describe("what a profile needs", () => {
  it("targets weight for obesity, from the condition or the BMI", () => {
    expect(needsFor(person({ conditions: ["Obesity"] }))[0]).toBe("weight");
    expect(needsFor(person({ bmi: 31 }))[0]).toBe("weight");
    const fit = fitFor(person({ conditions: ["Obesity"] }));
    expect(fit.ranked.slice(0, 3)).toEqual(["functional", "zumba", "swimming"]);
  });

  it("keeps jumping classes away from bad knees", () => {
    const fit = fitFor(person({ conditions: ["Arthritis"] }));
    for (const id of ["zumba", "hiit", "functional", "dance", "aerobics", "kickboxing"]) expect(fit.ranked).not.toContain(id);
    expect(fit.ranked[0]).toBe("aqua");
  });

  it("shows only prenatal classes in pregnancy, with a doctor's note", () => {
    const fit = fitFor(person({ pregnant: true, conditions: ["Diabetes"] }));
    expect(fit.needs).toEqual(["prenatal"]);
    expect(fit.ranked).toEqual(["prenatal_yoga", "meditation"]);
    expect(fit.doctorNote).toBe(true);
  });

  it("caps BP at moderate and drops HIIT", () => {
    const fit = fitFor(person({ conditions: ["High BP"] }));
    expect(fit.cap).toBe("moderate");
    expect(allows(fit, { activity: "hiit", intensity: "moderate" })).toBe(false);
    expect(allows(fit, { activity: "zumba", intensity: "high" })).toBe(false);
    expect(allows(fit, { activity: "yoga", intensity: "gentle" })).toBe(true);
  });

  it("puts the Today goal first and adds gentle pace past 60", () => {
    const needs = needsFor(person({ conditions: ["Diabetes"], goal: "sleep", ageYears: 66 }));
    expect(needs).toEqual(["sleep", "sugar", "elder"]);
    expect(fitFor(person({ ageYears: 66 })).doctorNote).toBe(true);
  });

  it("never offers prenatal yoga to anyone else", () => {
    expect(fitFor(person()).ranked).not.toContain("prenatal_yoga");
  });

  it("works out BMI only from plausible numbers", () => {
    expect(bmiFrom(170, 90)).toBe(31.1);
    expect(bmiFrom(null, 90)).toBeNull();
    expect(bmiFrom(50, 90)).toBeNull();
  });
});

describe("matching sessions", () => {
  const studio = (id: string, lat: number, activities: Studio["activities"]): Studio => ({ id, name: id, area: "Sample", lat, lng: BLR.lng, activities, rating: 4.5, reviews: 10, amenities: [], womenOnly: false, sample: true });
  const session = (st: Studio, activity: Session["activity"], at: string, over: Partial<Session> = {}): Session => ({ id: `${st.id}-${activity}-${at}`, studioId: st.id, activity, title: activity, startsAt: at, durationMin: 60, level: "all", intensity: ACTIVITIES.find((a) => a.id === activity)?.intensity ?? "moderate", seatsLeft: 5, basePrice: 200, ...over });

  const near = studio("near", BLR.lat + 0.005, ["yoga", "zumba"]);
  const far = studio("far", BLR.lat + 0.05, ["aqua"]);
  const items = [
    { session: session(near, "zumba", "2026-10-25T07:00:00+05:30"), studio: near },
    { session: session(near, "yoga", "2026-10-25T07:00:00+05:30"), studio: near },
    { session: session(far, "aqua", "2026-10-25T07:00:00+05:30"), studio: far },
    { session: session(near, "yoga", "2026-10-25T04:00:00+05:30"), studio: near },
    { session: session(near, "yoga", "2026-10-25T09:00:00+05:30", { seatsLeft: 0 }), studio: near },
  ];

  it("leaves out full, past and unsuitable sessions and says why the rest fit", () => {
    const out = matchSessions({ fit: fitFor(person({ conditions: ["Knee pain"] })), place: BLR, items, now: NOW });
    expect(out.map((m) => m.session.activity)).toEqual(["yoga", "aqua"]);
    expect(out.every((m) => m.reason === NEED_RULES.joints.reason)).toBe(true);
  });

  it("filters to the activity asked for", () => {
    const out = matchSessions({ fit: fitFor(person()), place: BLR, items, now: NOW, activity: "zumba" });
    expect(out.map((m) => m.session.activity)).toEqual(["zumba"]);
    expect(out[0]?.reason).toBeNull();
  });

  it("ranks studios by what suits the person, then distance", () => {
    const jumpy = studio("jumpy", BLR.lat + 0.002, ["zumba", "hiit"]);
    const ranked = rankStudios(fitFor(person({ conditions: ["Arthritis"] })), BLR, [jumpy, near, far]);
    expect(ranked.map((r) => r.studio.id)).toEqual(["near", "far"]);
    expect(rankStudios(fitFor(person()), BLR, [far, near])[0]?.studio.id).toBe("near");
  });

  it("keeps women-only studios from men, and mixes the picks", () => {
    const ladies = { ...near, id: "ladies", womenOnly: true };
    expect(rankStudios(fitFor(person({ sex: "male" })), BLR, [ladies, far]).map((r) => r.studio.id)).toEqual(["far"]);
    expect(rankStudios(fitFor(person({ sex: "female" })), BLR, [ladies]).map((r) => r.studio.id)).toEqual(["ladies"]);
    const many = matchSessions({ fit: fitFor(person()), place: BLR, items, now: NOW });
    const picked = varied([...many, ...many.map((m) => ({ ...m, session: { ...m.session, id: m.session.id + "b" } }))], 3, 1);
    expect(new Set(picked.slice(0, 2).map((m) => m.session.activity)).size).toBe(2);
  });

  it("keeps every reason within 36 characters", () => {
    for (const r of Object.values(NEED_RULES)) expect(r.reason.length).toBeLessThanOrEqual(36);
  });

  it("is quiet before tomorrow starts", () => {
    expect(matchSessions({ fit: fitFor(person()), place: BLR, items, now: TOMORROW })).toEqual([]);
  });
});

describe("reading the activity from a message", () => {
  it("knows prenatal yoga from yoga, and swimming from a pool", () => {
    expect(activityIn("any prenatal yoga class near me")).toBe("prenatal_yoga");
    expect(activityIn("book a yoga class")).toBe("yoga");
    expect(activityIn("a pool nearby?")).toBe("swimming");
    expect(activityIn("crossfit tomorrow")).toBe("functional");
    expect(activityIn("hello")).toBeNull();
  });

  it("keeps every chip label within 16 characters", () => {
    for (const a of ACTIVITIES) expect(a.label.length).toBeLessThanOrEqual(16);
  });
});
