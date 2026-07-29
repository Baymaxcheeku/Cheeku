"use server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";

/*
 * Export and delete.
 *
 * These are the two settings rows that must never be decorative. DPDP gives
 * people a right to their data and a right to have it erased; an app that draws
 * the buttons and does nothing has made a promise it is breaking. So both do
 * the real thing, and the delete is genuinely irreversible.
 *
 * Both are scoped by `requireUser()`. Neither takes an id from the caller.
 */

export type ExportBundle = {
  exportedAt: string;
  account: { email: string | null };
  profiles: unknown[];
  documents: unknown[];
  entities: unknown[];
  timelineEvents: unknown[];
  conversations: unknown[];
  messages: unknown[];
  consentLog: unknown[];
  subscription: unknown;
};

/**
 * Everything the account holds, as JSON.
 *
 * Read through the anon client on purpose: RLS then decides what comes back,
 * so an export can never contain a row the user could not otherwise see. Using
 * the service key here would work and would be wrong — the one place a bug
 * would hand someone another family's records is the place that hands data out.
 *
 * Storage objects are named but not inlined. A JSON file with a dozen
 * base64 PDFs in it is unusable, and the originals are downloadable from each
 * record's own screen.
 */
export async function exportAccount(): Promise<
  { ok: true; bundle: ExportBundle } | { ok: false; message: string }
> {
  const user = await requireUser();
  const supabase = await createServerSupabase();

  const [profiles, documents, entities, timeline, conversations, messages, consent, subscription] =
    await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("documents").select("*"),
      supabase.from("entities").select("*"),
      supabase.from("timeline_events").select("*"),
      supabase.from("conversations").select("*"),
      supabase.from("messages").select("*"),
      supabase.from("consent_log").select("*"),
      supabase.from("subscriptions").select("*").maybeSingle(),
    ]);

  const failure = [profiles, documents, entities, timeline, conversations, messages, consent].find(
    (r) => r.error,
  );
  if (failure?.error) return { ok: false, message: "Could not read your data. Please try again." };

  return {
    ok: true,
    bundle: {
      exportedAt: new Date().toISOString(),
      account: { email: user.email ?? null },
      profiles: profiles.data ?? [],
      documents: documents.data ?? [],
      entities: entities.data ?? [],
      timelineEvents: timeline.data ?? [],
      conversations: conversations.data ?? [],
      messages: messages.data ?? [],
      consentLog: consent.data ?? [],
      subscription: subscription.data ?? null,
    },
  };
}

export type DeleteResult =
  | { ok: true; removedDocuments: number; removedObjects: number }
  | { ok: false; message: string };

/**
 * Erases the account's data. Irreversible.
 *
 * Order matters and is the whole substance of this function.
 *
 * STORAGE FIRST. The object keys live on `documents` rows; deleting the rows
 * first orphans every file in the bucket with no way left to find them. That is
 * the worst possible outcome for a delete — the user is told their data is
 * gone while their medical documents remain on disk forever.
 *
 * THEN THE ROWS. `families` cascades to profiles, documents, entities, timeline
 * events, conversations, messages and the subscription, so one delete clears
 * the tree rather than eight that could each half-fail.
 *
 * The auth user is deliberately left. Removing it would sign the person out
 * mid-request and lose the confirmation screen, and an account with no data is
 * a legitimate state — they may want to start again.
 */
export async function deleteAccountData(confirmation: string): Promise<DeleteResult> {
  /*
   * The typed confirmation is checked on the server as well as in the UI. A
   * destructive action whose only guard is a client-side string comparison is
   * one fetch away from being unguarded.
   */
  if (confirmation.trim().toUpperCase() !== "DELETE") {
    return { ok: false, message: "Type DELETE to confirm." };
  }

  const user = await requireUser();
  const supabase = await createServerSupabase();

  const { data: docs, error: readError } = await supabase.from("documents").select("storage_path");
  if (readError) return { ok: false, message: "Could not read your documents. Nothing was deleted." };

  const paths = (docs ?? []).map((d) => d.storage_path as string).filter(Boolean);

  let removedObjects = 0;
  if (paths.length > 0) {
    const { data: removed, error: storageError } = await supabase.storage
      .from("documents")
      .remove(paths);

    /*
     * A storage failure aborts before any row is touched. Reporting success
     * while the files survive is the one outcome that must not happen.
     */
    if (storageError) {
      return { ok: false, message: "Could not remove your files. Nothing was deleted." };
    }
    removedObjects = removed?.length ?? 0;
  }

  const admin = createAdminSupabase();
  const { error: familyError } = await admin.from("families").delete().eq("owner_id", user.id);
  if (familyError) {
    return { ok: false, message: "Files were removed but records could not be. Please try again." };
  }

  // consent_log hangs off the user, not the family, and is kept deliberately:
  // it is the record that consent was given and withdrawn, which is the thing
  // a regulator asks for. It carries no health data.

  return { ok: true, removedDocuments: paths.length, removedObjects };
}
