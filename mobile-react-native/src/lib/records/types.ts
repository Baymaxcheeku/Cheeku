/*
 * The vocabulary the records screens are built from.
 *
 * Two scales live here and they must never be confused, per the settled colour
 * ruling: `Severity` is a statement about the person's health and owns
 * green/amber/red. `Confidence` is a statement about how well the OCR read a
 * page and owns neutral grey plus a single amber "needs review". A colour that
 * means "your blood count is dangerous" on one screen must not mean "we might
 * have misread this word" on the next.
 */

/** How a document's findings look overall, and how a single value reads. */
export type Severity = "normal" | "borderline" | "high_risk";

export const SEVERITY_LABEL: Record<Severity, string> = {
  normal: "Normal",
  borderline: "Borderline",
  high_risk: "High risk",
};

/*
 * The list frame labels the mid tier "Needs attention" in the stats card but
 * "Borderline" on a record row. Same tier, two words, because one is counting
 * documents and the other is describing one. Both come from here so they cannot
 * drift.
 */
export const SEVERITY_STAT_LABEL: Record<Severity, string> = {
  normal: "Normal",
  borderline: "Needs attention",
  high_risk: "High priority",
};

/** Tailwind classes for a severity pill. Never used for confidence. */
export const SEVERITY_PILL: Record<Severity, string> = {
  normal: "bg-safe-bg text-safe-text",
  borderline: "bg-caution-bg text-caution-text",
  high_risk: "bg-danger-bg text-danger-text",
};

/** The ring on the timeline rail. Fill weight, so the sampled hues are right. */
export const SEVERITY_DOT: Record<Severity, string> = {
  normal: "border-safe",
  borderline: "border-caution",
  high_risk: "border-danger",
};

/*
 * A lab value's own flag, as stored on `entities.flag`. `caution` exists in the
 * schema for non-numeric findings that still warrant a second look.
 */
export type EntityFlag = "normal" | "high" | "low" | "caution";

export const FLAG_LABEL: Record<EntityFlag, string> = {
  normal: "Normal",
  high: "High",
  low: "Low",
  caution: "Borderline",
};

export const FLAG_PILL: Record<EntityFlag, string> = {
  normal: "bg-safe-bg text-safe-text",
  high: "bg-danger-bg text-danger-text",
  low: "bg-danger-bg text-danger-text",
  caution: "bg-caution-bg text-caution-text",
};

/** An out-of-range value is what makes a document worth opening. */
export function severityFromFlags(flags: readonly EntityFlag[]): Severity {
  if (flags.some((f) => f === "high" || f === "low")) return "high_risk";
  if (flags.some((f) => f === "caution")) return "borderline";
  return "normal";
}

export type DocType =
  | "lab_report"
  | "prescription"
  | "discharge"
  | "scan"
  | "bill"
  | "consultation_invoice"
  | "booking_invoice"
  | "vaccination"
  | "insurance"
  | "medication"
  | "other";

/** Every type, in the order the filter and the upload picker offer them. */
export const DOC_TYPES: readonly DocType[] = [
  "lab_report",
  "prescription",
  "scan",
  "discharge",
  "medication",
  "vaccination",
  "insurance",
  "bill",
  "consultation_invoice",
  "booking_invoice",
  "other",
];

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  discharge: "Discharge summary",
  scan: "Scan",
  bill: "Bill",
  consultation_invoice: "Consultation invoice",
  booking_invoice: "Booking invoice",
  vaccination: "Vaccination",
  insurance: "Insurance",
  medication: "Medication",
  other: "Other",
};

/*
 * One icon per document type, so the record list reads at a glance the way a
 * shelf of colour-coded folders does — a lab report and a prescription should
 * never look like the same grey rectangle with different words on it.
 */
export const DOC_TYPE_ICON: Record<DocType, "flask" | "pill" | "clipboard" | "scan" | "receipt" | "syringe" | "file" | "shield" | "stethoscope" | "calendar" | "tablets"> = {
  lab_report: "flask",
  prescription: "pill",
  discharge: "clipboard",
  scan: "scan",
  bill: "receipt",
  consultation_invoice: "stethoscope",
  booking_invoice: "calendar",
  vaccination: "syringe",
  insurance: "shield",
  medication: "tablets",
  other: "file",
};

export type DocStatus = "processing" | "needs_review" | "filed";

export type RecordEntity = {
  id: string;
  kind: "lab_value" | "medication" | "condition" | "vital" | "vaccine";
  name: string;
  canonicalName: string | null;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  refRange: string | null;
  flag: EntityFlag | null;
  eventDate: string | null;
};

export type RecordSummary = {
  id: string;
  profileId: string;
  profileName: string;
  /** Chosen face, or null to derive one from `profileId`. */
  profileAvatarSeed: string | null;
  title: string;
  docType: DocType;
  status: DocStatus;
  mimeType: string;
  eventDate: string | null;
  facility: string | null;
  doctor: string | null;
  confidence: number | null;
  severity: Severity;
  createdAt: string;
  /** The type's one useful line for a list ("₹608 · Paid"), when it has one. */
  summary?: string | null;
};

export type RecordDetail = RecordSummary & {
  rawText: string | null;
  storagePath: string;
  entities: RecordEntity[];
  /*
   * The raw extraction blob, as jsonb. Deliberately `unknown`: it is written by
   * the upload action but the column will hold any shape, so the review screen
   * narrows it rather than trusting a type that the database does not enforce.
   */
  extraction: unknown;
};

/** The four counts across the top of D1 and D3. */
export type RecordStats = {
  total: number;
  normal: number;
  borderline: number;
  highRisk: number;
};

/*
 * `mimeType` decides the little file chip, and the frames show it as the format
 * word rather than the MIME string.
 */
export function fileKind(mimeType: string): "PDF" | "JPG" | "PNG" | "IMG" {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "image/jpeg") return "JPG";
  if (mimeType === "image/png") return "PNG";
  return "IMG";
}
