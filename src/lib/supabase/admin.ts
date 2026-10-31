import "server-only";

import { createClient } from "@supabase/supabase-js";

import { clientEnv, serverEnv } from "@/lib/env";

/*
 * The service-role client. THIS BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * It exists for exactly one reason: `subscriptions` has no update or delete
 * policy, deliberately. Tier and quota are entitlement — a client that could
 * write its own tier could grant itself a free plan, and a client that could
 * write its own counter could reset it. So those writes have to come from
 * somewhere RLS does not apply.
 *
 * Rules for anything that imports this:
 *
 *   - Every call MUST filter by a family_id or user_id that was derived from
 *     `requireUser()`, never from a request parameter. RLS is not there to
 *     catch a mistake here; there is no net.
 *   - Never use it to read what the anon client could read. Reaching for the
 *     service key to "just get the data" is how isolation guarantees rot.
 *   - `server-only` above means importing this from a client component is a
 *     build error rather than a leaked key.
 */
export function createAdminSupabase() {
  // serverEnv() is a function, not a constant: it throws if it is ever reached
  // from the browser rather than quietly returning undefined.
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
