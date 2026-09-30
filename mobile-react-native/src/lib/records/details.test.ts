import { describe, expect, it } from "vitest";

import {
  amountDue,
  courseQuantity,
  courseStatus,
  coverStatus,
  coverUsed,
  daysUntil,
  doseStatus,
  lengthOfStay,
  medicineInstruction,
  parseRange,
  rangePosition,
  readDetails,
  readSchedule,
  rupees,
  rupeesShort,
  sameMedicine,
  supplyLeft,
  scheduleLabel,
  shortDate,
  summaryLine,
  toProfileMedication,
  trend,
  type Medicine,
} from "./details";

const NOW = new Date(2026, 8, 30); // 30 Sep 2026, local

const med = (over: Partial<Medicine> = {}): Medicine => ({
  name: "Metformin",
  strength: "500 mg",
  form: "tablet",
  dose: "1 tablet",
  schedule: [1, 0, 1],
  timing: "after_food",
  durationDays: 30,
  asNeeded: false,
  note: null,
  ...over,
});

describe("readDetails", () => {
  it("returns null for other, a missing blob, or junk", () => {
    expect(readDetails("other", { details: { kind: "x" } })).toBeNull();
    expect(readDetails("prescription", null)).toBeNull();
    expect(readDetails("prescription", { details: "nope" })).toBeNull();
    expect(readDetails("prescription", { details: [] })).toBeNull();
    expect(readDetails("insurance", { details: { insurer: "Star" } })).toBeNull(); // no policy number
  });

  it("rebuilds a prescription field by field and drops what does not fit", () => {
    const d = readDetails("prescription", {
      details: {
        doctor: { name: "Dr Rao", regNo: 12345 },
        medicines: [
          { name: "Metformin", strength: "500 mg", schedule: "1-0-1", timing: "after_food", durationDays: "30" },
          { name: "", schedule: "1-1-1" },
          { strength: "10 mg" },
          "junk",
        ],
        followUp: "not a date",
        tests: ["HbA1c", 4, null],
      },
    });
    expect(d?.kind).toBe("prescription");
    if (d?.kind !== "prescription") return;
    expect(d.doctor).toEqual({ name: "Dr Rao", qualification: null, regNo: null, clinic: null, phone: null });
    expect(d.medicines).toHaveLength(1);
    expect(d.medicines[0]?.schedule).toEqual([1, 0, 1]);
    expect(d.medicines[0]?.durationDays).toBe(30);
    expect(d.followUp).toBeNull();
    expect(d.tests).toEqual(["HbA1c"]);
  });

  it("uses the document's type, not a kind written inside the blob", () => {
    const d = readDetails("scan", { details: { kind: "insurance", bodyPart: "Chest", modality: "xray", findings: ["Clear"] } });
    expect(d?.kind).toBe("scan");
  });

  it("derives bill totals and status when they are missing", () => {
    const d = readDetails("bill", {
      details: { vendor: "Apollo Pharmacy", items: [{ name: "A", amount: 100 }, { name: "B", amount: 50 }], discount: 10, taxes: [{ label: "GST", amount: 7 }], paid: 147 },
    });
    if (d?.kind !== "bill") throw new Error("expected a bill");
    expect(d.subtotal).toBe(150);
    expect(d.total).toBe(147);
    expect(d.status).toBe("paid");
    expect(amountDue(d)).toBe(0);
  });

  it("clamps a vaccination dose into its course", () => {
    const d = readDetails("vaccination", { details: { vaccine: "Hep B", dose: 7, doses: 3 } });
    if (d?.kind !== "vaccination") throw new Error("expected a vaccination");
    expect(d.dose).toBe(3);
  });

  it("reads each remaining type", () => {
    expect(readDetails("lab_report", { details: { panel: "CBC", sections: [{ name: "Red cells", keys: ["hb"] }] } })?.kind).toBe("lab_report");
    expect(readDetails("discharge", { details: { hospital: "Manipal", admittedOn: "2026-08-01", dischargedOn: "2026-08-04" } })?.kind).toBe("discharge");
    expect(readDetails("consultation_invoice", { details: { invoiceNo: "CK-1", doctor: { name: "Dr A" }, lines: [{ label: "Fee", amount: 500 }] } })?.kind).toBe("consultation_invoice");
    expect(readDetails("booking_invoice", { details: { invoiceNo: "LB-1", partner: "Dr Lal", tests: [{ name: "CBC", price: 300 }], collectionFee: 50 } })).toMatchObject({ subtotal: 300, total: 350 });
    expect(readDetails("medication", { details: { medicines: [{ name: "Thyronorm", schedule: [1, 0, 0] }] } })?.kind).toBe("medication");
    expect(readDetails("insurance", { details: { insurer: "Star Health", policyNo: "P/1", sumInsured: 500000 } })?.kind).toBe("insurance");
  });
});

describe("schedules and medicines", () => {
  it("reads every schedule shape", () => {
    expect(readSchedule("1-0-1")).toEqual([1, 0, 1]);
    expect(readSchedule([0, 0, 1])).toEqual([0, 0, 1]);
    expect(readSchedule({ morning: 1, night: 2 })).toEqual([1, 0, 2]);
    expect(readSchedule("whenever")).toEqual([0, 0, 0]);
    expect(scheduleLabel([1, 0, 1])).toBe("1-0-1");
  });

  it("says it the way a pharmacist would", () => {
    expect(medicineInstruction(med())).toBe("Twice a day after food, for 30 days");
    expect(medicineInstruction(med({ schedule: [0, 0, 1], timing: "bedtime", durationDays: 1 }))).toBe("Once a day at bedtime, for 1 day");
    expect(medicineInstruction(med({ asNeeded: true, timing: "any" }))).toBe("Only when needed");
  });

  it("counts a course", () => {
    expect(courseQuantity(med())).toBe(60);
    expect(courseQuantity(med({ asNeeded: true }))).toBeNull();
    expect(courseStatus(med({ durationDays: 5 }), "2026-09-28", NOW)).toEqual({ ended: false, left: 3, endsOn: "2026-10-02" });
    expect(courseStatus(med({ durationDays: 5 }), "2026-09-01", NOW).ended).toBe(true);
  });

  it("maps to the member's own medicine list and matches loosely", () => {
    expect(toProfileMedication(med())).toEqual({ name: "Metformin 500 mg", dose: "1 tablet", frequency: "1-0-1 · Twice a day after food, for 30 days" });
    expect(toProfileMedication(med({ name: "Dolo 650", strength: "650" })).name).toBe("Dolo 650");
    expect(sameMedicine("Metformin  500mg", "metformin 500 mg")).toBe(true);
    expect(sameMedicine("Metformin 500", "Metformin 1000")).toBe(false);
  });
});

describe("ranges and trends", () => {
  it("parses the ways labs print ranges", () => {
    expect(parseRange("12.0-15.0")).toEqual({ low: 12, high: 15 });
    expect(parseRange("1,50,000 – 4,10,000")).toEqual({ low: 150000, high: 410000 });
    expect(parseRange("<200")).toEqual({ low: null, high: 200 });
    expect(parseRange("> 40")).toEqual({ low: 40, high: null });
    expect(parseRange("Negative")).toBeNull();
  });

  it("places a value with the normal band in the middle third", () => {
    const r = { low: 12, high: 15 };
    expect(rangePosition(12, r)).toBeCloseTo(1 / 3);
    expect(rangePosition(15, r)).toBeCloseTo(2 / 3);
    expect(rangePosition(10.4, r)).toBeLessThan(1 / 3);
    expect(rangePosition(99, r)).toBe(1);
    expect(rangePosition(-5, r)).toBe(0);
  });

  it("describes change since last time", () => {
    expect(trend(10.4, 11.2)).toEqual({ delta: -0.8, direction: "down" });
    expect(trend(5, null)).toBeNull();
  });
});

describe("cover, doses, stays and money", () => {
  it("knows where a policy stands", () => {
    expect(coverStatus({ start: "2026-01-01", end: "2026-12-31" }, NOW)).toEqual({ status: "active", daysLeft: 92 });
    expect(coverStatus({ start: "2025-10-15", end: "2026-10-14" }, NOW).status).toBe("renew_soon");
    expect(coverStatus({ start: "2025-01-01", end: "2025-12-31" }, NOW).status).toBe("expired");
    expect(coverStatus({ start: "2026-11-01", end: "2027-10-31" }, NOW).status).toBe("not_started");
    expect(coverUsed({ sumInsured: 500000, claimed: 125000 })).toEqual({ remaining: 375000, share: 0.25 });
  });

  it("knows when the next dose is due", () => {
    expect(doseStatus({ dose: 3, doses: 3, nextDue: null }, NOW).status).toBe("complete");
    expect(doseStatus({ dose: 1, doses: 3, nextDue: "2026-09-20" }, NOW)).toEqual({ status: "overdue", days: -10 });
    expect(doseStatus({ dose: 1, doses: 3, nextDue: "2026-10-05" }, NOW).status).toBe("due_soon");
    expect(doseStatus({ dose: 1, doses: 3, nextDue: "2027-03-01" }, NOW).status).toBe("upcoming");
    expect(doseStatus({ dose: 1, doses: 3, nextDue: null }, NOW).status).toBe("no_date");
  });

  it("counts a stay, and money the Indian way", () => {
    expect(lengthOfStay("2026-08-01", "2026-08-04")).toBe(3);
    expect(lengthOfStay("2026-08-01", "2026-08-01")).toBe(1);
    expect(lengthOfStay(null, "2026-08-01")).toBeNull();
    expect(rupees(123456)).toBe("₹1,23,456");
    expect(rupees(99.5)).toBe("₹99.50");
    expect(rupeesShort(500000)).toBe("₹5 lakh");
    expect(rupeesShort(15000000)).toBe("₹1.5 crore");
    expect(daysUntil("2026-10-01", NOW)).toBe(1);
    expect(shortDate("2026-10-12")).toBe("12 Oct 2026");
  });
});

describe("summaryLine", () => {
  it("gives each type its one useful line", () => {
    const rx = readDetails("prescription", { details: { doctor: { name: "Dr Rao" }, medicines: [{ name: "A" }, { name: "B" }] } });
    expect(summaryLine(rx, NOW)).toBe("2 medicines · Dr Rao");
    const bill = readDetails("bill", { details: { vendor: "Fortis", total: 12500, paid: 10000 } });
    expect(summaryLine(bill, NOW)).toBe("₹12,500 · ₹2,500 due");
    const vax = readDetails("vaccination", { details: { vaccine: "Hep B", dose: 1, doses: 3, nextDue: "2026-10-05" } });
    expect(summaryLine(vax, NOW)).toBe("Dose 1 of 3 · next due 5 Oct 2026");
    const ins = readDetails("insurance", { details: { insurer: "Star", policyNo: "P1", sumInsured: 500000, start: "2025-10-15", end: "2026-10-14" } });
    expect(summaryLine(ins, NOW)).toBe("₹5 lakh cover · renews in 14 days");
    expect(summaryLine(null, NOW)).toBeNull();
  });
});

describe("supplyLeft", () => {
  it("counts days of supply and the day it runs out", () => {
    expect(supplyLeft({ ...med(), qty: 180 }, "2026-09-01", NOW)).toEqual({ days: 90, runsOutOn: "2026-11-30", daysLeft: 61 });
    expect(supplyLeft({ ...med(), qty: 10 }, null, NOW)).toEqual({ days: 5, runsOutOn: null, daysLeft: null });
    expect(supplyLeft({ ...med({ asNeeded: true }), qty: 10 }, "2026-09-01", NOW)).toBeNull();
    expect(supplyLeft({ ...med(), qty: null }, "2026-09-01", NOW)).toBeNull();
  });
});
