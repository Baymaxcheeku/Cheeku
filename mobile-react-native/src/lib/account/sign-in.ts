import { supabase } from "@/lib/supabase/client";

/*
 * The last step of "Delete my account": removing the sign-in itself.
 *
 * Everything else is erased as the person, under RLS, in actions.ts. The
 * account in auth.users can only be removed with the service role, so the
 * delete-account Edge Function does it (supabase/functions/delete-account).
 * The function refuses while any family or document row remains, so this
 * only ever runs after the files and records are gone.
 *
 * Retrying is always safe: the function is idempotent, and so is the data
 * step before it.
 */

export type SignInRemoval = { ok: true } | { ok: false; message: string };

const RETRY = "Your records are deleted, but your sign-in is still there. Tap Delete again to finish.";

/** What to tell the person for each way the function can say no. */
export function removalMessage(status: number | null): string {
  if (status === 401) return "Your session expired. Sign in again and tap Delete to finish.";
  if (status === 409) return "Some records are still there. Tap Delete again to finish.";
  return RETRY;
}

export async function removeSignIn(): Promise<SignInRemoval> {
  try {
    const { data, error } = await supabase.functions.invoke("delete-account", { body: { confirm: "DELETE" } });
    if (!error && (data as { ok?: unknown } | null)?.ok === true) return { ok: true };
    const res = (error as { context?: unknown } | null)?.context;
    return { ok: false, message: removalMessage(res instanceof Response ? res.status : null) };
  } catch {
    return { ok: false, message: RETRY };
  }
}
