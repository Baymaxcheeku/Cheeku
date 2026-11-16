import { supabase } from "@/lib/supabase/client";

import type { ChatModel, ModelReply, ModelRequest } from "./model";
import { TIER_RANK, type Tier } from "./types";

/*
 * WHICH MODEL ANSWERS.
 *
 * Every turn the rules don't answer goes to the `cheeku-chat` Edge Function,
 * which asks Gemini (or the fine-tuned model once it has a URL). The model's
 * keys live in Edge Function secrets, never in the app.
 *
 * THERE IS NO STAND-IN (2026-11-17). The app used to answer from a hard-coded
 * on-device model whenever the function failed or the allowance ran out, and
 * people read the same canned paragraphs again and again as if Cheeku had
 * thought about them. Now a turn the model can't answer is NOT answered, and
 * the chat says why, plainly:
 *
 *   - ModelBusy: the meter refused for pace ("per_minute" / "per_hour").
 *     The chat says "give it a minute".
 *   - ModelUnavailable("quota"): the free allowance or the daily ceiling is
 *     spent. The chat opens the plans sheet.
 *   - ModelUnavailable("down"): the function, the model or the network
 *     failed. The chat says so and keeps their message in the box to resend.
 *
 * Nothing is saved for a refused turn.
 *
 * THE ONE EXCEPTION IS SAFETY. When the rules' floor already says call a
 * doctor today or go now, a failure does not leave them with an error: they
 * get a short rules answer that says exactly that, with the reasons the rules
 * found (modelId "rules:floor"). Emergencies themselves never get this far;
 * the rules answer them before any model is asked.
 */

const TIERS = Object.keys(TIER_RANK) as Tier[];
export const FLOOR_REPLY = "rules:floor";

/** The meter refused this turn for pace; the chat should ask them to wait. */
export class ModelBusy extends Error {
  constructor(readonly retryAfter: number) {
    super("model_busy");
  }
}

/** The model can't answer this turn: the allowance is spent, or something is down. */
export class ModelUnavailable extends Error {
  constructor(readonly reason: "quota" | "down") {
    super(`model_unavailable:${reason}`);
  }
}

/** The refusal reason and wait from a 429, or null when the error is anything else. */
async function refusalOf(error: unknown): Promise<{ reason: string; retryAfter: number } | null> {
  const res = (error as { context?: unknown } | null)?.context;
  if (!(res instanceof Response) || res.status !== 429) return null;
  try {
    const body = (await res.clone().json()) as Record<string, unknown>;
    return { reason: typeof body.reason === "string" ? body.reason : "refused", retryAfter: typeof body.retryAfter === "number" ? body.retryAfter : 60 };
  } catch {
    return { reason: "refused", retryAfter: 60 };
  }
}

/** A floor of contact-today or above: a failure still gets the rules' answer. */
export function floorAnswers(floor: Tier | null): boolean {
  return Boolean(floor && TIER_RANK[floor] >= TIER_RANK.contact_today);
}

/** What the rules say when the model can't, and the floor says a doctor today or sooner. */
export function floorReply(req: ModelRequest): ModelReply {
  const who = req.memory.person.firstName || "them";
  const now = req.floor.tier === "go_now";
  return {
    paragraphs: [
      now ? `From what you've told me, ${who} needs to be seen now. Go to the nearest emergency department or call 112.` : `From what you've told me, ${who} should talk to a doctor today.`,
      ...(req.floor.reasons.length ? [`Why:\n${req.floor.reasons.map((r) => `• ${r}`).join("\n")}`] : []),
      "I couldn't read the rest in full just now. Ask me again in a minute and I'll go through it properly.",
    ],
    citations: [],
    followUps: [],
    tier: req.floor.tier,
    basis: "grounded",
    careOffer: true,
  };
}

function readReply(v: unknown): (ModelReply & { modelId?: string }) | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const paragraphs = Array.isArray(o.paragraphs) ? o.paragraphs.filter((p): p is string => typeof p === "string" && p.trim().length > 0) : [];
  if (!paragraphs.length) return null;
  const citations = Array.isArray(o.citations)
    ? o.citations.filter((c): c is { documentId: string; label: string } => Boolean(c && typeof c === "object" && typeof (c as Record<string, unknown>).documentId === "string" && typeof (c as Record<string, unknown>).label === "string"))
    : [];
  return {
    paragraphs: paragraphs.slice(0, 12),
    citations,
    followUps: Array.isArray(o.followUps) ? o.followUps.filter((f): f is string => typeof f === "string").slice(0, 4) : [],
    tier: TIERS.includes(o.tier as Tier) ? (o.tier as Tier) : null,
    basis: o.basis === "grounded" || o.basis === "silent" ? o.basis : "general",
    careOffer: o.careOffer === true,
    actions: Array.isArray(o.actions) ? (o.actions as ModelReply["actions"]) : undefined,
    photoSummary: typeof o.photoSummary === "string" && o.photoSummary.trim() ? o.photoSummary.trim().slice(0, 400) : null,
    modelId: typeof o.modelId === "string" ? o.modelId : undefined,
  };
}

/** Gemini (or the fine-tuned model) through the Edge Function. */
export function chatModel(): ChatModel {
  let lastId = "cheeku-edge";
  return {
    get id() {
      return lastId;
    },
    async respond(req: ModelRequest) {
      let failure: ModelBusy | ModelUnavailable;
      try {
        const { data, error } = await supabase.functions.invoke("cheeku-chat", { body: req });
        const refusal = error ? await refusalOf(error) : null;
        const reply = error ? null : readReply(data);
        if (reply) {
          lastId = reply.modelId ?? "cheeku-edge";
          return reply;
        }
        failure =
          refusal && (refusal.reason === "per_minute" || refusal.reason === "per_hour") ? new ModelBusy(refusal.retryAfter)
          : refusal ? new ModelUnavailable("quota")
          : new ModelUnavailable("down");
      } catch {
        failure = new ModelUnavailable("down");
      }
      if (floorAnswers(req.floor.tier)) {
        lastId = FLOOR_REPLY;
        return floorReply(req);
      }
      throw failure;
    },
  };
}

/** For a spent allowance: the turn is still planned (emergencies are never refused), but no model is asked. */
export const noModel: ChatModel = {
  id: "none",
  async respond() {
    throw new ModelUnavailable("quota");
  },
};
