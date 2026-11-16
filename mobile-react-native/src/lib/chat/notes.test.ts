import { describe, expect, it } from "vitest";

import { chatNotes, type DocIn } from "./notes";

// Monday 16 Nov 2026, 9 am local.
const NOW = new Date(2026, 10, 16, 9, 0);
const iso = (days: number, hour = 9) => new Date(2026, 10, 16 + days, hour, 0).toISOString();
const base = { name: "Arjun", docs: [], labs: [], classes: [], visits: [], now: NOW };

const LIPID: DocIn = {
  id: "d1", title: "Lipid profile", docType: "lab_report", filedAt: iso(-1), medicines: 0, doctor: null,
  flagged: [{ name: "LDL cholesterol", value: "131 mg/dL" }, { name: "Triglycerides", value: "190 mg/dL" }],
  changes: [{ name: "LDL cholesterol", from: "118 mg/dL", to: "131 mg/dL", direction: "up" }],
};

describe("reports in chat", () => {
  it("says what moved and what is outside the range, without repeating a value", () => {
    const [n] = chatNotes({ ...base, docs: [LIPID] });
    expect(n!.title).toBe("I've read the Lipid profile.");
    expect(n!.line).toBe("LDL cholesterol 131 mg/dL, up from 118 mg/dL. Outside the printed range: Triglycerides 190 mg/dL.");
    expect(n!.primary).toMatchObject({ send: "What did my last blood report say?", record: "d1" });
  });
  it("says so when everything is in range", () => {
    const [n] = chatNotes({ ...base, docs: [{ ...LIPID, flagged: [], changes: [] }] });
    expect(n!.line).toBe("Everything on it is inside the printed ranges.");
  });
  it("offers the medicine check for a prescription", () => {
    const [n] = chatNotes({ ...base, docs: [{ ...LIPID, id: "p1", docType: "prescription", doctor: "Dr Rao", medicines: 3, flagged: [], changes: [] }] });
    expect(n!.title).toBe("I've read Dr Rao's prescription.");
    expect(n!.primary.route).toBe("/prescription/p1");
  });
  it("names the home test when the report is its result", () => {
    const lab = { id: "l1", tests: ["HbA1c"], slotDate: "2026-11-14", slotWindow: "6-8 am", status: "ready", createdAt: iso(-4), resultDocumentId: "d1" };
    const [n] = chatNotes({ ...base, docs: [LIPID], labs: [lab] });
    expect(n!.title).toBe("Your HbA1c result is back.");
  });
  it("stays quiet about bills and old reports", () => {
    expect(chatNotes({ ...base, docs: [{ ...LIPID, docType: "consultation_invoice" }, { ...LIPID, id: "old", filedAt: iso(-30) }] })).toEqual([]);
  });
});

describe("bookings in chat", () => {
  it("confirms a home test, then reminds the day before", () => {
    const lab = { id: "l2", tests: ["HbA1c", "Lipid profile", "Vitamin D"], slotDate: "2026-11-20", slotWindow: "6-8 am", status: "booked", createdAt: iso(0, 8), resultDocumentId: null };
    const [booked] = chatNotes({ ...base, labs: [lab] });
    expect(booked!.title).toBe("Booked: HbA1c, Lipid profile and 1 more at home, Fri 20 Nov, 6-8 am.");
    const [soon] = chatNotes({ ...base, labs: [{ ...lab, slotDate: "2026-11-17" }] });
    expect(soon!.key).toBe("lab:l2:soon");
    expect(soon!.title).toContain("Tomorrow, 6-8 am");
  });
  it("reminds about a class today and checks in after one", () => {
    const today = { id: "c1", title: "Yoga", studio: "Aum Yoga House", startsAt: iso(0, 18), status: "booked", createdAt: iso(-2) };
    expect(chatNotes({ ...base, classes: [today] })[0]!.title).toBe("Today at 6:00 pm: Yoga at Aum Yoga House.");
    const done = { ...today, startsAt: iso(-1, 7) };
    expect(chatNotes({ ...base, classes: [done] })[0]!.title).toBe("How was Yoga at Aum Yoga House?");
  });
  it("offers to prepare before a doctor visit and asks for the prescription after", () => {
    const visit = { id: "v1", doctor: "Dr Rao", mode: "online" as const, startsAt: iso(1, 18), when: "Tomorrow, 6:00 pm", status: "booked", createdAt: iso(-1) };
    const [before] = chatNotes({ ...base, visits: [visit] });
    expect(before!.primary.send).toBe("Prepare for my appointment");
    const [after] = chatNotes({ ...base, visits: [{ ...visit, startsAt: iso(-1, 18) }] });
    expect(after!.title).toBe("How did the video call with Dr Rao go?");
    expect(after!.primary.route).toBe("/scan");
  });
  it("puts the newest first and skips cancelled ones", () => {
    const visit = { id: "v2", doctor: "Dr Rao", mode: "clinic" as const, startsAt: iso(1), when: "Tomorrow, 9:00 am", status: "cancelled", createdAt: iso(-1) };
    const notes = chatNotes({ ...base, docs: [LIPID, { ...LIPID, id: "d2", filedAt: iso(-3) }], visits: [visit] });
    expect(notes.map((n) => n.key)).toEqual(["doc:d1", "doc:d2"]);
  });
});
