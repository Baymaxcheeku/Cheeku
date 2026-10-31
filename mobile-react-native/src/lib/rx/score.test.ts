import { describe, expect, it } from "vitest";

import { resolve, score, type RxInput, type RxMedicine } from "./engine";

const TODAY = "2026-10-31";
const med = (name: string, over: Partial<RxMedicine> = {}): RxMedicine => ({
  name,
  strength: null,
  form: "tablet",
  dose: "1 tablet",
  schedule: [1, 0, 0],
  timing: "after_food",
  durationDays: 30,
  ...over,
});
function input(meds: RxMedicine[], over: Partial<RxInput["person"]> = {}, rest: Partial<RxInput> = {}): RxInput {
  return {
    today: TODAY,
    document: { id: "doc-1", eventDate: TODAY, doctor: "Dr. Kavya Rao", medicines: meds },
    person: { id: "p-1", name: "Priya Sharma", dob: "1995-08-02", sex: "female", weightKg: 61, allergies: [], conditions: [], pregnancy: null, deliveredDaysAgo: null, ...over },
    current: [],
    labs: [],
    records: 6,
    ...rest,
  };
}
function check(c: ReturnType<typeof score>, id: string) {
  const found = c.checks.find((x) => x.id === id);
  if (!found) throw new Error(`no check ${id}`);
  return found;
}

describe("resolving a medicine to its salts", () => {
  it("knows brands, brands without strength, and generic names", () => {
    expect(resolve("Dolo 650")?.salts.map((s) => [s.salt.id, s.amount])).toEqual([["paracetamol", 650]]);
    expect(resolve("Thyronorm", "25 mcg")?.salts.map((s) => [s.salt.id, s.amount])).toEqual([["levothyroxine", 25]]);
    expect(resolve("Paracetamol drops", "100 mg/mL")?.salts[0]?.amount).toBe(100);
    expect(resolve("Orofer XT")?.salts.map((s) => s.salt.id)).toEqual(["ferrous_ascorbate", "folic_acid"]);
    expect(resolve("Amoxicillin + clavulanic acid")?.salts.map((s) => s.salt.id)).toEqual(["amoxicillin", "clavulanate"]);
    expect(resolve("Zyzzyx 10")).toBeNull();
  });
});

describe("the scorecard", () => {
  it("reads Priya's postnatal prescription against what she already takes and her reports", () => {
    const card = score(
      input([med("Orofer XT", { timing: "after_food", durationDays: 90 }), med("Shelcal 500", { schedule: [0, 0, 1], durationDays: 90 })], { conditions: ["Hypothyroidism"], deliveredDaysAgo: 49 }, {
        current: [
          { name: "Thyronorm 25 mcg", strength: "25 mcg", source: { label: "Dr. S. Bhat, 28 Sept", documentId: "rx-old" } },
          { name: "Ferrous ascorbate 100 mg", strength: "100 mg", source: { label: "Dr. S. Bhat, 28 Sept", documentId: "rx-old" } },
        ],
        labs: [
          { key: "ferritin", name: "Ferritin", value: 16, unit: "ng/mL", flag: "normal", date: "2026-09-26", source: { label: "Thyroid and iron panel", documentId: "lab-1" } },
          { key: "tsh", name: "TSH", value: 5.8, unit: "µIU/mL", flag: "high", date: "2026-09-26", source: { label: "Thyroid and iron panel", documentId: "lab-1" } },
        ],
      }),
    );
    expect(card.score).toEqual({ clear: 8, act: 2, stop: 0, unknown: 0, of: 10 });
    expect(card.verdict.tone).toBe("sort");
    expect(check(card, "interactions").status).toBe("act");
    expect(check(card, "interactions").findings.some((f) => /Thyronorm/.test(f.text) && /4 hours/.test(f.text))).toBe(true);
    expect(check(card, "duplicate").line).toMatch(/Ferrous ascorbate is in Orofer XT and in Ferrous ascorbate 100 mg/);
    expect(check(card, "reports").findings[0]?.text).toMatch(/Ferritin 16 ng\/mL is low/);
    expect(check(card, "pregnancy").status).toBe("clear");
    expect(card.questions.some((q) => /stop Ferrous ascorbate 100 mg/.test(q))).toBe(true);
    const orofer = card.medicines[0];
    if (!orofer) throw new Error("no medicine");
    expect(orofer.alternatives[0]).toMatchObject({ name: "Orofer XT", prescribed: true });
    expect(orofer.alternatives.find((a) => a.generic)?.save).toBe(79);
  });

  it("checks a baby's drops by weight and passes a doctor's own dose under 3 months", () => {
    const card = score(
      input([med("Paracetamol drops", { strength: "100 mg/mL", form: "drops", dose: "0.6 mL", schedule: [1, 1, 1], durationDays: 2, asNeeded: true })], { name: "Tara Sharma", dob: "2026-09-12", weightKg: 4.6 }),
    );
    const dose = check(card, "dose");
    expect(dose.status).toBe("clear");
    expect(dose.findings[0]?.text).toMatch(/60 mg a dose is 13 mg\/kg/);
    expect(card.verdict.tone).toBe("fits");
    expect(card.score.clear).toBe(10);
  });

  it("stops on an allergy match", () => {
    const card = score(input([med("Augmentin 625 Duo", { schedule: [1, 0, 1], durationDays: 5 })], { allergies: ["Penicillin"] }));
    expect(check(card, "allergy").status).toBe("stop");
    expect(card.verdict.tone).toBe("stop");
  });

  it("stops on a combination banned in India", () => {
    const card = score(input([med("Nimesulide + Paracetamol", { durationDays: 3 })]));
    expect(check(card, "banned").status).toBe("stop");
  });

  it("stops on a statin in pregnancy", () => {
    const card = score(input([med("Atorva 10")], { pregnancy: { weeks: 12 } }));
    expect(check(card, "pregnancy").status).toBe("stop");
    expect(card.questions[0]).toMatch(/12 weeks pregnant/);
  });

  it("flags a daily dose over the adult limit", () => {
    const card = score(input([med("Voveran 50", { dose: "2 tablets", schedule: [1, 1, 1], durationDays: 5 })], { sex: "male", name: "Arjun Sharma", dob: "1992-04-18" }));
    expect(check(card, "dose").status).toBe("act");
    expect(check(card, "dose").line).toMatch(/300 mg a day, over the 150 mg/);
  });

  it("flags paracetamol taken twice in one prescription", () => {
    const card = score(input([med("Combiflam", { durationDays: 3 }), med("Dolo 650", { durationDays: 3 })]));
    expect(check(card, "duplicate").status).toBe("act");
  });

  it("leaves an unknown brand open rather than calling it fine", () => {
    const card = score(input([med("Zyzzyx 10")]));
    expect(check(card, "salt").status).toBe("unknown");
    expect(card.verdict.tone).toBe("partial");
    expect(card.questions[0]).toMatch(/generic name of Zyzzyx 10/);
  });

  it("asks for a missing duration on an antibiotic", () => {
    const card = score(input([med("Azithral 500", { durationDays: null })]));
    expect(check(card, "instructions").status).toBe("act");
    expect(check(card, "instructions").line).toMatch(/full course/);
  });
});

describe("the formulary", () => {
  it("resolves every brand to salts that exist", () => {
    for (const name of ["Dolo 650", "Combiflam", "Montair LC", "Augmentin 625 Duo", "Shelcal 500", "Glycomet GP 1", "Pan D", "Doxinate"]) expect(resolve(name)).not.toBeNull();
  });
});
