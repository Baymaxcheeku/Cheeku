// Gemini as Cheeku's chat model, until the fine-tuned model has a URL.
//
// index.ts calls askGemini() when GEMINI_API_KEY is set and CHEEKU_MODEL_URL is
// not. It sends SYSTEM_PROMPT as the system instruction, renderRequest(body) as
// the one user turn, and asks for JSON matching REPLY_SCHEMA (Gemini accepts the
// schema as written, checked 2026-11-16 against gemini-3.5-flash and -lite).
//
// One model, then the fallback: the first model gets most of the time budget;
// a timeout, a 429, a 5xx, a block or a reply that is not the JSON we asked for
// moves on to the second. A 400/401/403 is a configuration fault (bad key,
// bad request) and is not retried, because the second call would fail the
// same way and spend the person's wait for nothing.
//
// The key goes in a header, never the URL. Nothing about the request or the
// reply is logged: it is one person's health memory. Only a model name and an
// HTTP status ever reach console.
//
// A PHOTO (2026-11-17). When the turn carries one, it goes as an inlineData
// part after the text, in the same single user turn. Only image/jpeg, png or
// webp, at most MAX_IMAGE_CHARS of base64 (the app sends a re-drawn 1280 px
// JPEG, a few hundred KB); anything else is dropped, never forwarded. The
// photo is not stored or logged here either.
//
// Keep this file free of imports (prompt.ts is passed in) so it can be joined
// into the dashboard paste file, supabase/manual/cheeku-chat-function-paste.ts.

export type GeminiConfig = {
  key: string;
  /** Tried in order; empty names are skipped and duplicates dropped. */
  models: string[];
  /** "low" by default: about 2s faster on flash than the default, same answers on our probes. */
  thinking?: string;
};

export type GeminiResult =
  | { ok: true; reply: Record<string, unknown>; model: string }
  | { ok: false; error: "model_error" | "model_empty" | "model_unreachable"; status?: number };

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiImage = { mimeType: string; data: string };

/** About 3 MB of picture. The app's re-drawn JPEG is a tenth of that. */
export const MAX_IMAGE_CHARS = 4_000_000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** The photo from a request body, or null if there is none or it isn't one we forward. */
export function readImage(v: unknown): GeminiImage | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.mimeType !== "string" || !IMAGE_TYPES.has(o.mimeType)) return null;
  if (typeof o.data !== "string" || !o.data.length || o.data.length > MAX_IMAGE_CHARS || !/^[A-Za-z0-9+/]+=*$/.test(o.data)) return null;
  return { mimeType: o.mimeType, data: o.data };
}

/** The generateContent body for one turn. Pure, so it can be tested. */
export function geminiBody(system: string, user: string, schema: unknown, thinking = "low", image: GeminiImage | null = null): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }, ...(image ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }] : [])] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      temperature: 0.4,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingLevel: thinking },
    },
  };
}

/**
 * The reply object from a generateContent response, or null when there is none:
 * blocked, cut off by the token limit, empty, or not a JSON object. Thought
 * parts are skipped; the answer can arrive split across several text parts.
 */
export function readGemini(res: unknown): Record<string, unknown> | null {
  const cand = (res as { candidates?: unknown[] } | null)?.candidates?.[0] as Record<string, unknown> | undefined;
  if (!cand) return null;
  if (cand.finishReason && cand.finishReason !== "STOP") return null;
  const parts = ((cand.content as Record<string, unknown> | undefined)?.parts ?? []) as Record<string, unknown>[];
  const text = parts
    .filter((p) => p && p.thought !== true && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("")
    .trim()
    // Defensive: a model that wraps JSON in a fence despite responseMimeType.
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  if (!text) return null;
  try {
    const out = JSON.parse(text);
    return out && typeof out === "object" && !Array.isArray(out) ? (out as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Retry on the fallback for these; anything else in 4xx is our fault and will not get better. */
const retryable = (status: number) => status === 404 || status === 408 || status === 429 || status >= 500;

export async function askGemini(
  cfg: GeminiConfig,
  system: string,
  user: string,
  schema: unknown,
  budgetMs = 24_000,
  image: GeminiImage | null = null,
): Promise<GeminiResult> {
  const models = [...new Set(cfg.models.map((m) => m.trim()).filter(Boolean))];
  const body = JSON.stringify(geminiBody(system, user, schema, cfg.thinking || "low", image));
  const deadline = Date.now() + budgetMs;
  let last: GeminiResult = { ok: false, error: "model_unreachable" };

  for (const [i, model] of models.entries()) {
    const left = deadline - Date.now();
    if (left < 1_500) break;
    // The first model gets two thirds of the budget when there is a fallback behind it.
    const slice = i < models.length - 1 ? Math.round(left * 0.66) : left;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), slice);
    try {
      const res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": cfg.key },
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error(`cheeku-chat: ${model} answered ${res.status}`);
        last = { ok: false, error: "model_error", status: res.status };
        if (!retryable(res.status)) return last;
        continue;
      }
      const reply = readGemini(await res.json());
      if (reply) return { ok: true, reply, model };
      console.error(`cheeku-chat: ${model} gave no usable reply`);
      last = { ok: false, error: "model_empty" };
    } catch {
      console.error(`cheeku-chat: ${model} timed out or was unreachable`);
      last = { ok: false, error: "model_unreachable" };
    } finally {
      clearTimeout(timer);
    }
  }
  return last;
}
