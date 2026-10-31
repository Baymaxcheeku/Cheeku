import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { removeSignIn } from "@/lib/account/sign-in";
import { supabase } from "@/lib/supabase/client";

/*
 * Export and erasure — the two rights DPDP gives people over their own data.
 *
 * Drawing these buttons and wiring them to nothing would be a promise the app
 * is breaking, so both do the real thing. Apple also requires in-app account
 * deletion, so this is a submission blocker as well as a legal one.
 *
 * ONE DELIBERATE DIFFERENCE FROM WEB. The web build performed the deletes with
 * the service key. That key cannot exist here — but it turns out it was never
 * required: every table involved already carries a delete policy keyed on
 * `auth.uid()` (families, profiles, documents, entities, timeline_events,
 * conversations, messages, support_tickets) and so do the storage objects. So
 * this runs as the user, under RLS, and is bounded to their own account by the
 * database rather than by this code being careful.
 */

export type ExportBundle = Record<string, unknown>;

export async function exportAccount(): Promise<
  { ok: true; uri: string; filename: string } | { ok: false; message: string }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Your session expired. Please sign in again." };

  /*
   * Every table the reader has data in. `select("*")` is safe here precisely
   * because RLS is doing the scoping — there is no user_id filter to forget,
   * and adding one would imply the boundary lives in this file.
   */
  const tables = [
    "profiles",
    "documents",
    "entities",
    "timeline_events",
    "conversations",
    "messages",
    "consent_log",
    "subscriptions",
    "support_tickets",
    "notifications",
    "service_waitlist",
    "lab_bookings",
    "provider_reviews",
    "account_activity",
    "privacy_requests",
    "today_actions",
    "daily_logs",
  ] as const;

  /*
   * Added by migrations 0031, 0033 and 0034. Until it is applied these tables do not exist,
   * and an export must not fail over a table that has never held anything.
   */
  const addedLater = new Set<string>(["account_activity", "privacy_requests", "today_actions", "daily_logs"]);

  const bundle: ExportBundle = {
    exportedAt: new Date().toISOString(),
    /*
     * The account's own id and email, so the file is identifiable as theirs
     * without a lookup. Nothing about anyone else is in here — a family
     * member's rows belong to this account, which is what makes exporting
     * them lawful.
     */
    account: { id: user.id, email: user.email },
  };

  for (const table of tables) {
    // Reviews are public to every signed-in user (0027), so RLS alone would
    // export everyone's. Only the reader's own go in their file.
    const base = supabase.from(table).select("*");
    const { data, error } = table === "provider_reviews" ? await base.eq("user_id", user.id) : await base;
    if (error) {
      if (addedLater.has(table) && /does not exist|schema cache|could not find/i.test(error.message)) {
        bundle[table] = [];
        continue;
      }
      return { ok: false, message: "Could not gather all of your data. Nothing was exported." };
    }
    bundle[table] = data ?? [];
  }

  /*
   * Written to the CACHE directory, not documents.
   *
   * The bundle is every lab value and every chat the family has, in plaintext
   * JSON. It exists only long enough to hand to the share sheet; leaving it in
   * a backed-up directory would quietly create a second, unencrypted copy of
   * the medical record that outlives the export.
   */
  const filename = `cheeku-ai-export-${new Date().toISOString().slice(0, 10)}.json`;

  try {
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create();
    file.writeSync(JSON.stringify(bundle, null, 2));
    return { ok: true, uri: file.uri, filename };
  } catch {
    return { ok: false, message: "Could not write the export file. Please try again." };
  }
}

/** Hands the written bundle to the system share sheet. */
export async function shareExport(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: "Export your Cheeku AI data",
    UTI: "public.json",
  });
}

/** Removes the cached bundle once it has been handed off. */
export function discardExport(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best effort. The cache directory is evictable by the OS anyway, so a
    // failure here delays cleanup rather than leaving the file forever.
  }
}

export type DeleteResult =
  | { ok: true; removedDocuments: number }
  | { ok: false; message: string };

/**
 * Erasure. Files first, then rows.
 *
 * The order matters: storage objects are not reachable once the rows naming
 * them are gone, so deleting rows first would orphan every file permanently.
 */
export async function deleteAccountData(confirmation: string): Promise<DeleteResult> {
  /*
   * The typed confirmation is re-checked here rather than trusted from the
   * screen. A destructive action whose only guard is a comparison in a
   * component is one refactor away from being unguarded.
   */
  if (confirmation.trim().toUpperCase() !== "DELETE") {
    return { ok: false, message: "Type DELETE to confirm." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Your session expired. Please sign in again." };

  const { data: docs, error: readError } = await supabase
    .from("documents")
    .select("storage_path");
  if (readError) {
    return { ok: false, message: "Could not read your documents. Nothing was deleted." };
  }

  // Profile photos sit in the same bucket and must go with everything else.
  const { data: faces, error: faceError } = await supabase.from("profiles").select("avatar_url");
  if (faceError) {
    return { ok: false, message: "Could not read your profiles. Nothing was deleted." };
  }

  // Meal photos and step screenshots (0034); absent before it, which is fine.
  const { data: daily } = await supabase.from("daily_logs").select("photo_path").not("photo_path", "is", null);

  const paths = [
    ...(docs ?? []).map((d) => d.storage_path as string),
    ...(daily ?? []).map((d) => d.photo_path as string | null).filter((x): x is string => Boolean(x)),
    ...(faces ?? []).map((f) => f.avatar_url as string | null).filter((x): x is string => Boolean(x)),
  ].filter(Boolean);

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("documents").remove(paths);
    /*
     * A storage failure aborts before any row is touched. Reporting success
     * while the files survive is the one outcome that must not happen.
     */
    if (storageError) {
      return { ok: false, message: "Could not remove your files. Nothing was deleted." };
    }
  }

  const { error: familyError } = await supabase
    .from("families")
    .delete()
    .eq("owner_id", user.id);
  if (familyError) {
    return { ok: false, message: "Files were removed but records could not be. Please try again." };
  }

  /*
   * Support tickets hang off `user_id`, NOT `family_id`, so deleting the family
   * does not cascade to them — they have to be removed explicitly. Missing this
   * would leave the user's own words behind after they asked for everything to
   * go, which is precisely what the erasure right forbids.
   */
  const { error: ticketError } = await supabase
    .from("support_tickets")
    .delete()
    .eq("user_id", user.id);
  if (ticketError) {
    return {
      ok: false,
      message: "Your records were removed but support messages could not be. Please contact support.",
    };
  }

  /*
   * Same for the inbox, the waitlist and this account's push tokens: they hang
   * off the user, and only the rows about a family member would cascade with
   * the family. Inbox titles name reports and doctors, so leaving them behind
   * would keep exactly what erasure is meant to remove.
   */
  // Reviews the reader wrote go too; lab bookings cascade with their member,
  // and are removed here as well in case a member was removed earlier.
  for (const table of ["notifications", "service_waitlist", "push_devices", "lab_bookings", "provider_reviews", "account_activity"] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    // account_activity arrives with migration 0031; a missing table is nothing to delete.
    if (error && table === "account_activity" && /does not exist|schema cache|could not find/i.test(error.message)) continue;
    if (error) {
      return {
        ok: false,
        message: "Your records were removed but some notifications could not be. Please try again.",
      };
    }
  }

  // consent_log hangs off the user, not the family, and is kept deliberately:
  // it is the record that consent was given and withdrawn, which is the thing
  // a regulator asks for. It carries no health data. privacy_requests stay
  // for the same reason: a grievance or erasure request is the record that
  // the person's rights were asked for and answered. Since 0037 both outlive
  // the sign-in too.

  // Last, the sign-in itself, so the same email cannot sign back in to an
  // empty account. Only the server can do this (see sign-in.ts).
  const signIn = await removeSignIn();
  if (!signIn.ok) return signIn;

  return { ok: true, removedDocuments: paths.length };
}

/** Exposed so the caller can check before offering the share step. */
export async function canShare(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}
