import { describe, expect, it } from "vitest";

import { buildHealthFile, careTeamFrom, mergeMedicines, shareText, trackValues, upcomingFrom, whenLabel } from "./file";

const NOW = new Date(2026, 8, 30);

const lab = (name: string, key: string, value: number, date: string, flag = "normal", doc = "d1") => ({
  id: `${key}-${date}`, document_id: doc, kind: "lab_value", name, canonical_name: key, value, value_text: null, unit: "g/dL", ref_range: "12.0-15.0", flag, event_date: date,
});

describe("trackValues", () => {
  it("makes one series per measurement, newest as latest, flagged first", () => {
    const t = trackValues([
      lab("Haemoglobin", "haemoglobin", 11.2, "2026-03-12"),
      lab("Haemoglobin", "haemoglobin", 10.4, "2026-08-04", "low"),
      lab("Platelets", "platelets", 2.4, "2026-09-01"),
      { id: "x", kind: "medication", name: "Metformin" },
    ]);
    expect(t.map((x) => x.key)).toEqual(["haemoglobin", "platelets"]);
    expect(t[0]).toMatchObject({ latest: { value: 10.4, flag: "low" }, previous: { value: 11.2 }, direction: "down" });
    expect(t[0]?.points.map((p) => p.value)).toEqual([11.2, 10.4]);
  });

  it("skips readings with no number", () => {
    expect(trackValues([{ ...lab("Urine", "urine", 0, "2026-01-01"), value: null, value_text: "Negative" }])).toEqual([]);
  });
});

describe("mergeMedicines", () => {
  it("lists the member's own first and never the same medicine twice", () => {
    const meds = mergeMedicines(
      [
        { kind: "medication", name: "Metformin 500 mg", value_text: "1-0-1", event_date: "2026-09-01", document_id: "rx2" },
        { kind: "medication", name: "Metformin 500mg", value_text: "old", event_date: "2026-01-01", document_id: "rx1" },
        { kind: "medication", name: "Atorvastatin 10 mg", value_text: "0-0-1", event_date: "2026-09-01", document_id: "rx2" },
      ],
      [{ name: "Thyronorm 50 mcg", dose: "1 tablet", frequency: "morning" }, { name: "atorvastatin 10mg", dose: "", frequency: "" }],
    );
    expect(meds.map((m) => [m.name, m.source])).toEqual([
      ["Thyronorm 50 mcg", "profile"],
      ["Metformin 500 mg", "record"],
      ["Atorvastatin 10 mg", "record"],
    ]);
    expect(meds[1]?.documentId).toBe("rx2");
  });
});

describe("upcomingFrom", () => {
  it("collects only dates the records gave, soonest first", () => {
    const up = upcomingFrom(
      [
        { id: "rx", doc_type: "prescription", details: { doctor: { name: "Dr. Iyer" }, medicines: [{ name: "A" }], followUp: "2026-10-05" } },
        { id: "vx", doc_type: "vaccination", details: { vaccine: "Hep B", dose: 2, doses: 3, nextDue: "2026-09-20" } },
        { id: "in", doc_type: "insurance", details: { insurer: "Star Health", policyNo: "P1", sumInsured: 500000, end: "2026-10-30" } },
        { id: "in2", doc_type: "insurance", details: { insurer: "Far Away", policyNo: "P2", sumInsured: 1, end: "2027-09-01" } },
        { id: "ci", doc_type: "consultation_invoice", details: { invoiceNo: "C1", doctor: { name: "Dr. Rao" }, mode: "online", appointment: { day: "2026-10-02" }, status: "refunded" } },
        { id: "bi", doc_type: "booking_invoice", details: { invoiceNo: "B1", partner: "Healthians", slot: { date: "2026-10-01", window: "6-8 am" }, status: "due" } },
        { id: "old", doc_type: "prescription", details: { doctor: { name: "Dr. Old" }, medicines: [{ name: "A" }], followUp: "2026-01-01" } },
      ],
      NOW,
    );
    expect(up.map((u) => [u.kind, u.days])).toEqual([
      ["next_dose", -10],
      ["lab_visit", 1],
      ["follow_up", 5],
      ["renewal", 30],
    ]);
  });

  it("names a yearly shot as the next dose, not dose 1 again", () => {
    const up = upcomingFrom([{ id: "flu", doc_type: "vaccination", details: { vaccine: "Flu", dose: 1, doses: 1, nextDue: "2027-09-01" } }], NOW);
    expect(up.map((u) => u.title)).toEqual(["Flu, next dose"]);
  });
});

describe("careTeamFrom", () => {
  it("counts visits per doctor and place, busiest first", () => {
    const team = careTeamFrom([
      { doc_type: "prescription", doctor: "Dr. Iyer", facility: "Sunrise Clinic", event_date: "2026-09-01" },
      { doc_type: "lab_report", doctor: "Dr. Iyer", facility: "Lucid Labs", event_date: "2026-09-10" },
      { doc_type: "booking_invoice", doctor: null, facility: "Healthians", event_date: "2026-09-10" },
    ]);
    expect(team[0]).toEqual({ name: "Dr. Iyer", kind: "doctor", visits: 2, last: "2026-09-10" });
    expect(team.some((c) => c.name === "Healthians")).toBe(false);
  });
});

describe("buildHealthFile", () => {
  it("puts it all together for one member", () => {
    const f = buildHealthFile(
      {
        profile: { id: "p1", name: "Amma Rao", relationship: "Mother", is_primary: false, dob: "1962-05-01", sex: "Female", blood_group: "B+", allergies: ["Penicillin"], conditions: ["Hypothyroidism"], medications: [] },
        documents: [
          { id: "d1", doc_type: "lab_report", status: "filed", event_date: "2026-08-04", title: "CBC", details: {} },
          { id: "d2", doc_type: "insurance", status: "needs_review", event_date: "2026-03-01", details: { insurer: "Star", policyNo: "P", sumInsured: 500000, claimed: 100000, end: "2027-03-01" } },
          { id: "bad", doc_type: "selfie", status: "filed" },
        ],
        entities: [lab("Haemoglobin", "haemoglobin", 10.4, "2026-08-04", "low")],
      },
      NOW,
    );
    expect(f.person).toMatchObject({ firstName: "Amma", age: 64, allergies: ["Penicillin"] });
    expect(f.totals).toEqual({ records: 2, needsReview: 1, valuesTracked: 1, firstEvent: "2026-03-01", lastEvent: "2026-08-04" });
    expect(f.flagged).toHaveLength(1);
    expect(f.cover[0]).toMatchObject({ insurer: "Star", remaining: 400000, status: "active" });
    expect(f.recent.map((r) => r.id)).toEqual(["d1", "d2"]);
    expect(f.recent[1]?.summary).toContain("₹5 lakh cover");
  });

  it("copes with an empty file", () => {
    const f = buildHealthFile({ profile: { id: "p", name: "Me" }, documents: [], entities: [] }, NOW);
    expect(f.totals.records).toBe(0);
    expect(f.upcoming).toEqual([]);
  });
});

describe("words", () => {
  it("says when, plainly", () => {
    expect(whenLabel(0)).toBe("Today");
    expect(whenLabel(1)).toBe("Tomorrow");
    expect(whenLabel(5)).toBe("In 5 days");
    expect(whenLabel(-3)).toBe("3 days ago");
    expect(whenLabel(21)).toBe("In 3 weeks");
  });

  it("shares only what the file says", () => {
    const f = buildHealthFile({ profile: { id: "p", name: "Amma", allergies: [] }, documents: [], entities: [lab("Haemoglobin", "hb", 10.4, "2026-08-04", "low")] }, NOW);
    const text = shareText(f);
    expect(text).toContain("Allergies: none recorded");
    expect(text).toContain("Haemoglobin 10.4 g/dL (range 12.0-15.0), 4 Aug 2026");
  });
});
