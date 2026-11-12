// wearables-google: Fitbit and Pixel Watch data through the Google Health API.
//
// The app never holds a Google key or token. This function:
//   start       { returnTo }        -> { url }   Google consent screen for the caller
//   (GET ?state=&code=)             Google comes back here; we swap the code for
//                                   a refresh token, keep it, and send the person
//                                   back to the app with google=ok or google=no
//   days        { from, to, offsetMinutes } -> { days }  daily summaries
//   disconnect  {}                  revoke at Google and forget the token
//
// SECURITY. Every POST checks the caller with Auth. Tokens and states live in
// wearable_links / wearable_link_states, which the app cannot read (0044). A
// state is single use and expires after ten minutes. Read-only scopes only.
//
// PRIVACY. Nothing is logged. Only daily totals go back to the app.
//
// Deploy:  supabase functions deploy wearables-google --no-verify-jwt
//          (JWT checking is done in here, because Google's redirect back
//          carries no Supabase token)
// Secrets: GOOGLE_HEALTH_CLIENT_ID, GOOGLE_HEALTH_CLIENT_SECRET
//          set in Supabase > Edge Functions > Secrets, never in the app.
// Needs:   migration 0044.

import { toDays, type Point } from "./rollup.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLIENT_ID = Deno.env.get("GOOGLE_HEALTH_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_HEALTH_CLIENT_SECRET") ?? "";

const SELF = `${SUPABASE_URL}/functions/v1/wearables-google`;
const SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
];
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_DAYS = 35;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}

function back(returnTo: string, ok: boolean): Response {
  const sep = returnTo.includes("?") ? "&" : "?";
  return new Response(null, { status: 302, headers: { location: `${returnTo}${sep}google=${ok ? "ok" : "no"}` } });
}

async function caller(authorization: string): Promise<string | null> {
  if (!authorization) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: authorization } });
  if (!res.ok) return null;
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  return typeof user?.id === "string" ? user.id : null;
}

/** PostgREST as the server, for the two locked tables only. */
function admin(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function start(userId: string, returnTo: unknown): Promise<Response> {
  if (typeof returnTo !== "string" || !returnTo.startsWith("cheekuai://") || returnTo.length > 200) {
    return json({ error: "bad_request" }, 400);
  }
  const state = randomState();
  // Old states for this person go; one sign-in at a time.
  await admin(`wearable_link_states?user_id=eq.${userId}`, { method: "DELETE" });
  const saved = await admin("wearable_link_states", {
    method: "POST",
    body: { state, user_id: userId, provider: "google_health", return_to: returnTo },
  });
  if (!saved.ok) return json({ error: "not_ready" }, 503);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", SELF);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return json({ url: url.toString() });
}

async function callback(params: URLSearchParams): Promise<Response> {
  const state = params.get("state") ?? "";
  if (!/^[0-9a-f]{64}$/.test(state)) return new Response("Link expired. Go back to Cheeku and try again.", { status: 400 });
  const found = await admin(`wearable_link_states?state=eq.${state}&select=user_id,return_to,created_at`);
  const rows = (await found.json().catch(() => [])) as { user_id: string; return_to: string; created_at: string }[];
  await admin(`wearable_link_states?state=eq.${state}`, { method: "DELETE" });
  const row = rows[0];
  if (!row) return new Response("Link expired. Go back to Cheeku and try again.", { status: 400 });
  if (Date.now() - Date.parse(row.created_at) > STATE_TTL_MS) return back(row.return_to, false);

  const code = params.get("code");
  if (!code) return back(row.return_to, false);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: SELF,
      grant_type: "authorization_code",
    }),
  });
  const token = (await tokenRes.json().catch(() => null)) as { refresh_token?: string; scope?: string } | null;
  if (!tokenRes.ok || !token?.refresh_token) return back(row.return_to, false);

  const saved = await admin("wearable_links?on_conflict=user_id,provider", {
    method: "POST",
    prefer: "resolution=merge-duplicates",
    body: { user_id: row.user_id, provider: "google_health", refresh_token: token.refresh_token, scopes: (token.scope ?? "").slice(0, 1000) },
  });
  return back(row.return_to, saved.ok);
}

async function refreshToken(userId: string): Promise<string | null> {
  const res = await admin(`wearable_links?user_id=eq.${userId}&provider=eq.google_health&select=refresh_token`);
  const rows = (await res.json().catch(() => [])) as { refresh_token: string }[];
  return rows[0]?.refresh_token ?? null;
}

async function accessToken(refresh: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: refresh, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "refresh_token" }),
  });
  const out = (await res.json().catch(() => null)) as { access_token?: string } | null;
  return res.ok && out?.access_token ? out.access_token : null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function civil(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return { date: { year, month, day: date }, time: { hours: 0, minutes: 0 } };
}

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function rollUp(access: string, dataType: string, from: string, to: string): Promise<Point[]> {
  const res = await fetch(`https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "content-type": "application/json" },
    body: JSON.stringify({ range: { start: civil(from), end: civil(nextDay(to)) }, windowSizeDays: 1 }),
  });
  if (!res.ok) return [];
  const out = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const list = (out?.rollupDataPoints ?? out?.dataPoints ?? []) as Point[];
  return Array.isArray(list) ? list : [];
}

async function days(userId: string, body: Record<string, unknown>): Promise<Response> {
  const from = typeof body.from === "string" && DAY.test(body.from) ? body.from : "";
  const to = typeof body.to === "string" && DAY.test(body.to) ? body.to : "";
  if (!from || !to || from > to) return json({ error: "bad_request" }, 400);
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > MAX_DAYS) return json({ error: "too_long" }, 400);

  const refresh = await refreshToken(userId);
  if (!refresh) return json({ days: [], linked: false });
  const access = await accessToken(refresh);
  if (!access) return json({ days: [], linked: false });

  const types = ["steps", "distance", "total-calories", "sleep", "daily-resting-heart-rate", "daily-heart-rate-variability", "weight"] as const;
  const results = await Promise.all(types.map((t) => rollUp(access, t, from, to)));
  const byType = Object.fromEntries(types.map((t, i) => [t, results[i]]));
  return json({ days: toDays(byType, from, to), linked: true });
}

async function disconnect(userId: string): Promise<Response> {
  const refresh = await refreshToken(userId);
  if (refresh) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refresh)}`, { method: "POST" }).catch(() => null);
  }
  await admin(`wearable_links?user_id=eq.${userId}&provider=eq.google_health`, { method: "DELETE" });
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!CLIENT_ID || !CLIENT_SECRET || !SERVICE_KEY) return json({ error: "not_configured" }, 503);

  if (req.method === "GET") return callback(new URL(req.url).searchParams);
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const userId = await caller(req.headers.get("Authorization") ?? "");
  if (!userId) return json({ error: "signed_out" }, 401);

  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  switch (body.action) {
    case "start":
      return start(userId, body.returnTo);
    case "days":
      return days(userId, body);
    case "disconnect":
      return disconnect(userId);
    default:
      return json({ error: "bad_request" }, 400);
  }
});
