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
import { Check, ChevronLeft, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { MascotBust } from "@/components/illustrations/sprout";
import { createAccountSchema, signInSchema } from "@/lib/auth/schemas";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, shadow } from "@/theme/tokens";

type Mode = "signIn" | "signUp";

/**
 * A3 — sign in and create account, as one screen with two tabs.
 *
 * Validation runs through the same Zod schema as the web build, so the rules
 * about what counts as a usable password live in one place.
 *
 * Supabase errors are surfaced verbatim only when they are safe to show. An
 * auth error that distinguishes "no such account" from "wrong password" is an
 * account-enumeration oracle, so both collapse to one message.
 */
export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);

    /*
     * Two schemas, not one. Creating an account additionally requires explicit
     * consent under the DPDP Act, and the schema rejects anything but a literal
     * `true` — which is what makes an unticked box fail rather than pass with a
     * falsy value.
     */
    const parsed =
      mode === "signIn"
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
        mode === "signIn"
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp(credentials);

      if (authError) {
        /*
         * Deliberately one message for every credential failure. Telling a
         * caller that an address exists but the password is wrong turns this
         * form into a way to discover who has an account here, which for a
         * medical app is itself a disclosure.
         */
        setError(
          mode === "signIn"
            ? "That email and password do not match an account."
            : authError.message,
        );
        return;
      }

      router.replace("/");
    } catch {
      /*
       * A thrown error here is a transport failure, not a credential one.
       * Saying so matters: "wrong password" when the user is on a train with no
       * signal sends them to reset a password that was never the problem.
       */
      setError("Could not reach Baymax. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="h-11 flex-row items-center px-5">
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <ChevronLeft size={19} color={ink[700]} />
          </Pressable>
        </View>

        <View className="relative px-5 pb-4 pt-1">
          <View className="pr-[36%]">
            <Text className="text-[26px] font-bold leading-[30px] tracking-tight text-ink-900">
              Welcome{"\n"}
              <Text className="text-brand-600">to Baymax</Text>
            </Text>
            <Text className="mt-2 text-[13px] leading-[18px] text-ink-500">
              Your family&apos;s health, protected and organised in one secure place.
            </Text>
          </View>
          <View className="absolute right-0 top-0">
            <MascotBust size={132} />
          </View>
        </View>

        <View className="mx-5 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          <View className="flex-row border-b border-line">
            {(
              [
                ["signIn", "Sign in"],
                ["signUp", "Create account"],
              ] as const
            ).map(([key, label]) => {
              const on = mode === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setMode(key);
                    setError(null);
                  }}
                  className="flex-1 items-center py-3.5"
                  style={{
                    borderBottomWidth: 2,
                    borderBottomColor: on ? brand[600] : "transparent",
                  }}
                >
                  <Text
                    className="text-[14px] font-bold"
                    style={{ color: on ? brand[600] : ink[500] }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="gap-3 p-4">
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

            <Field
              icon={<Lock size={17} color={ink[300]} />}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              textContentType={mode === "signIn" ? "password" : "newPassword"}
              trailing={
                <Pressable
                  accessibilityLabel={show ? "Hide password" : "Show password"}
                  onPress={() => setShow((v) => !v)}
                  hitSlop={8}
                >
                  {show ? <EyeOff size={17} color={ink[300]} /> : <Eye size={17} color={ink[300]} />}
                </Pressable>
              }
            />

            {mode === "signUp" ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consent }}
                onPress={() => setConsent((v) => !v)}
                className="flex-row items-start gap-2.5 pt-0.5"
              >
                <View
                  className="mt-0.5 h-5 w-5 items-center justify-center rounded-[6px]"
                  style={{
                    borderWidth: 1.5,
                    borderColor: consent ? brand[600] : "#c6c6f6",
                    backgroundColor: consent ? brand[600] : "transparent",
                  }}
                >
                  {consent ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                </View>
                <Text className="flex-1 text-[12px] leading-[17px] text-ink-500">
                  I agree to Baymax storing my family&apos;s health records, and I understand I can
                  export or delete everything at any time.
                </Text>
              </Pressable>
            ) : null}

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
                  {mode === "signIn" ? "Sign in" : "Create account"}
                </Text>
              )}
            </Button>
          </View>
        </View>

        <View className="mx-5 mt-4 flex-row items-center gap-2">
          <ShieldCheck size={14} color={ink[300]} />
          <Text className="flex-1 text-[11.5px] leading-[16px] text-ink-300">
            Bank-level encryption. Your data is private and secure.
          </Text>
        </View>
      </ScrollView>
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
      style={{ borderWidth: 1, borderColor: focused ? brand[500] : "#e8e8f4" }}
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
