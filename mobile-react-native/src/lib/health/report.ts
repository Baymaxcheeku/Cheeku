/*
 * ONE MEMBER'S HEALTH REPORT (int-ai-api, migration 0044).
 *
 * The AI API rebuilds `ai_health_reports` after every record it indexes. The
 * app only reads it: RLS keys the row to the account, and the health file
 * only ever asks for a member the plan covers.
 *
 * WHAT IT HOLDS AND WHAT IT NEVER DOES. A summary, the medicines already on
 * file explained (what the salt is commonly used for, how it was written to
 * be taken, what to watch), habits for long-term health and everyday life,
 * each tied to something in their file, and what to raise with their doctor.
 * It never names a new medicine or a dose and never says to change one
 * (Rule 6): the API drops any item that tries, before it is stored.
 *
 * The flagged values and the medicine list already have their own sections on
 * the health file, so the card does not repeat them.
 *
 * Like every other blob in this app, nothing in the row is trusted:
 * readReport rebuilds it field by field and returns null without a summary.
 * Pure, so it is unit tested; the query lives in ./queries.
 */

export type Habit = { title: string; why: string; action: string };
export type ExplainedMedicine = { name: string; salts: string[]; purpose: string | null; howToTake: string | null; tips: string[]; watch: string[]; unverified: boolean };

export type HealthReport = {
  summary: string;
  medicines: ExplainedMedicine[];
  longevity: Habit[];
  lifestyle: Habit[];
  discuss: string[];
  questions: string[];
  unverified: boolean;
  note: string;
  generatedAt: string | null;
  /** True when there is anything beyond the summary to open. */
  hasMore: boolean;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 400): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const strs = (v: unknown, n = 6, max = 400): string[] => (Array.isArray(v) ? v.map((x) => str(x, max)).filter((x): x is string => x !== null).slice(0, n) : []);

const NOTE = "This reads your own records. It is not a diagnosis or a prescription: take it to your doctor.";

function habits(v: unknown): Habit[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((h) => (isObj(h) ? { title: str(h.title, 60), why: str(h.why), action: str(h.action) } : null))
    .filter((h): h is Habit => Boolean(h?.title && h.why && h.action))
    .slice(0, 6);
}

function medicines(v: unknown): ExplainedMedicine[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isObj)
    .map((m) => ({
      name: str(m.name, 80) ?? "",
      salts: strs(m.salts, 6, 60),
      purpose: str(m.purpose),
      howToTake: str(m.howToTake, 120),
      tips: strs(m.tips, 3),
      watch: strs(m.watch, 4),
      unverified: m.unverified === true,
    }))
    // A medicine with nothing to explain is already in the Medicines section.
    .filter((m) => m.name && (m.purpose || m.tips.length || m.watch.length))
    .slice(0, 30);
}

/** The stored row as a report, or null when there is nothing worth showing. */
export function readReport(row: unknown): HealthReport | null {
  if (!isObj(row)) return null;
  const r = isObj(row.report) ? row.report : {};
  const summary = str(r.summary, 2000) ?? str(row.summary, 2000);
  if (!summary) return null;
  const report = {
    summary,
    medicines: medicines(r.medicines),
    longevity: habits(r.longevity),
    lifestyle: habits(r.lifestyle),
    discuss: strs(r.discuss),
    questions: strs(r.questions),
    unverified: r.unverified === true,
    note: str(r.note) ?? NOTE,
    generatedAt: typeof row.generated_at === "string" ? row.generated_at : null,
  };
  const hasMore = Boolean(report.medicines.length || report.longevity.length || report.lifestyle.length || report.discuss.length || report.questions.length);
  return { ...report, hasMore };
}
