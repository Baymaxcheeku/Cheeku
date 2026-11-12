import { shortDate } from "@/lib/records/details";

import type { MemoryContext } from "./context";
import type { LoopView } from "./loops";
import { loopWhen } from "./loops";
import { ageWords, type SymptomMatch } from "./symptoms";
import type { ThresholdRead } from "./thresholds";
import type { Tier } from "./types";
import { coverDigest } from "@/lib/insurance/explain";
import type { WorldDigest } from "@/lib/chat/world";

export type { WorldDigest };

/*
 * THE MODEL CONTRACT.
 *
 * Cheeku's own fine-tuned model plugs in here. Everything around it, the
 * memory, the clock, the thresholds, the ladder, the script, is built and
 * tested without it, so swapping the model changes the wording and nothing
 * about safety.
 *
 * WHAT THE MODEL GETS: the question, the recent thread, and a MemoryDigest, a
 * plain serialisable summary of this one person (never another member's file).
 * It also gets the FLOOR: the tier the rules already reached and why.
 *
 * WHAT IT RETURNS: paragraphs, the records it leaned on, follow-up chips, and
 * optionally its own tier. The pipeline takes the higher of the model's tier
 * and the floor. The model can make an answer more cautious, never less.
 *
 * WHAT IT NEVER SEES: a hard-stop or an emergency. Those are answered by rules
 * before any model is called.
 */

export type DigestReading = {
  key: string;
  name: string;
  unit: string | null;
  latest: { date: string; value: number; source: string };
  previous: { date: string; value: number } | null;
  change: string | null;
  read: string | null;
  tier: Tier | null;
  refRange: string | null;
  flag: string | null;
  /** True for the readings this question is about. */
  focus: boolean;
};

export type MemoryDigest = {
  person: {
    firstName: string;
    clock: string;
    /** "22 days old", "4 months old", "36": how old, in words. */
    age: string;
    /** Due date by the dating that won, when pregnant. */
    edd: string | null;
    stage: string;
    modifiers: string[];
    ageYears: number | null;
    bloodGroup: string | null;
    conditions: string[];
    allergies: string[];
  };
  notes: string[];
  readings: DigestReading[];
  medicines: { name: string; status: string; ingredients: string[]; regulatoryClass: string; prescribedBy: string | null }[];
  flags: { title: string; text: string; tier: Tier }[];
  loops: { title: string; when: string; type: string; because?: string }[];
  records: { id: string; title: string; type: string; date: string | null; facility: string | null; doctor: string | null; values: { name: string; value: string; range: string | null; flag: string | null }[] }[];
  symptoms: { id: string; label: string; mechanism: string; homeCare: string[]; watchFor: string[]; tier: Tier }[];
  /** Readings said in this very message, already saved. */
  logged: string[];
  /** Changes and lab flags the rules found worth saying, in plain words. */
  changes: string[];
  /** What to measure next, for a symptom with no recent reading on file. */
  askForReadings: string[];
  stats: { records: number; messages: number; since: string | null };
  /**
   * The person's insurance, as plain lines from what they saved (migration
   * 0043). For explaining their own cover back to them; anything not here is
   * unknown, and the model must say so rather than guess.
   */
  cover: { insurer: string; lines: string[] }[];
  /**
   * Everything around the person (lib/chat/world.ts): the longevity areas,
   * today's goal and logs, bookings coming up and just done, the watch's
   * lines, and, when asked from the account holder's chat, a family round-up.
   * Optional: absent on older callers and in tests.
   */
  world?: WorldDigest;
};

/*
 * THINGS THE CHAT CAN DO, NOT ONLY SAY. The model proposes; the app shows each
 * as a button and does nothing until the person taps it. Logging steps or
 * sleep said in the message is the one exception, done by rules before the
 * model is asked, and listed in `memory.logged`.
 */
export type ChatAction =
  /** Make this the person's goal: tomorrow's plan leans on it (lib/home/goals). */
  | { type: "set_goal"; goal: "sleep" | "weight" | "sugar" | "legs" | "calm"; label: string }
  /** Open a screen in the app. Only routes on the allow-list in lib/chat/actions.ts. */
  | { type: "open"; route: string; label: string };

export type ModelRequest = {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  memory: MemoryDigest;
  floor: { tier: Tier | null; reasons: string[] };
};

export type ModelReply = {
  paragraphs: string[];
  tier?: Tier | null;
  citations: { documentId: string; label: string }[];
  followUps: string[];
  /** "grounded": from their records; "general": general health knowledge; "silent": nothing to go on. */
  basis: "grounded" | "general" | "silent";
  /** Offer to connect them with a doctor nearby or online, under the answer. */
  careOffer?: boolean;
  /** Buttons under the answer (see ChatAction). At most three are shown. */
  actions?: ChatAction[];
};

export interface ChatModel {
  /** Stored on every reply, so a transcript says which model wrote it. */
  readonly id: string;
  respond(req: ModelRequest): Promise<ModelReply>;
}

/** The person's memory as the model sees it. */
export function digest(
  c: MemoryContext,
  focus: {
    readings: string[];
    reads: ThresholdRead[];
    symptoms: SymptomMatch[];
    loops: (LoopView & { because?: string })[];
    notes: string[];
    alerts: { title: string; text: string; tier: Tier }[];
    logged?: string[];
    changes?: string[];
    askForReadings?: string[];
  },
): MemoryDigest {
  const readFor = (key: string) => focus.reads.find((r) => r.threshold.analyte === key) ?? null;
  const wanted = new Set(focus.readings);
  const readings = [...c.series.values()]
    .sort((a, b) => Number(wanted.has(b.key)) - Number(wanted.has(a.key)) || b.latest.date.localeCompare(a.latest.date))
    .slice(0, 14)
    .map((s) => {
      const r = readFor(s.key);
      return {
        key: s.key,
        name: s.name,
        unit: s.unit,
        latest: { date: s.latest.date, value: s.latest.value, source: s.latest.source },
        previous: s.previous ? { date: s.previous.date, value: s.previous.value } : null,
        change: s.previous ? `${s.previous.value} on ${shortDate(s.previous.date)} to ${s.latest.value} on ${shortDate(s.latest.date)}` : null,
        read: r?.text ?? null,
        tier: r?.tier ?? null,
        refRange: s.latest.refRange,
        flag: s.latest.flag,
        focus: wanted.has(s.key),
      };
    });

  const records = [...c.documents]
    .sort((a, b) => String(b.event_date ?? "").localeCompare(String(a.event_date ?? "")))
    .slice(0, 20)
    .map((d) => ({
      id: String(d.id),
      title: String(d.title ?? d.doc_type),
      type: String(d.doc_type),
      date: (d.event_date as string | null) ?? null,
      facility: (d.facility as string | null) ?? null,
      doctor: (d.doctor as string | null) ?? null,
      values: c.entities
        .filter((e) => e.document_id === d.id && (e.kind === "lab_value" || e.kind === "vital"))
        .map((e) => ({ name: String(e.name), value: `${e.value ?? e.value_text ?? ""}${e.unit ? ` ${String(e.unit)}` : ""}`, range: (e.ref_range as string | null) ?? null, flag: (e.flag as string | null) ?? null })),
    }));

  return {
    person: {
      firstName: c.subject.firstName,
      clock: c.clock.label,
      age: ageWords(c.clock),
      edd: c.clock.relative?.kind === "gestational" ? c.clock.relative.edd : null,
      stage: c.clock.stage,
      modifiers: c.clock.modifiers,
      ageYears: c.clock.ageYears,
      bloodGroup: c.subject.bloodGroup,
      conditions: c.subject.conditions,
      allergies: c.subject.allergies,
    },
    notes: focus.notes,
    readings,
    medicines: c.ledger.map((e) => ({ name: e.name, status: e.status, ingredients: e.ingredients.map((i) => i.name), regulatoryClass: e.regulatoryClass, prescribedBy: e.prescribedBy })),
    flags: focus.alerts,
    // Every open loop, the ones that bear on this question first, with why.
    loops: [...focus.loops, ...c.loops.filter((l) => !focus.loops.some((f) => f.key === l.key))]
      .slice(0, 6)
      .map((l) => ({ title: l.title, when: loopWhen(l), type: l.type, because: "because" in l && typeof l.because === "string" ? l.because : undefined })),
    records,
    symptoms: focus.symptoms.map((s) => ({ id: s.model.id, label: s.model.label, mechanism: s.mechanism, homeCare: s.homeCare, watchFor: s.watchFor, tier: s.tier })),
    logged: focus.logged ?? [],
    changes: focus.changes ?? [],
    askForReadings: focus.askForReadings ?? [],
    stats: { records: c.stats.records, messages: c.stats.messages, since: c.stats.since ? shortDate(c.stats.since) : null },
    cover: coverDigest(c.cover, () => [c.subject.firstName]),
  };
}
