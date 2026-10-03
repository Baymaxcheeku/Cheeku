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
 */

const MODE = process.env.EXPO_PUBLIC_CHAT_MODEL ?? "mock";
const TIERS = Object.keys(TIER_RANK) as Tier[];

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
        const reply = error ? null : readReply(data);
        if (reply) {
          lastId = reply.modelId ?? "cheeku-edge";
          return reply;
        }
      } catch {
        // Fall through to the stand-in.
      }
      lastId = mockModel.id;
      return mockModel.respond(req);
    },
  };
}

export function chatModel(): ChatModel {
  return MODE === "edge" ? edgeModel() : mockModel;
}
