/*
 * The fixtures exist to guarantee that every UI state is reachable in a demo
 * without uploading anything. These assertions are that guarantee — if someone
 * "tidies" the amber needs-review document away, the review screen silently
 * becomes undemoable and nobody notices until it is on a projector.
 */
import { describe, expect, it } from "vitest";

import { SEED_DOCUMENTS, SEED_PROFILES } from "./family";

const allEntities = SEED_DOCUMENTS.flatMap((d) => d.entities);

describe("seed family", () => {
  it("has exactly one primary profile", () => {
    expect(SEED_PROFILES.filter((p) => p.isPrimary)).toHaveLength(1);
  });

  it("stays within the 6-profile family cap enforced by the database", () => {
    expect(SEED_PROFILES.length).toBeLessThanOrEqual(6);
  });

  it("uses globally unique ids across profiles, documents and entities", () => {
    const ids = [
      ...SEED_PROFILES.map((p) => p.id),
      ...SEED_DOCUMENTS.map((d) => d.id),
      ...allEntities.map((e) => e.id),
      ...SEED_PROFILES.flatMap((p) => p.timeline.map((t) => t.id)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references documents that exist from the timeline", () => {
    const documentIds = new Set(SEED_DOCUMENTS.map((d) => d.id));
    for (const profile of SEED_PROFILES) {
      for (const event of profile.timeline) {
        if (event.sourceDocumentId) expect(documentIds).toContain(event.sourceDocumentId);
      }
    }
  });
});

describe("demo coverage", () => {
  it("includes a needs_review document, so the amber review path is always visible", () => {
    const review = SEED_DOCUMENTS.filter((d) => d.status === "needs_review");
    expect(review.length).toBeGreaterThan(0);
    // Needs-review must actually look uncertain, not be an arbitrary label.
    expect(review.every((d) => d.confidence < 0.75)).toBe(true);
  });

  it("includes a high-flagged lab value", () => {
    expect(allEntities.some((e) => e.kind === "lab_value" && e.flag === "high")).toBe(true);
  });

  it("includes low and normal flags too, so all states render", () => {
    const flags = new Set(allEntities.map((e) => e.flag));
    expect(flags).toContain("low");
    expect(flags).toContain("normal");
    expect(flags).toContain("caution");
  });

  it("has a trendable series: three HbA1c readings spanning at least 18 months", () => {
    const series = allEntities
      .filter((e) => e.canonicalName === "hba1c")
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    expect(series).toHaveLength(3);

    const first = new Date(series[0]!.eventDate);
    const last = new Date(series[2]!.eventDate);
    const months = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
    expect(months).toBeGreaterThanOrEqual(18);
  });

  it("covers the document types the records filter offers", () => {
    const types = new Set(SEED_DOCUMENTS.map((d) => d.docType));
    for (const type of ["lab_report", "prescription", "scan", "bill"]) {
      expect(types).toContain(type);
    }
  });

  it("uses only allowlisted mime types, matching the upload validator", () => {
    const allowed = new Set(["image/jpeg", "image/png", "image/heic", "application/pdf"]);
    for (const doc of SEED_DOCUMENTS) expect(allowed).toContain(doc.mimeType);
  });

  it("gives every document a real facility and date, so no card renders blank", () => {
    for (const doc of SEED_DOCUMENTS) {
      expect(doc.facility.length).toBeGreaterThan(0);
      expect(doc.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
