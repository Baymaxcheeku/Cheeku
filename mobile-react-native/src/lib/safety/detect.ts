/*
 * This file is a safety-critical control. Changes require rerunning the frozen
 * suite and a human review. Do not let a model rewrite this without tests
 * passing.
 *
 * Contract: pure, synchronous, no network, no I/O, well under 200ms. Runs
 * client-side before ANY AI call, on every free-text input in the app.
 *
 * The rules themselves live in lexicon.yaml (human-readable, versioned) and are
 * compiled to lexicon.generated.ts by `pnpm safety:build`.
 */

import { ESCALATE_RULES, LEXICON_VERSION, TIER2_RULES, type SafetyRule } from "./lexicon.generated";

export type SafetyStatus = "clear" | "tier2" | "escalate";

export type SafetyResult = {
  status: SafetyStatus;
  /** Rule id that fired, for logging. Never contains user text — no PII in logs. */
  matched?: string;
  lexiconVersion: string;
};

/*
 * Hinglish and romanised Hindi arrive with wildly inconsistent spelling, so
 * variants are folded to one canonical form before matching. Ordered: longer
 * keys first would be safer, but these are all disjoint tokens.
 */
const SPELLING_VARIANTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bnhi\b|\bnahin\b|\bnai\b/g, "nahi"],
  [/\bh[ao]{2}?\b/g, "ho"],
  [/\bmai\b|\bmein\b|\bmay\b/g, "me"],
  [/\brha\b|\brhi\b|\braha\b|\brahi\b/g, "raha"],
  [/\bsans\b|\bsaans\b|\bshvas\b/g, "saans"],
  [/\bkhun\b|\bkhoon\b|\bkhun\b/g, "khoon"],
  [/\bdrd\b|\bdard\b/g, "dard"],
  [/\bseene\b|\bsine\b|\bchaati\b|\bchhati\b/g, "seene"],
  [/\bbukhaar\b|\bbukhar\b/g, "bukhar"],
  [/\bbehosh\b|\bbehoshi\b/g, "behosh"],
];

/**
 * Lowercases, strips diacritics and Devanagari-adjacent noise, flattens
 * punctuation and elongations, and folds Hinglish spelling variants.
 */
export function normalise(input: string): string {
  let text = input
    .normalize("NFKD")
    // strip combining marks so "dárd" === "dard"
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // curly quotes and dashes to ascii
    .replace(/[‘’‛]/g, "'")
    .replace(/[–—]/g, " ")
    // collapse character elongation: "paaaain" -> "paain" (2 max, so \w{2} rules still hit)
    .replace(/(.)\1{2,}/g, "$1$1")
    // punctuation to space, keep apostrophes for "can't"
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of SPELLING_VARIANTS) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

function firstMatch(text: string, rules: readonly SafetyRule[]): string | undefined {
  for (const rule of rules) {
    const hit = rule.patterns.some((pattern) => pattern.test(text));
    if (!hit) continue;
    // `unless` kills idioms and lookalikes ("chest day at the gym"), never real symptoms.
    const suppressed = rule.unless.some((pattern) => pattern.test(text));
    if (!suppressed) return rule.id;
  }
  return undefined;
}

/*
 * Suppression is scoped to a sentence. Evaluating `unless` against the whole
 * message let an idiom anywhere in a long message silence a real symptom
 * elsewhere in it ("my back hurts when i laugh. also I have chest pain"), which
 * is a false negative — the one failure mode this control exists to prevent.
 */
function segments(text: string): string[] {
  return text
    .split(/[.!?;\n]+|\s+(?:but|however|separately|anyway|also,)\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/**
 * Classifies free text before it reaches any AI surface.
 *
 * Escalate is checked before tier2 across every segment — a message containing
 * both must always escalate.
 */
export function detect(text: string): SafetyResult {
  if (!text || !text.trim()) return { status: "clear", lexiconVersion: LEXICON_VERSION };

  const parts = segments(text).map(normalise);

  for (const part of parts) {
    const escalated = firstMatch(part, ESCALATE_RULES);
    if (escalated) {
      return { status: "escalate", matched: escalated, lexiconVersion: LEXICON_VERSION };
    }
  }

  for (const part of parts) {
    const urgent = firstMatch(part, TIER2_RULES);
    if (urgent) {
      return { status: "tier2", matched: urgent, lexiconVersion: LEXICON_VERSION };
    }
  }

  return { status: "clear", lexiconVersion: LEXICON_VERSION };
}
