import { addDays, readDetails, shortDate } from "@/lib/records/details";
import type { DocType } from "@/lib/records/types";

import { daysBetween } from "./clock";

/*
 * OPEN LOOPS. Things that were started and have not closed.
 *
 *   test_ordered    a prescription asked for a test, and no result has come in
 *   result_pending  an invoice lists a test, and its result never arrived
 *   followup_due    a doctor asked to see them again
 *   vaccine_due     the next dose of a course
 *   reminder        something said in the chat ("repeat the scan on the 12th")
 *
 * THE INVOICE INSIGHT is the one most systems miss: a lab bill that lists
 * three tests when only two results exist is how a missing result gets
 * noticed. In the reference thread that caught a newborn screening panel
 * nobody had chased for six days.
 *
 * Loops are surfaced in context, not as a nagging list: the pending screening
 * panel became the most important thing on screen the moment a product with
 * aspartame was prescribed, because phenylketonuria was on that panel.
 */

export type LoopType = "test_ordered" | "result_pending" | "followup_due" | "vaccine_due" | "reminder";
export type LoopStatus = "open" | "closed" | "dismissed";

export type OpenLoop = {
  key: string;
  type: LoopType;
  title: string;
  detail: string | null;
  openedOn: string;
  dueBy: string | null;
  status: LoopStatus;
  /** How it closed: the record that answered it. */
  closedBy: string | null;
  sourceDocumentId: string | null;
  /** Words and ingredients that make this loop relevant to a conversation. */
  relatesTo: string[];
};

type DocRow = { id: string; doc_type: string; event_date: string | null; details: unknown; doctor?: string | null; title?: string | null };
type EntityRow = { document_id?: unknown; name?: unknown; canonical_name?: unknown; event_date?: unknown };
export type StoredLoop = { key: string; type: string; title: string; detail: string | null; opened_on: string; due_by: string | null; status: string; source_document_id: string | null };

/*
 * What a test name is likely to come back as. "Lipid profile" never appears
 * on the result; LDL and triglycerides do.
 */
const RESULT_WORDS: { match: RegExp; words: string[]; relates: string[] }[] = [
  { match: /lipid/i, words: ["cholesterol", "ldl", "hdl", "triglyceride", "lipid"], relates: ["cholesterol", "statin", "atorvastatin"] },
  { match: /\bcbc\b|complete blood|haemogram|hemogram/i, words: ["haemoglobin", "hemoglobin", "wbc", "platelet", "rbc"], relates: ["fever", "infection", "tired", "pale"] },
  { match: /thyroid|\btsh\b|t3|t4/i, words: ["tsh", "t3", "t4", "thyroid"], relates: ["thyroid", "levothyroxine", "thyronorm", "tired"] },
  { match: /hba1c|sugar|glucose|\bgtt\b|\bogtt\b|\bfbs\b/i, words: ["glucose", "hba1c", "sugar", "fbs", "gtt"], relates: ["sugar", "diabetes", "metformin", "thirst"] },
  { match: /vitamin\s*d/i, words: ["vitamin d", "25-oh"], relates: ["vitamin d", "vitamin_d", "bones"] },
  { match: /ferritin|iron/i, words: ["ferritin", "iron"], relates: ["iron", "tired", "anaemia"] },
  { match: /bilirubin|\blft\b|liver/i, words: ["bilirubin", "sgpt", "sgot", "alt", "ast", "liver"], relates: ["jaundice", "yellow", "liver"] },
  {
    match: /newborn screen|neonatal screen|\bnbs\b|metabolic screen/i,
    words: ["newborn screening", "pku", "phenylalanine", "g6pd", "congenital hypothyroidism", "17-ohp", "galactosemia"],
    relates: ["aspartame", "phenylalanine", "pku", "g6pd", "jaundice", "yellow", "thyroid", "feeding"],
  },
  { match: /urine|routine.*urine/i, words: ["urine", "pus cells", "albumin"], relates: ["urine", "burning", "uti"] },
];

function wordsFor(test: string): { words: string[]; relates: string[] } {
  const hit = RESULT_WORDS.find((r) => r.match.test(test));
  const own = test.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !["test", "after", "weeks", "profile", "panel", "repeat"].includes(w));
  return { words: [...(hit?.words ?? []), ...own], relates: [...(hit?.relates ?? []), ...own] };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Did a lab report on or after `from` answer this test? */
function resultFor(test: string, from: string, labs: readonly DocRow[], entities: readonly EntityRow[]): string | null {
  const { words } = wordsFor(test);
  if (!words.length) return null;
  for (const doc of labs) {
    if (!doc.event_date || doc.event_date < from) continue;
    const text = [
      doc.title ?? "",
      ...entities.filter((e) => e.document_id === doc.id).map((e) => `${String(e.name ?? "")} ${String(e.canonical_name ?? "")}`),
    ]
      .join(" ")
      .toLowerCase();
    if (words.some((w) => text.includes(w))) return doc.id;
  }
  return null;
}

/** Every loop the records open, with whether a later record closed it. */
export function deriveLoops(documents: readonly DocRow[], entities: readonly EntityRow[], today: string): OpenLoop[] {
  const out: OpenLoop[] = [];
  const sorted = [...documents].sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const labs = sorted.filter((d) => d.doc_type === "lab_report");
  const visits = sorted.filter((d) => d.doc_type === "prescription" || d.doc_type === "consultation_invoice" || d.doc_type === "discharge");

  for (const doc of sorted) {
    const when = doc.event_date ?? today;
    const d = readDetails(doc.doc_type as DocType, { details: doc.details });
    if (!d) continue;

    if (d.kind === "prescription") {
      for (const test of d.tests) {
        const closedBy = resultFor(test, when, labs, entities);
        const w = wordsFor(test);
        out.push({
          key: `test:${doc.id}:${slug(test)}`,
          type: "test_ordered",
          title: test,
          detail: `Asked for by ${d.doctor.name} on ${shortDate(when)}`,
          openedOn: when,
          dueBy: d.followUp ?? addDays(when, 14),
          status: closedBy ? "closed" : "open",
          closedBy,
          sourceDocumentId: doc.id,
          relatesTo: w.relates,
        });
      }
      const followUp = d.followUp;
      if (followUp) {
        const seen = visits.find((v) => v.id !== doc.id && (v.event_date ?? "") >= addDays(followUp, -10) && (!v.doctor || !d.doctor.name || sameDoctor(v.doctor, d.doctor.name)));
        out.push({
          key: `followup:${doc.id}`,
          type: "followup_due",
          title: `Follow-up with ${d.doctor.name}`,
          detail: d.doctor.clinic,
          openedOn: when,
          dueBy: followUp,
          status: seen ? "closed" : "open",
          closedBy: seen?.id ?? null,
          sourceDocumentId: doc.id,
          relatesTo: [d.doctor.name.toLowerCase(), ...d.diagnosis.map((x) => x.toLowerCase())],
        });
      }
    }

    if (d.kind === "discharge" && d.followUp?.date) {
      const date = d.followUp.date;
      const seen = visits.find((v) => v.id !== doc.id && (v.event_date ?? "") >= addDays(date, -10));
      out.push({
        key: `followup:${doc.id}`,
        type: "followup_due",
        title: `Follow-up after ${d.hospital}`,
        detail: d.followUp.with,
        openedOn: when,
        dueBy: date,
        status: seen ? "closed" : "open",
        closedBy: seen?.id ?? null,
        sourceDocumentId: doc.id,
        relatesTo: d.diagnosis.map((x) => x.toLowerCase()),
      });
    }

    // The invoice insight: every test billed should have a result somewhere.
    const billed =
      d.kind === "booking_invoice"
        ? d.status === "cancelled" || d.status === "refunded"
          ? []
          : d.tests.map((t) => t.name)
        : d.kind === "bill" && (d.vendorKind === "diagnostic" || d.vendorKind === "hospital")
          ? d.items.filter((i) => /test|lab|pathology|investigation|screen/i.test(`${i.category ?? ""} ${i.name}`)).map((i) => i.name)
          : [];
    const from = d.kind === "booking_invoice" ? (d.slot.date ?? when) : when;
    for (const test of billed) {
      const closedBy = resultFor(test, addDays(from, -1), labs, entities);
      const w = wordsFor(test);
      out.push({
        key: `result:${doc.id}:${slug(test)}`,
        type: "result_pending",
        title: `${test} result`,
        detail: `Billed on ${shortDate(when)}, no result filed yet`,
        openedOn: from,
        dueBy: addDays(from, 3),
        status: closedBy ? "closed" : "open",
        closedBy,
        sourceDocumentId: doc.id,
        relatesTo: w.relates,
      });
    }

    if (d.kind === "vaccination" && d.nextDue && d.dose < d.doses) {
      const later = sorted.find((v) => {
        if (v.doc_type !== "vaccination" || (v.event_date ?? "") <= when) return false;
        const vd = readDetails("vaccination", { details: v.details });
        return vd?.kind === "vaccination" && vd.vaccine.toLowerCase() === d.vaccine.toLowerCase() && vd.dose > d.dose;
      });
      out.push({
        key: `vaccine:${doc.id}`,
        type: "vaccine_due",
        title: `${d.vaccine}, dose ${d.dose + 1}`,
        detail: d.centre,
        openedOn: when,
        dueBy: d.nextDue,
        status: later ? "closed" : "open",
        closedBy: later?.id ?? null,
        sourceDocumentId: doc.id,
        relatesTo: [d.vaccine.toLowerCase(), (d.protectsAgainst ?? "").toLowerCase(), "vaccine", "injection", "shot"].filter(Boolean),
      });
    }
  }

  return out;
}

function sameDoctor(a: string, b: string): boolean {
  const k = (s: string) => s.toLowerCase().replace(/^dr\.?\s*/, "").replace(/[^a-z]/g, "");
  return k(a) === k(b);
}

/**
 * Derived loops plus the ones kept in the database: chat reminders, and the
 * reader's own "done" or "not needed" on a derived loop, which wins.
 */
export function mergeLoops(derived: readonly OpenLoop[], stored: readonly StoredLoop[]): OpenLoop[] {
  const byKey = new Map(derived.map((l) => [l.key, { ...l }]));
  for (const s of stored) {
    const existing = byKey.get(s.key);
    const status: LoopStatus = s.status === "closed" || s.status === "dismissed" ? s.status : "open";
    if (existing) {
      // A record closing a loop beats a stale "open"; a person's decision beats a derivation.
      if (existing.status === "open") existing.status = status;
      continue;
    }
    byKey.set(s.key, {
      key: s.key,
      type: (["test_ordered", "result_pending", "followup_due", "vaccine_due", "reminder"] as const).includes(s.type as LoopType) ? (s.type as LoopType) : "reminder",
      title: s.title,
      detail: s.detail,
      openedOn: s.opened_on,
      dueBy: s.due_by,
      status,
      closedBy: null,
      sourceDocumentId: s.source_document_id,
      relatesTo: s.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
    });
  }
  return [...byKey.values()];
}

export type LoopView = OpenLoop & { daysOpen: number; daysToDue: number | null; overdue: boolean };

/** Open loops for display, the most overdue first. */
export function openLoops(loops: readonly OpenLoop[], today: string): LoopView[] {
  return loops
    .filter((l) => l.status === "open")
    .map((l) => {
      const daysToDue = l.dueBy ? daysBetween(today, l.dueBy) : null;
      return { ...l, daysOpen: Math.max(0, daysBetween(l.openedOn, today)), daysToDue, overdue: daysToDue !== null && daysToDue < 0 };
    })
    .sort((a, b) => (a.daysToDue ?? 999) - (b.daysToDue ?? 999));
}

/** "Due in 3 days", "Overdue by 2 weeks", "Waiting 6 days". */
export function loopWhen(l: LoopView): string {
  if (l.type === "result_pending" && (l.daysToDue === null || l.daysToDue < 0)) return `Waiting ${l.daysOpen} day${l.daysOpen === 1 ? "" : "s"}`;
  if (l.daysToDue === null) return `Open ${l.daysOpen} day${l.daysOpen === 1 ? "" : "s"}`;
  if (l.daysToDue === 0) return "Due today";
  const n = Math.abs(l.daysToDue);
  const span = n >= 14 ? `${Math.round(n / 7)} weeks` : `${n} day${n === 1 ? "" : "s"}`;
  return l.daysToDue > 0 ? `Due in ${span}` : `Overdue by ${span}`;
}

/**
 * The loops worth raising in THIS conversation: ones the question mentions,
 * and ones a current medicine's ingredients make urgent.
 */
export function relevantLoops(
  loops: readonly LoopView[],
  text: string,
  /** Active ingredients of current medicines: "atorvastatin". */
  ingredientWords: readonly string[] = [],
  /** Inactive ingredients worth knowing: "aspartame". */
  excipientWords: readonly string[] = [],
): (LoopView & { because: string })[] {
  const q = text.toLowerCase();
  const out: (LoopView & { because: string })[] = [];
  for (const l of loops) {
    const excipient = l.relatesTo.find((w) => w && excipientWords.includes(w));
    const med = l.relatesTo.find((w) => w && ingredientWords.includes(w));
    const said = l.relatesTo.find((w) => w && q.includes(w));
    if (excipient) out.push({ ...l, because: `A current product contains ${excipient}, and this result is what says whether that's safe. It still isn't back.` });
    else if (med) out.push({ ...l, because: `${med.charAt(0).toUpperCase()}${med.slice(1)} is on the medicine list, and this test is how its effect gets checked.` });
    else if (said) out.push({ ...l, because: "Still open, and it bears on what you asked." });
  }
  return out.slice(0, 2);
}
