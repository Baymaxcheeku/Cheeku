import { describe, expect, it } from "vitest";

import { answerQuestion, type GroundingRecord } from "./answer";
import type { RecordEntity } from "@/lib/records/types";

/*
 * Product-rule tests. The chat is the surface where a health app is most likely
 * to say something it should not, so the things it must never say are asserted
 * directly rather than left to review.
 *
 * The design frames answer these same questions with "may indicate mild anemia"
 * and "2000-4000 IU daily for 8-12 weeks" — a diagnosis and a dosage. These
 * tests are what stop that copy being reintroduced.
 */

function entity(over: Partial<RecordEntity> = {}): RecordEntity {
  return {
    id: "e1",
    kind: "lab_value",
    name: "Haemoglobin",
    canonicalName: "haemoglobin",
    value: 10.4,
    valueText: null,
    unit: "g/dL",
    refRange: "12.0-15.0",
    flag: "low",
    eventDate: "2026-06-14",
    ...over,
  };
}

function record(over: Partial<GroundingRecord> = {}): GroundingRecord {
  return {
    id: "d1",
    profileId: "p1",
    profileName: "Ananya",
    title: "Complete blood count",
    docType: "lab_report",
    status: "filed",
    mimeType: "application/pdf",
    eventDate: "2026-06-14",
    facility: "Vijaya Diagnostics",
    doctor: null,
    confidence: 0.9,
    severity: "high_risk",
    createdAt: "2026-06-14T00:00:00Z",
    entities: [entity()],
    ...over,
  };
}

const FORBIDDEN: [RegExp, string][] = [
  [/\banemia|anaemia\b/i, "names a condition"],
  [/\bdiabet/i, "names a condition"],
  [/\bdeficien/i, "names a condition"],
  [/\bdiagnos(e|ed|es|ing|is)\b/i, "diagnoses"], // Targets the ACT of diagnosing, not the letters: facility
  // names legitimately contain "Diagnostics" and are echoed verbatim from the
  // reader's own document, which is not Cheeku making a claim.
  [/\bprescrib/i, "prescribes"],
  [/\b\d+\s*(iu|mg|mcg|ml)\b/i, "gives a dosage"],
  [/\bsupplement/i, "recommends a treatment"],
  [/\btablet|capsule\b/i, "recommends a treatment"],
  [/\byou should (take|start|stop)\b/i, "instructs treatment"],
  [/\bindicates?\b/i, "interprets"],
  [/\bmeans that you\b/i, "interprets"],
];

function assertSafe(text: string) {
  for (const [pattern, why] of FORBIDDEN) {
    expect(text, `answer ${why}: ${pattern}`).not.toMatch(pattern);
  }
}

describe("answerQuestion — grounding", () => {
  it("is silent when no record covers the question", () => {
    const answer = answerQuestion("what about my thyroid", [record()]);
    expect(answer.grounded).toBe(false);
    expect(answer.citations).toEqual([]);
    expect(answer.paragraphs.join(" ")).toContain("could not find");
    assertSafe(answer.paragraphs.join(" "));
  });

  it("says so plainly when there are no records at all", () => {
    const answer = answerQuestion("how is my blood count", []);
    expect(answer.grounded).toBe(false);
    expect(answer.paragraphs.join(" ")).toContain("no records saved");
  });

  it("is silent for a question with no matching record and no general topic", () => {
    const answer = answerQuestion("what is a normal cholesterol level", [record()]);
    expect(answer.grounded).toBe(false);
    expect(answer.kind).toBe("silent");
    assertSafe(answer.paragraphs.join(" "));
  });

  it("answers a general topic question that isn't grounded in any record", () => {
    const answer = answerQuestion("is running safe during pregnancy", [record()]);
    expect(answer.grounded).toBe(false);
    expect(answer.kind).toBe("general");
    expect(answer.citations).toEqual([]);
    assertSafe(answer.paragraphs.join(" "));
  });

  it("folds in the reader's own declared conditions on a general answer, without inventing one", () => {
    const withCondition = answerQuestion("is running safe during pregnancy", [record()], [
      "Pregnancy, 24 weeks",
    ]);
    const without = answerQuestion("is running safe during pregnancy", [record()], []);
    expect(withCondition.paragraphs.join(" ")).toMatch(/health profile/i);
    expect(without.paragraphs.join(" ")).not.toMatch(/health profile/i);
    assertSafe(withCondition.paragraphs.join(" "));
  });

  it("answers the chat's own starter chips from the records rather than going silent", () => {
    // All three starters are overview-shaped and used to fall through to
    // silence, which made the first tap in the product a dead end.
    for (const starter of [
      "What do my recent reports say?",
      "Has anything changed since last time?",
      "What is in my records?",
    ]) {
      const answer = answerQuestion(starter, [record()]);
      expect(answer.kind, `"${starter}" should be grounded`).toBe("grounded");
      expect(answer.citations.length).toBeGreaterThan(0);
      assertSafe(answer.paragraphs.join(" "));
    }
  });

  it("reports what the report itself flagged, without interpreting it", () => {
    const answer = answerQuestion("what do my recent reports say", [record()]);
    const text = answer.paragraphs.join(" ");
    expect(text).toContain("Complete blood count");
    expect(text).toMatch(/outside its printed range/);
    assertSafe(text);
  });

  it("still goes silent on an overview question when there are no records", () => {
    const answer = answerQuestion("what is in my records", []);
    expect(answer.kind).toBe("silent");
  });

  it("prefers a specific value over an overview when the question names one", () => {
    // "latest" would match the overview patterns, but haemoglobin is nameable.
    const answer = answerQuestion("what is my latest haemoglobin", [record()]);
    expect(answer.kind).toBe("grounded");
    expect(answer.paragraphs.join(" ")).toContain("10.4 g/dL");
  });

  it("prefers a grounded record match over a general topic when both could apply", () => {
    const hb = record({ entities: [entity({ name: "Haemoglobin", canonicalName: "haemoglobin" })] });
    const answer = answerQuestion("how is my haemoglobin", [hb]);
    expect(answer.kind).toBe("grounded");
  });

  it("answers from the record and cites it", () => {
    const answer = answerQuestion("how is my haemoglobin", [record()]);
    expect(answer.grounded).toBe(true);
    expect(answer.citations).toHaveLength(1);
    expect(answer.citations[0]?.documentId).toBe("d1");
    expect(answer.paragraphs.join(" ")).toContain("10.4 g/dL");
  });

  it("resolves everyday words to what the lab actually printed", () => {
    // "blood" must reach a document that says "Haemoglobin".
    const answer = answerQuestion("is my blood okay", [record()]);
    expect(answer.grounded).toBe(true);
  });

  it("reports a change in direction without saying what it means", () => {
    const older = record({
      id: "d0",
      title: "Complete blood count (March)",
      eventDate: "2026-03-01",
      entities: [entity({ id: "e0", value: 9.1 })],
    });
    const answer = answerQuestion("how is my haemoglobin", [record(), older]);
    const text = answer.paragraphs.join(" ");
    expect(text).toMatch(/higher/);
    expect(answer.citations.map((c) => c.documentId)).toContain("d0");
    assertSafe(text);
  });
});

describe("answerQuestion — the product rules", () => {
  it("never diagnoses, prescribes or gives a dosage", () => {
    const probes = [
      "how is my haemoglobin",
      "is my blood okay",
      "what should I do about my haemoglobin",
      "do I have anemia",
      "what medicine should I take",
    ];
    for (const probe of probes) {
      assertSafe(answerQuestion(probe, [record()]).paragraphs.join(" "));
    }
  });

  it("always defers interpretation to a doctor when it answers", () => {
    const answer = answerQuestion("how is my haemoglobin", [record()]);
    expect(answer.paragraphs.join(" ")).toMatch(/do not interpret|your doctor/i);
  });

  it("only quotes numbers that came from the document", () => {
    const answer = answerQuestion("how is my haemoglobin", [record()]);
    const text = answer.paragraphs.join(" ");
    // 10.4 and the printed range are from the record. Nothing else numeric
    // should appear — a threshold of its own would be a clinical claim.
    const numbers = text.match(/\d+(\.\d+)?/g) ?? [];
    for (const n of numbers) {
      expect(["10.4", "12.0", "15.0", "14", "2026", "6"]).toContain(n);
    }
  });

  it("never offers a follow-up Cheeku cannot actually do", () => {
    const answer = answerQuestion("how is my haemoglobin", [record()]);
    for (const chip of answer.followUps) {
      expect(chip).not.toMatch(/order|book|prescribe|buy/i);
    }
  });
});
