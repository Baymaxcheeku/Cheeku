import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  CalendarClock,
  Gift,
  Lightbulb,
  LineChart,
  Mail,
  Megaphone,
  ShieldAlert,
  Tag,
  Users2,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { SettingsScreen } from "@/components/settings/chrome";
import { SpringSwitch } from "@/components/ui/motion";
import { updateNotificationPrefs } from "@/lib/settings/actions";
import { DEFAULT_PREFS, ownFamily } from "@/lib/settings/queries";
import type { NotificationPrefs } from "@/lib/settings/schemas";
import { brand, ink, shadow, surface } from "@/theme/tokens";

type Key = keyof NotificationPrefs;

const GROUPS: {
  title: string;
  body: string;
  icon: LucideIcon;
  rows: { key: Key; icon: LucideIcon; title: string; body: string }[];
}[] = [
  {
    title: "General updates",
    body: "Important updates about your account and Cheeku AI.",
    icon: BellRing,
    rows: [
      {
        key: "accountSecurity",
        icon: ShieldAlert,
        title: "Account & security",
        body: "Login, password changes and security alerts.",
      },
      {
        key: "productUpdates",
        icon: Megaphone,
        title: "Product updates",
        body: "New features, improvements and announcements.",
      },
      {
        key: "tipsReminders",
        icon: Lightbulb,
        title: "Tips & reminders",
        body: "Helpful tips to get the most out of Cheeku AI.",
      },
    ],
  },
  {
    title: "Health & insights",
    body: "Stay on top of your health and check-ins.",
    icon: LineChart,
    rows: [
      {
        key: "checkinReminders",
        icon: CalendarClock,
        title: "Daily check-in reminders",
        body: "Receive reminders to complete your check-in.",
      },
      {
        key: "healthInsights",
        icon: LineChart,
        title: "Health insights",
        body: "Personalised insights based on your data.",
      },
      {
        key: "reportNotifications",
        icon: Mail,
        title: "Report notifications",
        body: "When your reports are ready or updated.",
      },
    ],
  },
  {
    title: "Family & sharing",
    body: "Updates about your family members and sharing.",
    icon: Users2,
    rows: [
      {
        key: "familyActivity",
        icon: Users2,
        title: "Family member activity",
        body: "Check-ins and added reports from family members.",
      },
      {
        key: "invitations",
        icon: Mail,
        title: "Invitations & requests",
        body: "Alerts for invites to join or share.",
      },
    ],
  },
  {
    title: "Marketing & offers",
    body: "Special offers and content we think you'll love.",
    icon: Gift,
    rows: [
      {
        key: "promotions",
        icon: Tag,
        title: "Promotions & offers",
        body: "Discounts, offers and exclusive deals.",
      },
    ],
  },
];

export default function Notifications() {
  const family = useQuery({ queryKey: ["own-family"], queryFn: ownFamily });

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (family.data) setPrefs(family.data.prefs);
  }, [family.data]);

  /*
   * Optimistic, and reverted on failure.
   *
   * A switch is the one control where lag is unacceptable — it exists to feel
   * instant. But a switch that stays on after the write failed is worse than a
   * slow one: the reader believes they turned something off. So it moves at
   * once and moves back if the save does not land.
   */
  function toggle(key: Key) {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    setError(null);
    void updateNotificationPrefs({ [key]: next }).then((result) => {
      if (!result.ok) {
        setPrefs((p) => ({ ...p, [key]: !next }));
        setError(result.message);
      }
    });
  }

  return (
    <SettingsScreen title="Notifications" eyebrow="Alerts and reminders" icon={Bell}>
      {family.isPending ? (
        <View className="mt-16 items-center">
          <ActivityIndicator color={brand[600]} />
        </View>
      ) : (
        <>
          {/*
           * The honest caveat, first. Every switch below writes a real stored
           * preference, but nothing delivers a push yet — that is Phase 5, and
           * it needs APNs and FCM credentials. Collecting consent for a
           * delivery system that does not exist is fine; implying messages are
           * already being sent is not.
           */}
          <View className="mx-5 mt-4 flex-row items-start gap-2 rounded-card bg-brand-50 px-4 py-3">
            <Bell size={15} color={brand[500]} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-[12px] leading-[17px] text-ink-700">
              Your choices are saved now and honoured the moment push notifications arrive. Cheeku
              never puts a health detail in a notification, so nothing sensitive shows on a locked
              screen.
            </Text>
          </View>

          {GROUPS.map((group) => (
            <View key={group.title} className="mt-6">
              <View className="flex-row items-center gap-2 px-5">
                <group.icon size={15} color={ink[300]} />
                <Text className="text-[15px] font-semibold text-ink-700">
                  {group.title}
                </Text>
              </View>
              <Text className="mt-1 px-5 text-[11.5px] text-ink-300">{group.body}</Text>

              <View
                className="mx-5 mt-2 overflow-hidden rounded-card bg-surface"
                style={shadow.e1}
              >
                {group.rows.map((row, i) => (
                  <View
                    key={row.key}
                    className="flex-row items-center gap-3 px-3.5 py-3"
                    style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
                      <row.icon size={16} color={brand[600]} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[14px] font-semibold text-ink-900">{row.title}</Text>
                      <Text className="mt-0.5 text-[11.5px] leading-[16px] text-ink-500">
                        {row.body}
                      </Text>
                    </View>
                    <SpringSwitch
                      checked={prefs[row.key]}
                      onChange={() => toggle(row.key)}
                      label={row.title}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          {error ? (
            <Text
              accessibilityRole="alert"
              className="mx-5 mt-4 text-[13px] font-medium text-danger-text"
            >
              {error}
            </Text>
          ) : null}
        </>
      )}
    </SettingsScreen>
  );
}
