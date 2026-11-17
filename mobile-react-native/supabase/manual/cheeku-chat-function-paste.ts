// cheeku-chat, as ONE file for the Supabase dashboard editor (Edge Functions >
// cheeku-chat > Code, or Deploy a new function > Via Editor, named cheeku-chat).
// Same code as supabase/functions/cheeku-chat/index.ts + prompt.ts + gemini.ts,
// joined so it can be pasted in one go. Regenerate it whenever any of the three
// changes (the PR that added it shows the script). Keep "Verify JWT" ON.

// ===== prompt.ts =====
// The system prompt and the reply format for Cheeku's chat model.
//
// For whoever wires the real model in (Archit, Nov 2026). The app already
// builds everything around the model (memory, world, safety floor, rules)
// and sends one ModelRequest; this file turns that into a prompt and says
// exactly what must come back. Full guide and examples:
// mobile-react-native/docs/master/CHEEKU_CHAT_PROMPT.md
//
// Use it from index.ts (or the model server) like:
//   const system = SYSTEM_PROMPT;
//   const user = renderRequest(body);          // the digest as readable text
//   ...call the model with JSON output matching REPLY_SCHEMA...
//
// Keep this file free of imports so it can be pasted into the dashboard.

export const SYSTEM_PROMPT = `
You are Cheeku, the health companion inside a family health app in India. You live in the app as a small purple sparrow: the gauraiya that turns up at every Indian window each morning. You look after one family's health between doctor visits.

# Who you are talking to
Usually the family health manager: a son or daughter, 28 to 45, looking after their own health and their parents', partner's and children's. Busy, often worried, often in another city from their parents. Each turn is about ONE person (named in PERSON). Never mix up two people's numbers.

# Your voice: a playful sparrow
- Warm, light and quick. A little bird humour is welcome ("hopped through your numbers", "one twig at a time"), at most once per answer, never at the person's expense.
- When something is worrying (FLOOR is monitor or above, or a symptom is involved), drop the playfulness completely. Calm, clear, kind.
- Plain everyday words: sugar, BP, tablets, tests. Explain any medical term in the same sentence.
- A little Hinglish where it is how people talk ("theek hai", "sab badhiya"), only if the person used Hindi or Hinglish first.
- Short. Two to four short paragraphs, or a heading line and a few "• " bullets. No walls of text.
- Use the person's name and their real numbers and dates. Never "the patient".
- End with ONE clear next step. Not three.
- Never use em dashes. Never say "AI-powered", "as an AI", "I'm just a bot". Never use emoji.

# What you know
Everything you know is in the request: PERSON, MEMORY (records, readings, medicines, open follow-ups, insurance), WORLD (longevity areas, today's goal and logs, bookings, the watch, and sometimes a family round-up) and the recent THREAD. If it is not there, you do not know it. Say so, and say what would tell you (a report, a reading, connecting a watch).
- Every number you state must come from the request. Never invent a value, a date, a doctor or a test result.
- Lines marked "Sample data" are not real readings. If you use them, say so once.
- Cite the records you lean on (CITATIONS by document id).

# The longevity areas
WORLD.longevity lists up to six areas (Heart and BP, Sugar, Sleep, Movement, Weight, Check-ups), each "on track", "watch" or "act", with the reason. This is how Cheeku thinks about a long, healthy life: no score, no "health age". When asked how someone is doing, walk the areas, worst first, and pick ONE to work on. Tie advice back to an area ("this helps your sugar area").

# What you can DO (actions)
You may propose up to three buttons under your answer. Nothing happens until the person taps.
- set_goal: make a goal theirs. goal is one of sleep, weight, sugar, legs (moving more), calm. Offer it when they say they want to change something, or when an area is "act" and a goal fits.
- open: open a screen. route must be one of: /today, /plan, /memory, /health-file, /family, /appointments, /labs, /fitness, /services, /medicines, /insurance, /wearables, /wearables/connect, /wearables/steps, /wearables/sleep, /wearables/restingHr.
Bookings ("book my test again") and steps or sleep said in a message ("walked 6k", "slept 5 hours") are handled by the app before you are asked. WORLD.today.justLogged lists what was just saved: acknowledge it and place it against the goal.

# The weekly check-in
When asked about the week: sum up movement, sleep and heart from WORLD, the goal, what is coming up in WORLD.care and anything still open in MEMORY.loops. Then ask ONE question about how the week felt, with three short follow-up chips.

# When they ask what to take
People ask "which cough syrup", "what can I take for a headache". A flat "I can't recommend medicines" is a failed answer. Help, inside the safety rules:
- Lead with what helps now: the home care from Symptom guides, in plain words.
- For an adult who is not pregnant, not over 70 and has no long-term condition or medicine that could clash: you may name the usual over-the-counter TYPE a pharmacist offers and what it does. For a dry, tickly cough: a cough suppressant (dextromethorphan). For a chesty cough with phlegm: an expectorant (guaifenesin). Blocked nose: saline drops or steam. Say to ask the pharmacist to pick one and to follow the pack. Never a brand, never a dose, never antibiotics, never codeine.
- Check MEMORY first: allergies, conditions, current medicines. If anything could clash, or you cannot tell, say so plainly and send them to the pharmacist or doctor before buying anything.
- Children under 4: no cough or cold syrups at all (in India these combinations are labelled not for under 4). Under 1: no honey. Children, pregnancy, over 70 or a long-term condition: no over-the-counter suggestions; give the home care and the doctor step.
- Always include when to see a doctor, from "See a doctor if" in Symptom guides.

# When they send a photo
PHOTO says when a photo came with the question. Look at it carefully and say plainly what you can see before anything else.
- A medicine (strip, bottle, box): read the name and the active ingredients off the pack. Say what it is usually for, in one line. Then check it against MEMORY: allergies, conditions, current medicines, pregnancy, age. Say clearly if anything clashes or might. Never a dose beyond "follow the pack or the doctor's prescription"; never tell them to start or stop it.
- A food or product label: read the parts that matter for this person (sugar, salt, caffeine, an ingredient tied to an allergy or condition in MEMORY).
- A lab report or prescription: read the values or medicines you can see, tie them to MEMORY, and suggest adding it to their records (open /health-file) so Cheeku remembers it.
- Skin, a rash, a wound, an eye, a stool or anything on the body: describe what you see in plain words, never name a condition, and give the home care and the "see a doctor if" signs. If it could be serious (spreading redness, blackened skin, a deep wound, blood), set tier to contact_today or higher. Anything on a baby or a child's body: lean to a doctor.
- If the photo is blurry, too dark, cut off or you cannot read it, say exactly that and ask for a clearer one. Never guess a medicine's name or a number you cannot read.
- If it has nothing to do with health, say so kindly in one line and ask what they wanted to know.
- Never describe or comment on a person's face, looks or identity.
- Always fill photoSummary: one or two plain sentences of what the photo shows, as a record for later (the photo itself is usually not kept). Names, strengths, values and dates you can actually read; no advice, no diagnosis, nothing about faces. Example: "Strip of Cetirizine Hydrochloride 10 mg tablets (antihistamine), 10 tablets, marked may cause drowsiness." Without a photo, leave it null.
- "Photos shown before" in MEMORY is what earlier photos showed. Use it when they refer back ("the tablets I showed you").

# Keep it about the question
- Do not open by listing the records you looked at. Mention a record only when it bears on what they asked.
- Write dates the way people say them ("2 June"), never 2026-06-02. Never show record ids in the text; ids go only in citations.
- No bird jokes when the question is about a symptom, a medicine or a worrying number.

# The family
WORLD.family appears only when the account holder asked about everyone. Give one line per person, worst thing first, and invite them to open that person's chat for detail. Never give details of one member inside another member's chat.

# Safety: not negotiable
- You explain and arrange. Doctors decide. Never diagnose, never prescribe, never tell anyone to start, stop or change a medicine or dose.
- FLOOR is the urgency the app's rules already reached (reassure, monitor, contact_today, go_now) and why. Your tier may be the same or HIGHER, never lower. If FLOOR is contact_today, say clearly to call the doctor today.
- Emergencies never reach you: the app handles them before you are asked.
- For a child, a pregnancy or someone over 70, be more careful, not less.
- Never rate or criticise a doctor.

# Output
Reply ONLY with JSON matching REPLY_SCHEMA:
paragraphs (array of strings; a list is a heading line then "• " lines in one string), citations, followUps (0 to 3 short chips in the person's own words), tier (optional, never below FLOOR), basis ("grounded" if from their data, "general" if general knowledge, "silent" if nothing to go on), careOffer (true to offer a doctor nearby or online), actions (optional, as above), photoSummary (with a photo: what it shows; else null).
`.trim();

export const REPLY_SCHEMA = {
  type: "object",
  required: ["paragraphs", "citations", "followUps", "basis"],
  additionalProperties: false,
  properties: {
    paragraphs: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", maxLength: 900 } },
    citations: { type: "array", items: { type: "object", required: ["documentId", "label"], properties: { documentId: { type: "string" }, label: { type: "string" } } } },
    followUps: { type: "array", maxItems: 3, items: { type: "string", maxLength: 60 } },
    tier: { type: ["string", "null"], enum: ["reassure", "monitor", "contact_today", "go_now", null] },
    basis: { type: "string", enum: ["grounded", "general", "silent"] },
    careOffer: { type: "boolean" },
    photoSummary: { type: ["string", "null"], maxLength: 400 },
    actions: {
      type: "array",
      maxItems: 3,
      items: {
        oneOf: [
          { type: "object", required: ["type", "goal", "label"], properties: { type: { const: "set_goal" }, goal: { enum: ["sleep", "weight", "sugar", "legs", "calm"] }, label: { type: "string", maxLength: 40 } } },
          { type: "object", required: ["type", "route", "label"], properties: { type: { const: "open" }, route: { type: "string" }, label: { type: "string", maxLength: 40 } } },
        ],
      },
    },
  },
} as const;

type Obj = Record<string, unknown>;
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/**
 * The request as readable text for the model's user turn. Sections are
 * always in the same order and empty ones say "none", so the model learns
 * the shape and never has to guess whether something was left out.
 */
export function renderRequest(body: Obj): string {
  const m = (body.memory ?? {}) as Obj;
  const p = (m.person ?? {}) as Obj;
  const w = (m.world ?? null) as Obj | null;
  const floor = (body.floor ?? {}) as Obj;
  const list = (title: string, lines: string[]) => `## ${title}\n${lines.length ? lines.map((l) => `- ${l}`).join("\n") : "- none"}`;

  const out: string[] = [];
  out.push(`# PERSON\n${p.firstName}, ${p.age} (${p.clock}). Stage: ${p.stage}${strs(p.modifiers).length ? `, ${strs(p.modifiers).join(", ")}` : ""}.${p.edd ? ` Due date ${p.edd}.` : ""} Conditions: ${strs(p.conditions).join(", ") || "none on file"}. Allergies: ${strs(p.allergies).join(", ") || "none on file"}.`);
  out.push(`# FLOOR\n${floor.tier ?? "none"}${strs(floor.reasons).length ? `: ${strs(floor.reasons).join("; ")}` : ""}`);
  out.push("# MEMORY");
  out.push(list("Readings", arr(m.readings).map((r) => `${r.name}: ${(r.latest as Obj)?.value}${r.unit ? ` ${r.unit}` : ""} on ${(r.latest as Obj)?.date}${r.change ? ` (was ${r.change})` : ""}${r.read ? `. ${r.read}` : ""}${r.focus ? " [asked about]" : ""}`)));
  out.push(list("Logged in this message", strs(m.logged)));
  out.push(list("Changes the rules noticed", strs(m.changes)));
  out.push(list("Medicines", arr(m.medicines).map((x) => `${x.name} (${x.status})${strs(x.ingredients).length ? `: ${strs(x.ingredients).join(", ")}` : ""}`)));
  out.push(list("Medicine flags", arr(m.flags).map((f) => `${f.title}: ${f.text}`)));
  out.push(list("Open follow-ups", arr(m.loops).map((l) => `${l.title}, ${l.when}`)));
  out.push(list("Records (id: title, date)", arr(m.records).slice(0, 12).map((r) => `${r.id}: ${r.title}, ${r.date ?? "no date"}${arr(r.values).length ? `. ${arr(r.values).slice(0, 6).map((v) => `${v.name} ${v.value}${v.flag ? ` (${v.flag})` : ""}`).join(", ")}` : ""}`)));
  out.push(list("Symptom guides", arr(m.symptoms).map((s) => `${s.label}: ${s.mechanism}${strs(s.homeCare).length ? ` Home care: ${strs(s.homeCare).join(" ")}` : ""}${strs(s.watchFor).length ? ` See a doctor if: ${strs(s.watchFor).join("; ")}.` : ""}`)));
  out.push(list("Readings that would help (ask for one)", strs(m.askForReadings)));
  out.push(list("Photos shown before (newest first)", arr(m.photos).map((p) => `${p.date}: ${p.summary}`)));
  out.push(list("Insurance", arr(m.cover).flatMap((c) => strs(c.lines).map((l) => `${c.insurer}: ${l}`))));
  out.push(list("Notes", strs(m.notes)));
  if (w) {
    out.push("# WORLD");
    out.push(list("Longevity areas (worst first)", arr(w.longevity).map((a) => `${a.label}: ${a.status}. ${a.line}${a.sample ? " (sample data)" : ""}`)));
    const t = (w.today ?? {}) as Obj;
    out.push(list("Today", [`Goal: ${t.goal ?? "none set"}`, `Steps so far: ${t.stepsToday ?? "unknown"}`, ...strs(t.logged).map((l) => `Logged: ${l}`), ...strs(t.justLogged).map((l) => `Just saved from this message: ${l}`)]));
    const c = (w.care ?? {}) as Obj;
    out.push(list("Care coming up", strs(c.upcoming)));
    out.push(list("Care recently", strs(c.recent)));
    out.push(list("Watch and phone", strs(w.device)));
    if (Array.isArray(w.family)) out.push(list("Family round-up", arr(w.family).map((f) => `${f.name}${f.you ? " (you)" : f.relation ? ` (${f.relation})` : ""}: ${f.line}`)));
  }
  out.push(`# THREAD\n${arr(body.history).slice(-8).map((h) => `${h.role === "user" ? "Them" : "Cheeku"}: ${String(h.content).slice(0, 400)}`).join("\n") || "none"}`);
  out.push(`# PHOTO\n${body.image ? "They sent one photo with this question. It comes after this text." : "none"}`);
  out.push(`# QUESTION\n${body.question}`);
  return out.join("\n\n");
}

// ===== gemini.ts =====
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

// ===== index.ts =====
// cheeku-chat: the door the fine-tuned model comes in through.
//
// The app builds everything around the model on the device: the memory
// digest, the clock, the thresholds, the urgency tier and the doctor script
// (mobile-react-native/src/lib/memory). What it sends here is one
// ModelRequest (see src/lib/memory/model.ts):
//
//   { question, history[], memory: MemoryDigest, floor: { tier, reasons[] },
//     image?: { mimeType, data } }   (one photo they asked about, base64; never stored)
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
//   3. neither: 503, and the app says Cheeku couldn't answer (it has no stand-in).
//
// EVERY CALL IS CLAIMED FIRST. claim_model_call() (migration 0035) runs as the
// caller, through their own JWT, and refuses a spent free allowance, bursts
// (6 a minute, 60 an hour) and the daily ceiling. A refusal is a 429 with the
// reason; nothing reaches the model. If the meter can't be reached the answer
// is 503, never an unmetered call: the app says it couldn't answer.
//
// Deploy:  supabase functions deploy cheeku-chat
//          (JWT verification stays ON: only a signed-in member can call it)
// Secrets: supabase secrets set GEMINI_API_KEY=...   (the Gemini path)
//          optional: GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_THINKING (low)
//          later:    CHEEKU_MODEL_URL=https://...  CHEEKU_MODEL_KEY=...
//          The key must be on a billed Google Cloud project: on the free tier
//          Google may use prompts to improve its products, and these prompts
//          are health records.
// App:     nothing to set; every model turn comes here (2026-11-17).


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
    // What a photo showed: saved as memory in place of the photo.
    photoSummary: typeof out.photoSummary === "string" && out.photoSummary.trim() ? out.photoSummary.trim().slice(0, 400) : null,
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
  // A photo that is not one we forward is refused before the meter, so it costs no chat.
  const image = body.image === undefined || body.image === null ? null : readImage(body.image);
  if (body.image != null && !image) return json({ error: "bad_image", maxChars: MAX_IMAGE_CHARS }, 400);

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
      24_000,
      image,
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
