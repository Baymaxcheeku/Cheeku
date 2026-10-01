/*
 * Splits a migration into small steps for the Supabase SQL Editor.
 *
 *   npx tsx scripts/sql-editor-steps.ts supabase/migrations/0030_memory_layer.sql
 *
 * The editor cuts long pastes off part-way (it stopped at character 5290 once)
 * and the error it gives, "syntax error at end of input", says nothing about
 * why. So each step:
 *   - has the comments taken out (they are the bulk of a migration here)
 *   - is cut only between whole statements, at the `-- ----` section rules
 *   - stays under ~3,000 characters where a single statement allows
 *   - is its own transaction, ending on `commit;` so a cut-off paste is
 *     obvious before Run
 *
 * The migration itself must be safe to run again, so a step that half-ran
 * can simply be run again. Output goes to supabase/manual/<prefix>-step-N-of-M.sql.
 */

import { readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const LIMIT = 3000;
const file = process.argv[2];
if (!file) throw new Error("usage: sql-editor-steps.ts <migration.sql>");

const prefix = basename(file).slice(0, 4);
const src = readFileSync(file, "utf8");

// Sections are separated by the `-- ----` rules the migrations already use.
const sections = src
  .split(/^-- -{3,}.*$/m)
  .map((s) =>
    s
      .split("\n")
      .filter((line) => !/^\s*--/.test(line))
      .join("\n")
      .replace(/^comment on [\s\S]*?;\s*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
  .filter(Boolean);

const steps: string[] = [];
let current = "";
for (const s of sections) {
  if (current && current.length + s.length > LIMIT) {
    steps.push(current);
    current = "";
  }
  current = current ? `${current}\n\n${s}` : s;
}
if (current) steps.push(current);

const dir = resolve(__dirname, "../supabase/manual");
for (const f of readdirSync(dir)) if (f.startsWith(`${prefix}-step-`)) unlinkSync(resolve(dir, f));
steps.forEach((body, i) => {
  const head = `-- ${prefix} step ${i + 1} of ${steps.length}. Run the steps in order, each in a new query. Safe to run again.\n`;
  const out = `${head}begin;\n\n${body}\n\ncommit;\n`;
  writeFileSync(resolve(dir, `${prefix}-step-${i + 1}-of-${steps.length}.sql`), out);
  console.log(`${prefix} step ${i + 1}/${steps.length}: ${out.length} chars`);
});
