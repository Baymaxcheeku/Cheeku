import { supabase } from "@/lib/supabase/client";

import type { ChatModel, ModelReply, ModelRequest } from "./model";
import { mockModel } from "./mock-model";
import { TIER_RANK, type Tier } from "./types";

/*
 * WHICH MODEL ANSWERS.
 *
 * `EXPO_PUBLIC_CHAT_MODEL=edge` sends each turn's ModelRequest to the
 * `cheeku-chat` Edge Function, which forwards it to the fine-tuned model
 * (see supabase/functions/cheeku-chat). Anything else, or the edge call
 * failing, uses the stand-in, so the chat never breaks because a model
 * endpoint is down. The reply records which one actually answered.
 *
 * The model's keys and URL live in Edge Function secrets, never in the app.
 *
 * A 429 from the function is a refusal by the meter (migration 0035), not an
 * outage, and is handled by its reason:
 *   - "per_minute" / "per_hour": the person is sending faster than the limit.
 *     The turn stops with ModelBusy so the chat can say "give it a minute",
 *     UNLESS the floor already says contact a doctor today or go now: then the
 *     stand-in answers, because a careful answer now beats a lecture on pace.
 *   - "quota" / "daily" and anything else: the stand-in answers. For a spent
 *     free allowance the send is refused right after by the same check the
 *     database makes, so nothing extra is given away.
 */

const MODE = process.env.EXPO_PUBLIC_CHAT_MODEL ?? "mock";
const TIERS = Object.keys(TIER_RANK) as Tier[];

/** The meter refused this turn for pace; the chat should ask them to wait. */
export class ModelBusy extends Error {
  constructor(readonly retryAfter: number) {
    super("model_busy");
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

/** Pace refusals stop the turn, except when the floor already asks for a doctor today or sooner. */
export function stopsTurn(reason: string, floor: Tier | null): boolean {
  if (reason !== "per_minute" && reason !== "per_hour") return false;
  return !floor || TIER_RANK[floor] < TIER_RANK.contact_today;
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
    modelId: typeof o.modelId === "string" ? o.modelId : undefined,
  };
}

/** The fine-tuned model, through the Edge Function. Falls back to the stand-in. */
function edgeModel(): ChatModel {
  let lastId = "cheeku-edge";
  return {
    get id() {
      return lastId;
    },
    async respond(req: ModelRequest) {
      try {
        const { data, error } = await supabase.functions.invoke("cheeku-chat", { body: req });
        const refusal = error ? await refusalOf(error) : null;
        if (refusal && stopsTurn(refusal.reason, req.floor.tier)) throw new ModelBusy(refusal.retryAfter);
        const reply = error ? null : readReply(data);
        if (reply) {
          lastId = reply.modelId ?? "cheeku-edge";
          return reply;
        }
      } catch (e) {
        if (e instanceof ModelBusy) throw e;
        // Anything else falls through to the stand-in.
      }
      lastId = mockModel.id;
      return mockModel.respond(req);
    },
  };
}

export function chatModel(): ChatModel {
  return MODE === "edge" ? edgeModel() : mockModel;
}
