import type { Session } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { create } from "zustand";

import { supabase } from "@/lib/supabase/client";

/*
 * WHO IS SIGNED IN, IN ONE PLACE.
 *
 * The root navigator's guards read this and nothing else. Before it existed,
 * each screen decided for itself whether its reader should be there (welcome
 * checked for a session, sign-in did not, onboarding's back button went to
 * sign-in), so a signed-in person could walk back into the screens for
 * strangers and a signed-out one could be left on Home after the session
 * ended. With the guards reading one status, a screen that does not belong to
 * the current status cannot be reached at all, by a push, a swipe, the
 * Android back button or a link.
 *
 * This is navigation, not access control. Row level security checks the
 * token on every query; a guard only decides what is drawn.
 */

export type AuthStatus = "loading" | "signedOut" | "unverified" | "signedIn";

/**
 * A session whose email was never confirmed is not a signed-in account.
 *
 * With "Confirm email" on in Supabase (it must be: see PLAN.md, Running it),
 * an unconfirmed address never gets a session at all. This is the second
 * lock for a project where it was switched off: the person still cannot get
 * past the check-your-inbox screen until the link is opened.
 */
export function statusFor(session: Session | null): Exclude<AuthStatus, "loading"> {
  if (!session) return "signedOut";
  return session.user.email_confirmed_at ? "signedIn" : "unverified";
}

type AuthState = {
  status: AuthStatus;
  /** The address of an account waiting for its confirmation link, for check-your-inbox. */
  pendingEmail: string | null;
  setPendingEmail: (email: string | null) => void;
};

export const useAuth = create<AuthState>((set) => ({
  status: "loading",
  pendingEmail: null,
  setPendingEmail: (pendingEmail) => set({ pendingEmail }),
}));

/**
 * Starts following the session. Call once, from the root layout.
 *
 * `onAuthStateChange` reports the stored session first (INITIAL_SESSION), so
 * the status leaves "loading" without a separate read. Every later sign-in,
 * sign-out, refresh and confirmed email arrives the same way.
 *
 * The token refresh only runs while the app is in the foreground, as Supabase
 * asks for React Native: a timer left running in the background is a refresh
 * that fails offline and signs somebody out for no reason.
 */
export function startAuth(): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const status = statusFor(session);
    useAuth.setState((s) => ({
      status,
      // Once the account is in, nothing is waiting for a link any more.
      pendingEmail: status === "signedIn" ? null : (session?.user.email ?? s.pendingEmail),
    }));
  });

  if (Platform.OS === "web") return () => data.subscription.unsubscribe();

  const refresh = (state: string) => {
    if (state === "active") void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  };
  refresh(AppState.currentState ?? "active");
  const appState = AppState.addEventListener("change", refresh);

  return () => {
    data.subscription.unsubscribe();
    appState.remove();
  };
}
