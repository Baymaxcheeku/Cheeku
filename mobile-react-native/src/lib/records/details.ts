/*
 * What each kind of record holds, beyond the columns every document shares.
 *
 * A lab report is a table of numbers against ranges. A prescription is a list
 * of medicines on a daily schedule. An insurance policy is a validity window
 * and a sum of money. Drawing all of them through one "values" template is
 * what made every record look like a blood count, so each type gets its own
 * shape here and its own page (components/records/detail).
 *
 * WHERE IT LIVES. `documents.extraction.details`, as jsonb. The database does
 * not enforce the shape, and a record can be written by the extractor, by a
 * database workflow (invoices, lab results) or by an older build. So nothing
 * here is trusted: `readDetails` rebuilds each shape field by field, drops
 * what does not fit, and returns null rather than a half-object when the core
 * of a type is missing. A page then falls back to the plain layout instead of
 * crashing on someone's medical record.
 *
 * Pure: no React Native imports, so all of it is unit tested.
 */

import type { DocType } from "./types";

// ------------------------------------------------------------------ shapes --

export type MedForm = "tablet" | "capsule" | "syrup" | "drops" | "injection" | "cream" | "inhaler" | "sachet" | "other";
export type MedTiming = "before_food" | "after_food" | "with_food" | "empty_stomach" | "bedtime" | "any";

export type Medicine = {
  name: string;
  strength: string | null;
  form: MedForm;
  /** "1 tablet", "5 ml". */
  dose: string | null;
  /** How many doses morning, afternoon, night: 1-0-1 is [1, 0, 1]. */
  schedule: [number, number, number];
  timing: MedTiming;
  durationDays: number | null;
  asNeeded: boolean;
  note: string | null;
};

export type LabDetails = {
  kind: "lab_report";
  panel: string | null;
  sampleType: string | null;
  collectedAt: string | null;
  reportedAt: string | null;
  referredBy: string | null;
  labId: string | null;
  accreditation: string | null;
  /** Groups of entity canonical names, in the order the lab printed them. */
  sections: { name: string; keys: string[] }[];
  notes: string[];
};

export type PrescriptionDetails = {
  kind: "prescription";
  doctor: { name: string; qualification: string | null; regNo: string | null; clinic: string | null; phone: string | null };
  complaints: string[];
  diagnosis: string[];
  vitals: { label: string; value: string }[];
  medicines: Medicine[];
  tests: string[];
  advice: string[];
  followUp: string | null;
};

export type ScanModality = "xray" | "mri" | "ct" | "ultrasound" | "ecg" | "echo" | "mammogram" | "other";

export type ScanDetails = {
  kind: "scan";
  modality: ScanModality;
  bodyPart: string;
  technique: string | null;
  contrast: boolean;
  clinicalNote: string | null;
  findings: string[];
  impression: string[];
  radiologist: string | null;
  referredBy: string | null;
};

export type DischargeDetails = {
  kind: "discharge";
  hospital: string;
  admittedOn: string | null;
  dischargedOn: string | null;
  ward: string | null;
  consultant: string | null;
  reason: string | null;
  diagnosis: string[];
  procedures: { name: string; date: string | null }[];
  course: string | null;
  medicines: Medicine[];
  instructions: string[];
  warningSigns: string[];
  followUp: { date: string | null; with: string | null } | null;
};

export type PaymentStatus = "paid" | "due" | "partial" | "refunded" | "cancelled";

export type BillDetails = {
  kind: "bill";
  billNo: string | null;
  vendor: string;
  vendorKind: "hospital" | "pharmacy" | "clinic" | "diagnostic" | "other";
  gstin: string | null;
  items: { name: string; category: string | null; qty: number | null; rate: number | null; amount: number }[];
  subtotal: number;
  discount: number;
  taxes: { label: string; amount: number }[];
  total: number;
  paid: number;
  paymentMode: string | null;
  status: PaymentStatus;
  claimable: boolean;
};

export type ConsultationInvoiceDetails = {
  kind: "consultation_invoice";
  invoiceNo: string;
  issuedAt: string;
  doctor: { name: string; specialty: string | null; clinic: string | null };
  mode: "online" | "clinic";
  appointment: { day: string | null; slot: string | null };
  lines: { label: string; amount: number }[];
  total: number;
  status: PaymentStatus;
  paymentMode: string | null;
  sample: boolean;
};

export type BookingInvoiceDetails = {
  kind: "booking_invoice";
  invoiceNo: string;
  issuedAt: string;
  partner: string;
  bookingId: string | null;
  tests: { name: string; price: number }[];
  collectionFee: number;
  subtotal: number;
  total: number;
  status: PaymentStatus;
  slot: { date: string | null; window: string | null };
  sample: boolean;
};

export type VaccinationDetails = {
  kind: "vaccination";
  vaccine: string;
  protectsAgainst: string | null;
  dose: number;
  doses: number;
  givenOn: string | null;
  batch: string | null;
  site: string | null;
  givenBy: string | null;
  centre: string | null;
  nextDue: string | null;
  certificateId: string | null;
};

export type InsuranceDetails = {
  kind: "insurance";
  insurer: string;
  plan: string | null;
  policyNo: string;
  policyType: "family_floater" | "individual" | "group" | "top_up";
  start: string | null;
  end: string | null;
  sumInsured: number;
  claimed: number;
  premium: { amount: number; frequency: "yearly" | "monthly" | "quarterly" } | null;
  members: { name: string; relation: string | null }[];
  tpa: { name: string; phone: string | null } | null;
  cashless: boolean;
  coPay: string | null;
  roomRent: string | null;
  waitingPeriods: { label: string; until: string | null }[];
  claims: { id: string; date: string | null; amount: number; status: "settled" | "pending" | "rejected" }[];
};

/*
 * What a photographed box says about itself. The licence printed on it is the
 * part most systems drop: a drug licence, an FSSAI food licence and a cosmetic
 * licence mean very different things about how far the label can be trusted.
 */
export type RegulatoryClass = "drug" | "nutraceutical" | "cosmetic" | "device" | "unknown";

export type PackInfo = {
  /** Active ingredients with their amount per unit (tablet, ml, sachet). */
  composition: { name: string; amount: number | null; unit: string | null }[];
  regulatoryClass: RegulatoryClass;
  licence: string | null;
  batch: string | null;
  manufacturer: string | null;
  route: "oral" | "topical" | "inhaled" | "injection" | "eye_ear_nose" | "other" | null;
  /** Inactive ingredients worth knowing: sweeteners, alcohol, dyes. */
  excipients: string[];
};

export type MedicationDetails = {
  kind: "medication";
  source: "pharmacy" | "list" | "label";
  pharmacy: string | null;
  prescribedBy: string | null;
  startedOn: string | null;
  medicines: (Medicine & { qty: number | null; expiry: string | null; pack: PackInfo | null })[];
};

export type RecordDetails =
  | LabDetails
  | PrescriptionDetails
  | ScanDetails
  | DischargeDetails
  | BillDetails
  | ConsultationInvoiceDetails
  | BookingInvoiceDetails
  | VaccinationDetails
  | InsuranceDetails
  | MedicationDetails;

// ----------------------------------------------------------------- reading --

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const money = (v: unknown): number => Math.max(0, num(v) ?? 0);
const bool = (v: unknown): boolean => v === true;
const strs = (v: unknown, cap = 40): string[] =>
  Array.isArray(v) ? v.map(str).filter((x): x is string => x !== null).slice(0, cap) : [];
const list = <T>(v: unknown, read: (o: Obj) => T | null, cap = 60): T[] =>
  Array.isArray(v) ? v.filter(isObj).map(read).filter((x): x is T => x !== null).slice(0, cap) : [];
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
/** "2026-08-04" and full ISO timestamps; anything else is dropped. */
const date = (v: unknown): string | null => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s.slice(0, 10))) ? s : null;
};

const FORMS: readonly MedForm[] = ["tablet", "capsule", "syrup", "drops", "injection", "cream", "inhaler", "sachet", "other"];
const TIMINGS: readonly MedTiming[] = ["before_food", "after_food", "with_food", "empty_stomach", "bedtime", "any"];
const PAYMENT: readonly PaymentStatus[] = ["paid", "due", "partial", "refunded", "cancelled"];

/** "1-0-1", [1,0,1] or {morning, afternoon, night}; anything else is 0-0-0. */
export function readSchedule(v: unknown): [number, number, number] {
  const clamp = (n: unknown) => Math.min(9, Math.max(0, Math.round(num(n) ?? 0)));
  if (Array.isArray(v)) return [clamp(v[0]), clamp(v[1]), clamp(v[2])];
  if (typeof v === "string") {
    const parts = v.split(/[-\s]+/).map((p) => (p === "½" ? 0.5 : Number(p)));
    if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) return [clamp(parts[0]), clamp(parts[1]), clamp(parts[2])];
  }
  if (isObj(v)) return [clamp(v.morning), clamp(v.afternoon), clamp(v.night)];
  return [0, 0, 0];
}

function readMedicine(o: Obj): Medicine | null {
  const name = str(o.name);
  if (!name) return null;
  return {
    name,
    strength: str(o.strength),
    form: oneOf(o.form, FORMS, "tablet"),
    dose: str(o.dose),
    schedule: readSchedule(o.schedule),
    timing: oneOf(o.timing, TIMINGS, "any"),
    durationDays: num(o.durationDays) !== null ? Math.max(0, Math.round(num(o.durationDays) as number)) : null,
    asNeeded: bool(o.asNeeded),
    note: str(o.note),
  };
}

const readLine = (o: Obj) => {
  const label = str(o.label);
  return label ? { label, amount: num(o.amount) ?? 0 } : null;
};

const REG_CLASSES: readonly RegulatoryClass[] = ["drug", "nutraceutical", "cosmetic", "device", "unknown"];
const ROUTES = ["oral", "topical", "inhaled", "injection", "eye_ear_nose", "other"] as const;

function readPack(v: unknown): PackInfo | null {
  if (!isObj(v)) return null;
  return {
    composition: list(v.composition, (c) => {
      const name = str(c.name);
      return name ? { name, amount: num(c.amount), unit: str(c.unit) } : null;
    }, 20),
    regulatoryClass: oneOf(v.regulatoryClass, REG_CLASSES, "unknown"),
    licence: str(v.licence),
    batch: str(v.batch),
    manufacturer: str(v.manufacturer),
    route: typeof v.route === "string" && (ROUTES as readonly string[]).includes(v.route) ? (v.route as PackInfo["route"]) : null,
    excipients: strs(v.excipients, 12),
  };
}

const READERS: { [K in RecordDetails["kind"]]: (d: Obj) => Extract<RecordDetails, { kind: K }> | null } = {
  lab_report: (d) => ({
    kind: "lab_report",
    panel: str(d.panel),
    sampleType: str(d.sampleType),
    collectedAt: date(d.collectedAt),
    reportedAt: date(d.reportedAt),
    referredBy: str(d.referredBy),
    labId: str(d.labId),
    accreditation: str(d.accreditation),
    sections: list(d.sections, (s) => {
      const name = str(s.name);
      return name ? { name, keys: strs(s.keys, 80) } : null;
    }),
    notes: strs(d.notes, 10),
  }),

  prescription: (d) => {
    const doc = isObj(d.doctor) ? d.doctor : {};
    const medicines = list(d.medicines, readMedicine);
    const doctor = str(doc.name);
    if (!doctor && medicines.length === 0) return null;
    return {
      kind: "prescription",
      doctor: { name: doctor ?? "Your doctor", qualification: str(doc.qualification), regNo: str(doc.regNo), clinic: str(doc.clinic), phone: str(doc.phone) },
      complaints: strs(d.complaints),
      diagnosis: strs(d.diagnosis),
      vitals: list(d.vitals, (v) => {
        const label = str(v.label);
        const value = str(v.value);
        return label && value ? { label, value } : null;
      }, 12),
      medicines,
      tests: strs(d.tests),
      advice: strs(d.advice),
      followUp: date(d.followUp),
    };
  },

  scan: (d) => {
    const bodyPart = str(d.bodyPart);
    const findings = strs(d.findings);
    const impression = strs(d.impression);
    if (!bodyPart && findings.length === 0 && impression.length === 0) return null;
    return {
      kind: "scan",
      modality: oneOf(d.modality, ["xray", "mri", "ct", "ultrasound", "ecg", "echo", "mammogram", "other"] as const, "other"),
      bodyPart: bodyPart ?? "Not stated",
      technique: str(d.technique),
      contrast: bool(d.contrast),
      clinicalNote: str(d.clinicalNote),
      findings,
      impression,
      radiologist: str(d.radiologist),
      referredBy: str(d.referredBy),
    };
  },

  discharge: (d) => {
    const hospital = str(d.hospital);
    if (!hospital) return null;
    const fu = isObj(d.followUp) ? d.followUp : null;
    return {
      kind: "discharge",
      hospital,
      admittedOn: date(d.admittedOn),
      dischargedOn: date(d.dischargedOn),
      ward: str(d.ward),
      consultant: str(d.consultant),
      reason: str(d.reason),
      diagnosis: strs(d.diagnosis),
      procedures: list(d.procedures, (p) => {
        const name = str(p.name);
        return name ? { name, date: date(p.date) } : null;
      }),
      course: str(d.course),
      medicines: list(d.medicines, readMedicine),
      instructions: strs(d.instructions),
      warningSigns: strs(d.warningSigns),
      followUp: fu && (date(fu.date) || str(fu.with)) ? { date: date(fu.date), with: str(fu.with) } : null,
    };
  },

  bill: (d) => {
    const vendor = str(d.vendor);
    const items = list(d.items, (i) => {
      const name = str(i.name);
      return name ? { name, category: str(i.category), qty: num(i.qty), rate: num(i.rate), amount: num(i.amount) ?? 0 } : null;
    }, 200);
    if (!vendor && items.length === 0) return null;
    const subtotal = num(d.subtotal) ?? items.reduce((s, i) => s + i.amount, 0);
    const discount = money(d.discount);
    const taxes = list(d.taxes, readLine, 6);
    const total = num(d.total) ?? subtotal - discount + taxes.reduce((s, t) => s + t.amount, 0);
    const paid = num(d.paid) ?? (d.status === "paid" ? total : 0);
    return {
      kind: "bill",
      billNo: str(d.billNo),
      vendor: vendor ?? "Unknown",
      vendorKind: oneOf(d.vendorKind, ["hospital", "pharmacy", "clinic", "diagnostic", "other"] as const, "other"),
      gstin: str(d.gstin),
      items,
      subtotal,
      discount,
      taxes,
      total,
      paid,
      paymentMode: str(d.paymentMode),
      status: oneOf(d.status, PAYMENT, paid >= total && total > 0 ? "paid" : paid > 0 ? "partial" : "due"),
      claimable: bool(d.claimable),
    };
  },

  consultation_invoice: (d) => {
    const doc = isObj(d.doctor) ? d.doctor : {};
    const name = str(doc.name);
    const invoiceNo = str(d.invoiceNo);
    if (!name || !invoiceNo) return null;
    const appt = isObj(d.appointment) ? d.appointment : {};
    const lines = list(d.lines, readLine, 10);
    return {
      kind: "consultation_invoice",
      invoiceNo,
      issuedAt: str(d.issuedAt) ?? "",
      doctor: { name, specialty: str(doc.specialty), clinic: str(doc.clinic) },
      mode: oneOf(d.mode, ["online", "clinic"] as const, "online"),
      appointment: { day: date(appt.day), slot: str(appt.slot) },
      lines,
      total: num(d.total) ?? lines.reduce((s, l) => s + l.amount, 0),
      status: oneOf(d.status, PAYMENT, "paid"),
      paymentMode: str(d.paymentMode),
      sample: bool(d.sample),
    };
  },

  booking_invoice: (d) => {
    const partner = str(d.partner);
    const invoiceNo = str(d.invoiceNo);
    if (!partner || !invoiceNo) return null;
    const tests = list(d.tests, (t) => {
      const name = str(t.name);
      return name ? { name, price: money(t.price) } : null;
    }, 20);
    const collectionFee = money(d.collectionFee);
    const subtotal = num(d.subtotal) ?? tests.reduce((s, t) => s + t.price, 0);
    const slot = isObj(d.slot) ? d.slot : {};
    return {
      kind: "booking_invoice",
      invoiceNo,
      issuedAt: str(d.issuedAt) ?? "",
      partner,
      bookingId: str(d.bookingId),
      tests,
      collectionFee,
      subtotal,
      total: num(d.total) ?? subtotal + collectionFee,
      status: oneOf(d.status, PAYMENT, "due"),
      slot: { date: date(slot.date), window: str(slot.window) },
      sample: bool(d.sample),
    };
  },

  vaccination: (d) => {
    const vaccine = str(d.vaccine);
    if (!vaccine) return null;
    const doses = Math.max(1, Math.round(num(d.doses) ?? 1));
    return {
      kind: "vaccination",
      vaccine,
      protectsAgainst: str(d.protectsAgainst),
      dose: Math.min(doses, Math.max(1, Math.round(num(d.dose) ?? 1))),
      doses,
      givenOn: date(d.givenOn),
      batch: str(d.batch),
      site: str(d.site),
      givenBy: str(d.givenBy),
      centre: str(d.centre),
      nextDue: date(d.nextDue),
      certificateId: str(d.certificateId),
    };
  },

  insurance: (d) => {
    const insurer = str(d.insurer);
    const policyNo = str(d.policyNo);
    if (!insurer || !policyNo) return null;
    const premium = isObj(d.premium) && num(d.premium.amount) !== null
      ? { amount: money(d.premium.amount), frequency: oneOf(d.premium.frequency, ["yearly", "monthly", "quarterly"] as const, "yearly") }
      : null;
    const tpa = isObj(d.tpa) && str(d.tpa.name) ? { name: str(d.tpa.name) as string, phone: str(d.tpa.phone) } : null;
    return {
      kind: "insurance",
      insurer,
      plan: str(d.plan),
      policyNo,
      policyType: oneOf(d.policyType, ["family_floater", "individual", "group", "top_up"] as const, "individual"),
      start: date(d.start),
      end: date(d.end),
      sumInsured: money(d.sumInsured),
      claimed: money(d.claimed),
      premium,
      members: list(d.members, (m) => {
        const name = str(m.name);
        return name ? { name, relation: str(m.relation) } : null;
      }, 12),
      tpa,
      cashless: bool(d.cashless),
      coPay: str(d.coPay),
      roomRent: str(d.roomRent),
      waitingPeriods: list(d.waitingPeriods, (w) => {
        const label = str(w.label);
        return label ? { label, until: date(w.until) } : null;
      }, 10),
      claims: list(d.claims, (c) => {
        const id = str(c.id);
        return id ? { id, date: date(c.date), amount: money(c.amount), status: oneOf(c.status, ["settled", "pending", "rejected"] as const, "pending") } : null;
      }, 20),
    };
  },

  medication: (d) => {
    const medicines = list(d.medicines, (o) => {
      const m = readMedicine(o);
      return m ? { ...m, qty: num(o.qty), expiry: date(o.expiry), pack: readPack(o.pack) } : null;
    });
    if (medicines.length === 0) return null;
    return {
      kind: "medication",
      source: oneOf(d.source, ["pharmacy", "list", "label"] as const, "list"),
      pharmacy: str(d.pharmacy),
      prescribedBy: str(d.prescribedBy),
      startedOn: date(d.startedOn),
      medicines,
    };
  },
};

/**
 * The type-specific details of a record, or null to use the plain layout.
 * The document's own type decides the reader; a `kind` inside the blob that
 * disagrees (a record retyped by hand) is ignored rather than trusted.
 */
export function readDetails(docType: DocType, extraction: unknown): RecordDetails | null {
  if (docType === "other") return null;
  const details = isObj(extraction) && isObj(extraction.details) ? extraction.details : null;
  if (!details) return null;
  try {
    return READERS[docType](details);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------- derived --

const DAY = 86_400_000;

/** Whole days from `from` to the date `iso` (negative when it has passed). */
export function daysUntil(iso: string | null, from: Date = new Date()): number | null {
  if (!iso) return null;
  const target = Date.parse(iso.slice(0, 10));
  if (Number.isNaN(target)) return null;
  const today = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target - today) / DAY);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso.slice(0, 10)) + days * DAY).toISOString().slice(0, 10);
}

/** "1-0-1". Halves print as ½. */
export function scheduleLabel(s: readonly [number, number, number]): string {
  return s.map((n) => (n === 0.5 ? "½" : String(n))).join("-");
}

export function dosesPerDay(m: Pick<Medicine, "schedule">): number {
  return m.schedule[0] + m.schedule[1] + m.schedule[2];
}

const TIMING_LABEL: Record<MedTiming, string | null> = {
  before_food: "before food",
  after_food: "after food",
  with_food: "with food",
  empty_stomach: "on an empty stomach",
  bedtime: "at bedtime",
  any: null,
};

/** "Twice a day after food, for 5 days". Written the way a pharmacist says it. */
export function medicineInstruction(m: Medicine): string {
  if (m.asNeeded) return `Only when needed${TIMING_LABEL[m.timing] ? `, ${TIMING_LABEL[m.timing]}` : ""}`;
  const n = dosesPerDay(m);
  const freq = n === 0 ? "As directed" : n === 1 ? "Once a day" : n === 2 ? "Twice a day" : n === 3 ? "Three times a day" : `${n} times a day`;
  const timing = TIMING_LABEL[m.timing];
  const duration = m.durationDays ? `, for ${m.durationDays} day${m.durationDays === 1 ? "" : "s"}` : "";
  return `${freq}${timing ? ` ${timing}` : ""}${duration}`;
}

/** How many to buy for the whole course, when the course has a length. */
export function courseQuantity(m: Medicine): number | null {
  if (m.asNeeded || !m.durationDays) return null;
  const n = dosesPerDay(m);
  return n > 0 ? n * m.durationDays : null;
}

/**
 * Where a course stands, counted from the record's date.
 * `left` is days remaining including today; null when it has no length.
 */
export function courseStatus(m: Medicine, startIso: string | null, now: Date = new Date()): { ended: boolean; left: number | null; endsOn: string | null } {
  if (!startIso || !m.durationDays || m.asNeeded) return { ended: false, left: null, endsOn: null };
  const endsOn = addDays(startIso, m.durationDays - 1);
  const left = (daysUntil(endsOn, now) ?? 0) + 1;
  return { ended: left <= 0, left: Math.max(0, left), endsOn };
}

/** The same medicine in the member's own list: {name, dose, frequency}. */
export function toProfileMedication(m: Medicine): { name: string; dose: string; frequency: string } {
  const name = m.strength && !m.name.toLowerCase().includes(m.strength.toLowerCase()) ? `${m.name} ${m.strength}` : m.name;
  return { name, dose: m.dose ?? "", frequency: m.asNeeded ? "When needed" : `${scheduleLabel(m.schedule)} · ${medicineInstruction(m)}` };
}

/** Case- and space-insensitive: "Metformin  500mg" matches "metformin 500 mg". */
export function sameMedicine(a: string, b: string): boolean {
  const k = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9.]/g, "");
  return k(a) === k(b);
}

// ------------------------------------------------------------------ ranges --

export type RangeBounds = { low: number | null; high: number | null };

/** "12.0-15.0", "12 – 15", "<200", "> 40", "up to 5.7". Null when unreadable. */
export function parseRange(text: string | null): RangeBounds | null {
  if (!text) return null;
  const t = text.replace(/,/g, "").trim();
  const between = t.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (between) {
    const low = Number(between[1]);
    const high = Number(between[2]);
    return low <= high ? { low, high } : { low: high, high: low };
  }
  const upper = t.match(/^(?:<|≤|<=|up to|below|less than)\s*(\d+(?:\.\d+)?)/i);
  if (upper) return { low: null, high: Number(upper[1]) };
  const lower = t.match(/^(?:>|≥|>=|above|more than)\s*(\d+(?:\.\d+)?)/i);
  if (lower) return { low: Number(lower[1]), high: null };
  return null;
}

/**
 * Where a value sits on a bar whose middle third is the normal range:
 * 0 to 1, clamped, with the range itself spanning 1/3 to 2/3.
 */
export function rangePosition(value: number, r: RangeBounds): number {
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  if (r.low !== null && r.high !== null) {
    const span = r.high - r.low || 1;
    return clamp(1 / 3 + ((value - r.low) / span) * (1 / 3));
  }
  if (r.high !== null) return clamp((value / (r.high || 1)) * (2 / 3));
  if (r.low !== null) return clamp(1 / 3 + ((value - r.low) / (r.low || 1)) * (1 / 3));
  return 0.5;
}

/** A value's change from the last time it was measured. */
export function trend(current: number, previous: number | null): { delta: number; direction: "up" | "down" | "same" } | null {
  if (previous === null || !Number.isFinite(previous)) return null;
  const delta = Number((current - previous).toFixed(2));
  return { delta, direction: delta > 0 ? "up" : delta < 0 ? "down" : "same" };
}

// --------------------------------------------------------------- insurance --

export type CoverStatus = "active" | "renew_soon" | "expired" | "not_started" | "unknown";

export function coverStatus(d: Pick<InsuranceDetails, "start" | "end">, now: Date = new Date()): { status: CoverStatus; daysLeft: number | null } {
  const toStart = daysUntil(d.start, now);
  const left = daysUntil(d.end, now);
  if (toStart !== null && toStart > 0) return { status: "not_started", daysLeft: left };
  if (left === null) return { status: "unknown", daysLeft: null };
  if (left < 0) return { status: "expired", daysLeft: left };
  if (left <= 30) return { status: "renew_soon", daysLeft: left };
  return { status: "active", daysLeft: left };
}

export function coverUsed(d: Pick<InsuranceDetails, "sumInsured" | "claimed">): { remaining: number; share: number } {
  const remaining = Math.max(0, d.sumInsured - d.claimed);
  return { remaining, share: d.sumInsured > 0 ? Math.min(1, d.claimed / d.sumInsured) : 0 };
}

// ------------------------------------------------------------- vaccination --

export type DoseStatus = "complete" | "overdue" | "due_soon" | "upcoming" | "no_date";

export function doseStatus(d: Pick<VaccinationDetails, "dose" | "doses" | "nextDue">, now: Date = new Date()): { status: DoseStatus; days: number | null } {
  if (d.dose >= d.doses && !d.nextDue) return { status: "complete", days: null };
  const days = daysUntil(d.nextDue, now);
  if (days === null) return { status: d.dose >= d.doses ? "complete" : "no_date", days: null };
  if (days < 0) return { status: "overdue", days };
  if (days <= 14) return { status: "due_soon", days };
  return { status: "upcoming", days };
}

// ------------------------------------------------------------------ stays --

export function lengthOfStay(admitted: string | null, discharged: string | null): number | null {
  if (!admitted || !discharged) return null;
  const n = Math.round((Date.parse(discharged.slice(0, 10)) - Date.parse(admitted.slice(0, 10))) / DAY);
  return Number.isFinite(n) && n >= 0 ? Math.max(1, n) : null;
}

// ------------------------------------------------------------------ money --

/** ₹1,23,456 in the Indian grouping, with paise only when there are some. */
export function rupees(n: number): string {
  const whole = Number.isInteger(n);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** ₹5 lakh, ₹1.5 crore: how cover is said out loud in India. */
export function rupeesShort(n: number): string {
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} lakh`;
  return rupees(n);
}

export function amountDue(d: { total: number; paid?: number; status: PaymentStatus }): number {
  if (d.status === "paid" || d.status === "refunded" || d.status === "cancelled") return 0;
  return Math.max(0, d.total - (d.paid ?? 0));
}

// ----------------------------------------------------------- list summary --

/**
 * One line for the record's card in the list: the thing you'd want to know
 * without opening it. Null leaves the card's usual facility line.
 */
export function summaryLine(details: RecordDetails | null, now: Date = new Date()): string | null {
  if (!details) return null;
  switch (details.kind) {
    case "prescription": {
      const n = details.medicines.length;
      return n ? `${n} medicine${n === 1 ? "" : "s"} · ${details.doctor.name}` : details.doctor.name;
    }
    case "medication": {
      const n = details.medicines.length;
      return `${n} medicine${n === 1 ? "" : "s"}${details.pharmacy ? ` · ${details.pharmacy}` : ""}`;
    }
    case "scan":
      return `${MODALITY_LABEL[details.modality]} · ${details.bodyPart}`;
    case "discharge": {
      const stay = lengthOfStay(details.admittedOn, details.dischargedOn);
      return `${details.hospital}${stay ? ` · ${stay} day${stay === 1 ? "" : "s"} admitted` : ""}`;
    }
    case "bill": {
      const due = amountDue(details);
      return `${rupees(details.total)} · ${due > 0 ? `${rupees(due)} due` : PAYMENT_LABEL[details.status]}`;
    }
    case "consultation_invoice":
      return `${rupees(details.total)} · ${PAYMENT_LABEL[details.status]} · ${details.doctor.name}`;
    case "booking_invoice":
      return `${rupees(details.total)} · ${PAYMENT_LABEL[details.status]} · ${details.partner}`;
    case "vaccination": {
      const s = doseStatus(details, now);
      const dose = details.doses > 1 ? `Dose ${details.dose} of ${details.doses}` : "Single dose";
      if (s.status === "overdue") return `${dose} · next dose overdue`;
      if (s.status === "due_soon" || s.status === "upcoming") return `${dose} · next due ${shortDate(details.nextDue)}`;
      return s.status === "complete" ? `${dose} · course complete` : dose;
    }
    case "insurance": {
      const c = coverStatus(details, now);
      const cover = rupeesShort(details.sumInsured);
      if (c.status === "expired") return `${cover} cover · expired`;
      if (c.status === "renew_soon") return `${cover} cover · renews in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`;
      return `${cover} cover${details.end ? ` · till ${shortDate(details.end)}` : ""}`;
    }
    case "lab_report":
      return null;
  }
}

export const MODALITY_LABEL: Record<ScanModality, string> = {
  xray: "X-ray",
  mri: "MRI",
  ct: "CT scan",
  ultrasound: "Ultrasound",
  ecg: "ECG",
  echo: "Echo",
  mammogram: "Mammogram",
  other: "Imaging",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  due: "Payment due",
  partial: "Part paid",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Oct 2026". Built by hand so it reads the same on every phone locale. */
export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * How long a bought quantity lasts at the prescribed rate, and the day it
 * runs out when the start is known. Null for "when needed" medicines.
 */
export function supplyLeft(m: Medicine & { qty: number | null }, startIso: string | null, now: Date = new Date()): { days: number; runsOutOn: string | null; daysLeft: number | null } | null {
  const perDay = dosesPerDay(m);
  if (m.asNeeded || !m.qty || perDay <= 0) return null;
  const days = Math.floor(m.qty / perDay);
  if (!startIso) return { days, runsOutOn: null, daysLeft: null };
  const runsOutOn = addDays(startIso, days);
  return { days, runsOutOn, daysLeft: daysUntil(runsOutOn, now) };
}
