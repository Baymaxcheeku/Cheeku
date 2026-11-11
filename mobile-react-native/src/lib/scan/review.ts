import { LOW_CONFIDENCE, type Extraction, type ExtractedValue } from "@/lib/ai/mock/extract-types";

/*
 * THE CONFIRM STEP (loop-scan-ux).
 *
 * The reader returns a confidence for every field and value. Only the ones
 * below LOW_CONFIDENCE are put in front of the person to check; everything
 * read clearly is folded away. Checking an item ("Looks right") or correcting
 * it makes it certain (confidence 1). When nothing doubtful is left the record
 * files as "filed"; anything left unchecked keeps it "needs_review", visibly
 * unverified, exactly as before.
 */

export type ReviewItem = {
  /** "f:<key>" for a field, "v:<key>" for a value. */
  id: string;
  kind: "field" | "value";
  label: string;
  value: string;
  unit: string | null;
  refRange: string | null;
  flag: ExtractedValue["flag"];
  confidence: number;
  low: boolean;
};

export type ReviewState = {
  /** Corrections typed by the person, by item id. */
  edits: Record<string, { value?: string; unit?: string }>;
  /** Items the person said are right as read. */
  confirmed: ReadonlySet<string>;
};

export const EMPTY_REVIEW: ReviewState = { edits: {}, confirmed: new Set() };

export function reviewItems(x: Extraction): ReviewItem[] {
  const fields: ReviewItem[] = x.fields
    .filter((f) => f.value && f.value !== "-")
    .map((f) => ({ id: `f:${f.key}`, kind: "field", label: f.label, value: f.value, unit: null, refRange: null, flag: null, confidence: f.confidence, low: f.confidence < LOW_CONFIDENCE }));
  const values: ReviewItem[] = x.values.map((v) => ({ id: `v:${v.key}`, kind: "value", label: v.label, value: v.value, unit: v.unit, refRange: v.refRange, flag: v.flag, confidence: v.confidence, low: v.confidence < LOW_CONFIDENCE }));
  return [...fields, ...values];
}

/** The items still waiting for a look. */
export function unresolved(x: Extraction, s: ReviewState): ReviewItem[] {
  return reviewItems(x).filter((i) => i.low && !s.confirmed.has(i.id) && !(s.edits[i.id]?.value ?? "").trim());
}

/** "4.0-5.6" or "70 - 99" to numbers; null when it is not a plain range. */
export function parseRange(r: string | null): [number, number] | null {
  const m = (r ?? "").match(/(-?\d+(?:\.\d+)?)\s*[-–to]+\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  return Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi ? [lo, hi] : null;
}

/** A corrected number gets its flag again from the range printed on the report. */
export function flagFor(value: string, refRange: string | null, previous: ExtractedValue["flag"]): ExtractedValue["flag"] {
  const n = Number(value.replace(/,/g, ""));
  const range = parseRange(refRange);
  if (!range || !Number.isFinite(n)) return previous === "caution" ? "caution" : null;
  return n < range[0] ? "low" : n > range[1] ? "high" : "normal";
}

/*
 * A medicine is its own field, "med:<index>", because a misread handwritten
 * name is the reading that matters most (the reader puts one per medicine,
 * ai_integration_api services/baymax_reader.py). The field shows "Glycomet
 * 500 mg"; a correction replaces the medicine's name with what the person
 * typed and drops the separate strength, which the typed text now carries.
 * The rest of the medicine (schedule, timing, days) is left as read.
 */
function withCorrectedMedicines(details: Extraction["details"], s: ReviewState): Extraction["details"] {
  const meds = (details as { medicines?: unknown }).medicines;
  if (!Array.isArray(meds)) return details;
  let changed = false;
  const next = meds.map((m, i) => {
    const typed = s.edits[`f:med:${i}`]?.value?.trim();
    if (!typed || !m || typeof m !== "object") return m;
    changed = true;
    return { ...(m as Record<string, unknown>), name: typed.slice(0, 80), strength: null };
  });
  return changed ? { ...details, medicines: next } : details;
}

/** The extraction as the person confirmed it. */
export function applyReview(x: Extraction, s: ReviewState): Extraction {
  const touched = (id: string) => s.confirmed.has(id) || Boolean((s.edits[id]?.value ?? "").trim());
  const fields = x.fields.map((f) => {
    const id = `f:${f.key}`;
    const v = s.edits[id]?.value?.trim();
    return touched(id) ? { ...f, value: v || f.value, confidence: 1 } : f;
  });
  const values = x.values.map((v) => {
    const id = `v:${v.key}`;
    const e = s.edits[id];
    const next = e?.value?.trim();
    if (!touched(id)) return v;
    const value = next || v.value;
    return { ...v, value, unit: e?.unit?.trim() || v.unit, flag: next && next !== v.value ? flagFor(value, v.refRange, v.flag) : v.flag, confidence: 1 };
  });
  const pick = (key: string, fallback: string | null) => {
    const f = fields.find((x) => x.key === key);
    return f && f.value && f.value !== "-" ? f.value : fallback;
  };
  const all = [...fields, ...values];
  return {
    ...x,
    details: withCorrectedMedicines(x.details, s),
    fields,
    values,
    eventDate: pick("eventDate", x.eventDate),
    facility: pick("facility", x.facility),
    doctor: pick("doctor", x.doctor),
    confidence: all.length ? Number((all.reduce((n, f) => n + f.confidence, 0) / all.length).toFixed(2)) : x.confidence,
  };
}
