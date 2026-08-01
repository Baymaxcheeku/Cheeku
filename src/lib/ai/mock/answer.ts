import type { RecordEntity, RecordSummary } from "@/lib/records/types";
import { answerFromKnowledge, matchKnowledge } from "./knowledge";

/*
 * The mock answer engine.
 *
 * This is where the product rules are enforced at once, so the shape of it
 * matters more than the prose it produces.
 *
 *   1. NEVER DIAGNOSES, PRESCRIBES OR GIVES DOSAGES. There is no code path here
 *      that emits a condition name, a drug, or a quantity. This did not change
 *      when rule 4 did — see below.
 *
 *   4. GROUNDED, THEN GENERAL, THEN SILENT. Originally "grounded or silent":
 *      nothing outside the user's own records, full stop. Athar asked Ask
 *      Baymax to work both ways — general questions get a general, rule-1-safe
 *      answer (see ./knowledge.ts), and a genuinely unanswerable question still
 *      goes silent rather than improvising. `answer.kind` tells the UI which of
 *      the three happened, because each deserves different framing: a grounded
 *      answer cites a document, a general one carries a "not about your
 *      records" note, and a silent one explains the limit.
 *
 * The design frames answer questions like this with "Hb below 11 g/dL may
 * indicate mild anemia" and "Vitamin D3: 2000-4000 IU daily for 8-12 weeks".
 * That is a diagnosis and a dosage. Neither is reproducible here at any level
 * of fidelity, in either the grounded or the general path, and the divergence
 * is recorded in PROGRESS.md.
 *
 * Citations point at the user's own documents rather than at journal papers,
 * per the spec's flow ("citations open the right records") and because a
 * citation the reader cannot open is decoration.
 */

export type Citation = { documentId: string; label: string };

export type AnswerKind = "grounded" | "general" | "silent";

export type MockAnswer = {
  paragraphs: string[];
  citations: Citation[];
  /** False for both "general" and "silent" — kept for existing call sites and tests. */
  grounded: boolean;
  /** Which of the three paths produced this answer. */
  kind: AnswerKind;
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
 * "What do my recent reports say?" / "What's in my records?" / "Has anything
 * changed?"
 *
 * These are overview questions, and the entity matcher could never answer one:
 * it looks for a measurement name in the question, and there isn't one. All
 * three of the chat's own starter chips are this shape, so the first thing most
 * people tapped came back with "I could not find anything" while their records
 * sat right there — the worst possible first impression, and the engine's fault
 * rather than the reader's.
 *
 * The answer is still strictly grounded: what documents exist, when, from
 * where, and what the reports themselves flagged. No interpretation is added.
 */
const OVERVIEW_PATTERNS: RegExp[] = [
  /\b(recent|latest|last)\b.*\b(report|record|result|test|scan)/i,
  /\b(report|record|result)s?\b.*\b(say|show|mean overall|summar)/i,
  /what.{0,12}\bin my (records|reports|documents)/i,
  /\b(overview|summary|summarise|summarize)\b/i,
  /\b(anything|what).{0,20}\bchanged\b/i,
  /\bhow (am|is) (i|my health|things)\b/i,
];

function looksLikeOverview(question: string): boolean {
  return OVERVIEW_PATTERNS.some((p) => p.test(question));
}

function overviewAnswer(records: readonly GroundingRecord[]): MockAnswer {
  const dated = [...records].sort((a, b) =>
    (b.eventDate ?? "").localeCompare(a.eventDate ?? ""),
  );

  const flagged = dated.filter((r) =>
    r.entities.some((e) => e.flag && e.flag !== "normal"),
  );

  const paragraphs: string[] = [
    `You have ${dated.length} record${dated.length === 1 ? "" : "s"} saved here. Newest first:`,
  ];

  for (const record of dated.slice(0, 4)) {
    const where = record.facility ? ` · ${record.facility}` : "";
    const outside = record.entities.filter((e) => e.flag && e.flag !== "normal").length;
    const note =
      record.entities.length === 0
        ? " — no measured values were extracted"
        : outside > 0
          ? ` — ${outside} value${outside === 1 ? "" : "s"} the report marks outside its printed range`
          : " — every measured value is inside its printed range";
    paragraphs.push(`${record.title} (${shortDate(record.eventDate)})${where}${note}.`);
  }

  if (dated.length > 4) {
    paragraphs.push(`And ${dated.length - 4} older record${dated.length - 4 === 1 ? "" : "s"}.`);
  }

  paragraphs.push(
    flagged.length > 0
      ? "Ask me about any single value and I'll read you the exact number and the range printed next to it. What those numbers mean for you is your doctor's call, not mine."
      : "Ask me about any single value and I'll read you the exact number and the range printed next to it.",
  );

  return {
    grounded: true,
    kind: "grounded",
    // Cited so the reader can open any of them, same as any other answer.
    citations: dated.slice(0, 4).map((r) => ({ documentId: r.id, label: r.title })),
    paragraphs,
    followUps: flagged.length > 0 ? ["Open the flagged report", "Show me the trend"] : ["Open a report"],
  };
}

/**
 * The genuinely-nothing-to-say path: no record matched AND no general topic
 * matched either. What it cannot do and why, which is more useful than a
 * hedge and much safer than a guess.
 */
function silentAnswer(records: readonly GroundingRecord[]): MockAnswer {
  return {
    grounded: false,
    kind: "silent",
    citations: [],
    paragraphs: [
      records.length === 0
        ? "There are no records saved for this family member yet, so there is nothing for me to read."
        : "I could not find anything about that in the records saved here, and it isn't a topic I have general information on either.",
      "If the report exists, adding it will let me answer from it. Otherwise this is a good question for your doctor.",
    ],
    followUps: ["Add a document", "What is in my records?"],
  };
}

/**
 * The engine. Pure and synchronous — the streaming is a UI concern.
 *
 * `conditions` is the reader's own Health profile (settings/health), never a
 * document the engine inferred anything from — it is only used to decide
 * whether a general answer gets a personalized paragraph, per rule 3's own
 * profile-scoping (the active profile's declared conditions, not the whole
 * family's).
 */
export function answerQuestion(
  question: string,
  records: readonly GroundingRecord[],
  conditions: readonly string[] = [],
): MockAnswer {
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
  if (!primary) {
    /*
     * Overview questions are checked only after the entity matcher has failed,
     * so "how is my haemoglobin" still gets the specific value rather than a
     * summary. But before the general-knowledge fallback, because an overview of
     * the reader's OWN records always beats a general answer.
     */
    if (records.length > 0 && looksLikeOverview(question)) return overviewAnswer(records);

    const topic = matchKnowledge(question);
    if (!topic) return silentAnswer(records);

    const general = answerFromKnowledge(topic, [...conditions]);
    return {
      grounded: false,
      kind: "general",
      citations: [],
      paragraphs: general.paragraphs,
      followUps: general.followUps,
    };
  }

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
    kind: "grounded",
    citations,
    paragraphs,
    followUps:
      older.length > 0
        ? ["Show me the trend", "Open the report", "Prepare for my appointment"]
        : ["Open the report", "Prepare for my appointment"],
  };
}
