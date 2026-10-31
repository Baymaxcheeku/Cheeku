import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";

import { RX_VERSION, scoreAndStore, type Rest, type Scorecard } from "./engine";

/*
 * The prescription scorecard, three ways, in the order that keeps it fast and
 * always available:
 *
 *   1. The card already kept in rx_scorecards (migration 0042), if it was
 *      scored with today's rules. Opens instantly, the same on every phone.
 *   2. The rx-score Edge Function: scores it as the person and keeps it.
 *   3. The same code on the phone, when the function isn't deployed or can't
 *      be reached. It reads and writes with the person's own token, so RLS
 *      applies exactly as it does to the function.
 *
 * Editing a prescription clears its kept card (a trigger in 0042), so the
 * next open scores it afresh.
 */

export type { Scorecard } from "./engine";

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function kept(documentId: string): Promise<Scorecard | null> {
  const { data, error } = await supabase.from("rx_scorecards").select("version, card").eq("document_id", documentId).maybeSingle();
  if (error || !data) return null;
  return (data.version as number) === RX_VERSION ? (data.card as Scorecard) : null;
}

async function viaFunction(documentId: string): Promise<Scorecard | null> {
  const { data, error } = await supabase.functions.invoke("rx-score", { body: { documentId } });
  if (error || !data || typeof data !== "object") return null;
  const card = (data as { card?: Scorecard }).card;
  return card && card.version === RX_VERSION ? card : null;
}

async function onPhone(documentId: string): Promise<Scorecard | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token || !URL_) throw new Error("signed out");
  const rest: Rest = (path, init = {}) =>
    fetch(`${URL_}${path}`, { method: init.method ?? "GET", body: init.body, headers: { apikey: ANON, Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  return scoreAndStore(rest, documentId);
}

export async function fetchScorecard(documentId: string, fresh = false): Promise<Scorecard | null> {
  if (!fresh) {
    const card = await kept(documentId);
    if (card) return card;
  }
  return (await viaFunction(documentId)) ?? (await onPhone(documentId));
}

export const scorecardKey = (documentId: string) => ["rx-scorecard", documentId] as const;

export function useScorecard(documentId: string | undefined) {
  return useQuery({
    queryKey: scorecardKey(documentId ?? ""),
    queryFn: () => fetchScorecard(documentId as string),
    enabled: Boolean(documentId),
    staleTime: 60_000,
    retry: 1,
  });
}

/** Score again with the latest records, ignoring the kept card. */
export function useRescore() {
  const qc = useQueryClient();
  return async (documentId: string) => {
    const card = await fetchScorecard(documentId, true);
    qc.setQueryData(scorecardKey(documentId), card);
    return card;
  };
}
