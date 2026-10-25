import { useQuery, type QueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { create } from "zustand";

import { kv } from "@/lib/storage";
import { supabase } from "@/lib/supabase/client";
import { sessionUser } from "@/lib/supabase/session";

import { reverseGeocode, type GeoError, type Place } from "./geo";
import { distanceKm, shouldGeocode, shouldSave } from "./rules";

/*
 * WHERE THIS PHONE IS, AND WHERE EACH MEMBER LIVES (loc-live).
 *
 * Two sources, one answer per member:
 *   - the phone: a GPS fix while the app is open (live.ts keeps it fresh),
 *     looked up into an address and saved to the account holder's row in
 *     member_locations (migration 0040);
 *   - a picked place: searched or a city, for anyone ("Papa lives in
 *     Lucknow"), saved to that member's row.
 *
 * The phone's copy is kept in kv, tied to the account that wrote it, so the
 * next open shows the place at once instead of "Finding you".
 */

export type Source = "gps" | "search" | "city";
export type Fix = { place: Place; accuracy: number | null; at: number; source: Source };
export type Permission = "unknown" | "undetermined" | "granted" | "denied";

type Saved = { uid: string; fix: Fix | null; live: boolean; pinnedUntil: number };

const KEY = "cheeku.location";

type State = {
  hydrated: boolean;
  fix: Fix | null;
  /** Keep the phone's place up to date while the app is open. */
  live: boolean;
  /** A picked place holds until then, so a booking for elsewhere is not overridden. */
  pinnedUntil: number;
  permission: Permission;
  locating: boolean;
  error: GeoError | "denied" | "unavailable" | null;
  /** When the server last got the phone's place. */
  savedAt: number;
  savedPlace: Place | null;
};

export const useLocationStore = create<State>(() => ({
  hydrated: false,
  fix: null,
  live: true,
  pinnedUntil: 0,
  permission: "unknown",
  locating: false,
  error: null,
  savedAt: 0,
  savedPlace: null,
}));

const set = (s: Partial<State>) => useLocationStore.setState(s);

async function persist() {
  const me = await sessionUser().catch(() => null);
  if (!me) return;
  const { fix, live, pinnedUntil } = useLocationStore.getState();
  const saved: Saved = { uid: me.id, fix, live, pinnedUntil };
  await kv.set(KEY, JSON.stringify(saved)).catch(() => undefined);
}

export async function hydrateLocation(): Promise<void> {
  if (useLocationStore.getState().hydrated) return;
  try {
    const raw = await kv.get(KEY);
    const me = await sessionUser();
    const s = raw ? (JSON.parse(raw) as Saved) : null;
    // Another account's place is never shown, even for a frame.
    if (s && me && s.uid === me.id) set({ fix: s.fix, live: s.live !== false, pinnedUntil: s.pinnedUntil ?? 0 });
  } catch {
    // A broken copy is just no copy.
  }
  set({ hydrated: true });
}

export async function readPermission(): Promise<Permission> {
  try {
    const p = await Location.getForegroundPermissionsAsync();
    const v: Permission = p.status === "granted" ? "granted" : p.status === "denied" ? "denied" : "undetermined";
    set({ permission: v });
    return v;
  } catch {
    set({ permission: "undetermined" });
    return "undetermined";
  }
}

// ----------------------------------------------------------- the server --

export const MEMBER_LOCATIONS_KEY = ["member-locations"] as const;

export type MemberLocation = Place & { profileId: string; source: Source | "manual"; accuracy: number | null; capturedAt: string };

type Row = {
  profile_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  label: string | null;
  locality: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  country_code: string | null;
  formatted: string | null;
  source: MemberLocation["source"];
  provider: Place["provider"];
  captured_at: string;
};

const missing = (m: string | undefined) => Boolean(m && /relation .* does not exist|could not find the (table|function)|function .* does not exist/i.test(m));

export async function fetchMemberLocations(): Promise<Record<string, MemberLocation>> {
  const { data, error } = await supabase.from("member_locations").select("*");
  if (error) {
    if (missing(error.message)) return {};
    throw new Error(`fetchMemberLocations: ${error.message}`);
  }
  const out: Record<string, MemberLocation> = {};
  for (const r of (data ?? []) as Row[]) {
    out[r.profile_id] = {
      profileId: r.profile_id,
      lat: r.lat,
      lng: r.lng,
      accuracy: r.accuracy_m,
      label: r.label ?? r.city ?? "Saved place",
      locality: r.locality,
      city: r.city,
      district: r.district,
      state: r.state,
      pincode: r.pincode,
      countryCode: r.country_code,
      formatted: r.formatted,
      provider: r.provider,
      source: r.source,
      capturedAt: r.captured_at,
    };
  }
  return out;
}

export function useMemberLocations(enabled = true) {
  return useQuery({ queryKey: MEMBER_LOCATIONS_KEY, queryFn: fetchMemberLocations, staleTime: 60_000, enabled });
}

export async function saveMemberLocation(profileId: string, place: Place, source: Source, accuracy: number | null): Promise<"saved" | "unchanged" | "limit" | "failed"> {
  const { data, error } = await supabase.rpc("set_member_location", {
    p_profile: profileId,
    p_lat: place.lat,
    p_lng: place.lng,
    p_accuracy: accuracy === null ? null : Math.round(accuracy),
    p_source: source,
    p_place: { label: place.label, locality: place.locality, city: place.city, district: place.district, state: place.state, pincode: place.pincode, countryCode: place.countryCode, formatted: place.formatted, provider: place.provider },
  });
  if (error) return "failed";
  const reason = (data as { reason?: string } | null)?.reason;
  return reason === "saved" || reason === "unchanged" || reason === "limit" ? reason : "failed";
}

export async function forgetLocations(profileId?: string): Promise<boolean> {
  const { error } = await supabase.rpc("forget_member_location", { p_profile: profileId ?? null });
  if (!profileId) {
    set({ fix: null, savedAt: 0, savedPlace: null, pinnedUntil: 0 });
    await kv.remove(KEY).catch(() => undefined);
  }
  return !error;
}

// -------------------------------------------------------- the phone's fix --

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/**
 * Takes one fix and makes it the phone's place. `prompt` lets the system ask
 * for permission; only call it with true from a tap on our own card.
 */
export async function locateNow(args: { prompt: boolean; primaryId: string | null; qc?: QueryClient; force?: boolean }): Promise<Fix | null> {
  set({ locating: true, error: null });
  try {
    let perm = await readPermission();
    if (perm !== "granted" && args.prompt) {
      const asked = await Location.requestForegroundPermissionsAsync().catch(() => null);
      perm = asked?.status === "granted" ? "granted" : asked?.status === "denied" ? "denied" : "undetermined";
      set({ permission: perm });
    }
    if (perm !== "granted") {
      set({ error: perm === "denied" ? "denied" : null });
      return null;
    }
    const pos =
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 12_000).catch(() => null)) ??
      (await Location.getLastKnownPositionAsync().catch(() => null));
    if (!pos) {
      set({ error: "unavailable" });
      return null;
    }
    if (args.force) set({ pinnedUntil: 0 });
    return await acceptFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null, primaryId: args.primaryId, qc: args.qc });
  } finally {
    set({ locating: false });
    void persist();
  }
}

/** A position from GPS (one-off or the live watch): look it up if it moved, save if it matters. */
export async function acceptFix(args: { lat: number; lng: number; accuracy: number | null; primaryId: string | null; qc?: QueryClient }): Promise<Fix | null> {
  const s = useLocationStore.getState();
  if (s.pinnedUntil > Date.now()) return s.fix;
  const prev = s.fix;
  let place: Place;
  if (shouldGeocode(prev?.place ?? null, args.lat, args.lng)) {
    const res = await reverseGeocode(args.lat, args.lng);
    place = res.place;
    if (res.error === "daily_limit") set({ error: "daily_limit" });
  } else {
    place = { ...(prev?.place as Place), lat: args.lat, lng: args.lng };
  }
  const fix: Fix = { place, accuracy: args.accuracy, at: Date.now(), source: "gps" };
  set({ fix });
  void persist();
  const st = useLocationStore.getState();
  if (args.primaryId && st.live && shouldSave(st.savedPlace, st.savedAt, place)) {
    const r = await saveMemberLocation(args.primaryId, place, "gps", args.accuracy);
    if (r === "saved" || r === "unchanged") {
      set({ savedAt: Date.now(), savedPlace: place });
      if (r === "saved") void args.qc?.invalidateQueries({ queryKey: MEMBER_LOCATIONS_KEY });
    }
  }
  return fix;
}

/** A picked place for the phone's owner: holds for two hours over GPS. */
export async function pinPlace(args: { place: Place; source: Source; primaryId: string | null; qc?: QueryClient }) {
  const fix: Fix = { place: args.place, accuracy: null, at: Date.now(), source: args.source };
  set({ fix, pinnedUntil: Date.now() + 2 * 3_600_000 });
  void persist();
  if (args.primaryId) {
    const r = await saveMemberLocation(args.primaryId, args.place, args.source, null);
    if (r === "saved") {
      set({ savedAt: Date.now(), savedPlace: args.place });
      void args.qc?.invalidateQueries({ queryKey: MEMBER_LOCATIONS_KEY });
    }
  }
}

export function setLive(on: boolean) {
  set({ live: on, ...(on ? {} : { pinnedUntil: 0 }) });
  void persist();
}

export { distanceKm };
