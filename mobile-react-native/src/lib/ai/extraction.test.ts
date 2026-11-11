import { describe, expect, it } from "vitest";

import { LOW_CONFIDENCE } from "./mock/extract-types";
import { readExtraction } from "./extraction";

const good = {
  title: "Diabetes panel",
  docType: "lab_report",
  eventDate: "2026-10-01",
  facility: "Thyrocare",
  doctor: null,
  details: { collectedAt: "2026-10-01", sections: [{ name: "Diabetes panel", keys: ["hba1c"] }] },
  fields: [{ key: "eventDate", label: "Date on the document", value: "2026-10-01", confidence: 0.95 }],
  values: [{ key: "hba1c", label: "HbA1c", value: "7.8", unit: "%", refRange: "4.0 - 5.6", flag: "high", confidence: 0.97 }],
  rawText: "HbA1c 7.8 %",
  confidence: 0.96,
  source: "cheeku-reader-gemini",
};

describe("an extraction from the reader", () => {
  it("passes through intact when it fits the contract", () => {
    const x = readExtraction(good);
    expect(x).toMatchObject({ title: "Diabetes panel", docType: "lab_report", eventDate: "2026-10-01", facility: "Thyrocare" });
    expect(x?.values[0]).toEqual({ key: "hba1c", label: "HbA1c", value: "7.8", unit: "%", refRange: "4.0 - 5.6", flag: "high", confidence: 0.97 });
    expect(x?.confidence).toBe(0.96);
  });

  it("never lets a malformed confidence fold a doubtful value away", () => {
    const x = readExtraction({ ...good, values: [{ ...good.values[0], confidence: "0.99" }, { ...good.values[0], key: "b", confidence: 7 }] });
    expect(x!.values[0]!.confidence).toBe(0);
    expect(x!.values[0]!.confidence).toBeLessThan(LOW_CONFIDENCE);
    expect(x!.values[1]!.confidence).toBe(1);
  });

  it("drops items it cannot use instead of crashing the review screen", () => {
    const x = readExtraction({ ...good, fields: [null, { key: "x" }, "y", good.fields[0], good.fields[0]], values: "nope", details: [], flag: 1 });
    expect(x?.fields).toHaveLength(1);
    expect(x?.values).toEqual([]);
    expect(x?.details).toEqual({});
  });

  it("keeps the type the person picked, and refuses an unknown type", () => {
    expect(readExtraction(good, "prescription")?.docType).toBe("prescription");
    expect(readExtraction({ ...good, docType: "selfie" })?.docType).toBe("other");
  });

  it("drops a date that is not a plain ISO date and a flag outside the scale", () => {
    const x = readExtraction({ ...good, eventDate: "01/10/2026", values: [{ ...good.values[0], flag: "critical" }] });
    expect(x?.eventDate).toBeNull();
    expect(x!.values[0]!.flag).toBeNull();
  });

  it("is null when nothing usable came back, so Scan says it could not read the page", () => {
    expect(readExtraction(null)).toBeNull();
    expect(readExtraction({})).toBeNull();
    expect(readExtraction({ fields: [], values: [], rawText: "   " })).toBeNull();
  });
});
