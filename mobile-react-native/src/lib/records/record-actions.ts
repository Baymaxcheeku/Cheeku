import type { QueryClient } from "@tanstack/react-query";

import { loadMemberHealth, saveMemberHealth } from "@/lib/profiles/health";
import { supabase } from "@/lib/supabase/client";

import { sameMedicine, toProfileMedication, type Medicine } from "./details";
import type { DocType } from "./types";

/*
 * What a person can do to a record once it is filed, and the reads the
 * record pages need beyond the record itself.
 *
 * Every write names the record's OWN member, never whoever is being viewed:
 * "Add to Amma's medicines" from Amma's prescription goes to Amma even if
 * the app was showing someone else a moment ago.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

const OFFLINE = "That didn't save. Check your connection and try again.";

/** Everything that shows a record, a list of them, or counts over them. */
export function refreshRecords(qc: QueryClient, id?: string) {
  if (id) void qc.invalidateQueries({ queryKey: ["record", id] });
  for (const key of ["records", "records-list", "records-context", "health-overview", "notifications", "family-members"]) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

/** Filed under the wrong person. The database moves its values and inbox rows too. */
export async function moveRecord(id: string, profileId: string): Promise<ActionResult> {
  const { data, error } = await supabase.rpc("move_document", { p_doc: id, p_profile: profileId });
  if (error) {
    if (/not covered/.test(error.message)) return { ok: false, message: "That family member isn't covered by your plan, so records can't be filed under them." };
    return { ok: false, message: OFFLINE };
  }
  return data ? { ok: true } : { ok: false, message: "That record isn't here any more." };
}

/** Read as the wrong kind of document. The page re-draws in the new layout. */
export async function setRecordType(id: string, docType: DocType): Promise<ActionResult> {
  const { error } = await supabase.from("documents").update({ doc_type: docType }).eq("id", id);
  return error ? { ok: false, message: OFFLINE } : { ok: true };
}

/**
 * Gone for good: the row (its values go with it) and, for an upload, the
 * file. Records the app wrote itself have no file.
 */
export async function deleteRecord(id: string, storagePath: string, hasFile: boolean): Promise<ActionResult> {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { ok: false, message: OFFLINE };
  if (hasFile) void supabase.storage.from("documents").remove([storagePath]);
  return { ok: true };
}

/**
 * Copies medicines into the member's own list (Settings › Health, and what
 * Ask Cheeku grounds on). Ones already there are left alone rather than
 * duplicated or overwritten; the person may have edited them.
 */
export async function addMedicinesToMember(profileId: string, medicines: Medicine[]): Promise<{ ok: true; added: number; already: number } | { ok: false; message: string }> {
  try {
    const health = await loadMemberHealth(profileId);
    const incoming = medicines.map(toProfileMedication);
    const fresh = incoming.filter((m) => !health.medications.some((h) => sameMedicine(h.name, m.name)));
    if (fresh.length === 0) return { ok: true, added: 0, already: incoming.length };
    const room = Math.max(0, 30 - health.medications.length);
    const res = await saveMemberHealth(profileId, { ...health, medications: [...health.medications, ...fresh.slice(0, room)] });
    if (!res.ok) return { ok: false, message: res.message };
    return { ok: true, added: Math.min(fresh.length, room), already: incoming.length - fresh.length };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

/** Names from this list already in the member's medicines. */
export async function medicinesAlreadyListed(profileId: string, medicines: Medicine[]): Promise<number> {
  try {
    const health = await loadMemberHealth(profileId);
    return medicines.map(toProfileMedication).filter((m) => health.medications.some((h) => sameMedicine(h.name, m.name))).length;
  } catch {
    return 0;
  }
}

export type PastValue = { canonicalName: string; value: number; eventDate: string | null; documentId: string | null };

/**
 * The last reading of each of these values for this member, from any other
 * record, for "was 11.2 in March". Only this member's: a trend that mixed in
 * someone else's blood count would be worse than none.
 */
export async function previousValues(profileId: string, documentId: string, keys: string[], before: string | null): Promise<Map<string, PastValue>> {
  const out = new Map<string, PastValue>();
  if (keys.length === 0) return out;
  let q = supabase
    .from("entities")
    .select("canonical_name, value, event_date, document_id")
    .eq("profile_id", profileId)
    .eq("kind", "lab_value")
    .in("canonical_name", keys)
    .neq("document_id", documentId)
    .not("value", "is", null)
    .order("event_date", { ascending: false, nullsFirst: false })
    .limit(200);
  if (before) q = q.lte("event_date", before);
  const { data } = await q;
  for (const r of data ?? []) {
    const key = r.canonical_name as string;
    if (!out.has(key)) out.set(key, { canonicalName: key, value: Number(r.value), eventDate: r.event_date as string | null, documentId: r.document_id as string | null });
  }
  return out;
}

export type DoseRecord = { dose: number; eventDate: string | null; documentId: string | null; name: string };

/** Every recorded dose of this vaccine for this member, oldest first. */
export async function vaccineHistory(profileId: string, canonical: string): Promise<DoseRecord[]> {
  const { data } = await supabase
    .from("entities")
    .select("name, value, event_date, document_id")
    .eq("profile_id", profileId)
    .eq("kind", "vaccine")
    .eq("canonical_name", canonical)
    .order("event_date", { ascending: true });
  return (data ?? []).map((r) => ({ dose: Number(r.value ?? 1), eventDate: r.event_date as string | null, documentId: r.document_id as string | null, name: r.name as string }));
}

/** Records of one type for a member, newest first; for "your insurance". */
export async function recordsOfType(profileId: string, docType: DocType): Promise<{ id: string; title: string; eventDate: string | null }[]> {
  const { data } = await supabase
    .from("documents")
    .select("id, event_date, extraction")
    .eq("profile_id", profileId)
    .eq("doc_type", docType)
    .order("event_date", { ascending: false, nullsFirst: false })
    .limit(10);
  return (data ?? []).map((r) => ({ id: r.id as string, eventDate: r.event_date as string | null, title: ((r.extraction as { title?: string } | null)?.title ?? "") as string }));
}

// ------------------------------------------------------- consultation invoice --

export async function fileConsultationInvoice(p: {
  profileId: string;
  doctor: string;
  specialty: string | null;
  clinic: string | null;
  mode: "online" | "clinic";
  day: string;
  slot: string;
  fee: number;
  appointmentId: string;
}): Promise<string | null> {
  const { data, error } = await supabase.rpc("file_consultation_invoice", {
    p_profile: p.profileId,
    p_doctor: p.doctor,
    p_specialty: p.specialty ?? "",
    p_clinic: p.clinic ?? "",
    p_mode: p.mode,
    p_day: p.day.slice(0, 10),
    p_slot: p.slot,
    p_fee: Math.round(p.fee),
    p_appointment: p.appointmentId,
  });
  return error ? null : ((data as string | null) ?? null);
}

export async function cancelConsultationInvoice(invoiceId: string): Promise<void> {
  await supabase.rpc("update_consultation_invoice", { p_doc: invoiceId, p_action: "cancel" });
}

export async function rescheduleConsultationInvoice(invoiceId: string, day: string, slot: string): Promise<void> {
  await supabase.rpc("update_consultation_invoice", { p_doc: invoiceId, p_action: "reschedule", p_day: day.slice(0, 10), p_slot: slot });
}
