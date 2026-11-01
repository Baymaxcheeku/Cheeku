import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";

import { uploadDocument, type PickedFile } from "@/lib/records/upload";
import { supabase } from "@/lib/supabase/client";
import { sessionUser } from "@/lib/supabase/session";

import { readPolicy, rowFromDraft, type Policy, type PolicyDraft } from "./policy";

/*
 * The family's policies (migration 0043). One list for the account, read
 * once and shared by the Insurance screens, the Health file and the chat.
 *
 * Before 0043 is applied the table is missing; that reads as "no policies"
 * rather than an error, so nothing breaks while the migration waits.
 */

export const policiesKey = ["insurance-policies"] as const;

const missing = (message: string) => /insurance_policies|does not exist|schema cache/i.test(message);

export async function fetchPolicies(): Promise<Policy[]> {
  const { data, error } = await supabase.from("insurance_policies").select("*").order("created_at", { ascending: true });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(`insurance: ${error.message}`);
  }
  return (data ?? []).map((r) => readPolicy(r as Record<string, unknown>)).filter((p): p is Policy => Boolean(p));
}

/** The policies covering one person: what their Health file and chat read. */
export async function policiesFor(profileId: string): Promise<Policy[]> {
  const { data, error } = await supabase.from("insurance_policies").select("*").contains("covered_profile_ids", [profileId]);
  if (error) return [];
  return (data ?? []).map((r) => readPolicy(r as Record<string, unknown>)).filter((p): p is Policy => Boolean(p));
}

export function usePolicies() {
  return useQuery({ queryKey: policiesKey, queryFn: fetchPolicies, staleTime: 60_000 });
}

export type SaveResult = { ok: true; id: string } | { ok: false; message: string };

/**
 * Add or update a policy. With a picked file, the policy document is filed
 * first (under the first person it covers, as an Insurance record) and the
 * policy points at it; a failed upload saves the policy anyway and says so.
 */
export async function savePolicy(draft: PolicyDraft, opts: { id?: string | null; file?: PickedFile | null; keepDocumentId?: string | null } = {}): Promise<SaveResult & { fileFailed?: boolean }> {
  const user = await sessionUser();
  if (!user) return { ok: false, message: "Your session expired. Please sign in again." };

  let documentId = opts.keepDocumentId ?? null;
  let fileFailed = false;
  const owner = draft.coveredProfileIds[0];
  if (opts.file && owner) {
    const up = await uploadDocument(opts.file, owner, "insurance");
    if (up.ok) documentId = up.documentId;
    else fileFailed = true;
  }

  const row = rowFromDraft(draft, { documentId, source: documentId ? "document" : "manual" });
  const query = opts.id
    ? supabase.from("insurance_policies").update(row).eq("id", opts.id).select("id").single()
    : supabase.from("insurance_policies").insert({ ...row, user_id: user.id }).select("id").single();
  const { data, error } = await query;
  if (error || !data) {
    if (error && missing(error.message)) return { ok: false, message: "Insurance isn't switched on for this account yet. It needs a database update (0043)." };
    return { ok: false, message: "Couldn't save the policy. Check your connection and try again." };
  }
  return { ok: true, id: data.id as string, fileFailed };
}

export async function deletePolicy(id: string): Promise<boolean> {
  const { error } = await supabase.from("insurance_policies").delete().eq("id", id);
  return !error;
}

/** The policy PDF or a photo of the card. Null when the person backs out. */
export async function pickPolicyFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png", "image/heic"], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const a = result.assets[0];
  if (!a) return null;
  return { uri: a.uri, mimeType: a.mimeType ?? "application/pdf", name: a.name ?? "policy.pdf" };
}

/** After any change: the list, every Health file and the chat's memory read it. */
export function useRefreshCover() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: policiesKey });
    void qc.invalidateQueries({ queryKey: ["health-file"] });
    void qc.invalidateQueries({ queryKey: ["memory"] });
  };
}
