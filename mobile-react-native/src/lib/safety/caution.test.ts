import { describe, expect, it } from "vitest";

import { cautionCopy, shouldCaution } from "./caution";
import { detect } from "./detect";
import { MUST_FIRE } from "./fixtures/must-fire";

/*
 * Tier 2 was detected and recorded for the whole life of the port, and never
 * shown. These lock the response to the verdict so it cannot go quiet again.
 */

describe("who gets the caution", () => {
  it("shows it for tier2", () => {
    const result = detect("fever for more than 3 days now");
    expect(result.status).toBe("tier2");
    expect(shouldCaution(result)).toBe(true);
  });

  it("never shows it alongside an escalation", () => {
    // Escalate has its own full-screen interrupt. Both at once would put a
    // "see someone today" note under "call an ambulance".
    const result = detect("I'm having crushing chest pain");
    expect(result.status).toBe("escalate");
    expect(shouldCaution(result)).toBe(false);
  });

  it("shows nothing for an ordinary question", () => {
    const result = detect("what does my last report mean");
    expect(result.status).toBe("clear");
    expect(shouldCaution(result)).toBe(false);
  });
});

describe("the copy", () => {
  it("never leaves a tier2 rule without words", () => {
    /*
     * The real risk is a lexicon rule added later with no copy entry, which
     * would render an empty amber box. Every tier2 phrase in the frozen corpus
     * has to produce a title and a body.
     */
    const tier2Phrases = MUST_FIRE.filter((f) => f.tier === "tier2");
    expect(tier2Phrases.length).toBeGreaterThan(0);

    for (const { text } of tier2Phrases) {
      const result = detect(text);
      if (result.status !== "tier2") continue; // may legitimately escalate
      const copy = cautionCopy(result);
      expect(copy.title.length, `no title for: ${text}`).toBeGreaterThan(0);
      expect(copy.body.length, `no body for: ${text}`).toBeGreaterThan(0);
    }
  });

  it("does not name a condition or a treatment", () => {
    /*
     * Rule 1. An urgency statement is allowed; "this could be dengue" is a
     * diagnosis and "take paracetamol" is a prescription, however likely
     * either might be.
     */
    const banned = /dengue|malaria|covid|typhoid|infection|sepsis|paracetamol|ibuprofen|antibiotic|\bmg\b|dose of/i;
    const phrases = MUST_FIRE.filter((f) => f.tier === "tier2");

    for (const { text } of phrases) {
      const result = detect(text);
      if (result.status !== "tier2") continue;
      const copy = cautionCopy(result);
      expect(banned.test(copy.title), `title diagnoses: ${copy.title}`).toBe(false);
      expect(banned.test(copy.body), `body diagnoses: ${copy.body}`).toBe(false);
    }
  });
});
