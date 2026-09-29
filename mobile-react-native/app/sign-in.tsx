import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Apple,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { MascotBust } from "@/components/illustrations/sprout";
import { createAccountSchema, signInSchema } from "@/lib/auth/schemas";
import { resolveLanding } from "@/lib/auth/landing";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, shadow, surface } from "@/theme/tokens";

type Tab = "signIn" | "create";

/**
 * A3 — sign in and create account, ported from the web build.
 *
 * The sheet, the tab pair, the per-tab heading, the forgot-password link, the
 * consent panel and the three disabled providers are all in the original. They
 * are here because the screen reads as unfinished without them, not for
 * decoration: the providers in particular are in the approved frames, and
 * dropping them entirely would misrepresent what the screen becomes.
 */
export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("signIn");
  const [email, setEmail] = useState("");
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
      const credentials = { email: parsed.data.email, password: parsed.data.password };
      const { error: authError } =
        tab === "signIn"
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp(credentials);

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
            : authError.message,
        );
        return;
      }

      /*
       * Where they belong, not where a new account belongs.
       *
       * This was a hard-coded "/who", so signing in to an account that already
       * had a profile and years of records still walked through the whole of
       * onboarding and asked for a profile that existed. Replacing "/" instead
       * is not the fix either: that lands on the splash, which used to bounce
       * to the welcome carousel they had just finished.
       */
      router.replace(await resolveLanding());
    } catch {
      // A throw is a transport failure. Saying "wrong password" to someone with
      // no signal sends them to reset a password that was never the problem.
      setError("Could not reach Cheeku AI. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
        <View className="h-11 flex-row items-center px-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <ChevronLeft size={19} color={ink[700]} />
          </Pressable>
          <Pressable className="ml-auto" hitSlop={8} onPress={() => router.push("/welcome")}>
            <Text className="text-[14px] font-semibold text-brand-500">Help</Text>
          </Pressable>
        </View>

        <View className="relative px-5 pb-2">
          <View className="pr-[38%]">
            <Text className="text-[27px] font-bold leading-[32px] tracking-tight text-ink-900">
              Welcome{"\n"}
              <Text className="text-brand-600">to Cheeku AI</Text>
            </Text>
            <Text className="mt-2 text-[13px] leading-[19px] text-ink-500">
              Your family&apos;s health, protected and organised in one secure place.
            </Text>
          </View>
          <View className="absolute -right-2 top-0" pointerEvents="none">
            <MascotBust size={140} />
          </View>
        </View>

        {/* The sheet. Rounded at the top only, as in the frames. */}
        <ScrollView
          className="mt-2 flex-1 bg-surface"
          style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row border-b border-line">
            {(
              [
                ["signIn", "Sign in"],
                ["create", "Create account"],
              ] as const
            ).map(([key, label]) => {
              const on = tab === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => switchTo(key)}
                  className="flex-1 items-center pb-2.5 pt-1"
                  style={{
                    marginBottom: -1,
                    borderBottomWidth: 2,
                    borderBottomColor: on ? brand[600] : "transparent",
                  }}
                >
                  <Text
                    className="text-[14px] font-semibold"
                    style={{ color: on ? brand[600] : ink[500] }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="pt-4">
            <Text className="text-[15px] font-semibold text-ink-900">
              {tab === "signIn" ? "Sign in to your account" : "Create your account"}
            </Text>
            <Text className="mt-0.5 text-[12px] text-ink-500">
              {tab === "signIn"
                ? "Access your health records and insights"
                : "Your records stay private to you and the family you invite"}
            </Text>
          </View>

          <View className="mt-4 gap-3">
            <Field
              icon={<Mail size={17} color={ink[300]} />}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <View>
              <Field
                icon={<Lock size={17} color={ink[300]} />}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete={tab === "signIn" ? "current-password" : "new-password"}
                textContentType={tab === "signIn" ? "password" : "newPassword"}
                trailing={
                  <Pressable
                    accessibilityLabel={show ? "Hide password" : "Show password"}
                    onPress={() => setShow((v) => !v)}
                    hitSlop={8}
                  >
                    {show ? (
                      <EyeOff size={17} color={ink[300]} />
                    ) : (
                      <Eye size={17} color={ink[300]} />
                    )}
                  </Pressable>
                }
              />
              {tab === "create" ? (
                <Text className="mt-1.5 text-[12px] text-ink-300">At least 10 characters</Text>
              ) : null}
            </View>

            {tab === "signIn" ? (
              <Pressable className="self-end" hitSlop={8}>
                <Text className="text-[13px] font-medium text-brand-500">Forgot password?</Text>
              </Pressable>
            ) : (
              /* DPDP Act: unticked by default, and the copy names what is being
                 consented to rather than linking away to find out. */
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consent }}
                onPress={() => setConsent((v) => !v)}
                className="flex-row gap-2.5 rounded-tile bg-brand-50 px-3.5 py-3"
              >
                <View
                  className="mt-0.5 h-4 w-4 items-center justify-center rounded-[4px]"
                  style={{
                    borderWidth: 1.5,
                    borderColor: consent ? brand[600] : brand[200],
                    backgroundColor: consent ? brand[600] : "transparent",
                  }}
                >
                  {consent ? <View className="h-1.5 w-1.5 rounded-[1px] bg-white" /> : null}
                </View>
                <Text className="flex-1 text-[12px] leading-[17px] text-ink-500">
                  I agree that Cheeku may store and process my family&apos;s health records to give
                  me insights. I can export or delete everything at any time.
                </Text>
              </Pressable>
            )}

            {error ? (
              <Text accessibilityRole="alert" className="text-[13px] font-medium text-danger-text">
                {error}
              </Text>
            ) : null}

            <Button onPress={submit} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-[16px] font-bold text-white">
                  {tab === "signIn" ? "Sign in" : "Create account"}
                </Text>
              )}
            </Button>
          </View>

          <View className="my-4 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-line" />
            <Text className="text-[12px] text-ink-300">or continue with</Text>
            <View className="h-px flex-1 bg-line" />
          </View>

          {/*
           * In the frames, but no provider is configured yet. Shipping these as
           * buttons that silently do nothing would be worse than disabling
           * them, so they are disabled and say why.
           */}
          <View className="flex-row gap-2">
            {[
              { label: "Google", Icon: Mail },
              { label: "Apple", Icon: Apple },
              { label: "Phone (OTP)", Icon: Phone },
            ].map(({ label, Icon }) => (
              <View
                key={label}
                accessibilityLabel={`${label}. Coming soon, use email and password for now`}
                className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-pill bg-surface"
                style={{ borderWidth: 1, borderColor: surface.line, opacity: 0.55 }}
              >
                <Icon size={14} color={ink[500]} />
                <Text className="text-[12px] font-medium text-ink-500">{label}</Text>
              </View>
            ))}
          </View>

          <View className="mt-4 flex-row items-center justify-center gap-2">
            <ShieldCheck size={14} color={brand[400]} />
            <Text className="text-[12px] text-ink-500">
              Bank-level encryption. Your data is private and secure.
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  icon,
  trailing,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      className="h-[52px] flex-row items-center gap-2.5 rounded-tile bg-canvas px-3.5"
      style={{ borderWidth: 1, borderColor: focused ? brand[500] : surface.line }}
    >
      {icon}
      <TextInput
        {...props}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={ink[300]}
        style={{ flex: 1, fontSize: 15, color: ink[900], fontFamily: "Inter_400Regular" }}
      />
      {trailing}
    </View>
  );
}
