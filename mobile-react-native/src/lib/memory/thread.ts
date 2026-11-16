import { safeActions } from "@/lib/chat/safe-actions";
import type { ChatAction } from "./model";
import type { ProductAssessment } from "@/lib/ai/mock/scenarios";

import type { BookingIntent } from "./intent";
import { loopWhen } from "./loops";
import type { ReadingChip, TurnPlan } from "./pipeline";
import type { Script } from "./script";
import type { Tier } from "./types";

/*
 * ONE CONTINUOUS THREAD PER PERSON.
 *
 * The reference thread ran for twelve months in one place, and that is what
 * made it useful: last week's bilirubin, last month's prescription and today's
 * question all sat in the same scroll. So the chat is no longer a fresh screen
 * each time. It is one thread per family member, loaded newest-first in pages,
 * with day breaks, and a new "sitting" (conversation row) only when the last
 * message is more than six hours old, so history can still be browsed by
 * sitting.
 *
 * `TurnMemory` is the structured half of an answer, stored on the message
 * (messages.memory) so a reply reads the same a year later: the tier, what was
 * read, the script, the loops it raised, and what it corrected.
 */

/** The model id stored on a reply the booking rules wrote, with no model call. */
export const BOOKING_REPLY = "rules:booking";

export const SITTING_GAP_MS = 6 * 60 * 60 * 1000;

export type TurnMemory = {
  v: 1;
  tier: Tier | null;
  reasons: string[];
  watchFor: string[];
  reading: ReadingChip[];
  script: Script | null;
  loops: { key: string; title: string; when: string; because: string }[];
  alerts: { title: string; text: string; tier: Tier }[];
  revisions: { label: string; before: string; after: string; text: string; affected: number }[];
  contradictions: { label: string; text: string }[];
  notes: string[];
  usedFactIds: string[];
  basis: "grounded" | "general" | "silent" | "rules";
  followUps: string[];
  /** Show "Doctors nearby" and "Online consultation" under the answer. */
  careOffer: boolean;
  hardStop: { title: string; text: string; where: string } | null;
  /** The person's clock when it was said: "Day 6 of life". */
  clock: string;
  /** Something to book, offered right under the answer ("book test again"). */
  booking?: (BookingIntent & { forName: string }) | null;
  /** A booking that was made, written into the thread by the booking flows. */
  event?: BookedEvent | null;
  /** Buttons under the answer: make a goal, open a screen (lib/chat/actions). */
  actions?: ChatAction[];
};

/**
 * A booking made anywhere in the app (the chat's card, the marketplace, the
 * doctor flow), filed in the person's own thread so the memory knows a test
 * is coming or a doctor has the note.
 */
export type BookedEvent = {
  kind: "lab" | "doctor" | "service" | "fitness" | "medicine";
  title: string;
  /** "Tue, 8 Oct · 6-8 am" */
  when: string;
  /** Lab or doctor, and where. */
  where: string;
  /** Where a tap goes: the booking's own page. */
  route: string;
  /** The pre-consultation note's lines, for doctor bookings. */
  note?: string[];
};

export type ThreadMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  tier: Tier | null;
  memory: TurnMemory | null;
  citations: { documentId: string; label: string }[];
  safety: "clear" | "tier2" | "escalated";
  attachment: { kind: "product"; scenarioId: string; title: string; thumbnail: string } | null;
  assessment: ProductAssessment | null;
};

/** The plan's structured half, ready to store. */
export function toTurnMemory(plan: TurnPlan): TurnMemory {
  return {
    v: 1,
    tier: plan.decision.tier,
    reasons: plan.decision.reasons.slice(0, 4).map((r) => r.text),
    watchFor: plan.decision.watchFor,
    reading: plan.reading,
    script: plan.script,
    loops: plan.loops.map((l) => ({ key: l.key, title: l.title, when: loopWhen(l), because: l.because })),
    alerts: [...plan.flags.filter((f) => f.tier !== "reassure"), ...plan.alerts].map((f) => ({ title: f.title, text: f.text, tier: f.tier })),
    revisions: plan.revisions.map((r) => ({ label: r.label, before: r.before, after: r.after, text: r.text, affected: r.affectedMessageIds.length })),
    contradictions: plan.contradictions.map((c) => ({ label: c.label, text: c.text })),
    notes: plan.notes,
    usedFactIds: plan.usedFactIds,
    basis: plan.modelId === BOOKING_REPLY ? "rules" : (plan.reply?.basis ?? "rules"),
    followUps: plan.reply?.followUps ?? [],
    careOffer: Boolean(plan.reply?.careOffer),
    hardStop: plan.decision.hardStop ? { title: plan.decision.hardStop.title, text: plan.decision.hardStop.text, where: plan.decision.hardStop.where } : null,
    clock: plan.context.clock.label,
    booking: plan.booking ? { ...plan.booking, forName: plan.context.subject.firstName } : null,
    actions: safeActions(plan.reply?.actions),
  };
}

/** The stored half of a "Booked" entry: nothing but the event. */
export function eventMemory(event: BookedEvent, clock = ""): TurnMemory {
  return {
    v: 1,
    tier: null,
    reasons: [],
    watchFor: [],
    reading: [],
    script: null,
    loops: [],
    alerts: [],
    revisions: [],
    contradictions: [],
    notes: [],
    usedFactIds: [],
    basis: "rules",
    followUps: [],
    careOffer: false,
    hardStop: null,
    clock,
    booking: null,
    event,
  };
}

/** What the assistant says, as prose: readable without the app. */
export function replyText(plan: TurnPlan): string {
  if (plan.decision.hardStop) return `${plan.decision.hardStop.title}. ${plan.decision.hardStop.text} Go to ${plan.decision.hardStop.where}.`;
  const parts = [...plan.revisions.map((r) => r.text), ...(plan.reply?.paragraphs ?? [])];
  return parts.join("\n\n");
}

type Row = Record<string, unknown>;

const TIERS = new Set(["reassure", "monitor", "contact_today", "go_now"]);

function readMemory(v: unknown): TurnMemory | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<TurnMemory>;
  if (o.v !== 1) return null;
  const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
  return {
    v: 1,
    tier: TIERS.has(o.tier as string) ? (o.tier as Tier) : null,
    reasons: arr(o.reasons),
    watchFor: arr(o.watchFor),
    reading: arr(o.reading),
    script: o.script && typeof o.script === "object" ? (o.script as Script) : null,
    loops: arr(o.loops),
    alerts: arr(o.alerts),
    revisions: arr(o.revisions),
    contradictions: arr(o.contradictions),
    notes: arr(o.notes),
    usedFactIds: arr(o.usedFactIds),
    basis: o.basis ?? "general",
    followUps: arr(o.followUps),
    careOffer: o.careOffer === true,
    hardStop: o.hardStop ?? null,
    clock: typeof o.clock === "string" ? o.clock : "",
    booking: o.booking && typeof o.booking === "object" ? o.booking : null,
    event: o.event && typeof o.event === "object" ? o.event : null,
    actions: safeActions(o.actions),
  };
}

export function readThreadRow(r: Row): ThreadMessage {
  const safety = r.safety_status === "tier2" || r.safety_status === "escalated" ? r.safety_status : "clear";
  const attachment = r.attachment && typeof r.attachment === "object" ? (r.attachment as ThreadMessage["attachment"]) : null;
  return {
    id: String(r.id),
    conversationId: String(r.conversation_id),
    role: r.role === "assistant" ? "assistant" : "user",
    content: typeof r.content === "string" ? r.content : "",
    createdAt: String(r.created_at),
    tier: TIERS.has(r.tier as string) ? (r.tier as Tier) : null,
    memory: readMemory(r.memory),
    citations: Array.isArray(r.citations) ? (r.citations as ThreadMessage["citations"]) : [],
    safety,
    attachment,
    assessment: r.product_assessment && typeof r.product_assessment === "object" ? (r.product_assessment as ProductAssessment) : null,
  };
}

/** Oldest first, user before assistant when they share a timestamp. */
export function inOrder(messages: readonly ThreadMessage[]): ThreadMessage[] {
  const seen = new Set<string>();
  return [...messages]
    .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || (a.role === b.role ? 0 : a.role === "user" ? -1 : 1));
}

export type ThreadItem = { kind: "day"; key: string; label: string } | { kind: "message"; key: string; message: ThreadMessage };

/** Day breaks between messages: "Today", "Yesterday", "Mon, 7 Sep". */
export function withDayBreaks(messages: readonly ThreadMessage[], now: Date = new Date()): ThreadItem[] {
  const out: ThreadItem[] = [];
  let last = "";
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86_400_000).toDateString();
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const day = d.toDateString();
    if (day !== last) {
      const label =
        day === today
          ? "Today"
          : day === yesterday
            ? "Yesterday"
            : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
      out.push({ kind: "day", key: `day-${day}`, label });
      last = day;
    }
    out.push({ kind: "message", key: m.id, message: m });
  }
  return out;
}

/** Continue the open sitting, or start a new one after a long gap. */
export function sittingFor(messages: readonly ThreadMessage[], now: Date = new Date()): string | null {
  const last = messages[messages.length - 1];
  if (!last) return null;
  return now.getTime() - Date.parse(last.createdAt) < SITTING_GAP_MS ? last.conversationId : null;
}

/** Which earlier answers leaned on which facts, for corrections. */
export function factUsage(messages: readonly ThreadMessage[]): { messageId: string; factIds: string[] }[] {
  return messages.filter((m) => m.role === "assistant" && m.memory?.usedFactIds.length).map((m) => ({ messageId: m.id, factIds: m.memory?.usedFactIds ?? [] }));
}
