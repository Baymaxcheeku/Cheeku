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
// Deploy:  supabase functions deploy cheeku-chat
//          (JWT verification stays ON: only a signed-in member can call it)
// Secrets: supabase secrets set CHEEKU_MODEL_URL=https://...  CHEEKU_MODEL_KEY=...
// App:     EXPO_PUBLIC_CHAT_MODEL=edge

const TIERS = ["reassure", "monitor", "contact_today", "go_now"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
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

  // Nothing about the request is logged: it is one person's health memory.
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
