import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MailCheck } from "lucide-react-native";

import { MascotBust } from "@/components/illustrations/sprout";
import { CtaLabel } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/ui/tap";
import { resendConfirmation } from "@/lib/auth/email-link";
import { useAuth } from "@/lib/auth/state";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, shadow } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/** Supabase sends at most one confirmation email a minute per address. */
const RESEND_AFTER = 60;

/**
 * Check your inbox. The only screen between creating an account and using it.
 *
 * Reached from sign-up (no session until the link is opened), from logging
 * in to an account that never opened its link, and by the guards for a
 * session whose email is unconfirmed. Nothing in the app opens until the
 * address is confirmed: the root navigator lets an unconfirmed account see
 * this screen and nothing else.
 *
 * Opening the link on this phone signs the person in (/auth/callback). Opened
 * anywhere else it still confirms the address, so "I've confirmed it" leads
 * to Log in, where the password finishes the job.
 */
export default function VerifyEmail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const status = useAuth((s) => s.status);
  const email = useAuth((s) => s.pendingEmail);
  const setPendingEmail = useAuth((s) => s.setPendingEmail);

  const [wait, setWait] = useState(RESEND_AFTER);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<"check" | "resend" | null>(null);

  // The email was sent a moment ago; the countdown starts with the screen.
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function confirmed() {
    setNote(null);
    // Signed out (the usual case): the password finishes the job.
    if (status !== "unverified") {
      router.replace("/sign-in");
      return;
    }
    // Holding an unconfirmed session: ask Supabase again. A confirmed address
    // flips the guards and the splash takes over from here.
    setBusy("check");
    const { data } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));
    setBusy(null);
    if (!data.session?.user.email_confirmed_at) {
      setNote("Not confirmed yet. Open the link in the email first, then come back.");
    }
  }

  async function resend() {
    if (!email || wait > 0) return;
    setNote(null);
    setBusy("resend");
    const result = await resendConfirmation(email).catch(() => "sent" as const);
    setBusy(null);
    setWait(RESEND_AFTER);
    setNote(
      result === "wait"
        ? "That was quick. Wait a minute, then ask again."
        : "A new link is on its way. Only the newest one works.",
    );
  }

  async function differentEmail() {
    setPendingEmail(null);
    // An unconfirmed session is ended here; the screen stays open to signed-out
    // people, so going to Log in afterwards is allowed.
    if (status === "unverified") await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    router.replace("/sign-in");
  }

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          <MascotBust size={128} moment="present" />
        </View>

        <View className="mt-6">
          <Text style={[type.eyebrow, { color: brand[600] }]}>One more step</Text>
          <Text accessibilityRole="header" style={[type.title, { marginTop: 8 }]}>
            Check your inbox
          </Text>
          <Text style={[type.body, { marginTop: 8 }]}>
            {email ? (
              <>
                We sent a link to <Text style={{ fontFamily: font.semibold, color: ink[900] }}>{email}</Text>.
              </>
            ) : (
              "We sent a link to your email."
            )}{" "}
            Open it on this phone and your account is ready.
          </Text>
        </View>

        <View className="mt-6 flex-row items-start gap-3 rounded-xl bg-surface p-4" style={shadow.e1}>
          <MailCheck size={20} color={brand[600]} style={{ marginTop: 1 }} />
          <Text style={[type.bodySmall, { flex: 1 }]}>
            Not there? Look in spam or promotions. The link works once and expires after a day.
          </Text>
        </View>

        {note ? (
          <Text accessibilityLiveRegion="polite" style={[type.bodySmall, { marginTop: 16, color: ink[700] }]}>
            {note}
          </Text>
        ) : null}

        <View className="mt-auto gap-3 pt-8">
          <Button onPress={() => void confirmed()} loading={busy === "check"}>
            <CtaLabel>I&apos;ve confirmed it</CtaLabel>
          </Button>
          {email ? (
            <Button variant="secondary" onPress={() => void resend()} disabled={wait > 0} loading={busy === "resend"}>
              <Text style={[type.button, { color: brand[700] }]}>
                {wait > 0 ? `Send again in ${wait}s` : "Send the link again"}
              </Text>
            </Button>
          ) : null}
          <Tap
            accessibilityRole="button"
            onPress={() => void differentEmail()}
            className="h-11 items-center justify-center"
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Use a different email</Text>
          </Tap>
        </View>
      </ScrollView>
    </View>
  );
}
