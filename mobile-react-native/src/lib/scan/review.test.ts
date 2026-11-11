import { describe, expect, it } from "vitest";

import type { Extraction } from "@/lib/ai/mock/extract-types";
import { routeFor } from "@/lib/ai/mock/extract";

import { applyReview, EMPTY_REVIEW, flagFor, parseRange, reviewItems, unresolved } from "./review";
import { fromShare, normaliseMime } from "./shared";

const X: Extraction = {
  title: "Diabetes panel",
  docType: "lab_report",
  eventDate: "2026-10-20",
  facility: "City Diagnostics",
  doctor: null,
  details: {},
  rawText: "",
  confidence: 0.8,
  fields: [
    { key: "patientName", label: "Patient name", value: "-", confidence: 0.9 },
    { key: "eventDate", label: "Date on the document", value: "2026-10-20", confidence: 0.95 },
    { key: "facility", label: "Lab name", value: "Citv Diagnostlcs", confidence: 0.55 },
  ],
  values: [
    { key: "hba1c", label: "HbA1c", value: "6.1", unit: "%", refRange: "4.0-5.6", flag: "high", confidence: 0.93 },
    { key: "glucose_fasting", label: "Fasting glucose", value: "18", unit: "mg/dL", refRange: "70-99", flag: "low", confidence: 0.42 },
  ],
};

describe("what the confirm step shows", () => {
  it("lists only the doubtful items to check, and skips empty fields", () => {
    const items = reviewItems(X);
    expect(items.map((i) => i.id)).toEqual(["f:eventDate", "f:facility", "v:hba1c", "v:glucose_fasting"]);
    expect(items.filter((i) => i.low).map((i) => i.id)).toEqual(["f:facility", "v:glucose_fasting"]);
    expect(unresolved(X, EMPTY_REVIEW)).toHaveLength(2);
  });

  it("files as checked once every doubtful item is confirmed or corrected", () => {
    const s = { edits: { "v:glucose_fasting": { value: "108" } }, confirmed: new Set(["f:facility"]) };
    expect(unresolved(X, s)).toHaveLength(0);
    const out = applyReview(X, s);
    expect(routeFor(out)).toBe("filed");
    const g = out.values.find((v) => v.key === "glucose_fasting");
    expect(g).toMatchObject({ value: "108", flag: "high", confidence: 1 });
    expect(out.facility).toBe("Citv Diagnostlcs");
  });

  it("stays unverified when something doubtful is left unchecked", () => {
    const out = applyReview(X, { edits: {}, confirmed: new Set(["f:facility"]) });
    expect(routeFor(out)).toBe("needs_review");
  });

  it("carries a corrected lab name into the record", () => {
    const out = applyReview(X, { edits: { "f:facility": { value: "City Diagnostics" } }, confirmed: new Set() });
    expect(out.facility).toBe("City Diagnostics");
  });

  it("reads ranges and flags plainly", () => {
    expect(parseRange("4.0-5.6")).toEqual([4, 5.6]);
    expect(parseRange("70 - 99")).toEqual([70, 99]);
    expect(parseRange("Negative")).toBeNull();
    expect(flagFor("5.0", "4.0-5.6", "high")).toBe("normal");
    expect(flagFor("3.1", "4.0-5.6", null)).toBe("low");
    expect(flagFor("abc", "4.0-5.6", "caution")).toBe("caution");
  });
});

describe("a medicine read from a prescription", () => {
  const rx: Extraction = {
    title: "Prescription",
    docType: "prescription",
    eventDate: "2026-10-02",
    facility: null,
    doctor: "Dr. Rao",
    details: {
      doctor: { name: "Dr. Rao" },
      medicines: [
        { name: "Glycomet", strength: "500 mg", schedule: [1, 0, 1], timing: "after_food", durationDays: 30 },
        { name: "Dolo", strength: "650", schedule: [0, 0, 0], asNeeded: true },
      ],
    },
    fields: [
      { key: "med:0", label: "Medicine 1", value: "Glycomet 500 mg", confidence: 0.92 },
      { key: "med:1", label: "Medicine 2", value: "Dolo 650", confidence: 0.55 },
    ],
    values: [],
    rawText: "",
    confidence: 0.74,
  };

  it("asks about a doubtful medicine name and nothing read clearly", () => {
    expect(unresolved(rx, EMPTY_REVIEW).map((i) => i.id)).toEqual(["f:med:1"]);
  });

  it("writes a corrected name into the medicine, keeping its schedule", () => {
    const out = applyReview(rx, { edits: { "f:med:1": { value: "Dolo 650 mg" } }, confirmed: new Set() });
    const meds = (out.details as { medicines: Record<string, unknown>[] }).medicines;
    expect(meds[1]).toMatchObject({ name: "Dolo 650 mg", strength: null, asNeeded: true });
    expect(meds[0]).toMatchObject({ name: "Glycomet", strength: "500 mg", schedule: [1, 0, 1] });
    expect(routeFor(out)).toBe("filed");
  });

  it("leaves the medicines alone when a name is only confirmed", () => {
    const out = applyReview(rx, { edits: {}, confirmed: new Set(["f:med:1"]) });
    expect(out.details).toBe(rx.details);
  });
});

describe("a shared file", () => {
  it("takes the first file and fixes WhatsApp's types", () => {
    expect(normaliseMime("image/jpg", "IMG.jpg")).toBe("image/jpeg");
    expect(normaliseMime("application/octet-stream", "Report_CBC.pdf")).toBe("application/pdf");
    const f = fromShare([{ path: "/data/user/0/app/cache/Report.pdf", mimeType: "", fileName: "Report.pdf", size: 2048, width: null, height: null, duration: null }]);
    expect(f).toMatchObject({ uri: "file:///data/user/0/app/cache/Report.pdf", mimeType: "application/pdf", accepted: true, size: 2048 });
  });

  it("marks a video or a document type Scan cannot read", () => {
    expect(fromShare([{ path: "file:///x/clip.mp4", mimeType: "video/mp4", fileName: "clip.mp4", size: 1, width: null, height: null, duration: 3 }])?.accepted).toBe(false);
    expect(fromShare([])).toBeNull();
  });
});
