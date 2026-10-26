// geo: turns a point into an address and a few typed words into places.
//
// The app never holds a maps key. It sends { op: "reverse", lat, lng } or
// { op: "search", q, lat?, lng? } and gets back Places in one shape (see
// parse.ts), whatever answered.
//
// WHO ANSWERS.
//   1. Ola Maps (Krutrim), when OLA_MAPS_API_KEY is set: built on Indian
//      data with pincodes and localities, and free up to at least 500,000
//      calls a month per API at the time of writing.
//   2. OpenStreetMap Nominatim otherwise, or when Ola fails: free and keyless
//      but limited to light use (about one request a second, identified by
//      User-Agent), which the cache below keeps us well inside.
//
// COST CONTROL.
//   - geo_cache: a reverse lookup is cached per ~110 m cell and a search per
//     words and rough area, for 30 days. Most opens hit the cache.
//   - geo_quota: at most 300 provider calls per person per day (cache hits
//     are free). Past that the app keeps its last place and says so.
//
// PRIVACY. The point and the words go to the provider; nothing else does
// (no user id, no health data). Nothing here is logged.
//
// Deploy:  supabase functions deploy geo
//          (JWT verification stays ON: only signed-in people can call it)
//          From the dashboard instead: paste supabase/manual/0040-geo-function-paste.ts
//          (this file and parse.ts joined) into Edge Functions > Via Editor.
// Secrets: supabase secrets set OLA_MAPS_API_KEY=<key from maps.olakrutrim.com>
//          (optional; without it OpenStreetMap answers)
// Needs:   migration 0040 (geo_cache, geo_quota, geo_take_quota, geo_prune).

import { parseOlaReverse, parseOlaSearch, parseOsmReverse, parseOsmSearch, reverseKey, searchKey, type Place } from "./parse.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OLA_KEY = Deno.env.get("OLA_MAPS_API_KEY") ?? "";
const DAILY_CAP = 300;
const CACHE_DAYS = 30;
const UA = "CheekuAI-geo/1.0 (+https://cheeku-ai-mobile.vercel.app)";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}

function admin(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

/** The account that signed this request, or null. Asked of Auth, never read from the body. */
async function caller(authorization: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: authorization } });
  if (!res.ok) return null;
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  return typeof user?.id === "string" ? user.id : null;
}

async function cached(key: string): Promise<unknown | null> {
  const res = await admin(`/rest/v1/geo_cache?key=eq.${encodeURIComponent(key)}&select=place,created_at`);
  if (!res.ok) return null;
  const rows = (await res.json().catch(() => [])) as { place: unknown; created_at: string }[];
  const row = rows[0];
  if (!row || Date.now() - Date.parse(row.created_at) > CACHE_DAYS * 86_400_000) return null;
  return row.place;
}

async function remember(key: string, place: unknown, provider: string) {
  await admin("/rest/v1/geo_cache", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key, place, provider, created_at: new Date().toISOString() }),
  }).catch(() => undefined);
}

async function takeQuota(userId: string): Promise<boolean> {
  const res = await admin("/rest/v1/rpc/geo_take_quota", { method: "POST", body: JSON.stringify({ p_user: userId, p_limit: DAILY_CAP }) });
  if (!res.ok) return true; // A broken counter must not take maps down.
  return (await res.json().catch(() => true)) !== false;
}

async function get(url: string, headers: Record<string, string> = {}): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en", ...headers }, signal: AbortSignal.timeout(4500) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const olaId = () => crypto.randomUUID();

async function reverse(lat: number, lng: number): Promise<Place | null> {
  if (OLA_KEY) {
    const body = await get(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${encodeURIComponent(OLA_KEY)}`, { "X-Request-Id": olaId() });
    const place = parseOlaReverse(body, lat, lng);
    if (place) return place;
  }
  const body = await get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=17&lat=${lat}&lon=${lng}`);
  return parseOsmReverse(body, lat, lng);
}

async function search(q: string, near: { lat: number; lng: number } | null): Promise<Place[]> {
  if (OLA_KEY) {
    const loc = near ? `&location=${near.lat},${near.lng}` : "";
    const body = await get(`https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(q)}${loc}&api_key=${encodeURIComponent(OLA_KEY)}`, { "X-Request-Id": olaId() });
    const places = parseOlaSearch(body);
    if (places.length) return places;
  }
  const body = await get(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`);
  return parseOsmSearch(body);
}

const isLat = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= -90 && n <= 90;
const isLng = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= -180 && n <= 180;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return json({ error: "not_configured" }, 503);

  const authorization = req.headers.get("authorization");
  if (!authorization) return json({ error: "signed_out" }, 401);
  const userId = await caller(authorization);
  if (!userId) return json({ error: "signed_out" }, 401);

  const body = (await req.json().catch(() => null)) as { op?: unknown; lat?: unknown; lng?: unknown; q?: unknown } | null;
  if (Math.random() < 0.01) void admin("/rest/v1/rpc/geo_prune", { method: "POST", body: "{}" }).catch(() => undefined);

  if (body?.op === "reverse") {
    if (!isLat(body.lat) || !isLng(body.lng)) return json({ error: "bad_point" }, 400);
    const lat = Math.round(body.lat * 1e5) / 1e5;
    const lng = Math.round(body.lng * 1e5) / 1e5;
    const key = reverseKey(lat, lng);
    const hit = (await cached(key)) as Place | null;
    if (hit) return json({ ok: true, cached: true, place: { ...hit, lat, lng } });
    if (!(await takeQuota(userId))) return json({ error: "daily_limit" }, 429);
    const place = await reverse(lat, lng);
    if (!place) return json({ error: "no_answer" }, 502);
    await remember(key, place, place.provider);
    return json({ ok: true, cached: false, place });
  }

  if (body?.op === "search") {
    const q = typeof body.q === "string" ? body.q.trim() : "";
    if (q.length < 2 || q.length > 80) return json({ error: "bad_query" }, 400);
    const near = isLat(body.lat) && isLng(body.lng) ? { lat: body.lat, lng: body.lng } : null;
    const key = searchKey(q, near);
    const hit = (await cached(key)) as Place[] | null;
    if (hit) return json({ ok: true, cached: true, places: hit });
    if (!(await takeQuota(userId))) return json({ error: "daily_limit" }, 429);
    const places = await search(q, near);
    if (places.length) await remember(key, places, places[0]?.provider ?? "none");
    return json({ ok: true, cached: false, places });
  }

  return json({ error: "unknown_op" }, 400);
});
