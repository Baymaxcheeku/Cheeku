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
 * than assumed from which screen is calling.
 */

export type Landing = "/home" | "/who" | "/welcome";

/**
 * Three states, three destinations.
 *
 *   no session          → the carousel. They have never been here.
 *   session, no profile → onboarding. Signed up, never finished.
 *   session and profile → home. Everything else is in their way.
 *
 * FAILS TOWARDS ONBOARDING, not towards home. If the profile lookup errors —
 * no signal on a cold launch is the common case — sending someone to /who
 * costs them a Skip tap; sending them to /home shows an empty shell of an app
 * and looks like their records are gone.
 */
export async function resolveLanding(): Promise<Landing> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/welcome";

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) return "/who";
  return data?.id ? "/home" : "/who";
}
