import { describe, expect, it } from "vitest";

import { detect } from "./detect";
import { contactsFor, copyFor, escalationKind, HOLD_MS } from "./escalation";
import { ESCALATE_RULES } from "./lexicon.generated";

/*
 * These guard a routing decision, not a layout. Which numbers someone is shown
 * during a crisis is the highest-stakes branch in the app, and it keys off rule
 * ids in a generated file — so the ids are asserted to still exist rather than
 * assumed.
 */

const ruleIds = new Set(ESCALATE_RULES.map((r) => r.id));

describe("escalation routing", () => {
  it("keys off rule ids that actually exist in the lexicon", () => {
    // If a rule is renamed in lexicon.yaml this fails here rather than silently
    // routing a self-harm disclosure to an ambulance.
    expect(ruleIds.has("self-harm")).toBe(true);
    expect(ruleIds.has("overdose")).toBe(true);
  });

  it("sends a self-harm disclosure to mental health support, not an ambulance", () => {
    const result = detect("i want to end my life");
    expect(result.status).toBe("escalate");
    expect(escalationKind(result)).toBe("mental_health");

    const contacts = contactsFor(result);
    expect(contacts[0]?.number).toBe("14416");
    // An ambulance must not be the first thing offered: it reads as a threat of
    // forced hospitalisation and is a known reason people stop talking.
    expect(contacts[0]?.number).not.toBe("108");
  });

  it("treats an overdose as physical first, with mental health support alongside", () => {
    const result = detect("i swallowed the whole bottle");
    expect(result.status).toBe("escalate");
    expect(escalationKind(result)).toBe("medical");

    const numbers = contactsFor(result).map((c) => c.number);
    expect(numbers[0]).toBe("112");
    expect(numbers).toContain("14416");
  });

  it("sends a physical emergency to emergency services", () => {
    const result = detect("crushing pain in my chest");
    expect(result.status).toBe("escalate");
    expect(escalationKind(result)).toBe("medical");

    const numbers = contactsFor(result).map((c) => c.number);
    expect(numbers).toEqual(["112", "108"]);
  });

  it("offers both 112 and 108 for medical emergencies", () => {
    // 112 is correct; 108 is what people in India actually know. In an
    // emergency, familiarity matters as much as correctness.
    const numbers = contactsFor(detect("i cannot breathe")).map((c) => c.number);
    expect(numbers).toContain("112");
    expect(numbers).toContain("108");
  });

  it("never offers a number that is not digits — tel: cannot dial prose", () => {
    for (const probe of ["chest pain", "i want to kill myself", "overdose"]) {
      for (const contact of contactsFor(detect(probe))) {
        expect(contact.number).toMatch(/^\d+$/);
      }
    }
  });
});

describe("escalation copy", () => {
  it("never tells someone what condition they have", () => {
    for (const kind of ["medical", "mental_health"] as const) {
      const copy = copyFor(kind);
      const all = `${copy.title} ${copy.lead} ${copy.body} ${copy.why}`;
      expect(all).not.toMatch(/\bdiagnos/i);
      expect(all).not.toMatch(/\byou (have|are having) a\b/i);
      expect(all).not.toMatch(/\bheart attack|stroke|anaphyla/i);
    }
  });

  it("says Cheeku cannot help rather than attempting to", () => {
    expect(copyFor("medical").title).toMatch(/can't help/i);
    expect(copyFor("mental_health").title).toMatch(/can't help/i);
  });
});

describe("the hard gate", () => {
  it("holds long enough to be read but not long enough to trap", () => {
    expect(HOLD_MS).toBeGreaterThanOrEqual(2000);
    expect(HOLD_MS).toBeLessThanOrEqual(5000);
  });
});
