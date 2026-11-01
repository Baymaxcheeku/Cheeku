import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import { CtaLabel } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { completeEmailLink } from "@/lib/auth/email-link";
import { useAuth } from "@/lib/auth/state";
import { startFresh } from "@/lib/nav/start-fresh";
import { clearOfflineCache } from "@/lib/offline/cache";
import { brand } from "@/theme/tokens";
import { type } from "@/theme/type";

type Outcome = "working" | "expired" | "failed";

/**
 * Where the confirmation email's link opens the app.
 *
 * Open to anyone (it is not inside a guard), because the person arriving
 * is by definition not signed in yet. The link carries a one-time code from
 * Supabase's verify endpoint; `completeEmailLink` exchanges it with the
 * verifier only this phone holds (PKCE), so a link from anybody else's
 * sign-up, or an edited or forged one, signs nobody in.
 *
 * On success the new session flips the guards and this screen sends the
 * person to the splash, which takes a new account to onboarding.
 */
export default function AuthCallback() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const url = Linking.useLinkingURL();
  const handled = useRef<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("working");

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;

    async function run() {
      /*
       * Somebody already signed in who opens a confirmation link (their own
       * again, or another account's) keeps the session they have. Swapping
       * accounts from a link, without the sign-out that wipes the phone,
       * would show the new account the old one's cached family.
       */
      if (useAuth.getState().status === "signedIn") {
        startFresh(router, "/");
        return;
      }
      queryClient.clear();
      await clearOfflineCache();
      const result = await completeEmailLink(url);
      if (result === "signedIn") startFresh(router, "/");
      else setOutcome(result === "expired" ? "expired" : "failed");
    }
    void run();
  }, [url, router, queryClient]);

  const expired = outcome === "expired";
  /*
   * A new link needs the address. It is known when the account was created on
   * this run of the app; otherwise logging in asks for it, and an unconfirmed
   * account is taken from there to check-your-inbox with a resend button.
   */
  const canResend = expired && Boolean(useAuth.getState().pendingEmail);

  return (
    <View
      className="flex-1 bg-canvas px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View className="items-center">
        <MascotBust size={128} moment={outcome === "working" ? "working" : "shrug"} />
      </View>

      <View className="mt-6">
        {outcome === "working" ? (
          <Text accessibilityRole="header" style={type.title}>
            Confirming your email
          </Text>
        ) : (
          <>
            <Text style={[type.eyebrow, { color: brand[600] }]}>
              {expired ? "Link expired" : "Link not recognised"}
            </Text>
            <Text accessibilityRole="header" style={[type.title, { marginTop: 8 }]}>
              {expired ? "That link has run out" : "That link did not work"}
            </Text>
            <Text style={[type.body, { marginTop: 8 }]}>
              {expired
                ? canResend
                  ? "Links last a day and work once. Ask for a new one and open the newest email."
                  : "Links last a day and work once. Log in and Cheeku will offer to send a new one."
                : "It may have been used already, or copied only in part. If you confirmed already, just log in."}
            </Text>
          </>
        )}
      </View>

      {outcome === "working" ? null : (
        <View className="mt-auto gap-3">
          <Button onPress={() => startFresh(router, canResend ? "/verify-email" : "/sign-in")}>
            <CtaLabel>{canResend ? "Send a new link" : "Go to log in"}</CtaLabel>
          </Button>
        </View>
      )}
    </View>
  );
}
