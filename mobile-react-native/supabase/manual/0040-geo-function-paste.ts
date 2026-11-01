// geo, as ONE file for the Supabase dashboard editor (Edge Functions > Deploy a new
// function > Via Editor). Same code as supabase/functions/geo/index.ts + parse.ts,
// joined so it can be pasted in one go. Keep the two in step if either changes.

export type Place = {
  lat: number;
  lng: number;
  /** "Indiranagar, Bengaluru": what a chip or a profile row shows. */
  label: string;
  locality: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  countryCode: string | null;
  formatted: string | null;
  provider: "ola" | "osm" | "device" | "none";
};

type Component = { long_name?: string; short_name?: string; types?: string[] };

const clean = (s: unknown, max = 60): string | null => {
  if (typeof s !== "string") return null;
  const t = s.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};

const pin = (s: unknown): string | null => {
  const t = typeof s === "string" ? s.replace(/\s/g, "") : "";
  return /^[1-9][0-9]{5}$/.test(t) ? t : null;
};

const num = (n: unknown): number | null => {
  const v = typeof n === "string" ? Number(n) : n;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

/** "Indiranagar, Bengaluru", or the best one or two names there are. */
export function labelFor(p: Pick<Place, "locality" | "city" | "district" | "state" | "formatted">): string {
  const parts = [p.locality, p.city ?? p.district].filter((x): x is string => Boolean(x));
  const uniq = parts.filter((x, i) => parts.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
  const label = uniq.join(", ") || p.state || p.formatted?.split(",").slice(0, 2).join(",").trim() || "Near you";
  return label.slice(0, 80);
}

function fromComponents(components: Component[]) {
  const get = (...types: string[]) => {
    for (const t of types) {
      const c = components.find((x) => x.types?.includes(t));
      if (c?.long_name) return c;
    }
    return null;
  };
  return {
    locality: clean(get("sublocality_level_1", "sublocality", "neighborhood", "sublocality_level_2")?.long_name),
    city: clean(get("locality", "administrative_area_level_3")?.long_name),
    district: clean(get("administrative_area_level_2")?.long_name),
    state: clean(get("administrative_area_level_1")?.long_name),
    pincode: pin(get("postal_code")?.long_name),
    countryCode: clean(get("country")?.short_name, 2)?.toUpperCase() ?? null,
  };
}

/** Ola Maps reverse geocode (Google-style `results`). */
export function parseOlaReverse(body: unknown, lat: number, lng: number): Place | null {
  const results = (body as { results?: unknown })?.results;
  if (!Array.isArray(results) || !results.length) return null;
  const r = results[0] as { formatted_address?: string; address_components?: Component[] };
  const parts = fromComponents(Array.isArray(r.address_components) ? r.address_components : []);
  const formatted = clean(r.formatted_address, 200);
  const place = { lat, lng, ...parts, formatted, provider: "ola" as const, label: "" };
  place.label = labelFor(place);
  return place;
}

/** Ola Maps autocomplete `predictions`, with their coordinates. */
export function parseOlaSearch(body: unknown): Place[] {
  const preds = (body as { predictions?: unknown })?.predictions;
  if (!Array.isArray(preds)) return [];
  const out: Place[] = [];
  for (const p of preds as {
    description?: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
    geometry?: { location?: { lat?: unknown; lng?: unknown } };
    terms?: { value?: string }[];
  }[]) {
    const lat = num(p.geometry?.location?.lat);
    const lng = num(p.geometry?.location?.lng);
    if (lat === null || lng === null) continue;
    const main = clean(p.structured_formatting?.main_text);
    const secondary = clean(p.structured_formatting?.secondary_text, 200);
    const terms = (p.terms ?? []).map((t) => clean(t.value)).filter((x): x is string => Boolean(x));
    const formatted = clean(p.description, 200);
    const pinMatch = formatted?.match(/\b[1-9][0-9]{5}\b/)?.[0] ?? null;
    const city = terms.length >= 3 ? terms[terms.length - 3] ?? null : (secondary?.split(",")[0]?.trim() ?? null);
    const state = terms.length >= 2 ? terms[terms.length - 2] ?? null : null;
    const place: Place = { lat, lng, locality: main, city: city === main ? null : city, district: null, state, pincode: pin(pinMatch), countryCode: "IN", formatted, provider: "ola", label: "" };
    place.label = labelFor(place);
    out.push(place);
  }
  return out.slice(0, 8);
}

type OsmAddress = Record<string, string | undefined>;

function fromOsm(a: OsmAddress) {
  return {
    locality: clean(a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? a.residential ?? a.hamlet),
    city: clean(a.city ?? a.town ?? a.village ?? a.municipality),
    district: clean(a.state_district ?? a.county),
    state: clean(a.state),
    pincode: pin(a.postcode),
    countryCode: clean(a.country_code, 2)?.toUpperCase() ?? null,
  };
}

/** OpenStreetMap Nominatim reverse (format=jsonv2, addressdetails=1). */
export function parseOsmReverse(body: unknown, lat: number, lng: number): Place | null {
  const b = body as { address?: OsmAddress; display_name?: string; error?: string };
  if (!b || b.error || !b.address) return null;
  const place = { lat, lng, ...fromOsm(b.address), formatted: clean(b.display_name, 200), provider: "osm" as const, label: "" };
  place.label = labelFor(place);
  return place;
}

/** OpenStreetMap Nominatim search (format=jsonv2, addressdetails=1). */
export function parseOsmSearch(body: unknown): Place[] {
  if (!Array.isArray(body)) return [];
  const out: Place[] = [];
  for (const r of body as { lat?: unknown; lon?: unknown; display_name?: string; address?: OsmAddress; name?: string }[]) {
    const lat = num(r.lat);
    const lng = num(r.lon);
    if (lat === null || lng === null || !r.address) continue;
    const parts = fromOsm(r.address);
    const name = clean(r.name);
    const place: Place = { lat, lng, ...parts, locality: parts.locality ?? (name && name !== parts.city ? name : null), formatted: clean(r.display_name, 200), provider: "osm", label: "" };
    place.label = labelFor(place);
    out.push(place);
  }
  return out.slice(0, 8);
}

/** Cache keys: a reverse lookup by ~110 m cell, a search by its words and rough area. */
export const reverseKey = (lat: number, lng: number) => `r:${lat.toFixed(3)},${lng.toFixed(3)}`;
export const searchKey = (q: string, near: { lat: number; lng: number } | null) =>
  `s:${q.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80)}|${near ? `${near.lat.toFixed(1)},${near.lng.toFixed(1)}` : "-"}`;

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
