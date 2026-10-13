/*
 * WHICH HOME A FAMILY SEES.
 *
 * Three stages, and a family only ever moves forward through them:
 *
 *   starter   nothing yet. Home asks for the latest record.
 *   building  something is there (a question, a family member) but nothing
 *             Today can be built from. Home says how close they are.
 *   today     at least one real record. Home becomes the daily plan.
 *
 * The server owns the stage (families.home_stage, migration 0033) and
 * re-checks it only while a family is not on Today, so a family that has
 * unlocked costs nothing to serve. This file mirrors `home_decide` for the
 * one case the server cannot answer: a database where 0033 has not been
 * applied yet. Change one, change the other.
 *
 * CHAT ALONE NEVER UNLOCKS TODAY (product decision 2026-10-13). A chat that
 * saves a medicine or a due test counts, because that is a record. The
 * chat-volume rule exists in config, switched off.
 */

export type HomeStage = "starter" | "building" | "today";

export const STAGES: readonly HomeStage[] = ["starter", "building", "today"];

/** The kinds of real data that unlock Today, in the order "via" reports them. */
export const UNLOCK_KINDS = ["report", "prescription", "medicines", "due", "lab"] as const;
export type UnlockKind = (typeof UNLOCK_KINDS)[number];
export type UnlockedVia = UnlockKind | "chat" | "backfill";

export type HomeSignals = Partial<Record<UnlockKind | "family" | "asked", boolean>> & {
  chats?: number | null;
  chat_days?: number | null;
  facts?: number | null;
};

export type HomeRules = {
  unlock_items: number;
  chat_unlock?: { enabled: boolean; chats: number; days: number; facts: number };
};

export const DEFAULT_RULES: HomeRules = { unlock_items: 1, chat_unlock: { enabled: false, chats: 5, days: 2, facts: 3 } };

export type Decision = { stage: HomeStage; via: UnlockedVia | null; items: number };

export function decideStage(signals: HomeSignals, rules: HomeRules = DEFAULT_RULES): Decision {
  const need = Math.max(1, rules.unlock_items || 1);
  let items = 0;
  let via: UnlockedVia | null = null;
  for (const k of UNLOCK_KINDS) {
    if (signals[k]) {
      items += 1;
      via = via ?? k;
    }
  }
  if (items >= need) return { stage: "today", via, items };

  const chat = rules.chat_unlock;
  if (chat?.enabled && (signals.chats ?? 0) >= chat.chats && (signals.chat_days ?? 0) >= chat.days && (signals.facts ?? 0) >= chat.facts) {
    return { stage: "today", via: "chat", items };
  }

  if (items > 0 || signals.asked || signals.family) return { stage: "building", via: null, items };
  return { stage: "starter", via: null, items: 0 };
}

export const rank = (s: HomeStage) => STAGES.indexOf(s);

/** The ratchet: a stage never goes back, whatever the evidence says now. */
export function forward(current: HomeStage | null | undefined, next: HomeStage): HomeStage {
  if (!current) return next;
  return rank(next) > rank(current) ? next : current;
}

// ------------------------------------------------------------ the payload --

export type DueItem = {
  id: string;
  source: "loop" | "lab" | "memory";
  type: string;
  profileId: string;
  title: string;
  detail: string | null;
  dueBy: string;
};

export type HomeState = {
  stage: HomeStage;
  stageAt: string | null;
  via: UnlockedVia | null;
  signals: HomeSignals;
  unlockItems: number;
  today: string | null;
  due: DueItem[];
  doneDays: string[];
  /** False when the server could not answer and the app decided for itself. */
  fromServer: boolean;
};

const isStage = (v: unknown): v is HomeStage => typeof v === "string" && (STAGES as readonly string[]).includes(v);
const s = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/** Reads `home_state()` defensively: a malformed row lands on starter, never on a crash. */
export function readHomeState(raw: unknown): HomeState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const due = Array.isArray(r.due) ? r.due : [];
  return {
    stage: isStage(r.stage) ? r.stage : "starter",
    stageAt: s(r.stage_at),
    via: (s(r.unlocked_via) as UnlockedVia | null) ?? null,
    signals: (r.signals && typeof r.signals === "object" ? r.signals : {}) as HomeSignals,
    unlockItems: typeof r.unlock_items === "number" ? r.unlock_items : 1,
    today: s(r.today),
    due: due
      .map((d) => d as Record<string, unknown>)
      .filter((d) => s(d.id) && s(d.title) && s(d.due_by) && s(d.profile_id))
      .map((d) => ({
        id: String(d.id),
        source: d.source === "lab" ? "lab" : "loop",
        type: String(d.type ?? "reminder"),
        profileId: String(d.profile_id),
        title: String(d.title),
        detail: s(d.detail),
        dueBy: String(d.due_by).slice(0, 10),
      })),
    doneDays: Array.isArray(r.done_days) ? r.done_days.filter((d): d is string => typeof d === "string").map((d) => d.slice(0, 10)) : [],
    fromServer: true,
  };
}
