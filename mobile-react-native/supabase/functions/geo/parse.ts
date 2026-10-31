// Turns what each geocoding provider answers into one Place shape.
//
// Pure functions only (no Deno, no fetch), so the app's test suite can check
// them against real-looking answers: mobile-react-native/src/lib/location/
// geo-parse.test.ts imports this file directly.

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
