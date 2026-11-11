// doc-read: the document reader for Scan (int-ai-api, ai-ocr).
//
// The app has already uploaded the file to the private `documents` bucket
// under its server-shaped key (<user_id>/<profile_id>/<uuid>.<ext>, 0005).
// It sends { path, profileId, mimeType, docType? } and gets back one
// Extraction (src/lib/ai/mock/extract-types.ts): type, title, date, who,
// values with the range printed on the page, medicines, details and the
// page's text, every field with its own confidence.
//
// IT READS, IT NEVER FILES. Rule 12: Scan shows Check and save with what was
// read, asks about anything under 0.7, and the APP files the record. Filing
// is what teaches memory (0044's trigger queues the AI API's index job).
//
// WHO. JWT verification stays on. The caller is asked of Auth, never read from
// the body, and the path must start with their own user id and the member
// they named; the AI API checks both again, then asks ai_may_process()
// (theirs, on the plan, consented) before it downloads anything.
//
// PRIVACY. Nothing is logged here. The file goes to the AI API, which reads it
// with Gemini and keeps nothing (it never writes the record or the file).
//
// Until CHEEKU_READER_URL is set this answers 503 and the app reads with its
// built-in stand-in, so turning the reader on is a secrets change, not a release.
//
// Deploy:  supabase functions deploy doc-read   (JWT verification ON)
// Secrets: supabase secrets set CHEEKU_READER_URL=https://<ai-api>/api/v1/baymax/read  CHEEKU_MODEL_KEY=...
// App:     EXPO_PUBLIC_DOC_READER=edge

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS, ...headers } });
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/heic": "heic", "application/pdf": "pdf" };
const DOC_TYPES = ["lab_report", "prescription", "discharge", "scan", "bill", "consultation_invoice", "booking_invoice", "vaccination", "insurance", "medication", "other"];

/** The account that signed this request, or null. Asked of Auth, never read from the body. */
async function caller(authorization: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: authorization } }).catch(() => null);
  if (!res?.ok) return null;
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  return typeof user?.id === "string" ? user.id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("CHEEKU_READER_URL");
  const key = Deno.env.get("CHEEKU_MODEL_KEY");
  if (!url || !key) return json({ error: "reader_not_configured" }, 503);

  const authorization = req.headers.get("Authorization") ?? "";
  const userId = authorization ? await caller(authorization) : null;
  if (!userId) return json({ error: "signed_out" }, 401);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const path = typeof body?.path === "string" ? body.path : "";
  const profileId = typeof body?.profileId === "string" ? body.profileId : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const docType = typeof body?.docType === "string" && DOC_TYPES.includes(body.docType) ? body.docType : undefined;
  if (!EXT[mimeType] || !new RegExp(`^${UUID}$`, "i").test(profileId)) return json({ error: "bad_request" }, 400);
  // The key's first two segments are the authorisation, as the storage policies read them.
  if (!new RegExp(`^${userId}/${profileId}/${UUID}\\.${EXT[mimeType]}$`, "i").test(path)) return json({ error: "not_allowed" }, 403);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}`, "x-cheeku-user": authorization },
      body: JSON.stringify({ path, profileId, mimeType, ...(docType ? { docType } : {}) }),
      // A page with handwriting can take a while; past this the app reads with its stand-in.
      signal: AbortSignal.timeout(45_000),
    });
    if (res.status === 429) return json({ error: "rate_limited" }, 429, { "retry-after": res.headers.get("retry-after") ?? "60" });
    if (res.status === 403) return json({ error: "not_allowed" }, 403);
    if (!res.ok) return json({ error: "reader_error", status: res.status }, 502);
    const extraction = await res.json().catch(() => null);
    if (!extraction || typeof extraction !== "object") return json({ error: "reader_empty" }, 502);
    return json({ extraction });
  } catch {
    return json({ error: "reader_unreachable" }, 504);
  }
});
