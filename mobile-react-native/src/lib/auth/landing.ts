import { isAuthApiError } from "@supabase/supabase-js";

import { statusFor } from "@/lib/auth/state";
import { kv } from "@/lib/storage";
import { supabase } from "@/lib/supabase/client";

/*
 * Where a launch, or a sign-in, actually belongs.
 *
 * ┌─ THE BUG THIS EXISTS TO KILL ────────────────────────────────────────────┐
 * │                                                                          │
 * │ Two screens each made this decision by hard-coding it. The splash always │
 * │ went to /welcome and sign-in always went to /who — so somebody with an   │
 * │ account, a profile and three years of records was walked through the     │
 * │ carousel and the whole of onboarding on every single launch, and asked   │
 * │ to set up a profile they already had.                                    │
 * │                                                                          │
 * │ Neither line was wrong when it was written. /welcome was right when      │
 * │ nobody had an account yet, and /who was right on the day sign-up was the │
 * │ only way in. They rotted quietly, because a returning user is the one    │
 * │ case a developer with a fresh database never tests.                      │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * The decision is now in ONE place, asked as a question about state rather
 * than assumed from which screen is calling. The splash asks it on launch and
 * again whenever the root navigator's guards send someone back to it (a
 * sign-in, a sign-out, a confirmed email).
 */

export type Landing = "/home" | "/who" | "/welcome" | "/sign-in" | "/verify-email";

/*
 * Set the first time an account signs in on this phone, and kept across
 * sign-outs: it is about the phone, not the person. A phone that has seen an
 * account opens on Log in, not on the carousel that introduces Cheeku to
 * strangers.
 */
const RETURNING_KEY = "cheeku.returning";

/**
 * Five states, five destinations.
 *
 *   no session, new phone      → the carousel. They have never been here.
 *   no session, used before    → Log in. They signed out, or were signed out.
 *   email not confirmed        → check your inbox.
 *   confirmed, no profile      → onboarding. Signed up, never finished.
 *   confirmed and profile      → home. Everything else is in their way.
 *
 * The SESSION ON THE PHONE decides signed in or out, the same session the
 * navigator's guards read, so the two can never disagree (a landing the
 * guards refuse would send the person straight back to the splash). The
 * server is then asked whether that session is still good: one revoked from
 * another phone, or a deleted account, is signed out here. A failure to
 * reach the server is not a revocation; offline launches keep working.
 *
 * FAILS TOWARDS ONBOARDING, not towards home. If the profile lookup errors —
 * no signal on a cold launch is the common case — sending someone to /who
 * costs them a Skip tap; sending them to /home shows an empty shell of an app
 * and looks like their records are gone.
 */
export async function resolveLanding(): Promise<Landing> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const status = statusFor(session);
  if (status === "signedOut") return signedOutLanding();
  if (status === "unverified") return "/verify-email";

  const { data: fresh, error: userError } = await supabase.auth.getUser();
  if (userError && isAuthApiError(userError)) {
    // The server refused the token itself: revoked, expired past refresh, or
    // the account is gone. Local only, because there is no session left to
    // end on the server.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return signedOutLanding();
  }
  const userId = fresh.user?.id ?? session!.user.id;
  await kv.set(RETURNING_KEY, "1").catch(() => undefined);

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) return "/who";
  return data?.id ? "/home" : "/who";
}

async function signedOutLanding(): Promise<Landing> {
  const returning = await kv.get(RETURNING_KEY).catch(() => null);
  return returning ? "/sign-in" : "/welcome";
}
