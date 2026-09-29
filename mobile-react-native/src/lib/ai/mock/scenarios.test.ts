import { describe, expect, it } from "vitest";

import { PRODUCT_SCENARIOS, assessProduct, findScenario } from "./scenarios";

/*
 * Same product-rule check as the rest of the AI layer, applied to every
 * scenario's every field — a verdict is about the PRODUCT, never a diagnosis
 * or a dose directed at the reader.
 */

const FORBIDDEN: [RegExp, string][] = [
  [/\bdiagnos(e|ed|es|ing|is)\b/i, "diagnoses"], // Targets the ACT of diagnosing, not the letters: facility
  // names legitimately contain "Diagnostics" and are echoed verbatim from the
  // reader's own document, which is not Cheeku making a claim.
  [/\bprescrib/i, "prescribes"],
  [/\b\d+\s*(iu|mg|mcg|ml)\b/i, "gives a numeric dosage"],
  [/\byou should (take|start|stop)\b/i, "instructs treatment"],
  [/\bindicates?\b/i, "interprets"],
];

function allText(scenario: (typeof PRODUCT_SCENARIOS)[number]): string {
  return [
    scenario.title,
    scenario.verdictNote,
    ...scenario.personas.map((p) => p.note),
    ...scenario.ingredients.map((i) => i.note),
  ].join(" ");
}

function assertSafe(text: string) {
  for (const [pattern, why] of FORBIDDEN) {
    expect(text, `scenario ${why}: ${pattern}`).not.toMatch(pattern);
  }
}

describe("product scenarios — the product rules", () => {
  for (const scenario of PRODUCT_SCENARIOS) {
    it(`"${scenario.id}" never diagnoses, prescribes or gives a numeric dose`, () => {
      assertSafe(allText(scenario));
    });

    it(`"${scenario.id}" carries at least one ingredient and one persona`, () => {
      expect(scenario.ingredients.length).toBeGreaterThan(0);
      expect(scenario.personas.length).toBeGreaterThan(0);
    });

    it(`"${scenario.id}" thumbnail is self-contained SVG markup`, () => {
      // Raw markup, not a data URI: SvgXml takes the string, and `Buffer` —
      // which the web build used to base64 it — does not exist here.
      expect(scenario.thumbnail).toMatch(/^<svg /);
    });
  }

  it("looks up a known scenario by id", () => {
    expect(findScenario("daily-lotion")?.title).toBe("Daily Moisturizing Lotion");
  });

  it("returns null for an unknown id rather than throwing", () => {
    expect(findScenario("not-a-real-id")).toBeUndefined();
    expect(assessProduct("not-a-real-id", [])).toBeNull();
  });

  it("keeps the general verdict when the reader's conditions don't overlap", () => {
    const assessment = assessProduct("protein-bar", ["Type 2 diabetes"]);
    expect(assessment?.verdict).toBe("safe");
    expect(assessment?.personalNote).toBeNull();
  });

  it("escalates the verdict when a declared allergy matches an ingredient, without inventing one", () => {
    const withAllergy = assessProduct("protein-bar", ["Peanut allergy"]);
    expect(withAllergy?.verdict).toBe("avoid");
    expect(withAllergy?.personalNote).toMatch(/peanut allergy/i);

    const without = assessProduct("protein-bar", []);
    expect(without?.verdict).toBe("safe");
    expect(without?.personalNote).toBeNull();
  });

  it("always includes a disclaimer that this is general product information", () => {
    const assessment = assessProduct("daily-lotion", []);
    expect(assessment?.disclaimer).toMatch(/general product information/i);
  });
});
