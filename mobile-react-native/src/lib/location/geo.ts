import * as Location from "expo-location";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase/client";

import type { Place } from "../../../../supabase/functions/geo/parse";

export type { Place };

/*
 * Address lookups, through our own geo Edge Function (Ola Maps, with
 * OpenStreetMap behind it). The app never holds a maps key and never calls a
 * maps provider itself. When the function is not reachable, a phone falls
 * back to its own system geocoder; the web keeps the point and says "Near you".
 */

export const CITIES: readonly { label: string; lat: number; lng: number; state: string }[] = [
  { label: "Bengaluru", lat: 12.9716, lng: 77.5946, state: "Karnataka" },
  { label: "Mumbai", lat: 19.076, lng: 72.8777, state: "Maharashtra" },
  { label: "Delhi", lat: 28.6139, lng: 77.209, state: "Delhi" },
  { label: "Gurugram", lat: 28.4595, lng: 77.0266, state: "Haryana" },
  { label: "Noida", lat: 28.5355, lng: 77.391, state: "Uttar Pradesh" },
  { label: "Hyderabad", lat: 17.385, lng: 78.4867, state: "Telangana" },
  { label: "Chennai", lat: 13.0827, lng: 80.2707, state: "Tamil Nadu" },
  { label: "Pune", lat: 18.5204, lng: 73.8567, state: "Maharashtra" },
  { label: "Kolkata", lat: 22.5726, lng: 88.3639, state: "West Bengal" },
  { label: "Ahmedabad", lat: 23.0225, lng: 72.5714, state: "Gujarat" },
  { label: "Jaipur", lat: 26.9124, lng: 75.7873, state: "Rajasthan" },
  { label: "Lucknow", lat: 26.8467, lng: 80.9462, state: "Uttar Pradesh" },
  { label: "Chandigarh", lat: 30.7333, lng: 76.7794, state: "Chandigarh" },
  { label: "Kochi", lat: 9.9312, lng: 76.2673, state: "Kerala" },
  { label: "Indore", lat: 22.7196, lng: 75.8577, state: "Madhya Pradesh" },
  { label: "Coimbatore", lat: 11.0168, lng: 76.9558, state: "Tamil Nadu" },
];

export const cityPlace = (c: (typeof CITIES)[number]): Place => ({
  lat: c.lat,
  lng: c.lng,
  label: c.label,
  locality: null,
  city: c.label,
  district: null,
  state: c.state,
  pincode: null,
  countryCode: "IN",
  formatted: `${c.label}, ${c.state}`,
  provider: "none",
});

/** A bare point with no address yet. */
export const pointPlace = (lat: number, lng: number): Place => ({ lat, lng, label: "Near you", locality: null, city: null, district: null, state: null, pincode: null, countryCode: null, formatted: null, provider: "none" });

export type GeoError = "daily_limit" | "offline" | "none";

async function invoke<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: GeoError | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("geo", { body });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      return { data: null, error: status === 429 ? "daily_limit" : "offline" };
    }
    return { data: data as T, error: null };
  } catch {
    return { data: null, error: "offline" };
  }
}

/** The address at a point: our function first, then the phone's own geocoder. */
export async function reverseGeocode(lat: number, lng: number): Promise<{ place: Place; error: GeoError | null }> {
  const res = await invoke<{ place?: Place }>({ op: "reverse", lat, lng });
  if (res.data?.place) return { place: { ...res.data.place, lat, lng }, error: null };
  if (Platform.OS !== "web") {
    try {
      const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (g) {
        const locality = g.district ?? g.subregion ?? null;
        const city = g.city ?? null;
        const label = [locality, city].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(", ") || g.region || "Near you";
        return {
          place: { lat, lng, label, locality, city, district: g.subregion ?? null, state: g.region ?? null, pincode: g.postalCode && /^[1-9][0-9]{5}$/.test(g.postalCode) ? g.postalCode : null, countryCode: g.isoCountryCode ?? null, formatted: [g.name, g.street, locality, city, g.region, g.postalCode].filter(Boolean).join(", ") || null, provider: "device" },
          error: res.error,
        };
      }
    } catch {
      // Fall through to a bare point.
    }
  }
  return { place: pointPlace(lat, lng), error: res.error };
}

/** Places matching a few typed words, nearest the given point first when there is one. */
export async function searchPlaces(q: string, near: { lat: number; lng: number } | null): Promise<{ places: Place[]; error: GeoError | null }> {
  const words = q.trim();
  const local = CITIES.filter((c) => c.label.toLowerCase().startsWith(words.toLowerCase())).map(cityPlace);
  if (words.length < 2) return { places: local, error: null };
  const res = await invoke<{ places?: Place[] }>({ op: "search", q: words, ...(near ? { lat: near.lat, lng: near.lng } : {}) });
  const found = res.data?.places ?? [];
  const seen = new Set(found.map((p) => p.label.toLowerCase()));
  return { places: [...found, ...local.filter((c) => !seen.has(c.label.toLowerCase()))].slice(0, 8), error: res.error };
}
