"use server";

import { randomUUID } from "node:crypto";

import { extractFromFile, routeFor } from "@/lib/ai/mock/extract";
import { selectableProfiles } from "@/lib/profiles/context";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";

/*
 * Upload, extract, file. The one write path into the records system.
 *
 * Three things here are load-bearing rather than incidental:
 *
 *  1. The object key is SERVER-GENERATED as `<user_id>/<profile_id>/<uuid>.<ext>`.
 *     The storage policies match on that first segment, so a client-supplied
 *     name would be a client-supplied authorisation decision. It also means the
 *     original filename — often a patient name — never lands in a path that
 *     appears in logs or a URL.
 *  2. EXIF is stripped before the bytes leave the browser (see strip-exif.ts).
 *     A phone photo of a prescription carries GPS coordinates of the house it
 *     was taken in.
 *  3. The bucket is private and no permanent URL is ever produced.
 */

const MAX_BYTES = 10 * 1024 * 1024; // matches the bucket's own cap

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/heic", "heic"],
  ["application/pdf", "pdf"],
]);

export type UploadResult =
  | { ok: true; documentId: string; needsReview: boolean }
  | { ok: false; message: string };

export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  const user = await requireUser();
  const supabase = await createServerSupabase();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }

  /*
   * The MIME type is re-checked here even though the file input filters on it.
   * `accept` on an <input> is a hint to the file picker, not a constraint —
   * this is a server action and anything can post to it.
   */
  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return { ok: false, message: "Upload a PDF, JPG, PNG or HEIC file." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "That file is larger than 10MB." };
  }

  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId) return { ok: false, message: "Choose who this document is for." };

  /*
   * Confirm the profile belongs to the caller before its id is written into a
   * storage path. RLS would reject the insert anyway, but a path is built from
   * this value first, and building paths out of unverified input is how one
   * user's object key ends up under another user's prefix.
   */
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return { ok: false, message: "That family member could not be found." };

  /*
   * And confirm the PLAN reaches them. Ownership is not entitlement: a
   * downgraded account still owns every profile it ever created, and this is a
   * public endpoint, so without this check a Solo subscriber could post a
   * locked member's id and file documents into a profile the app will not let
   * them open again until they upgrade.
   */
  const allowed = await selectableProfiles();
  if (!allowed.some((p) => p.id === profileId)) {
    return {
      ok: false,
      message: "That family member is part of the Family plan. Upgrade to add records for them.",
    };
  }

  const path = `${user.id}/${profileId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, message: "The upload did not complete. Please try again." };
  }

  const extraction = extractFromFile(file.name, file.size);
  const status = routeFor(extraction);

  const { data: inserted, error: insertError } = await supabase
    .from("documents")
    .insert({
      profile_id: profileId,
      user_id: user.id,
      storage_path: path,
      mime_type: file.type,
      doc_type: extraction.docType,
      status,
      event_date: extraction.eventDate,
      facility: extraction.facility,
      confidence: extraction.confidence,
      raw_text: extraction.rawText,
      extraction: {
        title: extraction.title,
        fields: extraction.fields,
        values: extraction.values,
      },
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    /*
     * The row failed but the object is already in the bucket. Remove it rather
     * than leaving a file nobody can reach through the app but which still
     * counts against storage and still contains someone's medical record.
     */
    await supabase.storage.from("documents").remove([path]);
    return { ok: false, message: "The document could not be saved. Please try again." };
  }

  return { ok: true, documentId: inserted.id as string, needsReview: status === "needs_review" };
}

/**
 * Applies the reviewer's corrections and files the document (C2's Confirm & Save).
 *
 * Entities are written here rather than at upload time on purpose: they are the
 * *confirmed* facts, and creating them before a human has looked would let a
 * misread number start trending immediately.
 */
export async function confirmExtraction(formData: FormData): Promise<UploadResult> {
  const user = await requireUser();
  const supabase = await createServerSupabase();

  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return { ok: false, message: "Missing document." };

  const { data: doc } = await supabase
    .from("documents")
    .select("id, profile_id, extraction, event_date")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { ok: false, message: "That document could not be found." };

  const extraction = doc.extraction as {
    title?: string;
    values?: { key: string; label: string; unit: string | null; refRange: string | null; flag: string | null }[];
  } | null;

  const title = String(formData.get("title") ?? extraction?.title ?? "Document");
  const facility = String(formData.get("facility") ?? "");
  const eventDate = String(formData.get("eventDate") ?? "") || null;

  // Corrections arrive as value_<key>, so an edited number replaces the read.
  const values = (extraction?.values ?? []).map((v) => ({
    ...v,
    value: String(formData.get(`value_${v.key}`) ?? ""),
  }));

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      status: "filed",
      event_date: eventDate,
      facility: facility || null,
      extraction: { ...(extraction ?? {}), title, values },
    })
    .eq("id", documentId);

  if (updateError) return { ok: false, message: "Could not save your changes." };

  /*
   * Replace rather than append: confirming twice must not double every lab
   * value. The document is the unit of truth, so its entities are rewritten
   * from what the reviewer just approved.
   */
  await supabase.from("entities").delete().eq("document_id", documentId);

  const rows = values
    .filter((v) => v.value.trim() !== "")
    .map((v) => ({
      profile_id: doc.profile_id as string,
      user_id: user.id,
      document_id: documentId,
      kind: "lab_value" as const,
      name: v.label,
      canonical_name: v.key,
      value: Number.isFinite(Number(v.value)) ? Number(v.value) : null,
      value_text: Number.isFinite(Number(v.value)) ? null : v.value,
      unit: v.unit,
      ref_range: v.refRange,
      flag: v.flag,
      event_date: eventDate,
    }));

  if (rows.length > 0) {
    const { error: entityError } = await supabase.from("entities").insert(rows);
    if (entityError) return { ok: false, message: "Could not save the extracted values." };
  }

  await supabase.from("timeline_events").insert({
    profile_id: doc.profile_id as string,
    user_id: user.id,
    kind: "document",
    title,
    summary: facility || null,
    event_date: eventDate ?? new Date().toISOString().slice(0, 10),
    source_document_id: documentId,
  });

  return { ok: true, documentId, needsReview: false };
}
