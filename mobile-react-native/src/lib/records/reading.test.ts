import { describe, expect, it } from "vitest";

import { extractFromFile, routeFor } from "@/lib/ai/mock/extract";
import { guessDocType } from "@/lib/ai/mock/fixtures/records";

import { readDetails, summaryLine } from "./details";
import { entityRows } from "./reading";
import { DOC_TYPES } from "./types";

const TODAY = "2026-09-30";

describe("the preview reader, per type", () => {
  it("produces details every record page can read", () => {
    for (const type of DOC_TYPES) {
      const x = extractFromFile(`file.pdf`, 1234, type, TODAY);
      expect(x.docType).toBe(type);
      const details = readDetails(type, { details: x.details });
      if (type === "other") expect(details).toBeNull();
      else {
        expect(details?.kind).toBe(type);
        if (type !== "lab_report") expect(summaryLine(details, new Date(2026, 8, 30))).toBeTruthy();
      }
    }
  });

  it("is deterministic for the same file", () => {
    expect(extractFromFile("a.pdf", 10, "scan", TODAY)).toEqual(extractFromFile("a.pdf", 10, "scan", TODAY));
  });

  it("guesses the type from the file name", () => {
    expect(guessDocType("Rx_DrIyer.jpg")).toBe("prescription");
    expect(guessDocType("MRI-LS-spine.pdf")).toBe("scan");
    expect(guessDocType("star-health-policy.pdf")).toBe("insurance");
    expect(guessDocType("discharge_summary.pdf")).toBe("discharge");
    expect(guessDocType("apollo_bill.jpg")).toBe("bill");
    expect(guessDocType("hepB_vaccine.png")).toBe("vaccination");
    expect(guessDocType("CBC_report.pdf")).toBe("lab_report");
    expect(guessDocType("IMG_2041.jpg")).toBe("lab_report");
  });

  it("sends a handwritten prescription to review", () => {
    const x = extractFromFile("rx-photo.jpg", 99, "prescription", TODAY);
    expect(routeFor(x)).toBe("needs_review");
  });
});

describe("entityRows", () => {
  it("writes lab values with their flags and numbers", () => {
    const rows = entityRows(extractFromFile("cbc.pdf", 1, "lab_report", TODAY));
    expect(rows.length).toBeGreaterThan(3);
    const hb = rows.find((r) => r.canonical_name === "haemoglobin");
    expect(hb).toMatchObject({ kind: "lab_value", value: 10.4, flag: "low", unit: "g/dL", ref_range: "12.0-15.0" });
  });

  it("writes medicines from a prescription, a discharge and a medication list", () => {
    for (const type of ["prescription", "discharge", "medication"] as const) {
      const rows = entityRows(extractFromFile("x.pdf", 1, type, TODAY));
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.kind === "medication" && r.value_text)).toBe(true);
    }
    const rx = entityRows(extractFromFile("x.pdf", 1, "prescription", TODAY));
    expect(rx[0]?.name).toBe("Azithromycin 500 mg");
  });

  it("writes a vaccine dose, and nothing for money or cover", () => {
    expect(entityRows(extractFromFile("v.pdf", 1, "vaccination", TODAY))).toEqual([
      expect.objectContaining({ kind: "vaccine", value: 2, value_text: "Dose 2 of 3" }),
    ]);
    for (const type of ["bill", "insurance", "consultation_invoice", "booking_invoice", "scan", "other"] as const) {
      expect(entityRows(extractFromFile("x.pdf", 1, type, TODAY))).toEqual([]);
    }
  });
});
