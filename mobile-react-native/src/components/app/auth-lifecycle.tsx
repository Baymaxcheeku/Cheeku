import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

import { isSignedOutRoute } from "@/lib/auth/code";
import { startFresh } from "@/lib/nav/start-fresh";
import { isSigningOut, wipeAccountData } from "@/lib/privacy/local-data";
import { supabase } from "@/lib/supabase/client";

/*
 * The session, kept honest for the whole app. Renders nothing.
 *
 * 1. TOKEN REFRESH FOLLOWS THE APP. supabase-js refreshes on a timer, which
 *    a phone suspends in the background; a token that expired while the app
 *    slept is then refreshed late, on the first request after waking, and
 *    that request can fail. Supabase's React Native guidance is to start the
 *    timer when the app is active and stop it otherwise, which is this.
 *    The web build does this itself via page visibility.
 *
 * 2. A SESSION THAT ENDS SOMEWHERE ELSE ENDS HERE TOO. When a refresh token is
 *    revoked ("Sign out of other devices" on another phone, a password reset,
 *    account deletion), the client drops the session and emits SIGNED_OUT.
 *    Before this, the screen stayed up showing the family's records from the
 *    cache to someone who was no longer signed in. Now the phone's copy of
 *    the account is wiped and the app returns to Welcome.
 *
 *    A sign-out the app started itself (signOutAndWipe) is skipped: its
 *    caller already wipes and routes.
 */
export function AuthLifecycle() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // The listener is registered once; a ref keeps it reading the current route.
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (Platform.OS === "web") return;
    const follow = (state: AppStateStatus) => {
      if (state === "active") void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    };
    follow((AppState.currentState as AppStateStatus | null) ?? "active");
    const sub = AppState.addEventListener("change", follow);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT" || isSigningOut()) return;
      // Never call Supabase from inside this callback: it holds the auth lock.
      setTimeout(() => {
        void wipeAccountData(queryClient).finally(() => {
          if (!isSignedOutRoute(pathRef.current)) startFresh(router, "/welcome");
        });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  return null;
}
