import { describe, expect, it } from "vitest";

import { fastingFor, quote, rankPartners, searchTests, suggestionsFor, windowsFor, type Catalog, type LabPartner, type LabTest } from "./logic";

const t = (id: string, name: string, keywords: string[], extra: Partial<LabTest> = {}): LabTest => ({
  id, name, kind: "test", categories: [], sample: "Blood", fastingHours: 0, parameters: 1, includes: [], about: "", keywords, basePrice: 100, popular: false, ...extra,
});
const TESTS = [
  t("hba1c", "HbA1c", ["sugar", "diabetes", "glucose"]),
  t("fbs", "Fasting blood sugar", ["sugar", "glucose"], { fastingHours: 10 }),
  t("ferritin", "Iron studies with ferritin", ["iron", "hair fall"]),
  t("senior-care", "Senior citizen care", ["senior", "dadi", "parents"], { kind: "package", fastingHours: 12 }),
];
const P = (id: string, fee: number, free: number | null, hours: number): LabPartner => ({
  id, name: id, monogram: id, tagline: "", about: "", accreditation: [], collectionFee: fee, freeCollectionAbove: free, reportHours: hours, color: "", isSample: true,
});
const CAT: Catalog = {
  partners: [P("a", 99, 500, 24), P("b", 0, null, 36)],
  tests: TESTS,
  offers: [
    { partnerId: "a", testId: "hba1c", price: 400, mrp: 600 },
    { partnerId: "a", testId: "fbs", price: 120, mrp: 200 },
    { partnerId: "b", testId: "hba1c", price: 380, mrp: 600 },
  ],
};

describe("searchTests", () => {
  it("understands everyday words", () => {
    expect(searchTests(TESTS, "sugar").map((x) => x.id).slice(0, 2).sort()).toEqual(["fbs", "hba1c"]);
    expect(searchTests(TESTS, "hair fall")[0]?.id).toBe("ferritin");
    expect(searchTests(TESTS, "dadi")[0]?.id).toBe("senior-care");
  });
  it("puts a name match first", () => {
    expect(searchTests(TESTS, "hba")[0]?.id).toBe("hba1c");
  });
  it("returns nothing for nonsense and everything for blank", () => {
    expect(searchTests(TESTS, "zzzz")).toHaveLength(0);
    expect(searchTests(TESTS, " ")).toHaveLength(4);
  });
});

describe("pricing", () => {
  it("adds the collection fee below the threshold and waives it above", () => {
    expect(quote(CAT.offers, P("a", 99, 500, 24), ["hba1c"]).total).toBe(499);
    expect(quote(CAT.offers, P("a", 99, 500, 24), ["hba1c", "fbs"]).fee).toBe(0);
  });
  it("names tests a lab does not do", () => {
    expect(quote(CAT.offers, P("b", 0, null, 36), ["hba1c", "fbs"]).missing).toEqual(["fbs"]);
  });
  it("ranks labs that do everything, cheapest first", () => {
    expect(rankPartners(CAT, ["hba1c"]).map((r) => r.partner.id)).toEqual(["b", "a"]);
    expect(rankPartners(CAT, ["hba1c", "fbs"]).map((r) => r.partner.id)).toEqual(["a"]);
  });
});

describe("suggestions", () => {
  it("follows the conditions on file", () => {
    expect(suggestionsFor(["Diabetes"], 40)).toContain("hba1c");
    expect(suggestionsFor(["Thyroid"], 30)).toContain("thyroid");
  });
  it("adds senior checks over 60 and a sensible default otherwise", () => {
    expect(suggestionsFor([], 70)).toContain("senior-care");
    expect(suggestionsFor([], 30)).toEqual(["fullbody", "vitd"]);
  });
});

describe("slots", () => {
  const now = new Date(2026, 8, 30, 9, 0);
  it("needs two hours' notice today", () => {
    expect(windowsFor(new Date(2026, 8, 30), now, 0)).toEqual(["4-6 pm"]);
  });
  it("keeps fasting tests to the morning", () => {
    expect(windowsFor(new Date(2026, 9, 1), now, 12)).toEqual(["6-8 am", "8-10 am", "10-12 pm"]);
  });
  it("finds the longest fast", () => {
    expect(fastingFor(TESTS, ["hba1c", "senior-care"])).toBe(12);
  });
});
