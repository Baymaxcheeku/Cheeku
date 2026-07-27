import { describe, expect, it } from "vitest";

import { buildInsight, formatValue } from "./insight";
import type { RecordDetail, RecordEntity } from "./types";

/*
 * These are product-rule tests, not formatting tests. The insight card is the
 * one place on D2 where prose is generated about someone's health, so the
 * things it must never say are asserted directly.
 */

function entity(over: Partial<RecordEntity> = {}): RecordEntity {
  return {
    id: "e1",
    kind: "lab_value",
    name: "Hemoglobin (Hb)",
    canonicalName: "hemoglobin",
    value: 13.2,
    valueText: null,
    unit: "g/dL",
    refRange: "13.0–17.0",
    flag: "normal",
    eventDate: "2025-05-15",
    ...over,
  };
}

function record(entities: RecordEntity[]): RecordDetail {
  return {
    id: "d1",
    profileId: "p1",
    profileName: "Ananya Sharma",
    title: "Blood Test Report",
    docType: "lab_report",
    status: "filed",
    mimeType: "application/pdf",
    eventDate: "2025-05-15",
    facility: "Fortis",
    doctor: null,
    confidence: 0.92,
    severity: "normal",
    createdAt: "2025-05-15T09:30:00Z",
    rawText: null,
    storagePath: "u/p/d.pdf",
    entities,
    extraction: null,
  };
}

/*
 * Deliberately broad. If a future edit reaches for any of this vocabulary the
 * test fails, which is the point — the failure should be annoying enough to
 * force the question "am I about to diagnose someone?".
 */
const FORBIDDEN = [
  /\bdiagnos/i,
  /\bprescrib/i,
  /\bdos(e|age)/i,
  /\bmg\b/i,
  /\byou (have|likely have|may have)\b/i,
  /\bsuggests? (that )?you\b/i,
  /\btreat(ment)?\b/i,
  /\banemia|anaemia|diabetes|thyroid disease\b/i,
];

function assertSafe(text: string) {
  for (const pattern of FORBIDDEN) {
    expect(text, `matched forbidden pattern ${pattern}`).not.toMatch(pattern);
  }
}

describe("buildInsight", () => {
  it("stays silent about documents with nothing measured", () => {
    const insight = buildInsight(record([entity({ kind: "medication", name: "Metformin" })]));
    expect(insight.flagged).toBe(false);
    expect(insight.body).toContain("no measured values");
    assertSafe(insight.body);
  });

  it("says everything is in range without adding reassurance it cannot support", () => {
    const insight = buildInsight(record([entity(), entity({ id: "e2", name: "WBC Count" })]));
    expect(insight.flagged).toBe(false);
    expect(insight.body).toContain("within the reference range");
    assertSafe(insight.body);
  });

  it("names the out-of-range values and defers to a doctor", () => {
    const insight = buildInsight(
      record([
        entity({ flag: "normal" }),
        entity({ id: "e2", name: "WBC Count", flag: "high" }),
        entity({ id: "e3", name: "Platelet Count", flag: "low" }),
      ]),
    );
    expect(insight.flagged).toBe(true);
    expect(insight.headline).toContain("2 values");
    expect(insight.body).toContain("WBC Count and Platelet Count");
    expect(insight.body).toContain("does not interpret");
    assertSafe(insight.body);
  });

  it("counts only measured values, not medications on the same document", () => {
    const insight = buildInsight(
      record([entity({ flag: "high" }), entity({ id: "m", kind: "medication", name: "Metformin" })]),
    );
    expect(insight.headline).toContain("1 value");
    expect(insight.body).not.toContain("Metformin");
  });

  it("never emits a threshold or a number of its own", () => {
    const insight = buildInsight(record([entity({ flag: "low" })]));
    // The only digits allowed are the count of flagged values.
    const digits = insight.body.match(/\d+(\.\d+)?/g) ?? [];
    expect(digits).toEqual([]);
  });
});

describe("formatValue", () => {
  it("pairs a number with its unit", () => {
    expect(formatValue(entity())).toBe("13.2 g/dL");
  });

  it("falls back to free text when there is no number", () => {
    expect(formatValue(entity({ value: null, valueText: "Reactive", unit: null }))).toBe("Reactive");
  });

  it("shows a dash rather than 'null' when the document had neither", () => {
    expect(formatValue(entity({ value: null, valueText: null }))).toBe("—");
  });
});
