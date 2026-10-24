// delete-account: the last step of erasure, removing the sign-in itself.
//
// The app erases everything it can reach as the person first, under RLS
// (lib/account/actions.ts): files, then the family and every row under it,
// then the inbox, tokens, tickets and activity. What it cannot do is delete
// the account in auth.users; only the service role can. Without this step the
// same email signs straight back in to an empty account, which is not what
// "delete my account" means to anyone, nor to the DPDP Act or app review.
//
// ORDER IS ENFORCED, NOT TRUSTED. This refuses (409) while the caller still
// owns a family or a document row. Deleting the sign-in would cascade those
// rows, but not the files in storage they point at, so files must go first
// and only the app's path does that.
//
// WHAT IT KEEPS. One privacy_requests row (kind erasure, resolved) is written
// before the delete. After migration 0037, consent_log and privacy_requests no
// longer cascade with auth.users: the proof that consent was given and that
// erasure was asked for and done outlives the account. Neither holds health
// data, and RLS means nobody can read them through the API afterwards.
//
// Idempotent. A retry after a half-finished run finds the request already
// recorded and an account that may already be gone, and answers ok.
//
// Deploy:  supabase functions deploy delete-account
//          (JWT verification stays ON: only the signed-in person can call it)
// Needs:   migration 0037 first (supabase/manual/0037-step-1-of-1.sql).
//          SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are
//          provided to every function; nothing to set.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function admin(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/** The account that signed this request, or null. Asked of Auth, never read from the body. */
async function caller(authorization: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: authorization } });
  if (!res.ok) return null;
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  return typeof user?.id === "string" ? user.id : null;
}

async function count(path: string): Promise<number | null> {
  const res = await admin(`/rest/v1/${path}`, { headers: { Prefer: "count=exact", Range: "0-0" } });
  if (!res.ok) return null;
  const total = res.headers.get("content-range")?.split("/")[1];
  return total && total !== "*" ? Number(total) : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return json({ error: "not_configured" }, 503);

  const authorization = req.headers.get("authorization");
  if (!authorization) return json({ error: "signed_out" }, 401);

  // The app already asked the person to type DELETE. Asking for it again here
  // means a stray call with a valid session cannot remove an account.
  const body = (await req.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== "DELETE") return json({ error: "not_confirmed" }, 400);

  const userId = await caller(authorization);
  if (!userId) return json({ error: "signed_out" }, 401);
  const id = encodeURIComponent(userId);

  const families = await count(`families?owner_id=eq.${id}&select=id`);
  const documents = await count(`documents?user_id=eq.${id}&select=id`);
  if (families === null || documents === null) return json({ error: "unavailable" }, 503);
  if (families > 0 || documents > 0) return json({ error: "data_remains" }, 409);

  // The record that erasure was asked for and done. Written once, even across retries.
  const done = await admin(`/rest/v1/privacy_requests?user_id=eq.${id}&kind=eq.erasure&status=eq.resolved&select=id&limit=1`);
  const already = done.ok ? ((await done.json()) as unknown[]).length > 0 : false;
  if (!already) {
    const now = new Date().toISOString();
    const logged = await admin("/rest/v1/privacy_requests", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        kind: "erasure",
        status: "resolved",
        details: "Deleted the account in the app.",
        response: "Records, files and the sign-in were removed. Consent history is kept as proof of consent.",
        resolved_at: now,
      }),
    });
    // No record, no delete: the proof must exist before the account stops existing.
    if (!logged.ok) return json({ error: "unavailable" }, 503);
  }

  const removed = await admin(`/auth/v1/admin/users/${id}`, { method: "DELETE" });
  // 404 means a previous attempt already removed it.
  if (!removed.ok && removed.status !== 404) {
    console.error("delete-account: auth delete failed", removed.status);
    return json({ error: "unavailable" }, 502);
  }

  return json({ ok: true });
});
