import { activityById } from "@/lib/fitness/catalog";
import { fitFor, NEED_PHRASE } from "@/lib/fitness/match";
import { detect, type SafetyResult } from "@/lib/safety/detect";

import { daysBetween } from "./clock";
import { buildContext, type MemoryBundle, type MemoryContext } from "./context";
import { findCorrections, parseFacts, type ParsedFact, type Revision } from "./facts";
import { bookingIntent, withoutTestNames, type BookingIntent } from "./intent";
import { decideTier, hardStopFor, type TierDecision } from "./ladder";
import type { LedgerFlag } from "./ledger";
import { relevantLoops, type LoopView } from "./loops";
import { digest, type ChatModel, type ModelReply } from "./model";
import { serviceById } from "@/lib/services/catalog";

import { BOOKING_REPLY } from "./thread";
import { buildScript, type Script } from "./script";
import { describeChange, notableChanges, type Series } from "./series";
import { matchSymptoms } from "./symptoms";
import { analyteKey, readThreshold, type ThresholdRead } from "./thresholds";
import { TIER_RANK, type Fact, type Tier, type TierReason } from "./types";
import { coverReply, isCoverQuestion } from "@/lib/insurance/explain";

/*
 * ONE TURN, END TO END. The spec's minimum viable loop:
 *
 *   text in
 *     -> safety lexicon and clock-aware hard-stops (no model if either fires)
 *     -> pull out any readings said in the message, and any corrections
 *     -> rebuild the memory with them: series, thresholds, ledger, loops
 *     -> match symptoms against general models, for this person's clock
 *     -> the rules set a tier floor
 *     -> the model writes the answer, and may raise the tier
 *     -> contact-today or above: the clinician script
 *
 * Pure apart from the model call, so a whole conversation can be replayed in
 * a test. Nothing here writes to the database; `lib/memory/chat.ts` persists
 * the plan this returns.
 */

export type ReadingChip = {
  key: string;
  label: string;
  value: string;
  date: string;
  change: string | null;
  tier: Tier | null;
  source: "record" | "chat" | "device";
  documentId: string | null;
};

export type TurnPlan = {
  status: "answered" | "hard_stop" | "escalate";
  gate: SafetyResult;
  decision: TierDecision;
  /** Readings said in this message, still to be saved. */
  facts: Fact[];
  revisions: Revision[];
  contradictions: MemoryContext["contradictions"];
  reading: ReadingChip[];
  reply: ModelReply | null;
  script: Script | null;
  loops: (LoopView & { because: string })[];
  /** Ledger flags this question is about; these count towards the tier. */
  flags: LedgerFlag[];
  /** Serious ledger flags shown on any answer until sorted, without setting its tier. */
  alerts: LedgerFlag[];
  /** Cross-member and dating notes that bear on this question. */
  notes: string[];
  usedFactIds: string[];
  modelId: string | null;
  /** Something they asked to book, read against their memory. */
  booking: BookingIntent | null;
  context: MemoryContext;
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

function mentionedKeys(text: string, series: Map<string, Series>): string[] {
  const q = text.toLowerCase();
  const out: string[] = [];
  for (const s of series.values()) {
    const words = [s.name.toLowerCase(), s.key.replace(/_/g, " ")];
    if (words.some((w) => w.length > 2 && q.includes(w))) out.push(s.key);
  }
  // Common words for a measurement that is not printed that way.
  for (const word of q.split(/[^a-z0-9]+/)) {
    const k = analyteKey(word);
    if (series.has(k) && !out.includes(k)) out.push(k);
  }
  if (/\bbp\b|blood pressure|pressure/.test(q)) out.push("bp_systolic", "bp_diastolic");
  if (/\bsugar\b|glucose/.test(q)) out.push("glucose_fasting", "hba1c");
  if (/\bweight|weigh/.test(q)) out.push("weight");
  return [...new Set(out)];
}

function chips(keys: readonly string[], ctx: MemoryContext, reads: readonly ThresholdRead[]): ReadingChip[] {
  const out: ReadingChip[] = [];
  for (const key of keys) {
    const s = ctx.series.get(key);
    if (!s || key === "bp_diastolic") continue;
    const dia = key === "bp_systolic" ? ctx.series.get("bp_diastolic") : null;
    const unit = s.unit ? ` ${s.unit}` : "";
    out.push({
      key,
      label: key === "bp_systolic" ? "Blood pressure" : s.name,
      value: dia && dia.latest.date === s.latest.date ? `${fmt(s.latest.value)}/${fmt(dia.latest.value)} mmHg` : `${fmt(s.latest.value)}${unit}`,
      date: s.latest.date,
      change: describeChange(s),
      tier: reads.find((r) => r.threshold.analyte === key)?.tier ?? null,
      source: s.latest.source,
      documentId: s.latest.documentId,
    });
  }
  return out.slice(0, 4);
}

export async function planTurn(args: {
  text: string;
  bundle: MemoryBundle;
  today: string;
  history: { role: "user" | "assistant"; content: string }[];
  /** For each earlier assistant message, the fact ids it leaned on. */
  usage: { messageId: string; factIds: string[] }[];
  model: ChatModel;
  newId: () => string;
}): Promise<TurnPlan> {
  const text = args.text.trim();
  const gate = detect(text);
  const base = buildContext(args.bundle, args.today);

  const stopSymptoms = matchSymptoms(text, base.clock);
  let stopNotes: string[] = [];
  const stopPlan = (status: TurnPlan["status"], decision: TierDecision): TurnPlan => ({
    status,
    gate,
    decision,
    facts: [],
    revisions: [],
    contradictions: [],
    reading: [],
    reply: null,
    script:
      status === "hard_stop"
        ? buildScript({
            subject: base.subject,
            clock: base.clock,
            question: text,
            symptoms: stopSymptoms,
            series: stopSymptoms
              .flatMap((s) => s.model.analytes)
              .map((k) => base.series.get(k))
              .filter((s): s is Series => Boolean(s)),
            ledger: base.ledger,
            loops: [],
            // Only what bears on the emergency: the blood group for a yellow newborn.
            notes: stopNotes,
            doctor: base.doctor,
          })
        : null,
    loops: [],
    flags: [],
    alerts: [],
    notes: [],
    usedFactIds: [],
    modelId: null,
    booking: null,
    context: base,
  });

  if (gate.status === "escalate") {
    return stopPlan("escalate", decideTier({ gate, hardStop: null, symptoms: [], reads: [], changes: [], flags: [], clock: base.clock }));
  }
  const stop = hardStopFor(text, base.clock);
  if (stop?.id.includes("jaundice")) stopNotes = base.notes.filter((n) => n.kind === "blood_group").map((n) => n.text);
  if (stop) return stopPlan("hard_stop", decideTier({ gate, hardStop: stop, symptoms: [], reads: [], changes: [], flags: [], clock: base.clock }));

  // Readings in the message, and whether they correct earlier ones.
  const parsed: ParsedFact[] = parseFacts(text, args.today, base.clock, base.subject.dob);
  const revisions = findCorrections(text, parsed, base.facts, args.usage, args.today);
  const facts: Fact[] = parsed.map((p) => ({ ...p, id: args.newId(), messageId: null, documentId: null, supersededBy: null }));
  const ctx = buildContext(args.bundle, args.today, facts, revisions.map((r) => r.supersedes));

  // Asked to book something? Test names in a booking are not symptoms:
  // "book the bilirubin test" says nothing about how the baby looks.
  const booking = bookingIntent(text, ctx);
  const symptoms = matchSymptoms(booking?.service === "lab" ? withoutTestNames(text) : text, ctx.clock);
  // A symptom only pulls in readings recent enough to bear on it: last
  // month's temperature says nothing about tonight's fever.
  const recent = (key: string, days: number) => {
    const s = ctx.series.get(key);
    return Boolean(s && daysBetween(s.latest.date, args.today) <= days);
  };
  const symptomKeys = symptoms.flatMap((s) => s.model.analytes.filter((k) => recent(k, s.model.windowDays)));
  const keys = [...new Set([...parsed.map((p) => p.key), ...mentionedKeys(text, ctx.series), ...symptomKeys])].filter((k) => ctx.series.has(k));
  const missingReadings = symptoms.filter((s) => s.model.askForReading && !s.model.analytes.some((k) => recent(k, s.model.windowDays))).map((s) => s.model.askForReading as string);

  // Each value is read against the clock ON THE DAY IT WAS TAKEN.
  const reads: ThresholdRead[] = [];
  for (const key of keys) {
    const s = ctx.series.get(key);
    if (!s) continue;
    const r = readThreshold(key, s.latest.value, ctx.clockAt(s.latest.date), s.latest.refRange);
    if (r) reads.push(r);
  }
  const changes = notableChanges(ctx.series, ctx.clock.stage, ctx.clock.ageDays).filter((c) => keys.includes(c.key));

  // A value the lab itself flagged, tied to what they describe, with no
  // clock-specific limit to say more: worth raising, not alarming.
  const labFlags: TierReason[] = [];
  for (const key of symptomKeys) {
    const s = ctx.series.get(key);
    if (!s || reads.some((r) => r.threshold.analyte === key)) continue;
    if (s.latest.flag === "high" || s.latest.flag === "low") {
      labFlags.push({ tier: "monitor", source: "threshold", text: `${s.name} ${fmt(s.latest.value)}${s.unit ? ` ${s.unit}` : ""} is ${s.latest.flag === "high" ? "above" : "below"} the range the lab printed${s.latest.refRange ? ` (${s.latest.refRange})` : ""}.` });
    }
  }

  const lower = text.toLowerCase();
  const asksAboutMeds = /medicine|tablet|syrup|drops|cream|supplement|taking|dose|vitamin|give (him|her|them)/i.test(text);
  const current = ctx.ledger.filter((e) => e.status !== "ended");
  const loops = relevantLoops(
    ctx.loops,
    text,
    // A routine monitoring test (a lipid profile for a statin) only comes up
    // when medicines are the question. An ingredient that makes a pending
    // result a safety matter (aspartame and the newborn screen) always does.
    asksAboutMeds ? current.flatMap((e) => e.ingredients.map((i) => i.key.replace(/_/g, " "))) : [],
    current.flatMap((e) => e.excipients.map((x) => x.toLowerCase())),
  );
  const namesEntry = (f: LedgerFlag) => ctx.ledger.some((e) => f.entries.includes(e.key) && lower.includes((e.name.toLowerCase().split(" ")[0] ?? "~").slice(0, 12)));
  const flags = ctx.flags.filter((f) => asksAboutMeds || namesEntry(f));
  const alerts = ctx.flags.filter((f) => !flags.includes(f) && TIER_RANK[f.tier] >= TIER_RANK.contact_today);

  const aboutJaundice = keys.includes("bilirubin_total") || symptoms.some((s) => s.model.id === "jaundice");
  const aboutDates = /\b(week|weeks|due|edd|lmp|scan|dating|trimester|leave|travel|fly)\b/i.test(text) || reads.some((r) => r.threshold.modifiers.some((m) => m.startsWith("trimester") || m === "pregnant"));
  const notes = ctx.notes.filter((n) => (n.kind === "blood_group" && aboutJaundice) || (n.kind === "dating" && aboutDates)).map((n) => n.text);

  const logged = parsed
    .filter((p) => p.key !== "bp_diastolic")
    .map((p) => (p.key === "bp_systolic" && p.valueText ? `Blood pressure ${p.valueText} mmHg` : `${p.label} ${fmt(p.value ?? 0)}${p.unit ? ` ${p.unit}` : ""}`) + (p.observedOn === args.today ? ", today" : `, on ${p.observedOn}`));

  const floor = decideTier({ gate, hardStop: null, symptoms, reads, changes, flags, clock: ctx.clock, extra: labFlags });

  /*
   * A booking. With nothing worrying described alongside it ("book test
   * again"), the rules answer and no model is called: there is nothing to
   * interpret, only something to arrange. With a symptom alongside it ("book
   * a doctor, Imaad has a fever"), the model answers the symptom as usual and
   * the booking card rides under the answer.
   */
  const bookingOnly = booking !== null && parsed.length === 0 && symptoms.length === 0;
  /*
   * An insurance question with nothing medical in it ("is room rent
   * capped?") is answered from their own saved policy by rules, like a
   * booking: the answer is in a field or it isn't, and a model would only add
   * room to guess. With a symptom alongside, the model answers and sees the
   * cover in the digest.
   */
  const coverOnly = !bookingOnly && booking === null && parsed.length === 0 && symptoms.length === 0 && isCoverQuestion(text);
  const reply = bookingOnly ? bookingReply(booking, ctx) : coverOnly ? coverModelReply(text, ctx) : await args.model.respond({
    question: text,
    history: args.history.slice(-12),
    memory: digest(ctx, {
      readings: keys,
      reads,
      symptoms,
      loops,
      notes,
      alerts: [...flags, ...alerts].map((f) => ({ title: f.title, text: f.text, tier: f.tier })),
      logged,
      changes: [...changes.map((c) => c.text), ...labFlags.map((r) => r.text)],
      askForReadings: missingReadings,
    }),
    floor: { tier: floor.tier, reasons: floor.reasons.map((r) => r.text) },
  });
  const decision = decideTier({ gate, hardStop: null, symptoms, reads, changes, flags, clock: ctx.clock, modelTier: reply.tier ?? null, extra: labFlags });

  const script =
    decision.tier && TIER_RANK[decision.tier] >= TIER_RANK.contact_today
      ? buildScript({
          subject: ctx.subject,
          clock: ctx.clock,
          question: text,
          symptoms,
          series: keys.filter((k) => k !== "bp_diastolic").map((k) => ctx.series.get(k)).filter((s): s is Series => Boolean(s)),
          ledger: ctx.ledger,
          loops,
          notes,
          doctor: ctx.doctor,
        })
      : null;

  const usedFactIds = [...new Set(keys.flatMap((k) => ctx.series.get(k)?.points.map((p) => p.factId).filter((x): x is string => Boolean(x)) ?? []))];

  return {
    status: "answered",
    gate,
    decision,
    facts,
    revisions,
    contradictions: ctx.contradictions.filter((c) => keys.includes(c.key)),
    reading: chips(keys, ctx, reads),
    reply,
    script,
    loops,
    flags,
    alerts,
    notes,
    usedFactIds,
    modelId: bookingOnly ? BOOKING_REPLY : args.model.id,
    booking,
    context: ctx,
  };
}



/** What Cheeku says when asked to book something. Rules, in plain words. */
export function coverModelReply(text: string, ctx: MemoryContext): ModelReply {
  const r = coverReply(text, ctx.subject.firstName, ctx.cover);
  return { paragraphs: r.paragraphs, citations: [], followUps: r.followUps, basis: ctx.cover.length ? "grounded" : "silent" };
}

export function bookingReply(b: BookingIntent, ctx: MemoryContext): ModelReply {
  const name = ctx.subject.firstName;
  if (b.service === "fitness") {
    return { paragraphs: fitnessReply(b, ctx), citations: [], followUps: [], basis: "grounded" };
  }
  if (b.service === "medicine") {
    return {
      paragraphs: [`Let's get ${name}'s medicines ordered. Pick a prescription from ${name}'s records or refill what they already take, and it comes to the door. The order stays in ${name}'s memory.`],
      citations: [],
      followUps: [],
      basis: "grounded",
    };
  }
  if (b.service === "care") {
    const svc = serviceById(b.careId);
    if (svc?.id === "ambulance") {
      return {
        paragraphs: ["If this is an emergency, call 108 now. Don't wait on a booking.", `For a planned hospital transfer or a ride home after discharge, book it below and I'll keep it in ${name}'s memory.`],
        citations: [],
        followUps: [],
        basis: "grounded",
      };
    }
    return {
      paragraphs: [`Let's book ${svc ? svc.title.toLowerCase() : "that"} for ${name}. Pick what you need, when, and where, and it goes into ${name}'s memory once it's booked.`],
      citations: [],
      followUps: [],
      basis: "grounded",
    };
  }
  if (b.service === "doctor") {
    return {
      paragraphs: [
        `Let's get ${name} in front of the right doctor.`,
        `I'll ask a few quick questions and write them up as a note the doctor reads before you meet, with ${name}'s recent readings and medicines from memory. No repeating yourself.`,
      ],
      citations: [],
      followUps: [],
      basis: "grounded",
    };
  }
  if (!b.tests.length) {
    return {
      paragraphs: [
        b.again
          ? `I couldn't tell which test you mean from ${name}'s memory. Pick it below, or tell me its name (HbA1c, thyroid, vitamin D) and I'll set it up.`
          : `Happy to book a test for ${name}. Pick it below, or tell me which one and I'll set it up.`,
      ],
      citations: [],
      followUps: ["Book HbA1c", "Book a thyroid test", "Book a full body checkup"],
      basis: "grounded",
    };
  }
  const names = b.tests.map((t) => t.label);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
  const why = b.tests.filter((t) => t.because);
  return {
    paragraphs: [
      `${b.again ? "Booking" : "Let's book"} ${list} for ${name}${b.again ? " again" : ""}. Home collection, and the result comes straight back into ${name}'s memory.`,
      ...(why.length ? [`Why now, from ${name}'s memory:\n${why.map((t) => `• ${t.label}: ${t.because}`).join("\n")}`] : []),
      `When it's back I'll put it next to the last one and tell you what moved.`,
    ],
    citations: [],
    followUps: [],
    basis: "grounded",
  };
}


/**
 * Fitness, in Cheeku's words: what suits this person from their own profile,
 * the activity they named if it fits, a gentler steer if it doesn't, and the
 * doctor line where it belongs. The card under it shows real classes nearby.
 */
export function fitnessReply(b: BookingIntent, ctx: MemoryContext): string[] {
  const name = ctx.subject.firstName;
  const fit = fitFor({ conditions: ctx.subject.conditions, goal: null, ageYears: ctx.clock.ageYears, pregnant: ctx.clock.modifiers.includes("pregnant"), bmi: null, sex: ctx.subject.sex });
  const named = activityById(b.activity);
  const lead = fit.needs[0];
  const top = fit.ranked.slice(0, 3).map((a) => activityById(a)?.label.toLowerCase()).filter(Boolean);
  const out: string[] = [];
  if (named && !fit.ranked.includes(named.id)) {
    out.push(`${named.label} is a hard one for ${lead ? NEED_PHRASE[lead] : name}, so I've put gentler classes near ${name} first: ${top.join(", ")}.`);
  } else if (named) {
    out.push(`Here are ${named.label.toLowerCase()} classes near ${name}${lead ? `, picked with ${NEED_PHRASE[lead]} in mind` : ""}.`);
  } else if (lead) {
    out.push(`For ${NEED_PHRASE[lead]}, ${top.join(", ")} suit ${name} best. Here are classes nearby.`);
  } else {
    out.push(`Here are classes near ${name}: one session at a time, no membership.`);
  }
  if (fit.doctorNote) out.push(`Check with ${name}'s doctor before starting, and tell the trainer on the day.`);
  out.push(`Tap one to book. It's filed in ${name}'s memory, with a reminder an hour before.`);
  return out;
}
