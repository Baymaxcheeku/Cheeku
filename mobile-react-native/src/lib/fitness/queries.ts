import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";

import type { ActivityId } from "./catalog";
import { fitnessNetwork, type Session, type Studio } from "./provider";

/*
 * Fitness bookings in Supabase (migration 0039).
 *
 * Booking is two steps: the network holds the seat (today the preview
 * network, later the partner's API), then `create_fitness_booking` records it,
 * prices it with the server's own markup and writes the inbox row. Rows are
 * read straight from `fitness_bookings` (RLS: own rows). Before 0039 is
 * applied the list is simply empty and booking says so in plain words.
 */

export const FITNESS_BOOKINGS_KEY = ["fitness-bookings"] as const;

export type FitnessStatus = "booked" | "checked_in" | "attended" | "cancelled" | "missed";

export type FitnessBooking = {
  id: string;
  profileId: string;
  provider: string;
  providerRef: string;
  studioId: string;
  studioName: string;
  area: string | null;
  lat: number | null;
  lng: number | null;
  activity: ActivityId;
  title: string;
  startsAt: string;
  durationMin: number;
  basePrice: number;
  markup: number;
  price: number;
  status: FitnessStatus;
  checkinCode: string;
  reason: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  profile_id: string;
  provider: string;
  provider_ref: string;
  studio_id: string;
  studio_name: string;
  area: string | null;
  lat: number | null;
  lng: number | null;
  activity: ActivityId;
  session_title: string;
  starts_at: string;
  duration_min: number;
  base_price: number;
  markup: number;
  price: number;
  status: FitnessStatus;
  checkin_code: string;
  reason: string | null;
  created_at: string;
};

const missing = (message: string | undefined) => Boolean(message && /relation .* does not exist|could not find the (table|function)|function .* does not exist/i.test(message));

export function toFitnessBooking(r: Row): FitnessBooking {
  return {
    id: r.id,
    profileId: r.profile_id,
    provider: r.provider,
    providerRef: r.provider_ref,
    studioId: r.studio_id,
    studioName: r.studio_name,
    area: r.area,
    lat: r.lat,
    lng: r.lng,
    activity: r.activity,
    title: r.session_title,
    startsAt: r.starts_at,
    durationMin: r.duration_min,
    basePrice: r.base_price,
    markup: r.markup,
    price: r.price,
    status: r.status,
    checkinCode: r.checkin_code,
    reason: r.reason,
    createdAt: r.created_at,
  };
}

export async function fetchFitnessBookings(): Promise<FitnessBooking[]> {
  const { data, error } = await supabase.from("fitness_bookings").select("*").order("starts_at", { ascending: false }).limit(60);
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(`fetchFitnessBookings: ${error.message}`);
  }
  return ((data ?? []) as Row[]).map(toFitnessBooking);
}

export function useFitnessBookings(enabled = true) {
  return useQuery({ queryKey: FITNESS_BOOKINGS_KEY, queryFn: fetchFitnessBookings, staleTime: 30_000, enabled });
}

/** Booked and still ahead, soonest first. */
export function upcoming(list: readonly FitnessBooking[], now = Date.now()): FitnessBooking[] {
  return list
    .filter((b) => b.status === "booked" && Date.parse(b.startsAt) + b.durationMin * 60_000 > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Cancelling closes an hour before the class (cancel_fitness_booking). */
export const canCancel = (b: FitnessBooking, now = Date.now()) => b.status === "booked" && Date.parse(b.startsAt) - now > 60 * 60_000;

export type FitnessBookResult = { ok: true; id: string } | { ok: false; message: string };

export async function bookFitness(input: { profileId: string; forName: string; session: Session; studio: Studio; reason: string | null }): Promise<FitnessBookResult> {
  const net = fitnessNetwork();
  const held = await net.book({ session: input.session, studio: input.studio, forName: input.forName });
  if (!held.ok) return held;
  const { data, error } = await supabase.rpc("create_fitness_booking", {
    p_profile: input.profileId,
    p_provider: net.id,
    p_provider_ref: held.reference,
    p_studio_id: input.studio.id,
    p_studio_name: input.studio.name,
    p_area: input.studio.area,
    p_lat: input.studio.lat,
    p_lng: input.studio.lng,
    p_activity: input.session.activity,
    p_title: input.session.title,
    p_starts_at: input.session.startsAt,
    p_duration: input.session.durationMin,
    p_base_price: input.session.basePrice,
    p_checkin: held.checkinCode,
    p_reason: input.reason,
  });
  if (error || !data) {
    void net.cancel(held.reference);
    const m = error?.message ?? "";
    if (missing(m)) return { ok: false, message: "Fitness booking switches on with the next database update. Nothing was booked." };
    if (m.includes("not covered")) return { ok: false, message: "That family member isn't covered by your plan. Upgrade to Family to book for them." };
    if (m.includes("already booked")) return { ok: false, message: `${input.forName} already has a class at that time.` };
    if (m.includes("two weeks")) return { ok: false, message: "That class starts too soon. Pick a later one." };
    if (m.includes("twelve")) return { ok: false, message: "That's twelve classes ahead already. Book more after a few are done." };
    if (m.includes("required uses")) return { ok: false, message: "Agree to the required uses in Privacy first." };
    return { ok: false, message: "That didn't book. Check your connection and try again." };
  }
  return { ok: true, id: data as string };
}

export async function cancelFitness(b: FitnessBooking): Promise<boolean> {
  const { data, error } = await supabase.rpc("cancel_fitness_booking", { p_id: b.id });
  if (error || data !== true) return false;
  void fitnessNetwork().cancel(b.providerRef);
  return true;
}
