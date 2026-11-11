import type { QueryClient } from "@tanstack/react-query";
import type { useRouter } from "expo-router";

import { authMessage, sendFailure, type AuthFailure } from "@/lib/auth/errors";
import { otpType, type Purpose } from "@/lib/auth/code";
import { resolveLanding } from "@/lib/auth/landing";
import { ensureSignupConsent } from "@/lib/legal/consent";
import { startFresh } from "@/lib/nav/start-fresh";
import { clearOfflineCache } from "@/lib/offline/cache";
import { logActivity } from "@/lib/privacy/activity";
import { FAMILY_KEY, loadFamily } from "@/lib/profiles/family";
import { supabase } from "@/lib/supabase/client";

/*
 * Every call that puts a code in someone's inbox or takes one back, in one
 * place, so the three purposes cannot drift apart.
 */

export type FlowResult = { ok: true } | { ok: false; message: string };

/**
 * Ask Supabase to email a code.
 *
 * Reports success for every failure that could reveal whether the address has
 * an account (see `sendFailure`). A transport throw is caught and reported as
 * no signal, never as "sent", so someone in a tunnel is not left waiting for
 * an email that was never asked for.
 */
export async function sendCode(purpose: Purpose, email: string): Promise<FlowResult> {
  try {
    let error: AuthFailure = null;
    if (purpose === "signup") {
      ({ error } = await supabase.auth.resend({ type: "signup", email }));
    } else if (purpose === "login") {
      /*
       * shouldCreateUser: false — a login code must never create an account.
       * Sign-up is the only door in, because it is the one with the consent
       * box on it.
       */
      ({ error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } }));
    } else {
      ({ error } = await supabase.auth.resetPasswordForEmail(email));
    }
    const message = sendFailure(error);
    return message ? { ok: false, message } : { ok: true };
  } catch {
    return { ok: false, message: authMessage({ status: 0 }, "verify") };
  }
}

/** Check a code. On success the client now holds a session. */
export async function verifyCode(purpose: Purpose, email: string, token: string): Promise<FlowResult> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: otpType(purpose) });
    if (error || !data.session) return { ok: false, message: authMessage(error, "verify") };
    return { ok: true };
  } catch {
    return { ok: false, message: authMessage({ status: 0 }, "verify") };
  }
}

type Router = ReturnType<typeof useRouter>;

/**
 * The one way into the app once a session exists, whichever door was used.
 *
 * A fresh session starts from a clean cache: whatever the last session left
 * (another account's family, or a "no profile" cached while signed out) must
 * never be what Home opens on. The family is loaded BEFORE Home is shown, so
 * it opens complete instead of on a loader.
 */
export async function enterApp(
  router: Router,
  queryClient: QueryClient,
  { newAccount }: { newAccount: boolean },
): Promise<void> {
  queryClient.clear();
  await clearOfflineCache();
  // Belt and braces for the 0031 trigger, which writes the consent at sign-up.
  if (newAccount) await ensureSignupConsent().catch(() => undefined);
  void logActivity("sign_in");
  const landing = await resolveLanding();
  if (landing === "/home") {
    await queryClient.prefetchQuery({ queryKey: FAMILY_KEY, queryFn: loadFamily }).catch(() => undefined);
  }
  startFresh(router, landing);
}
