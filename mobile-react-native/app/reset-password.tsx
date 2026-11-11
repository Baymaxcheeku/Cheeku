import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Lock, MonitorSmartphone } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { AuthScaffold, Field, FormError, PasswordMeter } from "@/components/auth/chrome";
import { CtaLabel } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/ui/tap";
import { authMessage } from "@/lib/auth/errors";
import { enterApp } from "@/lib/auth/flow";
import { newPasswordSchema } from "@/lib/auth/schemas";
import { feel } from "@/lib/feel";
import { startFresh } from "@/lib/nav/start-fresh";
import { recordDeviceEvent } from "@/lib/notifications/queries";
import { logActivity } from "@/lib/privacy/activity";
import { supabase } from "@/lib/supabase/client";
import { brand, ink } from "@/theme/tokens";
import { type } from "@/theme/type";

/*
 * Choose a new password, after a reset code proved the email.
 *
 * The code already signed them in (a recovery session), so this screen only
 * has to set the password. Saving also signs every OTHER device out: a reset
 * is usually "someone may have my password", and a new password that leaves
 * the old sessions running fixes nothing.
 *
 * Leaving without saving is allowed and takes them into the app. They proved
 * the email, which is the same proof a login code is; trapping them here
 * would only make them close the app.
 */
export default function ResetPassword() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // No session means no code was checked (a reload, a stale link). Start over.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) startFresh(router, "/sign-in");
    });
  }, [router]);

  async function leave() {
    try {
      await enterApp(router, queryClient, { newAccount: false });
    } catch {
      startFresh(router, "/");
    }
  }

  async function save() {
    if (busy) return;
    setError(null);
    const parsed = newPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      feel.warn();
      setError(parsed.error.issues[0]?.message ?? "Check the password and try again.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (updateError) {
        feel.warn();
        setError(authMessage(updateError, "newPassword"));
        return;
      }

      // Best effort: the password is changed whatever happens next.
      const { error: othersError } = await supabase.auth.signOut({ scope: "others" }).catch(() => ({ error: true }));
      if (!othersError) void logActivity("signed_out_other_devices");
      await recordDeviceEvent({
        kind: "password_changed",
        title: "Your password was changed",
        body: "Done from this phone just now. If that wasn't you, reset it from Security straight away.",
        route: "/settings/security",
        dedupeKey: `password:${new Date().toISOString()}`,
      }).catch(() => undefined);

      feel.success();
      await leave();
    } catch {
      setError(authMessage({ status: 0 }, "newPassword"));
    } finally {
      setBusy(false);
    }
  }

  const eye = (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={show ? "Hide password" : "Show password"}
      onPress={() => setShow((v) => !v)}
      hitSlop={10}
    >
      {show ? <EyeOff size={18} color={ink[300]} /> : <Eye size={18} color={ink[300]} />}
    </Tap>
  );

  return (
    <AuthScaffold title={"Choose a new\npassword"} greet="You're nearly back!" onBack={() => void leave()}>
      <Text style={type.heading}>One you haven&apos;t used here</Text>
      <Text style={[type.bodySmall, { marginTop: 4 }]}>
        At least 10 characters. A short sentence you&apos;ll remember is stronger than a jumble you won&apos;t.
      </Text>

      <View className="mt-5 gap-4">
        <View>
          <Field
            label="New password"
            icon={<Lock size={18} color={brand[400]} />}
            placeholder="At least 10 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            autoFocus
            returnKeyType="next"
            trailing={eye}
          />
          <PasswordMeter length={password.length} />
        </View>

        <Field
          label="Type it again"
          icon={<Lock size={18} color={brand[400]} />}
          placeholder="Same password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />

        <FormError message={error} />

        <Button onPress={() => void save()} loading={busy} disabled={busy}>
          <CtaLabel>Save and continue</CtaLabel>
        </Button>

        <View className="flex-row items-start gap-2">
          <MonitorSmartphone size={14} color={ink[500]} style={{ marginTop: 2 }} />
          <Text style={[type.caption, { flex: 1 }]}>
            Saving signs you out on every other phone and browser. This one stays signed in.
          </Text>
        </View>
      </View>
    </AuthScaffold>
  );
}
