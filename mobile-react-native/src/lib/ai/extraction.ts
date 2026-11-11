import type { DocType } from "@/lib/records/types";

import type { ExtractedField, ExtractedValue, Extraction } from "./mock/extract-types";

/*
 * An Extraction that came over the network, rebuilt field by field.
 *
 * The reader (the AI API behind the doc-read Edge Function) is meant to return
 * exactly the Extraction contract, but "meant to" is a property of another
 * service. Scan's Check and save is driven by these numbers: a confidence that
 * arrives as a string or above 1 would fold a doubtful value away, and a
 * missing array would take the screen down on someone's medical record. So
 * nothing is trusted: anything that does not fit is dropped or clamped, and
 * an answer with no usable core is null, which sends Scan to the stand-in.
 *
 * Pure, no React Native imports, so it is unit tested.
 */

const DOC_TYPES: readonly DocType[] = [
  "lab_report", "prescription", "discharge", "scan", "bill", "consultation_invoice",
  "booking_invoice", "vaccination", "insurance", "medication", "other",
];
const FLAGS = ["normal", "high", "low", "caution"] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const conf = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) ? Math.round(Math.min(1, Math.max(0, n)) * 100) / 100 : 0;
};
const isoDate = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

function field(v: unknown): ExtractedField | null {
  if (!isObj(v)) return null;
  const key = str(v.key, 40);
  const label = str(v.label, 80);
  const value = str(v.value, 200);
  if (!key || !label || !value) return null;
  return { key, label, value, confidence: conf(v.confidence) };
}

function value(v: unknown): ExtractedValue | null {
  const f = field(v);
  if (!f || !isObj(v)) return null;
  return {
    ...f,
    unit: str(v.unit, 20),
    refRange: str(v.refRange, 40),
    flag: (FLAGS as readonly string[]).includes(v.flag as string) ? (v.flag as ExtractedValue["flag"]) : null,
  };
}

function unique<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)));
}

/**
 * The reader's answer as an Extraction, or null when it has nothing usable.
 * `asked` is the type the person picked; it wins, as it does for the stand-in.
 */
export function readExtraction(v: unknown, asked?: DocType): Extraction | null {
  if (!isObj(v)) return null;
  const docType = asked ?? (DOC_TYPES.includes(v.docType as DocType) ? (v.docType as DocType) : "other");
  const fields = unique((Array.isArray(v.fields) ? v.fields : []).map(field).filter((f): f is ExtractedField => f !== null)).slice(0, 60);
  const values = unique((Array.isArray(v.values) ? v.values : []).map(value).filter((x): x is ExtractedValue => x !== null)).slice(0, 120);
  const rawText = typeof v.rawText === "string" ? v.rawText.slice(0, 50_000) : "";
  const title = str(v.title, 60);
  if (!title && fields.length === 0 && values.length === 0 && !rawText.trim()) return null;

  const all = [...fields, ...values];
  return {
    title: title ?? "Document",
    docType,
    eventDate: isoDate(v.eventDate),
    facility: str(v.facility, 120),
    doctor: str(v.doctor, 120),
    details: isObj(v.details) ? v.details : {},
    fields,
    values,
    rawText,
    // Recomputed rather than trusted: it is what the review screen shows overall.
    confidence: all.length ? Math.round((all.reduce((n, f) => n + f.confidence, 0) / all.length) * 100) / 100 : 0,
  };
}
