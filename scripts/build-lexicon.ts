/*
 * Compiles src/lib/safety/lexicon.yaml into a typed TS module so that
 * detect() stays pure, synchronous and dependency-free at runtime.
 *
 * Run: pnpm safety:build
 * A drift test (detect.test.ts) fails if the generated file falls out of sync.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const yamlPath = resolve(here, "../src/lib/safety/lexicon.yaml");
const outPath = resolve(here, "../src/lib/safety/lexicon.generated.ts");

type Rule = { id: string; patterns: string[]; unless?: string[] };
type Lexicon = { version: string; updated: string; escalate: Rule[]; tier2: Rule[] };

const raw = readFileSync(yamlPath, "utf8");
const lexicon = parse(raw) as Lexicon;

for (const tier of ["escalate", "tier2"] as const) {
  for (const rule of lexicon[tier]) {
    for (const pattern of [...rule.patterns, ...(rule.unless ?? [])]) {
      // Fail the build rather than ship a rule that silently never matches.
      new RegExp(pattern);
    }
  }
}

export function hashOf(text: string) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

const banner = `// GENERATED FILE — do not edit.
// Source: src/lib/safety/lexicon.yaml (v${lexicon.version}, ${lexicon.updated})
// Regenerate with: pnpm safety:build
`;

const body = `${banner}
export const LEXICON_VERSION = ${JSON.stringify(lexicon.version)};
export const LEXICON_HASH = ${JSON.stringify(hashOf(raw))};

export type SafetyRule = {
  readonly id: string;
  readonly patterns: readonly RegExp[];
  readonly unless: readonly RegExp[];
};

export const ESCALATE_RULES: readonly SafetyRule[] = ${serialise(lexicon.escalate)};

export const TIER2_RULES: readonly SafetyRule[] = ${serialise(lexicon.tier2)};
`;

function serialise(rules: Rule[]) {
  const entries = rules.map((rule) => {
    const patterns = rule.patterns.map((p) => `/${p}/`).join(", ");
    const unless = (rule.unless ?? []).map((p) => `/${p}/`).join(", ");
    return `  { id: ${JSON.stringify(rule.id)}, patterns: [${patterns}], unless: [${unless}] }`;
  });
  return `[\n${entries.join(",\n")},\n]`;
}

writeFileSync(outPath, body);
console.log(
  `lexicon v${lexicon.version} → ${lexicon.escalate.length} escalate rules, ${lexicon.tier2.length} tier2 rules`,
);
