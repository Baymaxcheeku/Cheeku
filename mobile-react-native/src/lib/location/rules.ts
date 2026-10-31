import type { Place } from "./geo";

/*
 * When a new fix is worth an address lookup or a server write. Pure, so the
 * tests can pin the numbers: they decide how many geocoding calls a person
 * costs and how fresh "near you" really is.
 */

/** Look the address up again past 250 m, or when there is none yet. */
export const GEOCODE_AFTER_KM = 0.25;
/** Save to the server past 250 m, or every 30 minutes while open. */
export const SAVE_AFTER_KM = 0.25;
export const SAVE_EVERY_MS = 30 * 60_000;

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function shouldGeocode(prev: Place | null, lat: number, lng: number): boolean {
  if (!prev || prev.provider === "none") return true;
  return distanceKm(prev, { lat, lng }) >= GEOCODE_AFTER_KM;
}

export function shouldSave(saved: Place | null, savedAt: number, next: Place, now = Date.now()): boolean {
  if (!saved) return true;
  if (distanceKm(saved, next) >= SAVE_AFTER_KM) return true;
  if (!saved.pincode && next.pincode) return true;
  return now - savedAt >= SAVE_EVERY_MS;
}

/** "Just now", "12 min ago", "3 h ago", "2 days ago". */
export function freshness(at: number | string | null, now = Date.now()): string {
  if (at === null) return "";
  const t = typeof at === "string" ? Date.parse(at) : at;
  const s = Math.max(0, (now - t) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86_400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** The one line a row or chip shows for a place. */
export function placeLine(p: Pick<Place, "label" | "pincode"> | null): string {
  if (!p) return "Not set";
  return p.pincode ? `${p.label} · ${p.pincode}` : p.label;
}

/** An address line for a home visit form, from a looked-up place. */
export function addressFrom(p: Pick<Place, "formatted" | "label" | "pincode"> | null): string {
  if (!p) return "";
  const base = p.formatted ?? p.label;
  return p.pincode && !base.includes(p.pincode) ? `${base}, ${p.pincode}` : base;
}
