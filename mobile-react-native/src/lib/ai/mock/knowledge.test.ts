import { describe, expect, it } from "vitest";

import { KNOWLEDGE_TOPICS, answerFromKnowledge, matchKnowledge } from "./knowledge";

/*
 * Every general-knowledge topic, checked against the same product-rule
 * FORBIDDEN list as the grounded engine (see answer.test.ts). Rule 4 now lets
 * this file answer questions no document covers; rule 1 did not move, and
 * this is what proves it — for every topic, not just the ones a probe
 * question happens to hit.
 */

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
    expect(text, `topic ${why}: ${pattern}`).not.toMatch(pattern);
  }
}

describe("general-knowledge topics — the product rules", () => {
  for (const topic of KNOWLEDGE_TOPICS) {
    it(`"${topic.id}" never diagnoses, prescribes or doses, with or without a personal note`, () => {
      const plain = answerFromKnowledge(topic, []);
      assertSafe(plain.paragraphs.join(" "));

      const personalised = answerFromKnowledge(topic, [
        "Pregnancy, 24 weeks",
        "Type 2 diabetes",
        "Hypertension",
      ]);
      assertSafe(personalised.paragraphs.join(" "));
    });

    it(`"${topic.id}" always defers anything reading-specific to a doctor or an uploaded record`, () => {
      const answer = answerFromKnowledge(topic, []);
      expect(answer.paragraphs.join(" ")).toMatch(/doctor|record|report/i);
    });
  }

  it("matches a question by keyword", () => {
    expect(matchKnowledge("Is running safe during pregnancy?")?.id).toBe("exercise-pregnancy");
    expect(matchKnowledge("What about chamomile tea for sleep?")?.id).toBe("herbal-sleep");
  });

  it("matches nothing for an unrelated question", () => {
    expect(matchKnowledge("what is the capital of France")).toBeNull();
  });

  it("only adds a personal paragraph when the reader's own conditions actually overlap", () => {
    const topic = KNOWLEDGE_TOPICS.find((t) => t.id === "exercise-pregnancy");
    if (!topic) throw new Error("expected exercise-pregnancy topic to exist");
    expect(topic.personalize?.(["Seasonal allergy"])).toBeNull();
    expect(topic.personalize?.(["Pregnancy, 24 weeks"])).toMatch(/health profile/i);
  });
});
