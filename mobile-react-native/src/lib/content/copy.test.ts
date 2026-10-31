import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CATALOG } from "@/lib/home/catalog";
import { AREA_LABEL, MILESTONES, NUDGES, UNLOCK_COPY, unlockRows } from "@/lib/home/content";

/*
 * The content system (docs/content-system.md), enforced. A string that breaks
 * a limit fails here with the string and the limit, so the fix is obvious.
 */

const LIMIT = { title: 30, why: 60, more: 200, chip: 16, milestone: 40, notifyTitle: 40, notifyBody: 90 } as const;

// Words that make Cheeku sound like a warning label or a brochure.
const NEVER = [/\bdon'?t forget\b/i, /\byou missed\b/i, /\bwarning\b/i, /\bAI\b/, /\balgorithm\b/i, /!!/, /—/];

function within(label: string, text: string, max: number) {
  expect(text.length, `${label} is ${text.length} characters, limit ${max}: "${text}"`).toBeLessThanOrEqual(max);
}

function clean(label: string, text: string) {
  for (const re of NEVER) expect(re.test(text), `${label} uses ${re}: "${text}"`).toBe(false);
}

describe("card copy follows the content system", () => {
  it("every plan task has a short title, a one-line why, and its detail kept", () => {
    for (const t of CATALOG) {
      within(`${t.key} title`, t.title, LIMIT.title);
      within(`${t.key} why`, t.why, LIMIT.why);
      within(`${t.key} more`, t.more, LIMIT.more);
      expect(t.more.length, `${t.key} has no detail`).toBeGreaterThan(0);
      expect(t.title.endsWith("."), `${t.key} title ends with a full stop`).toBe(false);
      for (const [label, text] of [["title", t.title], ["why", t.why], ["more", t.more]] as const) clean(`${t.key} ${label}`, text);
    }
  });

  it("the card line is one sentence", () => {
    for (const n of NUDGES) {
      const sentences = n.why.split(/(?<=[.?!])\s+/).filter(Boolean);
      expect(sentences.length, `${n.key} why has ${sentences.length} sentences: "${n.why}"`).toBeLessThanOrEqual(2);
    }
  });

  it("chips, milestones and the unlock card stay short", () => {
    for (const [k, v] of Object.entries(AREA_LABEL)) within(`chip ${k}`, v, LIMIT.chip);
    for (const m of MILESTONES) within(`milestone ${m.days}`, m.line, LIMIT.milestone);
    for (const c of Object.values(UNLOCK_COPY)) {
      within("unlock eyebrow", c.eyebrow, 18);
      within("unlock title", c.title, LIMIT.title);
      within("unlock body", c.body, 90);
    }
    for (const r of unlockRows({})) {
      within(`unlock row ${r.key}`, r.title, LIMIT.title);
      within(`unlock row ${r.key} line`, r.unlocks, 40);
    }
  });
});

describe("notification copy follows the content system", () => {
  // The literal titles and bodies in the latest notification migration. Names
  // and dates are added at run time, so this checks the fixed words only.
  const sql = readFileSync(resolve(__dirname, "../../../supabase/migrations/0036_notification_copy.sql"), "utf8");
  const pairs = [...sql.matchAll(/perform notify_user\(\s*[^,]+,[^,]+,[^,]+,\s*'[a-z_]+'[^,]*,\s*([\s\S]*?),\s*([\s\S]*?),\s*'\//g)];

  it("finds every notification in the migration", () => {
    expect(pairs.length).toBeGreaterThanOrEqual(8);
  });

  it("keeps the fixed words short and calm", () => {
    // A case expression holds one variant per branch: check each on its own.
    // Anything else is one string built from pieces: check the pieces joined.
    const variants = (expr = "") => {
      const parts = [...expr.matchAll(/'((?:[^']|'')*)'/g)].map((m) => (m[1] ?? "").replace(/''/g, "'"));
      return /\bcase\b/.test(expr) ? parts.filter((p) => !/^[a-z_]+$/.test(p)) : [parts.join("")];
    };
    for (const [, title, body] of pairs) {
      for (const t of variants(title)) within(`notification title "${t}"`, t, LIMIT.notifyTitle);
      for (const b of variants(body)) within(`notification body "${b}"`, b, LIMIT.notifyBody);
      for (const x of [...variants(title), ...variants(body)]) clean("notification", x);
    }
  });
});
