import { ageFrom } from "@/lib/profiles/health-rules";
import {
  coverStatus,
  coverUsed,
  daysUntil,
  readDetails,
  sameMedicine,
  shortDate,
  summaryLine,
  supplyLeft,
  type CoverStatus,
} from "@/lib/records/details";
import { DOC_TYPE_LABEL, type DocStatus, type DocType, type EntityFlag } from "@/lib/records/types";

/*
 * ONE PERSON'S HEALTH FILE, shaped from one database read.
 *
 * `health_file_bundle` (migration 0029) returns a member's profile, records
 * and read values together, and only for a covered member of the caller's
 * own family. This turns that into everything the page and Home's card show.
 * Pure, so it is tested (file.test.ts) and Home and the page cannot disagree.
 *
 * NOTHING IS DERIVED THAT THE RECORDS DO NOT SAY. No score, no grade, no
 * "health age", no BMI verdict. Values are shown against the range the lab
 * printed, dates are the ones on the documents, and "coming up" lists only
 * dates a document or a booking actually gave.
 */

type Row = Record<string, unknown>;
export type Bundle = { profile: Row | null; documents: Row[]; entities: Row[] };

export type Point = { date: string | null; value: number };

export type Tracked = {
  key: string;
  name: string;
  unit: string | null;
  refRange: string | null;
  latest: Point & { flag: EntityFlag | null; documentId: string | null };
  previous: Point | null;
  /** Oldest first, numeric readings only. */
  points: Point[];
  direction: "up" | "down" | "same" | null;
};

export type FileMedicine = { name: string; detail: string | null; source: "record" | "profile"; documentId: string | null; date: string | null };
export type FileVaccine = { name: string; label: string; date: string | null; documentId: string | null };
export type UpcomingKind = "follow_up" | "next_dose" | "renewal" | "appointment" | "lab_visit" | "refill";
export type Upcoming = { id: string; kind: UpcomingKind; title: string; detail: string | null; date: string; days: number; documentId: string };
export type Cover = { documentId: string; insurer: string; plan: string | null; sumInsured: number; remaining: number; end: string | null; status: CoverStatus; daysLeft: number | null };
export type CareContact = { name: string; kind: "doctor" | "place"; visits: number; last: string | null };
export type RecentRecord = { id: string; docType: DocType; title: string; eventDate: string | null; status: DocStatus; summary: string | null };

export type Person = {
  id: string;
  name: string;
  firstName: string;
  relationship: string | null;
  isPrimary: boolean;
  age: number | null;
  sex: string | null;
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  conditions: string[];
  allergies: string[];
};

export type HealthFile = {
  person: Person;
  totals: { records: number; needsReview: number; valuesTracked: number; firstEvent: string | null; lastEvent: string | null };
  byType: { type: DocType; count: number }[];
  tracked: Tracked[];
  flagged: Tracked[];
  medicines: FileMedicine[];
  vaccines: FileVaccine[];
  upcoming: Upcoming[];
  cover: Cover[];
  careTeam: CareContact[];
  recent: RecentRecord[];
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((x): x is string => x !== null) : []);
const byDateDesc = (a: string | null, b: string | null) => String(b ?? "").localeCompare(String(a ?? ""));

const FLAGS = new Set(["normal", "high", "low", "caution"]);
const DOC_TYPES = new Set<string>(Object.keys(DOC_TYPE_LABEL));

function person(p: Row | null, now: Date): Person {
  const name = str(p?.name) ?? "Unknown";
  return {
    id: String(p?.id ?? ""),
    name,
    firstName: name.split(" ")[0] ?? name,
    relationship: str(p?.relationship),
    isPrimary: p?.is_primary === true,
    age: ageFrom(str(p?.dob), now),
    sex: str(p?.sex),
    bloodGroup: str(p?.blood_group),
    heightCm: num(p?.height_cm),
    weightKg: num(p?.weight_kg),
    conditions: strs(p?.conditions),
    allergies: strs(p?.allergies),
  };
}

/** Every lab value as a series, one per measurement, flagged ones first. */
export function trackValues(entities: Row[]): Tracked[] {
  const groups = new Map<string, Row[]>();
  for (const e of entities) {
    if (e.kind !== "lab_value" && e.kind !== "vital") continue;
    const key = (str(e.canonical_name) ?? str(e.name) ?? "").toLowerCase();
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const out: Tracked[] = [];
  for (const [key, rows] of groups) {
    const newest = [...rows].sort((a, b) => byDateDesc(str(a.event_date), str(b.event_date)));
    const latest = newest[0];
    if (!latest) continue;
    const latestValue = num(latest.value);
    if (latestValue === null) continue;
    const points = newest
      .map((r) => ({ date: str(r.event_date), value: num(r.value) }))
      .filter((p): p is Point => p.value !== null)
      .reverse();
    const prev = points.length > 1 ? (points[points.length - 2] ?? null) : null;
    const flag = FLAGS.has(latest.flag as string) ? (latest.flag as EntityFlag) : null;
    out.push({
      key,
      name: str(latest.name) ?? key,
      unit: str(latest.unit),
      refRange: str(latest.ref_range),
      latest: { date: str(latest.event_date), value: latestValue, flag, documentId: str(latest.document_id) },
      previous: prev,
      points,
      direction: prev === null ? null : latestValue > prev.value ? "up" : latestValue < prev.value ? "down" : "same",
    });
  }

  const flaggedFirst = (t: Tracked) => (t.latest.flag === "high" || t.latest.flag === "low" ? 0 : t.latest.flag === "caution" ? 1 : 2);
  return out.sort((a, b) => flaggedFirst(a) - flaggedFirst(b) || byDateDesc(a.latest.date, b.latest.date) || a.name.localeCompare(b.name));
}

/** From records (newest of each) and from the member's own list, never twice. */
export function mergeMedicines(entities: Row[], declared: unknown): FileMedicine[] {
  const fromRecords: FileMedicine[] = [];
  const meds = entities.filter((e) => e.kind === "medication").sort((a, b) => byDateDesc(str(a.event_date), str(b.event_date)));
  for (const m of meds) {
    const name = str(m.name);
    if (!name || fromRecords.some((x) => sameMedicine(x.name, name))) continue;
    fromRecords.push({ name, detail: str(m.value_text) ?? str(m.unit), source: "record", documentId: str(m.document_id), date: str(m.event_date) });
  }
  const own: FileMedicine[] = [];
  if (Array.isArray(declared)) {
    for (const d of declared as Row[]) {
      const name = str(d?.name);
      if (!name || fromRecords.some((x) => sameMedicine(x.name, name)) || own.some((x) => sameMedicine(x.name, name))) continue;
      const detail = [str(d.dose), str(d.frequency)].filter(Boolean).join(" · ");
      own.push({ name, detail: detail || null, source: "profile", documentId: null, date: null });
    }
  }
  // The member's own list first: it is what they say they take now.
  return [...own, ...fromRecords];
}

/** Dates a record or booking actually gave, from today on (overdue doses too). */
export function upcomingFrom(documents: Row[], now: Date): Upcoming[] {
  const out: Upcoming[] = [];
  const push = (doc: Row, kind: UpcomingKind, title: string, detail: string | null, date: string | null, allowPast = 0) => {
    if (!date) return;
    const days = daysUntil(date, now);
    if (days === null || days < -allowPast) return;
    out.push({ id: `${doc.id}-${kind}`, kind, title, detail, date: date.slice(0, 10), days, documentId: String(doc.id) });
  };

  for (const doc of documents) {
    const type = doc.doc_type as DocType;
    if (!DOC_TYPES.has(type)) continue;
    const d = readDetails(type, { details: doc.details });
    if (!d) continue;
    switch (d.kind) {
      case "prescription":
        push(doc, "follow_up", `Follow-up with ${d.doctor.name}`, d.doctor.clinic, d.followUp);
        break;
      case "discharge":
        push(doc, "follow_up", "Follow-up after discharge", d.followUp?.with ?? d.hospital, d.followUp?.date ?? null);
        break;
      case "vaccination":
        if (d.dose < d.doses || d.nextDue) push(doc, "next_dose", `${d.vaccine}, dose ${Math.min(d.dose + 1, d.doses)}`, d.centre, d.nextDue, 120);
        break;
      case "insurance": {
        const left = daysUntil(d.end, now);
        if (left !== null && left <= 60) push(doc, "renewal", `${d.insurer} renews`, d.plan, d.end);
        break;
      }
      case "consultation_invoice":
        if (d.status !== "cancelled" && d.status !== "refunded") push(doc, "appointment", d.mode === "online" ? `Video call with ${d.doctor.name}` : `Visit to ${d.doctor.name}`, d.appointment.slot, d.appointment.day);
        break;
      case "booking_invoice":
        if (d.status !== "cancelled") push(doc, "lab_visit", `Home collection by ${d.partner}`, d.slot.window, d.slot.date);
        break;
      case "medication":
        for (const m of d.medicines) {
          const s = supplyLeft(m, d.startedOn ?? str(doc.event_date));
          if (s?.runsOutOn && (s.daysLeft ?? 99) <= 21) push({ ...doc, id: `${doc.id}-${m.name}` }, "refill", `${m.name} runs out`, d.pharmacy, s.runsOutOn);
        }
        break;
      default:
        break;
    }
  }
  const seen = new Set<string>();
  return out
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)));
}

export function coverFrom(documents: Row[], now: Date): Cover[] {
  const out: Cover[] = [];
  for (const doc of documents) {
    if (doc.doc_type !== "insurance") continue;
    const d = readDetails("insurance", { details: doc.details });
    if (d?.kind !== "insurance") continue;
    const c = coverStatus(d, now);
    if (c.status === "expired") continue;
    out.push({ documentId: String(doc.id), insurer: d.insurer, plan: d.plan, sumInsured: d.sumInsured, remaining: coverUsed(d).remaining, end: d.end, status: c.status, daysLeft: c.daysLeft });
  }
  return out;
}

export function careTeamFrom(documents: Row[]): CareContact[] {
  const tally = new Map<string, CareContact>();
  const add = (raw: unknown, kind: CareContact["kind"], date: string | null) => {
    const name = str(raw);
    if (!name) return;
    const key = `${kind}:${name.toLowerCase()}`;
    const c = tally.get(key) ?? { name, kind, visits: 0, last: null };
    c.visits += 1;
    if (date && (!c.last || date > c.last)) c.last = date;
    tally.set(key, c);
  };
  for (const doc of documents) {
    // The app's own invoices name the same doctor as the visit; counting both
    // would double every consultation.
    if (doc.doc_type === "booking_invoice") continue;
    add(doc.doctor, "doctor", str(doc.event_date));
    add(doc.facility, "place", str(doc.event_date));
  }
  return [...tally.values()].sort((a, b) => b.visits - a.visits || byDateDesc(a.last, b.last)).slice(0, 8);
}

export function buildHealthFile(bundle: Bundle, now: Date = new Date()): HealthFile {
  const documents = (bundle.documents ?? []).filter((d) => DOC_TYPES.has(d.doc_type as string));
  const entities = bundle.entities ?? [];

  const counts = new Map<DocType, number>();
  let needsReview = 0;
  let first: string | null = null;
  let last: string | null = null;
  for (const d of documents) {
    const type = d.doc_type as DocType;
    counts.set(type, (counts.get(type) ?? 0) + 1);
    if (d.status === "needs_review") needsReview += 1;
    const date = str(d.event_date);
    if (date && (!last || date > last)) last = date;
    if (date && (!first || date < first)) first = date;
  }

  const tracked = trackValues(entities);
  const vaccines: FileVaccine[] = entities
    .filter((e) => e.kind === "vaccine")
    .sort((a, b) => byDateDesc(str(a.event_date), str(b.event_date)))
    .map((e) => ({ name: str(e.name) ?? "Vaccine", label: str(e.value_text) ?? (num(e.value) ? `Dose ${num(e.value)}` : "Dose"), date: str(e.event_date), documentId: str(e.document_id) }));

  const recent: RecentRecord[] = [...documents]
    .sort((a, b) => byDateDesc(str(a.event_date), str(b.event_date)) || byDateDesc(str(a.created_at), str(b.created_at)))
    .slice(0, 6)
    .map((d) => {
      const type = d.doc_type as DocType;
      return {
        id: String(d.id),
        docType: type,
        title: str(d.title) ?? DOC_TYPE_LABEL[type],
        eventDate: str(d.event_date),
        status: (d.status as DocStatus) ?? "filed",
        summary: summaryLine(readDetails(type, { details: d.details }), now),
      };
    });

  return {
    person: person(bundle.profile, now),
    totals: { records: documents.length, needsReview, valuesTracked: tracked.length, firstEvent: first, lastEvent: last },
    byType: [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    tracked,
    flagged: tracked.filter((t) => t.latest.flag === "high" || t.latest.flag === "low" || t.latest.flag === "caution"),
    medicines: mergeMedicines(entities, bundle.profile?.medications),
    vaccines,
    upcoming: upcomingFrom(documents, now),
    cover: coverFrom(documents, now),
    careTeam: careTeamFrom(documents),
    recent,
  };
}

/** "In 3 days", "Tomorrow", "Today", "5 days ago". */
export function whenLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${-days} days ago`;
  if (days < 14) return `In ${days} days`;
  if (days < 60) return `In ${Math.round(days / 7)} weeks`;
  return shortDate(new Date(Date.now() + days * 86_400_000).toISOString());
}

/**
 * A plain-text summary to hand a doctor or a relative: who, allergies,
 * conditions, medicines, flagged values with their dates and ranges. Words
 * from the file only; nothing interpreted.
 */
export function shareText(f: HealthFile): string {
  const p = f.person;
  const lines = [
    `${p.name}${p.age !== null ? `, ${p.age}` : ""}${p.sex ? `, ${p.sex}` : ""}`,
    p.bloodGroup ? `Blood group: ${p.bloodGroup}` : null,
    `Allergies: ${p.allergies.length ? p.allergies.join(", ") : "none recorded"}`,
    p.conditions.length ? `Conditions: ${p.conditions.join(", ")}` : null,
    f.medicines.length ? `\nMedicines:\n${f.medicines.map((m) => `- ${m.name}${m.detail ? ` (${m.detail})` : ""}`).join("\n")}` : null,
    f.flagged.length
      ? `\nOutside the lab's range:\n${f.flagged.map((t) => `- ${t.name} ${t.latest.value}${t.unit ? ` ${t.unit}` : ""}${t.refRange ? ` (range ${t.refRange})` : ""}${t.latest.date ? `, ${shortDate(t.latest.date)}` : ""}`).join("\n")}`
      : null,
    `\nFrom the health file in Cheeku. Values are as the labs printed them.`,
  ];
  return lines.filter(Boolean).join("\n");
}
