import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { MascotBust } from "@/components/illustrations/sprout";
import { CtaLabel } from "@/components/onboarding/chrome";
import { BubblePop, FillBar } from "@/components/onboarding/motion";
import { useReducedMotion } from "@/components/ui/motion";
import { ConsentBox } from "@/components/legal/consent-box";
import { authRedirectUrl } from "@/lib/auth/email-link";
import { createAccountSchema, signInSchema } from "@/lib/auth/schemas";
import { useAuth } from "@/lib/auth/state";
import { ensureSignupConsent, signupConsentPayload } from "@/lib/legal/consent";
import { clearOfflineCache } from "@/lib/offline/cache";
import { logActivity } from "@/lib/privacy/activity";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";
import { Brand } from "@/components/ui/brand";
import { Tap } from "@/components/ui/tap";

/** Mirrors `passwordSchema`'s minimum, for the live length meter. */
const MIN_PASSWORD = 10;

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

/**
 * A3 — sign in and create account.
 *
 * REDESIGNED 2026-09-29. Same logic, new surface:
 *
 * - Fields carry VISIBLE LABELS. A placeholder that vanishes on the first
 *   keystroke leaves somebody halfway through a password with no idea which
 *   box they are in.
 * - The tab pair is one sliding control, so switching reads as one thing
 *   changing its mind rather than two links.
 * - Creating a password shows a length meter instead of a rule to remember.
 *   It is brand violet, never green: green means a health result in this app.
 * - Other sign-in providers are not shown until one is configured. Disabled
 *   "Soon" buttons read as an unfinished app (UI audit, October 2026).
 */
export default function SignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const setPendingEmail = useAuth((s) => s.setPendingEmail);
  const [tab, setTab] = useState<Tab>("signIn");
  // Back from check-your-inbox, the address is already typed.
  const [email, setEmail] = useState(() => useAuth.getState().pendingEmail ?? "");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
   * Switching tab clears the fields.
   *
   * The web build remounts the form on tab change for the same reason: a
   * password typed while "Create account" was selected must never be silently
   * submitted to sign-in, or the other way round.
   */
  function switchTo(next: Tab) {
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

  async function submit() {
    setError(null);

    const parsed =
      tab === "signIn"
        ? signInSchema.safeParse({ email, password })
        : createAccountSchema.safeParse({ email, password, consent });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }

    setBusy(true);
    try {
      /*
       * A fresh session starts from a clean cache: whatever the last session
       * left (another account's family, or a "no profile" cached while signed
       * out) must never be what Home opens on. Cleared BEFORE the session
       * exists, because the moment it does the guards take the person on.
       */
      queryClient.clear();
      await clearOfflineCache();

      const credentials = { email: parsed.data.email, password: parsed.data.password };
      /*
       * The consent travels WITH the sign-up, in the new user's metadata, and
       * a database trigger writes it to the ledger inside the same insert that
       * creates the account (migration 0031). So an account never exists
       * without its consent record, even when email confirmation means there
       * is no session yet to write one from here.
       */
      const { data: authData, error: authError } =
        tab === "signIn"
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp({
              ...credentials,
              options: {
                data: { consent: signupConsentPayload() },
                // Where the confirmation email's link brings them back to.
                emailRedirectTo: authRedirectUrl(),
              },
            });

      /*
       * An account that has not opened its confirmation link yet. Supabase
       * only answers this when the password was right, so it says nothing
       * about whether an address has an account that the right password
       * would not already prove.
       */
      if (tab === "signIn" && authError?.code === "email_not_confirmed") {
        setPendingEmail(parsed.data.email);
        router.replace("/verify-email");
        return;
      }

      if (authError) {
        /*
         * One message for every credential failure on sign-in. Distinguishing
         * "no such account" from "wrong password" turns this form into a way to
         * discover who has an account here, which for a medical app is itself a
         * disclosure.
         */
        setError(
          tab === "signIn"
            ? "That email and password do not match an account."
            : authError.status === 429
              ? "Too many tries. Wait a minute, then try again."
              : authError.message,
        );
        return;
      }

      /*
       * Created, and waiting for its email to be confirmed: no session yet
       * (Supabase, "Confirm email" on). The same screen whether the address
       * is new or already has an account, because Supabase answers both the
       * same way and so does this app: telling them apart here would make
       * sign-up a way to find out who uses Cheeku.
       */
      if (!authData.session) {
        setPendingEmail(parsed.data.email);
        router.replace("/verify-email");
        return;
      }

      // Belt and braces for the consent trigger, then the account's own history.
      if (tab === "create") await ensureSignupConsent();
      void logActivity("sign_in");
      /*
       * No navigation here. The new session flips the root navigator's
       * guards: sign-in and welcome close, leave the history, and the splash
       * sends the person where they belong (resolveLanding). Navigating from
       * here as well would race it.
       */
    } catch {
      // A throw is a transport failure. Saying "wrong password" to someone with
      // no signal sends them to reset a password that was never the problem.
      setError("Could not reach Cheeku AI. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const copy = COPY[tab];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
        <View className="h-12 flex-row items-center px-5">
          <Tap scale={0.95}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <ChevronLeft size={20} color={ink[700]} />
          </Tap>
          <Tap className="ml-auto h-10 justify-center" hitSlop={8} onPress={() => router.push("/welcome")}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Help</Text>
          </Tap>
        </View>

        {/* The greeting. Cheeku says hello in a bubble that changes with the tab. */}
        <View className="flex-row items-end px-6 pb-1 pt-1">
          <View className="flex-1 pb-3">
            <Text accessibilityRole="header" style={type.title}>
              Welcome to{"\n"}
              <Text style={{ color: brand[600] }}><Brand ai /></Text>
            </Text>
          </View>
          <View className="items-center">
            <BubblePop key={tab} from="right" style={{ marginBottom: 4 }}>
              <View
                accessibilityLiveRegion="polite"
                className="rounded-lg px-3 py-1.5"
                style={[shadow.e1, { backgroundColor: brand[600], borderBottomRightRadius: 4 }]}
              >
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: "#ffffff" }}>{copy.greet}</Text>
              </View>
            </BubblePop>
            <MascotBust size={104} moment="present" />
          </View>
        </View>

        {/* The sheet. Rounded at the top only. */}
        <ScrollView
          className="flex-1 bg-surface"
          style={[{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }, shadow.e1]}
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
              textContentType="emailAddress"
            />

            <View>
              <Field
                label="Password"
                icon={<Lock size={18} color={brand[400]} />}
                placeholder={tab === "signIn" ? "Your password" : "At least 10 characters"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete={tab === "signIn" ? "current-password" : "new-password"}
                textContentType={tab === "signIn" ? "password" : "newPassword"}
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
              <Tap className="-mt-1 self-end" hitSlop={8} accessibilityRole="button">
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>
                  Forgot password?
                </Text>
              </Tap>
            ) : (
              /* DPDP Act: unticked by default, one box for the uses the service
                 needs, each itemised one tap away, optional uses never here. */
              <ConsentBox
                checked={consent}
                onToggle={() => setConsent((v) => !v)}
                onOpenDocument={(kind) => router.push({ pathname: "/legal/[doc]", params: { doc: kind } })}
              />
            )}

            {error ? (
              <View accessibilityRole="alert" className="flex-row items-start gap-2">
                <AlertCircle size={16} color={semantic.dangerText} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: semantic.dangerText }}>
                  {error}
                </Text>
              </View>
            ) : null}

            <Button onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <CtaLabel>{copy.cta}</CtaLabel>}
            </Button>
          </View>

          {/*
           * Google, Apple and Phone sign-in come back here once a provider is
           * configured. Three disabled "Soon" buttons read as an unfinished app
           * on the first screen anyone sees, so until then there is only email.
           */}

          <View className="mt-5 flex-row items-center justify-center gap-2">
            <ShieldCheck size={14} color={brand[400]} />
            <Text style={[type.caption, { color: ink[500] }]}>
              Encrypted in transit and at rest. Never sold.
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
            onPress={() => onChange(key)}
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

/** Counts up to the minimum length. Violet, never green: green means health. */
function PasswordMeter({ length }: { length: number }) {
  const done = length >= MIN_PASSWORD;
  return (
    <View className="mt-2.5 flex-row items-center gap-2.5">
      <View className="flex-1">
        <FillBar value={length / MIN_PASSWORD} color={brand[600]} track={brand[100]} height={5} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: done ? brand[700] : ink[500] }}>
        {done
          ? "Long enough"
          : `${MIN_PASSWORD - length} more ${MIN_PASSWORD - length === 1 ? "character" : "characters"}`}
      </Text>
    </View>
  );
}

function Field({
  label,
  icon,
  trailing,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-1.5">
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[700] }}>{label}</Text>
      <View
        className="h-[54px] flex-row items-center gap-3 rounded-lg px-4"
        style={{
          backgroundColor: focused ? surface.base : surface.canvas,
          borderWidth: 1.5,
          borderColor: focused ? brand[500] : surface.line,
        }}
      >
        {icon}
        <TextInput
          {...props}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={ink[300]}
          style={{ flex: 1, fontSize: 17, color: ink[900], fontFamily: font.regular }}
        />
        {trailing}
      </View>
    </View>
  );
}
