import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Bell,
  BellOff,
  BellRing,
  CalendarClock,
  ChevronRight,
  FileText,
  Inbox,
  KeyRound,
  Lock,
  Pill,
  Rocket,
  Sparkles,
  Tag,
  Users2,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { Panel, Section, SettingsScreen } from "@/components/settings/chrome";
import { SpringSwitch } from "@/components/ui/motion";
import { PillButton } from "@/components/ui/screen";
import { enablePush, pushPermission } from "@/lib/notifications/push";
import { runOptimistic } from "@/lib/optimistic";
import { updateNotificationPrefs } from "@/lib/settings/actions";
import { DEFAULT_PREFS, ownFamily } from "@/lib/settings/queries";
import type { NotificationPrefs } from "@/lib/settings/schemas";
import { brand, hue, ink, lilac } from "@/theme/tokens";
import { font } from "@/theme/type";
import { ListSkeleton } from "@/components/ui/skeleton";

type Key = keyof NotificationPrefs;

/*
 * What can buzz the phone, per kind of message.
 *
 * REWRITTEN 2026-09-30 alongside the real inbox. The old screen listed nine
 * switches, four of which (daily check-ins, insights, invitations, tips) had
 * nothing behind them and never would have sent anything. Every switch here
 * now maps to messages the app really produces (see migration 0024 and the
 * push-dispatch function), and the screen says plainly that the inbox gets
 * everything regardless, so turning a switch off can never hide something.
 *
 * The retired keys stay in the stored JSON and the schema, untouched, so an
 * older build reading the row does not break.
 */
const GROUPS: { title: string; rows: { key: Key; icon: LucideIcon; tint: string; fg: string; title: string; body: string }[] }[] = [
  {
    title: "Your health",
    rows: [
      {
        key: "appointmentReminders",
        icon: CalendarClock,
        tint: hue.blue.wash,
        fg: hue.blue.fg,
        title: "Appointment reminders",
        body: "A day before, an hour before, and the moment your call room opens.",
      },
      {
        key: "medicineReminders",
        icon: Pill,
        tint: hue.orange.wash,
        fg: hue.orange.fg,
        title: "Medicine reminders",
        body: "At each dose time, and five days before a strip runs out. Never names a medicine.",
      },
      {
        key: "dailyNudges",
        icon: Sparkles,
        tint: hue.teal.bg,
        fg: hue.teal.fg,
        title: "Daily nudges",
        body: "A few a day for your plan, goal and streak. Never after 10 pm.",
      },
      {
        key: "reportNotifications",
        icon: FileText,
        tint: lilac.base,
        fg: brand[600],
        title: "Reports",
        body: "When a report is filed, needs a quick check, or has values worth a look.",
      },
      {
        key: "familyActivity",
        icon: Users2,
        tint: hue.rose.bg,
        fg: hue.rose.fg,
        title: "Family",
        body: "When someone new joins your family's health files.",
      },
    ],
  },
  {
    title: "Your account",
    rows: [
      {
        key: "accountSecurity",
        icon: KeyRound,
        tint: hue.slate.bg,
        fg: ink[700],
        title: "Account and security",
        body: "Password changes, plan changes and replies from our support team.",
      },
    ],
  },
  {
    title: "From Cheeku",
    rows: [
      {
        key: "productUpdates",
        icon: Rocket,
        tint: hue.orange.wash,
        fg: hue.orange.fg,
        title: "New on Cheeku",
        body: "When a service you asked about goes live. We keep it rare.",
      },
      {
        key: "promotions",
        icon: Tag,
        tint: hue.orange.wash,
        fg: hue.orange.fg,
        title: "Offers",
        body: "Discounts on plans and bookings, only if you want them.",
      },
    ],
  },
];

export default function NotificationSettings() {
  const router = useRouter();
  const qc = useQueryClient();
  const family = useQuery({ queryKey: ["own-family"], queryFn: ownFamily });
  const permission = useQuery({ queryKey: ["push-permission"], queryFn: pushPermission });

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (family.data) setPrefs(family.data.prefs);
  }, [family.data]);

  /*
   * Optimistic, and reverted on failure.
   *
   * A switch is the one control where lag is unacceptable. But a switch that
   * stays on after the write failed is worse than a slow one: the reader
   * believes they turned something off. So it moves at once and moves back if
   * the save does not land. The cached family row is patched too, so the
   * reminder scheduler (which reads it) reacts without a refetch.
   */
  function toggle(key: Key) {
    const next = !prefs[key];
    const patchFamily = (value: boolean) =>
      qc.setQueryData(["own-family"], (old: { id: string; prefs: NotificationPrefs } | null | undefined) =>
        old ? { ...old, prefs: { ...old.prefs, [key]: value } } : old,
      );
    // On failure the switch flips back and the save bar offers Retry.
    void runOptimistic({
      apply: () => {
        setPrefs((p) => ({ ...p, [key]: next }));
        patchFamily(next);
      },
      revert: () => {
        setPrefs((p) => ({ ...p, [key]: !next }));
        patchFamily(!next);
      },
      write: () => updateNotificationPrefs({ [key]: next }),
      message: "Couldn't save that setting. Check your connection.",
    });
  }

  async function allow() {
    setAsking(true);
    await enablePush();
    await permission.refetch();
    setAsking(false);
  }

  const status = permission.data;

  return (
    <SettingsScreen title="Notifications" eyebrow="What reaches your phone" icon={Bell}>
      {family.isPending ? (
        <View className="px-5">
          <ListSkeleton rows={6} />
        </View>
      ) : (
        <>
          {/* Phone alerts: the one thing the switches below depend on. */}
          <Section>
            <Panel>
              <View className="flex-row items-center gap-3">
                <View
                  className="h-11 w-11 items-center justify-center rounded-lg"
                  style={{ backgroundColor: status === "granted" ? brand[50] : hue.slate.bg }}
                >
                  {status === "granted" ? <BellRing size={20} color={brand[600]} /> : <BellOff size={20} color={ink[500]} />}
                </View>
                <View className="flex-1">
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
                    {status === "granted"
                      ? "Phone alerts are on"
                      : status === "denied"
                        ? "Phone alerts are off"
                        : status === "unsupported"
                          ? "Phone alerts live in the app"
                          : "Phone alerts aren't on yet"}
                  </Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>
                    {status === "granted"
                      ? "Choose below what's allowed to buzz you."
                      : status === "denied"
                        ? "Your phone's settings are blocking Cheeku. Switch it back on there."
                        : status === "unsupported"
                          ? "Open Cheeku AI on your phone to turn these on."
                          : "Turn them on so reminders can actually reach you."}
                  </Text>
                </View>
              </View>
              {status === "undetermined" ? (
                <PillButton tone="brand" loading={asking} onPress={() => void allow()} icon={<BellRing size={16} color="#fff" />} style={{ marginTop: 14, height: 48 }}>
                  Turn on phone alerts
                </PillButton>
              ) : status === "denied" ? (
                <PillButton tone="light" onPress={() => void Linking.openSettings()} style={{ marginTop: 14, height: 48 }}>
                  Open phone settings
                </PillButton>
              ) : null}
            </Panel>
          </Section>

          <View className="mx-5 mt-4 flex-row items-start gap-2.5 rounded-lg px-4 py-3" style={{ backgroundColor: brand[50] }}>
            <Inbox size={16} color={brand[600]} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
              Everything always lands in your inbox. These switches only choose what can also buzz your phone.
            </Text>
          </View>

          {GROUPS.map((group) => (
            <Section key={group.title} label={group.title}>
              <Panel padded={false}>
                {group.rows.map((row, i) => (
                  <View
                    key={row.key}
                    className="flex-row items-center gap-3 px-4 py-3.5"
                    style={i > 0 ? { borderTopWidth: 1, borderTopColor: "rgba(15,16,48,0.06)" } : undefined}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-md" style={{ backgroundColor: row.tint }}>
                      <row.icon size={18} color={row.fg} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{row.title}</Text>
                      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 2 }}>{row.body}</Text>
                    </View>
                    <SpringSwitch checked={prefs[row.key]} onChange={() => toggle(row.key)} label={row.title} />
                  </View>
                ))}
              </Panel>
            </Section>
          ))}

          <View className="mx-5 mt-6 flex-row items-start gap-2.5">
            <Lock size={14} color={ink[300]} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500] }}>
              Your lock screen stays private. A buzz says something like &quot;Cheeku has an update on a report&quot;, never
              a result, a doctor or a name. The details wait inside the app.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => ({
              marginHorizontal: 20,
              marginTop: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              height: 44,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>Open your inbox</Text>
            <ChevronRight size={16} color={brand[700]} />
          </Pressable>
        </>
      )}
    </SettingsScreen>
  );
}
