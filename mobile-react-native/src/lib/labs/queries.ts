import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { create } from "zustand";

import { supabase } from "@/lib/supabase/client";

import type { BookingStatus, Catalog, LabOffer, LabPartner, LabTest, SlotWindow } from "./logic";

/*
 * Lab data from Supabase (migration 0027), and the cart.
 *
 * The catalogue is one query cached for an hour: it changes when a partner
 * feed changes, not while someone is browsing. Bookings are read straight from
 * `lab_bookings` (RLS: own rows), and every write goes through a database
 * function that prices and checks it; the app never states a price the
 * database did not compute.
 */

export const CATALOG_KEY = ["lab-catalog"] as const;
export const BOOKINGS_KEY = ["lab-bookings"] as const;

export async function fetchCatalog(): Promise<Catalog> {
  const [p, t, o] = await Promise.all([
    supabase.from("lab_partners").select("*").order("name"),
    supabase.from("lab_tests").select("*").order("popular", { ascending: false }).order("name"),
    supabase.from("lab_offers").select("*"),
  ]);
  const error = p.error ?? t.error ?? o.error;
  if (error) throw new Error(`fetchCatalog: ${error.message}`);
  return {
    partners: (p.data ?? []).map(
      (r): LabPartner => ({
        id: r.id,
        name: r.name,
        monogram: r.monogram,
        tagline: r.tagline,
        about: r.about,
        accreditation: r.accreditation ?? [],
        collectionFee: r.collection_fee,
        freeCollectionAbove: r.free_collection_above,
        reportHours: r.report_hours,
        color: r.color,
        isSample: r.is_sample,
      }),
    ),
    tests: (t.data ?? []).map(
      (r): LabTest => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        categories: r.categories ?? [],
        sample: r.sample,
        fastingHours: r.fasting_hours,
        parameters: r.parameters,
        includes: r.includes ?? [],
        about: r.about,
        keywords: r.keywords ?? [],
        basePrice: r.base_price,
        popular: r.popular,
      }),
    ),
    offers: (o.data ?? []).map((r): LabOffer => ({ partnerId: r.partner_id, testId: r.test_id, price: r.price, mrp: r.mrp })),
  };
}

export function useCatalog() {
  return useQuery({ queryKey: CATALOG_KEY, queryFn: fetchCatalog, staleTime: 60 * 60 * 1000 });
}

export type LabBooking = {
  id: string;
  profileId: string;
  partnerId: string;
  tests: string[];
  subtotal: number;
  collectionFee: number;
  total: number;
  slotDate: string;
  slotWindow: SlotWindow;
  address: string;
  status: BookingStatus;
  statusAt: string;
  resultDocumentId: string | null;
  createdAt: string;
};

type BookingRow = {
  id: string;
  profile_id: string;
  partner_id: string;
  tests: string[];
  subtotal: number;
  collection_fee: number;
  total: number;
  slot_date: string;
  slot_window: SlotWindow;
  address: string;
  status: BookingStatus;
  status_at: string;
  result_document_id: string | null;
  created_at: string;
};

function toBooking(r: BookingRow): LabBooking {
  return {
    id: r.id,
    profileId: r.profile_id,
    partnerId: r.partner_id,
    tests: r.tests,
    subtotal: r.subtotal,
    collectionFee: r.collection_fee,
    total: r.total,
    slotDate: r.slot_date,
    slotWindow: r.slot_window,
    address: r.address,
    status: r.status,
    statusAt: r.status_at,
    resultDocumentId: r.result_document_id,
    createdAt: r.created_at,
  };
}

/** Brings statuses up to date (the partner feed stand-in), then reads them. */
export async function fetchBookings(): Promise<LabBooking[]> {
  await supabase.rpc("sync_lab_bookings");
  const { data, error } = await supabase.from("lab_bookings").select("*").order("slot_date", { ascending: false }).limit(40);
  if (error) throw new Error(`fetchBookings: ${error.message}`);
  return ((data ?? []) as BookingRow[]).map(toBooking);
}

/**
 * Every lab booking on the account. A booking's result lands as a document,
 * so when one turns "ready" the records and the inbox are refreshed too.
 */
export function useLabBookings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: BOOKINGS_KEY, queryFn: fetchBookings, staleTime: 30_000 });
  const readyCount = (q.data ?? []).filter((b) => b.status === "ready").length;
  useEffect(() => {
    if (readyCount === 0) return;
    void qc.invalidateQueries({ queryKey: ["records"] });
    void qc.invalidateQueries({ queryKey: ["health-overview"] });
  }, [readyCount, qc]);
  return q;
}

export type BookResult = { ok: true; id: string } | { ok: false; message: string };

export async function bookLab(input: {
  profileId: string;
  partnerId: string;
  tests: string[];
  date: string;
  window: SlotWindow;
  address: string;
  prescriptionId?: string | null;
}): Promise<BookResult> {
  const { data, error } = await supabase.rpc("create_lab_booking", {
    p_profile: input.profileId,
    p_partner: input.partnerId,
    p_tests: input.tests,
    p_date: input.date,
    p_window: input.window,
    p_address: input.address,
    p_prescription: input.prescriptionId ?? null,
  });
  if (error || !data) {
    const m = error?.message ?? "";
    if (m.includes("not covered")) return { ok: false, message: "That family member isn't covered by your plan. Upgrade to Family to book for them." };
    if (m.includes("does not offer")) return { ok: false, message: "This lab doesn't do every test in your cart. Pick another lab or remove a test." };
    if (m.includes("two weeks")) return { ok: false, message: "Pick a day in the next two weeks." };
    return { ok: false, message: "That didn't book. Check your connection and try again." };
  }
  return { ok: true, id: data as string };
}

export async function cancelLab(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("cancel_lab_booking", { p_id: id });
  return !error && data === true;
}

/** PREVIEW ONLY: one stage forward. Refused by the database once demo_labs is off. */
export async function advanceLabDemo(id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("advance_lab_booking_demo", { p_id: id });
  return error ? null : (data as string);
}

// ---------------------------------------------------------------- reviews --

export type Rating = { rating: number; reviews: number };
export type Review = { id: string; author: string; city: string | null; rating: number; body: string; createdAt: string; isSample: boolean; mine: boolean };

export async function fetchRatings(kind: "doctor" | "lab"): Promise<Map<string, Rating>> {
  const { data, error } = await supabase.from("provider_ratings").select("*").eq("provider_kind", kind);
  if (error) throw new Error(`fetchRatings: ${error.message}`);
  return new Map((data ?? []).map((r) => [r.provider_id as string, { rating: Number(r.rating), reviews: r.reviews as number }]));
}

export function useRatings(kind: "doctor" | "lab") {
  return useQuery({ queryKey: ["ratings", kind], queryFn: () => fetchRatings(kind), staleTime: 5 * 60 * 1000 });
}

export async function fetchReviews(kind: "doctor" | "lab", id: string): Promise<Review[]> {
  const [{ data, error }, { data: me }] = await Promise.all([
    supabase.from("provider_reviews").select("*").eq("provider_kind", kind).eq("provider_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.auth.getUser(),
  ]);
  if (error) throw new Error(`fetchReviews: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    author: r.author,
    city: r.city,
    rating: r.rating,
    body: r.body,
    createdAt: r.created_at,
    isSample: r.is_sample,
    mine: Boolean(me.user && r.user_id === me.user.id),
  }));
}

export async function submitReview(input: { kind: "doctor" | "lab"; id: string; rating: number; body: string; author: string }): Promise<{ ok: boolean; message?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in again to leave a review." };
  const body = input.body.trim();
  if (body.length < 3) return { ok: false, message: "Say a few words about it." };
  const { error } = await supabase.from("provider_reviews").upsert(
    {
      provider_kind: input.kind,
      provider_id: input.id,
      user_id: user.id,
      author: input.author.slice(0, 40) || "Cheeku user",
      rating: input.rating,
      body: body.slice(0, 600),
    },
    { onConflict: "user_id,provider_kind,provider_id" },
  );
  if (error) return { ok: false, message: "That didn't post. Try again." };
  return { ok: true };
}

// ------------------------------------------------------------------- cart --

/*
 * What someone is booking, across the lab screens. In memory only: a
 * half-built order has no business surviving a restart on a shared phone,
 * the same rule as the doctor booking draft.
 */
type Cart = {
  tests: string[];
  partnerId: string | null;
  prescriptionId: string | null;
  toggle: (id: string) => void;
  add: (ids: string[]) => void;
  remove: (id: string) => void;
  setPartner: (id: string | null) => void;
  setPrescription: (id: string | null) => void;
  clear: () => void;
};

export const useLabCart = create<Cart>((set, get) => ({
  tests: [],
  partnerId: null,
  prescriptionId: null,
  toggle: (id) => set({ tests: get().tests.includes(id) ? get().tests.filter((x) => x !== id) : [...get().tests, id] }),
  add: (ids) => set({ tests: [...new Set([...get().tests, ...ids])] }),
  remove: (id) => set({ tests: get().tests.filter((x) => x !== id) }),
  setPartner: (partnerId) => set({ partnerId }),
  setPrescription: (prescriptionId) => set({ prescriptionId }),
  clear: () => set({ tests: [], partnerId: null, prescriptionId: null }),
}));
