import { readDetails, shortDate } from "@/lib/records/details";
import type { DocType } from "@/lib/records/types";

import { formatGa, resolveClock, type ResolvedClock } from "./clock";
import { contradictions, type Contradiction } from "./facts";
import { buildLedger, ledgerFlags, type LedgerEntry, type LedgerFlag } from "./ledger";
import { deriveLoops, mergeLoops, openLoops, type LoopView, type StoredLoop } from "./loops";
import { seriesFrom, type Series } from "./series";
import { bloodGroupNote, motherOf, readPregnancy, readSubject } from "./subjects";
import type { Fact, Pregnancy, Subject } from "./types";
import type { Policy } from "@/lib/insurance/policy";

/*
 * ONE PERSON'S MEMORY, ASSEMBLED.
 *
 * `memory_bundle` (migration 0030) returns everything the layer needs for one
 * member in one round trip, refusing anyone outside the caller's family or
 * plan. This turns that bundle into the working state every turn reasons
 * over: the subject, their clock today, every series, the ledger and its
 * flags, the open loops, and the notes that span family members.
 *
 * It is rebuilt after every new fact, so a reading typed into the chat is in
 * the trend, the threshold and the script of the very answer it prompted.
 */

type Row = Record<string, unknown>;

export type MemoryBundle = {
  profile: Row | null;
  relations: Row[];
  pregnancies: Row[];
  documents: Row[];
  entities: Row[];
  facts: Row[];
  loops: Row[];
  stats: { records?: number; messages?: number; conversations?: number; first_message_at?: string | null } | null;
  /** The family's insurance policies that cover this person (migration 0043). Read separately; absent before it. */
  policies?: Policy[];
  /** What photos asked about in chat showed, newest first (lib/chat/photo-store). Read separately. */
  photos?: { date: string; summary: string }[];
};

export type MemoryNote = { kind: "dating" | "blood_group"; text: string };

export type MemoryContext = {
  subject: Subject;
  today: string;
  clock: ResolvedClock;
  pregnancies: Pregnancy[];
  documents: Row[];
  entities: Row[];
  facts: Fact[];
  series: Map<string, Series>;
  ledger: LedgerEntry[];
  flags: LedgerFlag[];
  loops: LoopView[];
  contradictions: Contradiction[];
  /**
   * Cross-member and dating notes, each already in plain words. Raised in an
   * answer only when it bears on the question; always listed on the memory page.
   */
  notes: MemoryNote[];
  doctor: { name: string; phone: string | null } | null;
  stats: { records: number; messages: number; conversations: number; since: string | null };
  /** The clock at any date, for reading a value against the day it was taken. */
  clockAt: (date: string) => ResolvedClock;
  /** Insurance policies covering this person, for explaining their cover back to them. */
  cover: Policy[];
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

export function readFact(r: Row): Fact {
  return {
    id: String(r.id),
    key: String(r.key),
    label: str(r.label) ?? String(r.key),
    value: num(r.value),
    valueText: str(r.value_text ?? r.valueText),
    unit: str(r.unit),
    observedOn: (str(r.observed_on ?? r.observedOn) ?? "").slice(0, 10),
    source: r.source === "device" || r.source === "record" ? r.source : "chat",
    messageId: str(r.message_id ?? r.messageId),
    documentId: str(r.document_id ?? r.documentId),
    supersededBy: str(r.superseded_by ?? r.supersededBy),
  };
}

/** The extraction blob's title and details, lifted onto the row. */
function flatten(d: Row): Row {
  const x = (d.extraction ?? {}) as Row;
  return { ...d, title: d.title ?? x.title ?? null, details: d.details ?? x.details ?? null };
}

function latestDoctor(documents: readonly Row[]): MemoryContext["doctor"] {
  const sorted = [...documents].sort((a, b) => String(b.event_date ?? "").localeCompare(String(a.event_date ?? "")));
  for (const doc of sorted) {
    const d = readDetails(doc.doc_type as DocType, { details: doc.details });
    if (d?.kind === "prescription") return { name: d.doctor.name, phone: d.doctor.phone };
  }
  const named = sorted.find((d) => str(d.doctor));
  return named ? { name: String(named.doctor), phone: null } : null;
}

export function buildContext(bundle: MemoryBundle, today: string, extraFacts: readonly Fact[] = [], supersede: readonly string[] = []): MemoryContext {
  const subject = readSubject(bundle.profile ?? { id: "unknown", name: "Member" }, bundle.relations);
  const pregnancies = bundle.pregnancies.map(readPregnancy);
  const clockAt = (date: string) => resolveClock(subject, date, pregnancies);
  const clock = clockAt(today);
  const documents = bundle.documents.map(flatten);

  const facts = [...bundle.facts.map(readFact), ...extraFacts].map((f) => (supersede.includes(f.id) ? { ...f, supersededBy: "pending" } : f));
  const series = seriesFrom(bundle.entities, facts);
  const docRows = documents.map((d) => ({ id: String(d.id), doc_type: String(d.doc_type), event_date: str(d.event_date), details: d.details, doctor: str(d.doctor), title: str(d.title) }));
  const ledger = buildLedger(docRows, bundle.profile?.medications, today);
  const flags = ledgerFlags(ledger, clock);
  const loops = openLoops(
    mergeLoops(deriveLoops(docRows, bundle.entities, today), bundle.loops.map((l) => l as unknown as StoredLoop)),
    today,
  );

  const notes: MemoryNote[] = [];
  if (clock.relative?.kind === "gestational" && clock.relative.discrepancy) {
    const d = clock.relative.discrepancy;
    notes.push({
      kind: "dating",
      text: `By the LMP this is ${formatGa(d.lmpDays)}; the ${d.scanLabel ?? "scan"} puts it at ${formatGa(d.scanDays)}. I'm going by the scan, which is the usual rule, and it moves the due date to ${shortDate(clock.relative.edd)}.`,
    });
  }
  const mother = motherOf(subject);
  const abo = bloodGroupNote(subject, mother?.bloodGroup ?? null);
  if (abo && clock.ageDays !== null && clock.ageDays < 28) notes.push({ kind: "blood_group", text: abo });

  const stats = bundle.stats ?? {};
  return {
    subject,
    today,
    clock,
    pregnancies,
    documents,
    entities: bundle.entities,
    facts,
    series,
    ledger,
    flags,
    loops,
    contradictions: contradictions(series),
    notes,
    doctor: latestDoctor(documents),
    stats: { records: stats.records ?? documents.length, messages: stats.messages ?? 0, conversations: stats.conversations ?? 0, since: stats.first_message_at ?? null },
    clockAt,
    cover: (bundle.policies ?? []).filter((p) => p.coveredProfileIds.includes(subject.id)),
  };
}

/** "Remembers 19 records and 42 messages since March 2025." */
export function memoryLine(c: MemoryContext): string {
  const parts: string[] = [];
  if (c.stats.records) parts.push(`${c.stats.records} record${c.stats.records === 1 ? "" : "s"}`);
  if (c.stats.messages) parts.push(`${c.stats.messages} message${c.stats.messages === 1 ? "" : "s"}`);
  if (!parts.length) return "Nothing to remember yet";
  const since = c.stats.since ? ` since ${new Date(c.stats.since).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : "";
  return `Remembers ${parts.join(" and ")}${since}`;
}
