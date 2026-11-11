import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View, type TextInputInstance } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react-native";

import { AuthScaffold, Field, FormError, PasswordMeter, TextAction } from "@/components/auth/chrome";
import { CtaLabel } from "@/components/onboarding/chrome";
import { ConsentBox } from "@/components/legal/consent-box";
import { Brand } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/components/ui/motion";
import { Tap } from "@/components/ui/tap";
import { setPendingCode, type Purpose } from "@/lib/auth/code";
import { authMessage, isUnconfirmed } from "@/lib/auth/errors";
import { enterApp, sendCode } from "@/lib/auth/flow";
import { createAccountSchema, emailSchema, signInSchema } from "@/lib/auth/schemas";
import { feel } from "@/lib/feel";
import { signupConsentPayload } from "@/lib/legal/consent";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/*
 * Per-tab copy. Cheeku greets a returning person and a new one differently,
 * because they are in different moods: one wants to get back to something, the
 * other is deciding whether to trust an app with their family's paperwork.
 */
const COPY = {
  signIn: {
    greet: "Welcome back!",
    title: "Good to see you again",
    body: "Your family's health file is right where you left it.",
    cta: "Log in",
  },
  create: {
    greet: "Yay, a new friend!",
    title: "Let's set you up",
    body: "Takes about a minute. Your records stay private to you and the family you invite.",
    cta: "Create my account",
  },
} as const;

type Tab = "signIn" | "create";
type Busy = null | "submit" | "login" | "recovery";

/**
 * A3 — sign in and create account.
 *
 * REDESIGNED 2026-09-29, CODES ADDED 2026-11-11.
 *
 * - Fields carry VISIBLE LABELS. A placeholder that vanishes on the first
 *   keystroke leaves somebody halfway through a password with no idea which
 *   box they are in.
 * - The tab pair is one sliding control, so switching reads as one thing
 *   changing its mind rather than two links.
 * - Creating a password shows a length meter instead of a rule to remember.
 *   It is brand violet, never green: green means a health result in this app.
 * - Every email is a CODE typed on /verify, never a link (links open a
 *   browser and leave the phone signed out). A new account is confirmed
 *   there; an account that never was is sent there from Log in; "Forgot
 *   password?" and "Email me a login code" both start there.
 * - Works with Supabase's "Confirm email" on or off: a sign-up that comes
 *   back with a session goes straight in, one without goes to /verify.
 */
export default function SignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const passwordRef = useRef<TextInputInstance>(null);

  const [tab, setTab] = useState<Tab>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  /*
   * Switching tab clears the fields.
   *
   * The web build remounts the form on tab change for the same reason: a
   * password typed while "Create account" was selected must never be silently
   * submitted to sign-in, or the other way round.
   */
  function switchTo(next: Tab) {
    feel.tick();
    setTab(next);
    setEmail("");
    setPassword("");
    setConsent(false);
    setError(null);
  }

  /*
   * `back()` fails when this screen is the first entry in the history stack,
   * which it is on a cold launch or a direct link. Falling back to /welcome
   * keeps the control honest instead of surfacing a GO_BACK error.
   */
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/welcome");
  }

  function fail(message: string) {
    feel.warn();
    setError(message);
  }

  /** Hand over to /verify. The address travels in memory, never in the route. */
  function toVerify(purpose: Purpose, address: string) {
    setPendingCode({ email: address, purpose, sentAt: Date.now() });
    router.push("/verify");
  }

  async function submit() {
    if (busy) return;
    setError(null);

    const parsed =
      tab === "signIn"
        ? signInSchema.safeParse({ email, password })
        : createAccountSchema.safeParse({ email, password, consent });

    if (!parsed.success) {
      fail(parsed.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }

    setBusy("submit");
    try {
      const credentials = { email: parsed.data.email, password: parsed.data.password };

      if (tab === "signIn") {
        const { error: authError } = await supabase.auth.signInWithPassword(credentials);
        if (authError) {
          /*
           * Right password, address never confirmed. Supabase only says this
           * after checking the password, so it reveals nothing a stranger
           * could use. Send a fresh code and finish the job.
           */
          if (isUnconfirmed(authError)) {
            const sent = await sendCode("signup", credentials.email);
            if (!sent.ok) return fail(sent.message);
            toVerify("signup", credentials.email);
            return;
          }
          // One message for every credential failure: see lib/auth/errors.ts.
          return fail(authMessage(authError, "signIn"));
        }
        await enterApp(router, queryClient, { newAccount: false });
        return;
      }

      /*
       * The consent travels WITH the sign-up, in the new user's metadata, and
       * a database trigger writes it to the ledger inside the same insert that
       * creates the account (migration 0031). So an account never exists
       * without its consent record, even though there is no session until the
       * code is entered.
       */
      const { data, error: authError } = await supabase.auth.signUp({
        ...credentials,
        options: { data: { consent: signupConsentPayload() } },
      });
      if (authError) return fail(authMessage(authError, "signUp"));

      // "Confirm email" off: already signed in.
      if (data.session) {
        await enterApp(router, queryClient, { newAccount: true });
        return;
      }
      /*
       * "Confirm email" on: a code is on its way. This is ALSO what an address
       * that already has an account sees (Supabase answers a repeat sign-up
       * the same way and sends nothing), so the form never says who is a member.
       */
      toVerify("signup", credentials.email);
    } catch {
      // A throw is a transport failure. Saying "wrong password" to someone with
      // no signal sends them to reset a password that was never the problem.
      fail("Could not reach Cheeku AI. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  /** "Forgot password?" and "Email me a login code": both need only the email. */
  async function askForCode(purpose: "login" | "recovery") {
    if (busy) return;
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      fail(
        purpose === "recovery"
          ? "Type your email above, then tap Forgot password."
          : "Type your email above, then tap Email me a login code.",
      );
      return;
    }
    setBusy(purpose);
    const sent = await sendCode(purpose, parsed.data);
    setBusy(null);
    if (!sent.ok) return fail(sent.message);
    feel.tap();
    toVerify(purpose, parsed.data);
  }

  const copy = COPY[tab];

  return (
    <AuthScaffold
      title={
        <>
          Welcome to{"\n"}
          <Text style={{ color: brand[600] }}>
            <Brand ai />
          </Text>
        </>
      }
      greet={copy.greet}
      greetKey={tab}
      onBack={goBack}
      trailing={
        <Tap className="h-11 justify-center" hitSlop={8} onPress={() => router.push("/welcome")}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Help</Text>
        </Tap>
      }
    >
      <Segmented value={tab} onChange={switchTo} />

      <View className="pt-5">
        <Text style={type.heading}>{copy.title}</Text>
        <Text style={[type.bodySmall, { marginTop: 4 }]}>{copy.body}</Text>
      </View>

      <View className="mt-5 gap-4">
        <Field
          label="Email"
          icon={<Mail size={18} color={brand[400]} />}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType={tab === "signIn" ? "username" : "emailAddress"}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />

        <View>
          <Field
            ref={passwordRef}
            label="Password"
            icon={<Lock size={18} color={brand[400]} />}
            placeholder={tab === "signIn" ? "Your password" : "At least 10 characters"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoComplete={tab === "signIn" ? "current-password" : "new-password"}
            textContentType={tab === "signIn" ? "password" : "newPassword"}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            trailing={
              <Tap
                accessibilityRole="button"
                accessibilityLabel={show ? "Hide password" : "Show password"}
                onPress={() => setShow((v) => !v)}
                hitSlop={10}
              >
                {show ? <EyeOff size={18} color={ink[300]} /> : <Eye size={18} color={ink[300]} />}
              </Tap>
            }
          />
          {tab === "create" ? <PasswordMeter length={password.length} /> : null}
        </View>

        {tab === "signIn" ? (
          <View className="-mt-2">
            <TextAction
              label={busy === "recovery" ? "Sending a code…" : "Forgot password?"}
              align="end"
              disabled={busy !== null}
              onPress={() => void askForCode("recovery")}
              accessibilityHint="Emails you a code to set a new password"
            />
          </View>
        ) : (
          /* DPDP Act: unticked by default, one box for the uses the service
             needs, each itemised one tap away, optional uses never here. */
          <ConsentBox
            checked={consent}
            onToggle={() => setConsent((v) => !v)}
            onOpenDocument={(kind) => router.push({ pathname: "/legal/[doc]", params: { doc: kind } })}
          />
        )}

        <FormError message={error} />

        <Button onPress={() => void submit()} disabled={busy !== null}>
          {busy === "submit" ? <ActivityIndicator color="#fff" /> : <CtaLabel>{copy.cta}</CtaLabel>}
        </Button>

        {tab === "signIn" ? (
          <TextAction
            label={busy === "login" ? "Sending a code…" : "Email me a login code instead"}
            disabled={busy !== null}
            onPress={() => void askForCode("login")}
            accessibilityHint="Log in with a code from your email, no password"
          />
        ) : null}
      </View>

      {/*
       * Google, Apple and Phone sign-in come back here once a provider is
       * configured. Three disabled "Soon" buttons read as an unfinished app
       * on the first screen anyone sees, so until then there is only email.
       */}

      <View className="mt-5 flex-row items-center justify-center gap-2">
        <ShieldCheck size={14} color={brand[400]} />
        <Text style={[type.caption, { color: ink[500] }]}>Encrypted in transit and at rest. Never sold.</Text>
      </View>
    </AuthScaffold>
  );
}

/**
 * The two-way switch, with a sliding thumb.
 *
 * Measured rather than percentage-positioned: a translate needs pixels, and the
 * track's width is only known after layout.
 */
function Segmented({ value, onChange }: { value: Tab; onChange: (next: Tab) => void }) {
  const still = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const half = Math.max(0, (width - 8) / 2);

  useEffect(() => {
    const to = value === "signIn" ? 0 : half;
    x.value = still ? to : withSpring(to, { damping: 22, stiffness: 320 });
  }, [value, half, still, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className="h-12 flex-row rounded-pill p-1"
      style={{ backgroundColor: surface.tint }}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 4,
              left: 4,
              bottom: 4,
              width: half,
              borderRadius: 999,
              backgroundColor: surface.base,
            },
            shadow.e1,
            thumb,
          ]}
        />
      ) : null}
      {(
        [
          ["signIn", "Log in"],
          ["create", "New here? Sign up"],
        ] as const
      ).map(([key, label]) => {
        const on = value === key;
        return (
          <Tap
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) onChange(key);
            }}
            className="flex-1 items-center justify-center"
          >
            <Text style={{ fontFamily: on ? font.bold : font.medium, fontSize: 15, color: on ? brand[700] : ink[500] }}>
              {label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}
