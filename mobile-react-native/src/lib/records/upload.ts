import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";

import { extractFromFile, routeFor } from "@/lib/ai/mock/extract";
import { selectableProfiles } from "@/lib/profiles/context";
import { supabase } from "@/lib/supabase/client";

/*
 * Upload, extract, file. The one write path into the records system.
 *
 * ┌─ READ THIS BEFORE CHANGING ANYTHING HERE ────────────────────────────────┐
 *
 * On web this was a server action, and its comment said the object key is
 * SERVER-GENERATED because "a client-supplied name would be a client-supplied
 * authorisation decision". There is no server here. So it is worth being exact
 * about what still holds and what does not.
 *
 * STILL ENFORCED, because storage policies do it:
 *   The key's first segment must be the caller's own user id. A client cannot
 *   write under another account's prefix no matter what it sends, because the
 *   policy matches that segment against auth.uid(). This is the property that
 *   actually mattered, and it survives the port intact.
 *
 * STILL ENFORCED, because RLS does it:
 *   The `documents` insert can only name a profile the caller owns.
 *
 * ENFORCED SINCE MIGRATION 0011, by the database rather than by this file:
 *   The PLAN check. `documents_plan_scope_trigger` re-derives the entitlement
 *   inside every insert and refuses a document filed against a profile the
 *   plan does not cover, whatever the client sends or skips.
 *
 *   The check below is therefore the ERROR MESSAGE, not the gate. It can name
 *   the plan and offer the upgrade; a trigger can only refuse. Removing it
 *   would still be safe and still be worse, because the reader would get "the
 *   document could not be saved" for a situation with an obvious action.
 *
 * └──────────────────────────────────────────────────────────────────────────┘
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

export type PickedFile = {
  uri: string;
  mimeType: string;
  /** The picker's filename. Used only for the mock extractor's routing. */
  name: string;
};

export async function uploadDocument(
  picked: PickedFile,
  profileId: string,
): Promise<UploadResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Your session expired. Please sign in again." };

  const ext = ALLOWED.get(picked.mimeType);
  if (!ext) return { ok: false, message: "Upload a PDF, JPG, PNG or HEIC file." };
  if (!profileId) return { ok: false, message: "Choose who this document is for." };

  /*
   * Confirm the profile belongs to the caller before its id is written into a
   * storage path. RLS would reject the insert anyway, but the path is built
   * from this value first, and building paths out of unverified input is how
   * one user's object key ends up under another user's prefix.
   */
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return { ok: false, message: "That family member could not be found." };

  // The plan message. The trigger is the check — see the header comment.
  const allowed = await selectableProfiles();
  if (!allowed.some((p) => p.id === profileId)) {
    return {
      ok: false,
      message: "That family member is part of the Family plan. Upgrade to add records for them.",
    };
  }

  let bytes: ArrayBuffer;
  let size: number;
  try {
    const file = new File(picked.uri);
    size = file.size ?? 0;
    if (size > MAX_BYTES) return { ok: false, message: "That file is larger than 10MB." };
    if (size === 0) return { ok: false, message: "That file appears to be empty." };
    bytes = await file.arrayBuffer();
  } catch {
    return { ok: false, message: "That file could not be read. Try choosing it again." };
  }

  /*
   * The key is generated here, and deliberately contains nothing from the
   * picked file. Original filenames are routinely "Ananya_CBC_Fortis.jpg" — the
   * patient, the test and the hospital in one string — and a path travels into
   * logs and signed URLs where the record's own contents never go.
   */
  const path = `${user.id}/${profileId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, bytes, { contentType: picked.mimeType, upsert: false });

  if (uploadError) {
    return { ok: false, message: "The upload did not complete. Please try again." };
  }

  const extraction = extractFromFile(picked.name, size);
  const status = routeFor(extraction);

  const { data: inserted, error: insertError } = await supabase
    .from("documents")
    .insert({
      profile_id: profileId,
      user_id: user.id,
      storage_path: path,
      mime_type: picked.mimeType,
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

    /*
     * The trigger can still fire here even though the check above passed: a
     * plan that lapsed between the two, or a client that skipped the check
     * entirely. Say the same thing the check would have said rather than
     * "try again", which invites someone to retry something that cannot work.
     */
    if (insertError?.message?.includes("not covered by the current plan")) {
      return {
        ok: false,
        message: "That family member is part of the Family plan. Upgrade to add records for them.",
      };
    }
    return { ok: false, message: "The document could not be saved. Please try again." };
  }

  return { ok: true, documentId: inserted.id as string, needsReview: status === "needs_review" };
}
