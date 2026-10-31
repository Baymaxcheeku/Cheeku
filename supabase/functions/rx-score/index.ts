// rx-score: the prescription scorecard for one prescription.
//
// The app sends { documentId } and gets back { card }: every medicine read to
// its salts and checked on ten standards against the person's own records
// (rules and formulary in rx.ts, shared with the app). The card is kept in
// rx_scorecards so every phone in the family sees the same one.
//
// AS THE PERSON. Every read and the write go through PostgREST with the
// caller's own token, so row-level security decides what this can see. There
// is no service key in here: a request can never score someone else's record.
//
// PRIVACY. Nothing is logged and nothing leaves Supabase. No model is called;
// the rules are plain code.
//
// Deploy:  supabase functions deploy rx-score
//          (JWT verification stays ON: only signed-in people can call it)
//          From the dashboard instead: paste supabase/manual/0042-rx-score-function-paste.ts
//          (this file and rx.ts joined) into Edge Functions > Via Editor.
// Needs:   migration 0042 (rx_scorecards). Without it the card is still
//          returned, just not kept.

import { scoreAndStore, type Rest } from "./rx.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}

/** The account that signed this request, or null. Asked of Auth, never read from the body. */
async function caller(authorization: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: authorization } });
  if (!res.ok) return null;
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  return typeof user?.id === "string" ? user.id : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!(await caller(authorization))) return json({ error: "signed_out" }, 401);

  const body = (await req.json().catch(() => null)) as { documentId?: unknown } | null;
  const documentId = typeof body?.documentId === "string" ? body.documentId : "";
  if (!UUID.test(documentId)) return json({ error: "bad_request" }, 400);

  const rest: Rest = (path, init = {}) =>
    fetch(`${SUPABASE_URL}${path}`, {
      method: init.method ?? "GET",
      body: init.body,
      headers: { apikey: ANON_KEY, Authorization: authorization, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(8000),
    });

  try {
    const card = await scoreAndStore(rest, documentId);
    if (!card) return json({ error: "not_found" }, 404);
    return json({ card });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "not a prescription") return json({ error: "not_prescription" }, 422);
    return json({ error: "unavailable" }, 503);
  }
});
