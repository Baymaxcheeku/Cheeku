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
//     careOffer?: boolean, modelId? }
//
// THE FLOOR IS NOT A SUGGESTION. The app takes the higher of the model's tier
// and the floor, so a model can make an answer more careful and never less.
// Hard-stops and emergencies never reach this function at all.
//
// Until CHEEKU_MODEL_URL is set this answers 503 and the app uses its built-in
// stand-in, so turning the model on is a secrets change, not a release.
//
// THE AI API (int-ai-api). CHEEKU_MODEL_URL points at the Cheeku AI API's
// /api/v1/baymax/chat (ai_integration_api, running against this project since
// migration 0044). It needs to know WHO is asking to read that member's
// documents, so the caller's own token travels on as `x-cheeku-user`, and the
// API verifies it with Supabase Auth and asks ai_may_process() (theirs, on the
// plan, consented) before reading anything. The body's `profileId` names the
// member; the token, not the body, decides whether that is allowed.
// `authorization: Bearer CHEEKU_MODEL_KEY` proves the call came from here.
//
// EVERY CALL IS CLAIMED FIRST. claim_model_call() (migration 0035) runs as the
// caller, through their own JWT, and refuses a spent free allowance, bursts
// (6 a minute, 60 an hour) and the daily ceiling. A refusal is a 429 with the
// reason; nothing reaches the model. If the meter can't be reached the answer
// is 503, never an unmetered call: the app falls back to its stand-in.
//
// Deploy:  supabase functions deploy cheeku-chat
//          (JWT verification stays ON: only a signed-in member can call it)
// Secrets: supabase secrets set CHEEKU_MODEL_URL=https://<ai-api>/api/v1/baymax/chat  CHEEKU_MODEL_KEY=...
// App:     EXPO_PUBLIC_CHAT_MODEL=edge

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

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("CHEEKU_MODEL_URL");
  const key = Deno.env.get("CHEEKU_MODEL_KEY");
  if (!url) return json({ error: "model_not_configured" }, 503);

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key ? { authorization: `Bearer ${key}` } : {}),
        // Who is asking, passed through unchanged; the model service verifies it itself.
        "x-cheeku-user": authorization,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return json({ error: "model_error", status: res.status }, 502);
    const out = (await res.json()) as Record<string, unknown>;
    const paragraphs = Array.isArray(out.paragraphs) ? out.paragraphs.filter((p) => typeof p === "string") : [];
    if (!paragraphs.length) return json({ error: "model_empty" }, 502);
    return json({
      paragraphs,
      citations: Array.isArray(out.citations) ? out.citations : [],
      followUps: Array.isArray(out.followUps) ? out.followUps : [],
      tier: TIERS.includes(out.tier as string) ? out.tier : null,
      basis: out.basis ?? "general",
      careOffer: out.careOffer === true,
      modelId: typeof out.modelId === "string" ? out.modelId : "cheeku-ft",
    });
  } catch {
    return json({ error: "model_unreachable" }, 504);
  } finally {
    clearTimeout(timer);
  }
});
