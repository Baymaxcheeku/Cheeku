// cheeku-chat: the door the fine-tuned model comes in through.
//
// The app builds everything around the model on the device: the memory
// digest, the clock, the thresholds, the urgency tier and the doctor script
// (mobile-react-native/src/lib/memory). What it sends here is one
// ModelRequest (see src/lib/memory/model.ts):
//
//   { question, history[], memory: MemoryDigest, floor: { tier, reasons[] } }
//
// and what it expects back is one ModelReply:
//
//   { paragraphs: string[], citations: {documentId,label}[], followUps: string[],
//     tier?: "reassure"|"monitor"|"contact_today"|"go_now", basis,
//     careOffer?: boolean, actions?: ChatAction[], modelId? }
//
// The memory now carries `world` too (longevity areas, today's goal and
// logs, bookings, the watch, a family round-up when asked). The system prompt
// and a renderer for all of it are in prompt.ts; the guide is
// docs/master/CHEEKU_CHAT_PROMPT.md.
//
// THE FLOOR IS NOT A SUGGESTION. The app takes the higher of the model's tier
// and the floor, so a model can make an answer more careful and never less.
// Hard-stops and emergencies never reach this function at all.
//
// WHICH MODEL ANSWERS, by secrets alone (no release needed to switch):
//   1. CHEEKU_MODEL_URL set: the fine-tuned model server gets the ModelRequest.
//   2. else GEMINI_API_KEY set: Gemini answers (gemini.ts), with SYSTEM_PROMPT
//      and renderRequest() from prompt.ts. GEMINI_MODEL (default
//      gemini-3.5-flash-lite) first, then GEMINI_FALLBACK_MODEL (default
//      gemini-3.5-flash).
//   3. neither: 503 and the app uses its built-in stand-in.
//
// EVERY CALL IS CLAIMED FIRST. claim_model_call() (migration 0035) runs as the
// caller, through their own JWT, and refuses a spent free allowance, bursts
// (6 a minute, 60 an hour) and the daily ceiling. A refusal is a 429 with the
// reason; nothing reaches the model. If the meter can't be reached the answer
// is 503, never an unmetered call: the app falls back to its stand-in.
//
// Deploy:  supabase functions deploy cheeku-chat
//          (JWT verification stays ON: only a signed-in member can call it)
// Secrets: supabase secrets set GEMINI_API_KEY=...   (the Gemini path)
//          optional: GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_THINKING (low)
//          later:    CHEEKU_MODEL_URL=https://...  CHEEKU_MODEL_KEY=...
//          The key must be on a billed Google Cloud project: on the free tier
//          Google may use prompts to improve its products, and these prompts
//          are health records.
// App:     EXPO_PUBLIC_CHAT_MODEL=edge

import { askGemini } from "./gemini.ts";
import { REPLY_SCHEMA, renderRequest, SYSTEM_PROMPT } from "./prompt.ts";

const TIERS = ["reassure", "monitor", "contact_today", "go_now"];

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

type Claim = { ok: true } | { ok: false; reason: string; retry_after?: number };

/** One metered model call for whoever signed this request, or null if the meter is unreachable. */
async function claim(authorization: string): Promise<Claim | null> {
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !anon) return null;
  try {
    const res = await fetch(`${base}/rest/v1/rpc/claim_model_call`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: anon, authorization },
      body: "{}",
    });
    if (!res.ok) return null;
    const out = (await res.json()) as Record<string, unknown>;
    if (out.ok === true) return { ok: true };
    return { ok: false, reason: typeof out.reason === "string" ? out.reason : "refused", retry_after: typeof out.retry_after === "number" ? out.retry_after : undefined };
  } catch {
    return null;
  }
}

/** One model's reply as the ModelReply the app reads; 502 when it has nothing to say. */
function shape(out: Record<string, unknown>, modelId: string): Response {
  const paragraphs = Array.isArray(out.paragraphs) ? out.paragraphs.filter((p) => typeof p === "string" && p.trim()) : [];
  if (!paragraphs.length) return json({ error: "model_empty" }, 502);
  return json({
    paragraphs,
    citations: Array.isArray(out.citations) ? out.citations : [],
    followUps: Array.isArray(out.followUps) ? out.followUps : [],
    tier: TIERS.includes(out.tier as string) ? out.tier : null,
    basis: out.basis ?? "general",
    careOffer: out.careOffer === true,
    // Buttons the model proposes; the app keeps only known goals and allowed screens.
    actions: Array.isArray(out.actions) ? out.actions.slice(0, 3) : [],
    modelId,
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("CHEEKU_MODEL_URL");
  const key = Deno.env.get("CHEEKU_MODEL_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!url && !geminiKey) return json({ error: "model_not_configured" }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (typeof body.question !== "string" || !body.memory || typeof body.memory !== "object") return json({ error: "bad_request" }, 400);
  if ((body.question as string).length > 2000) return json({ error: "too_long" }, 413);

  const authorization = req.headers.get("authorization");
  if (!authorization) return json({ error: "signed_out" }, 401);
  const claimed = await claim(authorization);
  if (!claimed) return json({ error: "meter_unavailable" }, 503);
  if (!claimed.ok) {
    const retry = claimed.retry_after ?? 60;
    return json({ error: "rate_limited", reason: claimed.reason, retryAfter: retry }, 429, { "retry-after": String(retry) });
  }

  // Nothing about the request is logged: it is one person's health memory.
  if (!url) {
    const got = await askGemini(
      {
        key: geminiKey!,
        models: [Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite", Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash"],
        thinking: Deno.env.get("GEMINI_THINKING") || "low",
      },
      SYSTEM_PROMPT,
      renderRequest(body),
      REPLY_SCHEMA,
    );
    if (!got.ok) return json({ error: got.error, ...(got.status ? { status: got.status } : {}) }, got.error === "model_unreachable" ? 504 : 502);
    return shape(got.reply, `gemini:${got.model}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return json({ error: "model_error", status: res.status }, 502);
    const out = (await res.json()) as Record<string, unknown>;
    return shape(out, typeof out.modelId === "string" ? out.modelId : "cheeku-ft");
  } catch {
    return json({ error: "model_unreachable" }, 504);
  } finally {
    clearTimeout(timer);
  }
});
