import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import { blankExtraction, docTypeOf, mealSlotNow, plateTagsFrom, toExtraction, type ReadResult } from "./reader";

const base: ReadResult = {
  kind: "lab_report", title: "Complete blood count", eventDate: "2026-11-02", facility: "City Labs", doctor: null, patientName: "Arjun",
  values: [{ name: "Haemoglobin", value: "11.2", unit: "g/dL", refRange: "13-17", flag: "low" }], medicines: [], foods: [], summary: "A blood count.", confidence: 0.9, rawText: "",
};

describe("upload reader", () => {
  it("never files a meal or a non-health picture as a record type", () => {
    expect(docTypeOf("meal")).toBeNull();
    expect(docTypeOf("not_health")).toBeNull();
    expect(docTypeOf("other_health")).toBe("other");
    expect(docTypeOf("prescription")).toBe("prescription");
  });

  it("keeps the lab's own flag and range on each value", () => {
    const e = toExtraction(base, "lab_report");
    expect(e.values[0]).toMatchObject({ label: "Haemoglobin", value: "11.2", unit: "g/dL", refRange: "13-17", flag: "low" });
    expect(e.eventDate).toBe("2026-11-02");
    expect(e.title).toBe("Complete blood count");
  });

  it("puts a prescription's medicines where the record page reads them", () => {
    const e = toExtraction({ ...base, kind: "prescription", values: [], doctor: "Dr Mehta", medicines: [{ name: "Metformin", strength: "500 mg", form: "tablet", dose: "1", schedule: [1, 0, 1], timing: "after_food", durationDays: 30, asNeeded: false }] }, "prescription");
    expect(e.details).toMatchObject({ doctor: { name: "Dr Mehta" }, medicines: [{ name: "Metformin", schedule: [1, 0, 1], timing: "after_food" }] });
  });

  it("an unread file is blank, never sample data", () => {
    const e = blankExtraction("other");
    expect(e.values).toEqual([]);
    expect(e.confidence).toBe(0);
  });

  it("turns everyday food words into the meal sheet's chips", () => {
    expect(plateTagsFrom(["2 roti", "dal tadka", "aloo gobi", "chai"]).sort()).toEqual(["chai_sugar", "dal", "roti", "sabzi"]);
  });

  it("picks the meal by the hour", () => {
    expect(mealSlotNow(new Date(2026, 10, 21, 8))).toBe("breakfast");
    expect(mealSlotNow(new Date(2026, 10, 21, 13))).toBe("lunch");
    expect(mealSlotNow(new Date(2026, 10, 21, 21))).toBe("dinner");
  });
});
