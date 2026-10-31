/*
 * FROZEN SUITE. These thresholds are product guarantees, not style choices.
 * Loosening any of them requires a human decision recorded in PROGRESS.md.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { detect, normalise, type SafetyStatus } from "./detect";
import { MUST_FIRE } from "./fixtures/must-fire";
import { MUST_NOT_FIRE } from "./fixtures/must-not-fire";
import { ESCALATE_RULES, LEXICON_HASH, TIER2_RULES } from "./lexicon.generated";

const here = dirname(fileURLToPath(import.meta.url));

const MAX_FALSE_POSITIVE_RATE = 0.05;
const BUDGET_MS = 200;

const RANK: Record<SafetyStatus, number> = { clear: 0, tier2: 1, escalate: 2 };

describe("must-fire corpus (100% recall required)", () => {
  const misses = MUST_FIRE.filter(({ text, tier }) => RANK[detect(text).status] < RANK[tier]);

  it("classifies every phrase at or above its minimum tier", () => {
    expect(misses.map((m) => `${m.tier}: ${m.text}`)).toEqual([]);
  });

  it("never returns clear", () => {
    const cleared = MUST_FIRE.filter(({ text }) => detect(text).status === "clear");
    expect(cleared.map((c) => c.text)).toEqual([]);
  });

  it("reports a known rule id and nothing else — `matched` goes to logs, so it must never carry user text", () => {
    const ids = new Set([...ESCALATE_RULES, ...TIER2_RULES].map((r) => r.id));
    for (const { text } of MUST_FIRE) {
      expect(ids).toContain(detect(text).matched);
    }
  });
});

describe("must-not-fire corpus (under 5% false positives)", () => {
  const firing = MUST_NOT_FIRE.filter((text) => detect(text).status !== "clear");
  const rate = firing.length / MUST_NOT_FIRE.length;

  it(`stays under a ${MAX_FALSE_POSITIVE_RATE * 100}% false-positive rate`, () => {
    if (rate >= MAX_FALSE_POSITIVE_RATE) {
      console.error("false positives:", firing);
    }
    expect(rate).toBeLessThan(MAX_FALSE_POSITIVE_RATE);
  });
});

describe("normalise", () => {
  it("is idempotent", () => {
    for (const { text } of MUST_FIRE) {
      expect(normalise(normalise(text))).toBe(normalise(text));
    }
  });

  it("folds diacritics, elongation and punctuation", () => {
    expect(normalise("Chést   PAAAAIN!!!")).toBe("chest paain");
    expect(normalise("I can’t breathe…")).toBe("i can't breathe");
  });

  it("survives adversarial input without throwing", () => {
    for (const input of ["", "   ", "🙂🙂🙂", "<script>alert(1)</script>", "a".repeat(50_000)]) {
      expect(() => detect(input)).not.toThrow();
    }
  });
});

describe("contract", () => {
  it("treats empty and whitespace input as clear", () => {
    expect(detect("").status).toBe("clear");
    expect(detect("   \n\t ").status).toBe("clear");
  });

  it("escalates when a message contains both an escalate and a tier2 signal", () => {
    expect(detect("my baby has a fever and he stopped breathing").status).toBe("escalate");
  });

  it("classifies the whole corpus well inside the 200ms budget", () => {
    const all = [...MUST_FIRE.map((m) => m.text), ...MUST_NOT_FIRE];
    const started = performance.now();
    for (const text of all) detect(text);
    const perCall = (performance.now() - started) / all.length;
    expect(perCall).toBeLessThan(BUDGET_MS);
  });

  it("still escalates when the signal is buried at the end of a long message", () => {
    const filler = "I have been meaning to ask about my reports for a while now. ".repeat(200);
    const started = performance.now();
    const result = detect(`${filler}anyway, I have chest pain`);
    expect(performance.now() - started).toBeLessThan(BUDGET_MS);
    expect(result.status).toBe("escalate");
  });

  it("scopes suppression to the sentence, so a distant idiom cannot silence a real symptom", () => {
    expect(detect("chest pain when I laugh").status).toBe("clear");
    expect(detect("my back hurts when i laugh. separately, I have chest pain").status).toBe(
      "escalate",
    );
    expect(detect("that meme killed me. anyway I have chest pain").status).toBe("escalate");
    expect(detect("I have chest pain, but that film was breathtaking").status).toBe("escalate");
  });
});

describe("lexicon drift", () => {
  it("has a generated module in sync with lexicon.yaml", () => {
    const raw = readFileSync(resolve(here, "lexicon.yaml"), "utf8");
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
    expect(hash).toBe(LEXICON_HASH);
  });

  it("has no rule without a must-fire phrase exercising it", () => {
    const exercised = new Set(MUST_FIRE.map(({ text }) => detect(text).matched));
    const dead = [...ESCALATE_RULES, ...TIER2_RULES]
      .map((r) => r.id)
      .filter((id) => !exercised.has(id));
    expect(dead).toEqual([]);
  });

  it("has unique rule ids", () => {
    const ids = [...ESCALATE_RULES, ...TIER2_RULES].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no stateful global regexes, which would make matching order-dependent", () => {
    for (const rule of [...ESCALATE_RULES, ...TIER2_RULES]) {
      for (const pattern of [...rule.patterns, ...rule.unless]) {
        expect(pattern.global).toBe(false);
      }
    }
  });
});
