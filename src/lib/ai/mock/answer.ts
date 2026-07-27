import type { RecordEntity, RecordSummary } from "@/lib/records/types";

/*
 * The mock answer engine.
 *
 * This is where three of the five product rules are enforced at once, so the
 * shape of it matters more than the prose it produces.
 *
 *   1. NEVER DIAGNOSES, PRESCRIBES OR GIVES DOSAGES. There is no code path here
 *      that emits a condition name, a drug, or a quantity. The answers are
 *      built from values the user's own documents already contain.
 *
 *   4. GROUNDED OR SILENT. Every answer is assembled from matched records and
 *      carries citations to them. When nothing matches, the engine says so —
 *      `answer.grounded` is false and the UI shows it as a limitation, not as
 *      a hedged guess.
 *
 * The design frames answer questions like this with "Hb below 11 g/dL may
 * indicate mild anemia" and "Vitamin D3: 2000-4000 IU daily for 8-12 weeks".
 * That is a diagnosis and a dosage. Neither is reproducible here at any level
 * of fidelity, and the divergence is recorded in PROGRESS.md.
 *
 * Citations point at the user's own documents rather than at journal papers,
 * per the spec's flow ("citations open the right records") and because a
 * citation the reader cannot open is decoration.
 */

export type Citation = { documentId: string; label: string };

export type MockAnswer = {
  paragraphs: string[];
  citations: Citation[];
  /** False when no record covered the question — rule 4's "or silent". */
  grounded: boolean;
  /** Chips offered under the answer. Never actions Baymax cannot perform. */
  followUps: string[];
};

export type GroundingRecord = RecordSummary & { entities: RecordEntity[] };

/** Words that suggest the user is asking about a specific measurement. */
function tokens(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/*
 * Common ways people name a test, mapped to what the lab prints. Without this,
 * "sugar" finds nothing in a document that says "HbA1c" and the engine goes
 * silent on a question it can actually answer.
 */
const SYNONYMS: Record<string, string[]> = {
  sugar: ["glucose", "hba1c", "sugar"],
  diabetes: ["glucose", "hba1c"],
  blood: ["haemoglobin", "hemoglobin", "blood", "cbc", "platelet", "wbc"],
  hb: ["haemoglobin", "hemoglobin"],
  anaemia: ["haemoglobin", "hemoglobin", "mcv"],
  anemia: ["haemoglobin", "hemoglobin", "mcv"],
  iron: ["haemoglobin", "hemoglobin", "ferritin"],
  thyroid: ["tsh", "t3", "t4", "thyroid"],
  cholesterol: ["cholesterol", "ldl", "hdl", "triglyceride", "lipid"],
  vitamin: ["vitamin", "d3", "b12"],
  kidney: ["creatinine", "urea", "egfr"],
  liver: ["sgpt", "sgot", "alt", "ast", "bilirubin"],
  pressure: ["pressure", "systolic", "diastolic"],
  weight: ["weight", "bmi"],
};

function expand(words: string[]): Set<string> {
  const out = new Set(words);
  for (const w of words) for (const s of SYNONYMS[w] ?? []) out.add(s);
  return out;
}

function entityMatches(entity: RecordEntity, terms: Set<string>): boolean {
  const haystack = `${entity.name} ${entity.canonicalName ?? ""}`.toLowerCase();
  for (const term of terms) if (haystack.includes(term)) return true;
  return false;
}

function formatValue(entity: RecordEntity): string {
  if (entity.value !== null) return `${entity.value}${entity.unit ? ` ${entity.unit}` : ""}`;
  return entity.valueText ?? "—";
}

function shortDate(iso: string | null): string {
  if (!iso) return "an undated report";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/*
 * Rule 4's "or silent" half.
 *
 * The temptation when nothing matches is to answer from general knowledge —
 * which is exactly the improvising the rule forbids, and the point at which a
 * health app starts being confidently wrong. This says what it cannot do and
 * why, which is more useful than a hedge and much safer than a guess.
 */
function silentAnswer(records: readonly GroundingRecord[]): MockAnswer {
  return {
    grounded: false,
    citations: [],
    paragraphs: [
      records.length === 0
        ? "There are no records saved for this family member yet, so there is nothing for me to read."
        : "I could not find anything about that in the records saved here.",
      "I only answer from documents you have added. I do not use general medical knowledge, because I would have no way to tell you when I was wrong.",
      "If the report exists, adding it will let me answer. Otherwise this is a good question for your doctor.",
    ],
    followUps: ["Add a document", "What is in my records?"],
  };
}

/** The engine. Pure and synchronous — the streaming is a UI concern. */
export function answerQuestion(question: string, records: readonly GroundingRecord[]): MockAnswer {
  const terms = expand(tokens(question));

  const hits = records
    .map((record) => ({
      record,
      matched: record.entities.filter((e) => entityMatches(e, terms)),
    }))
    .filter((h) => h.matched.length > 0);

  // Newest first — the current value is what a question is almost always about.
  hits.sort((a, b) => (b.record.eventDate ?? "").localeCompare(a.record.eventDate ?? ""));

  const [primary, ...older] = hits;
  if (!primary) return silentAnswer(records);

  const paragraphs: string[] = [];
  const citations: Citation[] = [];
  const values = primary.matched;

  paragraphs.push(
    `Here is what your records say. From ${primary.record.title} (${shortDate(primary.record.eventDate)}):`,
  );

  for (const entity of values) {
    const range = entity.refRange ? `, against a printed range of ${entity.refRange}` : "";
    const flag =
      entity.flag && entity.flag !== "normal"
        ? " — the report marks this outside that range"
        : entity.flag === "normal"
          ? " — the report marks this within range"
          : "";
    paragraphs.push(`${entity.name}: ${formatValue(entity)}${range}${flag}.`);
  }

  citations.push({ documentId: primary.record.id, label: primary.record.title });

  /*
   * A second reading of the same measurement is the most useful thing this can
   * offer: it is a fact from the documents, not an interpretation. The engine
   * reports the direction of change and stops — what the change *means* is a
   * clinical judgement it must not make.
   */
  const previous = older[0];
  if (previous) {
    const before = previous.matched[0];
    const now = values[0];
    if (before && now && before.value !== null && now.value !== null) {
      const direction =
        now.value > before.value ? "higher" : now.value < before.value ? "lower" : "unchanged";
      paragraphs.push(
        `Compared with ${previous.record.title} (${shortDate(previous.record.eventDate)}), where ${before.name} was ${formatValue(before)}, the latest reading is ${direction}.`,
      );
    }
    for (const hit of older.slice(0, 2)) {
      citations.push({ documentId: hit.record.id, label: hit.record.title });
    }
  }

  paragraphs.push(
    "I read what your documents say — I do not interpret results or suggest treatment. Your doctor can tell you what these numbers mean for you.",
  );

  return {
    grounded: true,
    citations,
    paragraphs,
    followUps:
      older.length > 0
        ? ["Show me the trend", "Open the report", "Prepare for my appointment"]
        : ["Open the report", "Prepare for my appointment"],
  };
}
