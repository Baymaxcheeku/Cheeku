import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  DatabaseZap,
  EyeOff,
  Fingerprint,
  HardDrive,
  KeyRound,
  LockKeyhole,
  MonitorSmartphone,
  ScanFace,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";

import { Panel, Section, SettingsScreen } from "@/components/settings/chrome";
import { Brand } from "@/components/ui/brand";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { SpringSwitch } from "@/components/ui/motion";
import { ACTIVITY_KEY, ACTIVITY_LABEL, logActivity, useActivity, type ActivityRow } from "@/lib/privacy/activity";
import { isLockEnabled, lockCapability, lockDelay, lockName, setLockDelay, setLockEnabled } from "@/lib/security/app-lock";
import { LOCK_DELAYS, type LockDelay } from "@/lib/security/lock-timing";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/**
 * Security: who can open this app, and what has happened on the account.
 *
 * Three jobs, in the order people come here for them. Lock the app. Do
 * something about a phone that is no longer theirs (a password reset, signing
 * every other device out). And check the recent activity for anything they did
 * not do, which is the only way most people ever find out.
 *
 * Every claim in "How your data is handled" is one this build keeps. The
 * longer answers live in Privacy & consent and Storage & cache, linked below,
 * rather than being repeated here and drifting.
 */
export default function Security() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState<null | "lock" | "delay" | "reset">(null);
  const [note, setNote] = useState<string | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);

  const state = useQuery({
    queryKey: ["app-lock"],
    queryFn: async () => {
      const [capability, enabled, delay] = await Promise.all([lockCapability(), isLockEnabled(), lockDelay()]);
      return { capability, enabled, delay };
    },
  });
  const activity = useActivity(8);

  async function toggleLock() {
    if (!state.data?.capability.available || busy) return;
    setBusy("lock");
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
      void logActivity(next ? "app_lock_on" : "app_lock_off");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["app-lock"] }),
        queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY }),
      ]);
    } finally {
      setBusy(null);
    }
  }

  async function changeDelay(next: LockDelay) {
    if (busy || state.data?.delay === next) return;
    setBusy("delay");
    setNote(null);
    try {
      const changed = await setLockDelay(next);
      if (!changed) {
        setNote("The auto-lock was left as it was.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["app-lock"] });
    } finally {
      setBusy(null);
    }
  }

  async function sendPasswordReset() {
    setBusy("reset");
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
      void logActivity("password_reset_requested");
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
      setBusy(null);
      void queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY });
    }
  }

  /*
   * Revokes every other session's refresh token. A phone that is open right
   * now keeps its current access token until it expires (an hour at most), so
   * the copy says "within the hour" rather than promising "instantly".
   */
  async function signOutOthers() {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setOthersOpen(false);
    if (error) {
      setNote("That did not go through. Check your connection and try again.");
      return;
    }
    await logActivity("signed_out_other_devices");
    void queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY });
    setNote("Every other phone and browser is signed out. Any that are open right now lose access within the hour.");
  }

  const capability = state.data?.capability;
  const enabled = state.data?.enabled ?? false;
  const delay = state.data?.delay ?? 0;

  return (
    <SettingsScreen title="Security" eyebrow="Who can open this app, and what has happened on your account" icon={ShieldCheck}>
      {/* ------------------------------------------------------ app lock -- */}
      <Section label="App lock">
        <Panel padded={false}>
          {state.isPending ? (
            <View className="items-center py-7">
              <ActivityIndicator color={brand[600]} />
            </View>
          ) : capability?.available ? (
            <>
              <View className="flex-row items-center gap-3.5 px-4 py-3.5">
                <IconTile icon={capability.kind === "face" ? ScanFace : Fingerprint} />
                <View className="min-w-0 flex-1">
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Require {lockName(capability.kind)}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[500], marginTop: 2 }}>
                    Ask when <Brand ai /> is opened or comes back from the background.
                  </Text>
                </View>
                {busy === "lock" ? (
                  <ActivityIndicator size="small" color={brand[600]} />
                ) : (
                  <SpringSwitch checked={enabled} onChange={() => void toggleLock()} label={`Require ${lockName(capability.kind)} to open Cheeku AI`} />
                )}
              </View>

              {enabled ? (
                <View className="px-4 pb-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: surface.line }}>
                  <View className="flex-row items-center gap-2">
                    <Timer size={15} color={ink[500]} />
                    <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>Lock after leaving the app</Text>
                    {busy === "delay" ? <ActivityIndicator size="small" color={brand[600]} /> : null}
                  </View>
                  <View className="mt-2.5 flex-row gap-2">
                    {LOCK_DELAYS.map((d) => {
                      const on = delay === d.seconds;
                      return (
                        <Tap
                          key={d.seconds}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={`Lock ${d.seconds === 0 ? "immediately" : `after ${d.label}`}`}
                          disabled={busy !== null}
                          onPress={() => void changeDelay(d.seconds)}
                          className="h-10 flex-1 items-center justify-center rounded-pill"
                          style={{ backgroundColor: on ? brand[600] : surface.base, borderWidth: 1, borderColor: on ? brand[600] : surface.line }}
                        >
                          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? "#fff" : ink[700] }}>{d.label}</Text>
                        </Tap>
                      );
                    })}
                  </View>
                  <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 10 }}>
                    The screen is hidden in your app switcher straight away, whichever you pick. Restarting the app always asks.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <Tap
              accessibilityRole={capability?.reason === "not-enrolled" ? "button" : "text"}
              onPress={capability?.reason === "not-enrolled" ? () => void Linking.openSettings() : undefined}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="h-9 w-9 items-center justify-center rounded-tile" style={{ backgroundColor: surface.tint }}>
                <Fingerprint size={17} color={ink[300]} />
              </View>
              <View className="min-w-0 flex-1">
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>App lock</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[300], marginTop: 2 }}>
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
            </Tap>
          )}
        </Panel>
      </Section>

      {/* ------------------------------------------------------- account -- */}
      <Section label="Sign-in">
        <Panel padded={false}>
          <ActionRow
            first
            icon={KeyRound}
            title="Change password"
            body="Sends a reset link to your email"
            busy={busy === "reset"}
            onPress={() => void sendPasswordReset()}
          />
          <ActionRow
            icon={MonitorSmartphone}
            title="Sign out of other devices"
            body="Keeps this phone signed in and ends every other session"
            onPress={() => setOthersOpen(true)}
          />
        </Panel>
        {note ? (
          <Text accessibilityRole="alert" style={{ marginHorizontal: 20, marginTop: 10, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink[700] }}>
            {note}
          </Text>
        ) : null}
      </Section>

      {/* ------------------------------------------------------ activity -- */}
      <Section label="Recent activity">
        <Panel padded={false}>
          {activity.isPending ? (
            <View className="items-center py-6">
              <ActivityIndicator color={brand[600]} />
            </View>
          ) : activity.data === null ? (
            <EmptyLine text="Activity history isn't switched on for your account yet." />
          ) : !activity.data?.length ? (
            <EmptyLine text="Nothing yet. Sign-ins and security changes will show up here." />
          ) : (
            activity.data.map((row, i) => <ActivityLine key={row.id} row={row} first={i === 0} />)
          )}
        </Panel>
        <Text style={{ marginHorizontal: 20, marginTop: 10, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500] }}>
          See something you didn&apos;t do? Change your password, then sign out of other devices.
        </Text>
      </Section>

      {/* ------------------------------------------------------- privacy -- */}
      <Section label="How your data is handled">
        <View className="mx-5 gap-2">
          <Fact icon={ShieldCheck} title="Only you can read your records" body="Every record is bound to your account at the database, not just hidden in the app." />
          <Fact
            icon={EyeOff}
            title="Location is taken out of photos"
            body="Before a photo leaves your phone, Cheeku saves a fresh copy without the hidden GPS data. PDFs are uploaded as they are."
          />
          <Fact
            icon={DatabaseZap}
            title="Never sold"
            body="Nothing is sold or used for ads. A care partner you book sees only what that booking needs, and only because you booked it."
          />
        </View>
        <View className="mt-3">
          <Panel padded={false}>
            <ActionRow
              first
              icon={LockKeyhole}
              title="Privacy & consent"
              body="What you agreed to, optional uses, your rights"
              onPress={() => router.push("/settings/privacy")}
            />
            <ActionRow icon={HardDrive} title="Storage & cache" body="What stays on this phone, and clearing it" onPress={() => router.push("/settings/storage")} />
          </Panel>
        </View>
      </Section>

      <ConfirmSheet
        open={othersOpen}
        title="Sign out everywhere else?"
        body="Every other phone, tablet and browser signed in to your account will need your password again. This phone stays signed in. Phones that are open right now lose access within the hour."
        confirmLabel="Sign out other devices"
        cancelLabel="Not now"
        onConfirm={signOutOthers}
        onClose={() => setOthersOpen(false)}
      />
    </SettingsScreen>
  );
}

const SOURCE_LABEL: Record<string, string> = { ios: "iOS", android: "Android", web: "Web" };

/** "Today, 2:05 pm", "Yesterday, 9:40 am", "3 Oct". Enough to spot a stranger. */
function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (days <= 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function ActivityLine({ row, first }: { row: ActivityRow; first: boolean }) {
  const source = row.source ? SOURCE_LABEL[row.source] ?? null : null;
  return (
    <View className="flex-row items-center gap-3 px-4 py-3" style={first ? undefined : { borderTopWidth: 1, borderTopColor: surface.line }}>
      <View className="min-w-0 flex-1">
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{ACTIVITY_LABEL[row.kind] ?? row.kind}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>
          {[when(row.created_at), source].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </View>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <Text style={{ paddingHorizontal: 16, paddingVertical: 16, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500] }}>{text}</Text>
  );
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <View className="h-9 w-9 items-center justify-center rounded-tile" style={{ backgroundColor: brand[50] }}>
      <Icon size={17} color={brand[600]} />
    </View>
  );
}

function ActionRow({
  icon,
  title,
  body,
  first = false,
  busy = false,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  first?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Tap
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      className="flex-row items-center gap-3.5 px-4 py-3.5"
      style={first ? undefined : { borderTopWidth: 1, borderTopColor: surface.line }}
    >
      <IconTile icon={icon} />
      <View className="min-w-0 flex-1">
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[500], marginTop: 2 }}>{body}</Text>
      </View>
      {busy ? <ActivityIndicator size="small" color={brand[600]} /> : <ChevronRight size={16} color={ink[300]} />}
    </Tap>
  );
}

function Fact({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <View className="flex-row gap-3 rounded-card bg-surface p-3.5" style={{ borderWidth: 1, borderColor: surface.line }}>
      <Icon size={17} color={brand[500]} style={{ marginTop: 1 }} />
      <View className="min-w-0 flex-1">
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 3 }}>{body}</Text>
      </View>
    </View>
  );
}
