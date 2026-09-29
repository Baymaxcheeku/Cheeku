import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  DatabaseZap,
  EyeOff,
  Fingerprint,
  KeyRound,
  ScanFace,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Glass, GlassCircle } from "@/components/ui/glass";
import { SpringSwitch } from "@/components/ui/motion";
import { Backdrop } from "@/components/ui/screen";
import { font } from "@/theme/type";
import {
  isLockEnabled,
  lockCapability,
  lockName,
  setLockEnabled,
} from "@/lib/security/app-lock";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, shadow, surface } from "@/theme/tokens";

/**
 * Security & privacy. Phase 5's app lock, plus the facts about where the data
 * actually lives.
 *
 * The privacy half is not filler. "Is this thing safe" is the question people
 * ask before uploading a prescription, and answering it with a lock switch and
 * nothing else leaves them to guess. Each claim below is one this build can
 * actually keep.
 */
export default function Security() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const state = useQuery({
    queryKey: ["app-lock"],
    queryFn: async () => {
      const [capability, enabled] = await Promise.all([lockCapability(), isLockEnabled()]);
      return { capability, enabled };
    },
  });

  async function toggleLock() {
    if (!state.data?.capability.available || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const next = !state.data.enabled;
      const changed = await setLockEnabled(next);
      if (!changed) {
        // Both directions require passing the challenge, so a refusal here is
        // ordinary rather than an error. Say what happened and leave it alone.
        setNote("The switch was left as it was.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["app-lock"] });
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset() {
    setBusy(true);
    setNote(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) {
        setNote("Sign in again before changing your password.");
        return;
      }
      await supabase.auth.resetPasswordForEmail(email);
      /*
       * Always the same message, and never one that reveals whether the send
       * succeeded for this address. The sign-in form is careful not to confirm
       * which emails have accounts; a reset that reported failure differently
       * would hand back the same oracle from a different screen.
       */
      setNote("If that address has an account, a reset link is on its way.");
    } catch {
      setNote("If that address has an account, a reset link is on its way.");
    } finally {
      setBusy(false);
    }
  }

  const capability = state.data?.capability;
  const enabled = state.data?.enabled ?? false;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop height={380} />
      <View className="flex-row items-center px-4 pb-1" style={{ paddingTop: insets.top + 6 }}>
        <GlassCircle label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}>
          <ChevronLeft size={21} color={ink[900]} />
        </GlassCircle>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3.5 px-5 pt-3">
          <Glass strong className="h-14 w-14 items-center justify-center rounded-[18px]">
            <ShieldCheck size={23} color={brand[600]} strokeWidth={1.8} />
          </Glass>
          <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 26, lineHeight: 31, letterSpacing: -0.7, color: ink[900] }}>
            Security &amp; privacy
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[500], marginTop: 2 }}>
            Who can open this app, and what happens to what is inside it.
          </Text>
          </View>
        </View>

        {/* ------------------------------------------------------ app lock -- */}
        <Text className="mt-7 px-5 text-[15px] font-semibold text-ink-700">
          App lock
        </Text>
        <View className="mx-5 mt-2 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          {state.isPending ? (
            <View className="items-center py-7">
              <ActivityIndicator color={brand[600]} />
            </View>
          ) : capability?.available ? (
            <View className="flex-row items-center gap-3.5 px-3.5 py-3.5">
              <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
                {capability.kind === "face" ? (
                  <ScanFace size={17} color={brand[600]} />
                ) : (
                  <Fingerprint size={17} color={brand[600]} />
                )}
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[14.5px] font-semibold text-ink-900">
                  Require {lockName(capability.kind)}
                </Text>
                <Text className="mt-0.5 text-[11.5px] leading-[16px] text-ink-500">
                  Ask every time Cheeku AI is opened or comes back from the background.
                </Text>
              </View>
              {busy ? (
                <ActivityIndicator size="small" color={brand[600]} />
              ) : (
                <SpringSwitch
                  checked={enabled}
                  onChange={() => void toggleLock()}
                  label={`Require ${lockName(capability.kind)} to open Cheeku AI`}
                />
              )}
            </View>
          ) : (
            <Pressable
              accessibilityRole={capability?.reason === "not-enrolled" ? "button" : "text"}
              onPress={
                capability?.reason === "not-enrolled"
                  ? () => void Linking.openSettings()
                  : undefined
              }
              className="flex-row items-center gap-3.5 px-3.5 py-3.5"
            >
              <View className="h-9 w-9 items-center justify-center rounded-tile bg-canvas">
                <Fingerprint size={17} color={ink[300]} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[14.5px] font-semibold text-ink-500">App lock</Text>
                <Text className="mt-0.5 text-[11.5px] leading-[16px] text-ink-300">
                  {/*
                   * The two unavailable cases read differently on purpose. One
                   * is fixable in thirty seconds and the other is not, and
                   * telling someone with no sensor to "set one up" sends them
                   * hunting through Settings for something that is not there.
                   */}
                  {capability?.reason === "not-enrolled"
                    ? "Set up a fingerprint, face unlock or passcode in your phone's settings, then come back. Tap to open Settings."
                    : "This device does not support a biometric lock."}
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {enabled ? (
          <Text className="mx-5 mt-2 text-[11.5px] leading-[17px] text-ink-300">
            Cheeku also hides the screen in your app switcher, so a preview of your records is
            never left in the list of open apps.
          </Text>
        ) : null}

        {/* ------------------------------------------------------ password -- */}
        <Text className="mt-7 px-5 text-[15px] font-semibold text-ink-700">
          Account
        </Text>
        <View className="mx-5 mt-2 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void sendPasswordReset()}
            className="flex-row items-center gap-3.5 px-3.5 py-3.5"
          >
            <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
              <KeyRound size={17} color={brand[600]} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[14.5px] font-semibold text-ink-900">Change password</Text>
              <Text className="mt-0.5 text-[11.5px] text-ink-500">
                Sends a reset link to your email
              </Text>
            </View>
          </Pressable>
        </View>

        {note ? (
          <Text
            accessibilityRole="alert"
            className="mx-5 mt-2 text-[12.5px] leading-[18px] text-ink-500"
          >
            {note}
          </Text>
        ) : null}

        {/* ------------------------------------------------------- privacy -- */}
        <Text className="mt-7 px-5 text-[15px] font-semibold text-ink-700">
          How your data is handled
        </Text>
        <View className="mx-5 mt-2 gap-2">
          <Fact
            icon={ShieldCheck}
            title="Only you can read your records"
            body="Every record is bound to your account at the database, not just hidden in the app."
          />
          <Fact
            icon={EyeOff}
            title="Location is stripped from photos"
            body="A photo of a prescription carries the GPS of the room it was taken in. Cheeku removes it before the file ever leaves your phone."
          />
          <Fact
            icon={DatabaseZap}
            title="Nothing is sold, ever"
            body="Your records are not shared outside the family you invite, and are never used to sell you anything."
          />
        </View>

        <Text className="mx-5 mt-5 text-[11.5px] leading-[17px] text-ink-300">
          You can export everything or delete your account at any time from the settings screen.
        </Text>
      </ScrollView>
    </View>
  );
}

function Fact({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <View
      className="flex-row gap-3 rounded-card bg-surface p-3.5"
      style={{ borderWidth: 1, borderColor: surface.line }}
    >
      <Icon size={17} color={brand[500]} style={{ marginTop: 1 }} />
      <View className="min-w-0 flex-1">
        <Text className="text-[13.5px] font-semibold text-ink-900">{title}</Text>
        <Text className="mt-1 text-[11.5px] leading-[17px] text-ink-500">{body}</Text>
      </View>
    </View>
  );
}
