import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AuthScaffold, FormError, TextAction } from "@/components/auth/chrome";
import { CodeCells, type CodeState } from "@/components/auth/code-cells";
import { CtaLabel } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { Enter, useReducedMotion } from "@/components/ui/motion";
import {
  CODE_LENGTH,
  clearPendingCode,
  formatCountdown,
  getPendingCode,
  isCompleteCode,
  markCodeResent,
  secondsUntilResend,
  type Purpose,
} from "@/lib/auth/code";
import { enterApp, sendCode, verifyCode } from "@/lib/auth/flow";
import { feel } from "@/lib/feel";
import { startFresh } from "@/lib/nav/start-fresh";
import { brand, ink } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/*
 * Check your email: the one screen for every emailed code.
 *
 *   signup   → proves the address is theirs, then into onboarding
 *   login    → a password-free way in, then home
 *   recovery → proves the address, then /reset-password
 *
 * What it is careful about:
 * - The code fills itself in on iOS from Mail, pastes in one go, and is
 *   checked the moment the last digit lands. The button is there for anyone
 *   who wants to press something, and for screen readers.
 * - A wrong code shakes, clears and refocuses, so the next try is just typing.
 * - "Send a new code" waits out Supabase's own 60-second limit on screen
 *   instead of letting someone tap into a rate-limit error.
 * - The address comes from memory, never the URL (see `lib/auth/code.ts`).
 *   Arriving without one (a reload on web, a stale link) goes back to Log in.
 */

const COPY: Record<Purpose, { greet: string; after: string }> = {
  signup: {
    greet: "Almost there!",
    after: "This proves the email is yours, so only you can open your family's records.",
  },
  login: {
    greet: "No password needed",
    after: "Enter it here and you're in. It works once, and only for a short while.",
  },
  recovery: {
    greet: "Let's get you back in",
    after: "Next, you'll choose a new password.",
  },
};

/** How long the success wave plays before the screen moves on. */
const SUCCESS_BEAT_MS = 420;

export default function Verify() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const still = useReducedMotion();

  const [pending] = useState(getPendingCode);
  const [code, setCode] = useState("");
  const [state, setState] = useState<CodeState>("idle");
  const [wrongCount, setWrongCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState(pending?.sentAt ?? 0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pending) startFresh(router, "/sign-in");
  }, [pending, router]);

  const left = secondsUntilResend(sentAt, now);
  const waiting = left > 0;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting, sentAt]);

  if (!pending) return null;
  const { email, purpose } = pending;
  const copy = COPY[purpose];

  function goBack() {
    if (router.canGoBack()) router.back();
    else startFresh(router, "/sign-in");
  }

  async function submit(value: string) {
    if (state !== "idle" || !isCompleteCode(value)) return;
    setState("checking");
    setError(null);
    setNote(null);

    const result = await verifyCode(purpose, email, value);
    if (!result.ok) {
      feel.warn();
      setError(result.message);
      setCode("");
      setState("idle");
      setWrongCount((n) => n + 1);
      return;
    }

    setState("right");
    feel.success();
    await new Promise((r) => setTimeout(r, still ? 0 : SUCCESS_BEAT_MS));
    clearPendingCode();

    if (purpose === "recovery") {
      startFresh(router, "/reset-password");
      return;
    }
    try {
      await enterApp(router, queryClient, { newAccount: purpose === "signup" });
    } catch {
      // Signed in either way; the splash knows where a session belongs.
      startFresh(router, "/");
    }
  }

  async function resend() {
    if (waiting || sending || state !== "idle") return;
    setSending(true);
    setError(null);
    setNote(null);
    const result = await sendCode(purpose, email);
    setSending(false);
    if (!result.ok) {
      feel.warn();
      setError(result.message);
      return;
    }
    const t = Date.now();
    markCodeResent(t);
    setSentAt(t);
    setNow(t);
    setCode("");
    feel.tap();
    setNote("New code sent. Use the one in the newest email.");
  }

  return (
    <AuthScaffold title={"Check your\nemail"} greet={copy.greet} onBack={goBack}>
      <Text style={type.heading}>Enter the code</Text>
      <Text style={[type.bodySmall, { marginTop: 4 }]}>
        We sent a {CODE_LENGTH}-digit code to{" "}
        <Text style={{ fontFamily: font.semibold, color: ink[900] }}>{email}</Text>. {copy.after}
      </Text>

      <View className="mt-6">
        <CodeCells
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          length={CODE_LENGTH}
          state={state}
          wrongCount={wrongCount}
          onComplete={(full) => void submit(full)}
        />
      </View>

      {/* One status line, always the same height, so nothing below it jumps. */}
      <View className="mt-4 min-h-10 justify-center">
        {state === "checking" ? (
          <Enter kind="quick">
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color={brand[600]} />
              <Text style={[type.bodySmall, { color: ink[700] }]}>Checking the code…</Text>
            </View>
          </Enter>
        ) : error ? (
          <FormError message={error} />
        ) : note ? (
          <Enter key={note} kind="quick">
            <View accessibilityLiveRegion="polite" className="flex-row items-center gap-2">
              <MailCheck size={16} color={brand[600]} />
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: brand[700] }}>
                {note}
              </Text>
            </View>
          </Enter>
        ) : null}
      </View>

      <View className="mt-3">
        <Button
          onPress={() => void submit(code)}
          disabled={!isCompleteCode(code) || state !== "idle"}
        >
          <CtaLabel>{purpose === "recovery" ? "Continue" : "Verify and continue"}</CtaLabel>
        </Button>
      </View>

      <View className="mt-6 items-center gap-1">
        <Text style={[type.caption, { textAlign: "center" }]}>
          Didn&apos;t get it? Check spam, or wait a moment.
        </Text>
        <TextAction
          label={
            sending ? "Sending…" : waiting ? `Send a new code in ${formatCountdown(left)}` : "Send a new code"
          }
          disabled={waiting || sending || state !== "idle"}
          onPress={() => void resend()}
          accessibilityHint="Emails a fresh code. The old one stops working."
        />
        <TextAction label="Use a different email" onPress={goBack} />
      </View>
    </AuthScaffold>
  );
}
