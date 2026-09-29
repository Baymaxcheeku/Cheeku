import { describe, expect, it } from "vitest";

import { promptsFor } from "./prompts";
import type { JourneyId } from "@/lib/onboarding/journeys";

/*
 * Listed here rather than imported from `journeys.ts`, which pulls in Lucide
 * icon components and cannot load outside the app bundle. The type annotation
 * is what keeps this honest: adding a journey without a prompt set fails the
 * typecheck here as well as in the picker.
 */
const JOURNEY_IDS: readonly JourneyId[] = [
  "expecting",
  "fertility",
  "caregiver",
  "new_parent",
  "optimiser",
  "other",
];

describe("promptsFor", () => {
  it("leads with the declared condition, not the journey", () => {
    const [first] = promptsFor("other", ["Obesity"]);
    expect(first).toBe("What did my last lipid panel say?");
  });

  it("matches however the reader wrote it", () => {
    for (const written of ["Type 2 Diabetes", "diabetic", "HbA1c raised", "PREDIABETES"]) {
      expect(promptsFor(null, [written])[0]).toBe("What does HbA1c actually measure?");
    }
  });

  it("shows one question per topic", () => {
    // "Which of my numbers moved since last time?" (optimiser) and "Which of my
    // numbers changed since last time?" (weight) are different strings and the
    // same question. Shipping both is what this guards.
    const prompts = promptsFor("optimiser", ["obesity"]);
    expect(new Set(prompts).size).toBe(prompts.length);
    expect(prompts.filter((p) => p.includes("since last time"))).toHaveLength(1);
  });

  it("gives a reader who declared nothing three usable questions", () => {
    expect(promptsFor(null, [])).toHaveLength(3);
    expect(promptsFor(undefined, [])).toHaveLength(3);
  });

  it("has a set for every journey the picker offers", () => {
    for (const journey of JOURNEY_IDS) {
      const prompts = promptsFor(journey, []);
      expect(prompts).toHaveLength(3);
      // Not the generic fallback: a journey that falls through to BASE means a
      // reader told us about their life and got the default anyway.
      expect(prompts[0]).not.toBe("What does my last report mean?");
    }
  });

  it("ignores an unknown journey rather than breaking", () => {
    expect(promptsFor("something-we-removed", [])).toHaveLength(3);
  });

  /*
   * THE ONE THAT MATTERS.
   *
   * A suggested question is a promise the app will answer it. Cheeku must
   * never advise on a medicine, a dose or a treatment, and must never judge a
   * result — so no prompt may invite it to. Adding a chip like "Should I take
   * this?" would put the app one tap from the thing it is built not to do.
   */
  it("never suggests a question Cheeku must refuse", () => {
    const banned = [
      /\bshould i (take|stop|start|change|increase|reduce)\b/i,
      /\bis (it|this) safe to take\b/i,
      /\bwhat (should i|do i) take\b/i,
      /\bdo i have\b/i,
      /\bam i (diabetic|anaemic|anemic|overweight|obese|healthy)\b/i,
      /\bis (this|that|my result) (bad|serious|dangerous|normal)\b/i,
      /\bdiagnos/i,
      // Asking the app TO prescribe. Not "which prescriptions are on file" —
      // that is a question about documents the reader already has, which is
      // exactly what Cheeku is for.
      /\bprescribe\b/i,
      /\bwhat (should i|do i) be (taking|on)\b/i,
      /\bdosage|\bdose\b/i,
      /\bcure\b|\btreatment for\b/i,
    ];

    const journeys = [null, ...JOURNEY_IDS];
    const conditions = [
      [],
      ["obesity"],
      ["type 2 diabetes"],
      ["hypothyroidism"],
      ["hypertension"],
      ["pcos"],
      ["asthma"],
      ["anaemia"],
      ["high cholesterol"],
      ["kidney disease"],
      ["allergies"],
      ["obesity", "type 2 diabetes", "hypertension"],
    ];

    for (const journey of journeys) {
      for (const declared of conditions) {
        for (const prompt of promptsFor(journey, declared, 3)) {
          for (const pattern of banned) {
            expect(pattern.test(prompt), `${prompt} matched ${pattern}`).toBe(false);
          }
        }
      }
    }
  });
});
