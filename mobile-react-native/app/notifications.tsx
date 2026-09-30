import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CheckCheck, Settings2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppointmentCard } from "@/components/booking/appointment-card";
import {
  InboxEmpty,
  InboxSkeleton,
  NotificationRow,
  PushBlocked,
  PushPrimer,
  RowMenu,
  type Member,
} from "@/components/notifications/parts";
import { Glass, GlassCircle, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { isUpcoming, startsAt, useAppointmentList } from "@/lib/booking/appointments";
import { applyFilter, groupByDay, unreadCount } from "@/lib/notifications/inbox";
import { enablePush, pushPermission } from "@/lib/notifications/push";
import { CATEGORY_LABEL, type InboxFilter, type InboxItem, type NotificationCategory } from "@/lib/notifications/types";
import { useInbox, useInboxActions, useOpenNotification } from "@/lib/notifications/use-inbox";
import type { ActiveProfile } from "@/lib/profiles/context";
import { updateNotificationPrefs } from "@/lib/settings/actions";
import { kv } from "@/lib/storage";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Notifications, the whole screen.
 *
 * Was a bottom sheet listing flagged records. It is now a proper inbox, the
 * way people already know from every app on their phone:
 *
 *   header       back · settings
 *   title        "Notifications" + how many are new, and Mark all read
 *   primer       ask for phone alerts, once, in our words before the OS's
 *   coming up    the next appointment within a day, as a live card
 *   filters      All · Unread · one chip per category that has anything
 *   sections     Today · Yesterday · Earlier this week · Earlier
 *
 * SNAPPINESS. The list renders from the cached query the bell already
 * fetched, so it is on screen in the first frame. Tapping a row marks it read
 * and navigates in the same tick; the write catches up behind. Only the very
 * first open with an empty cache shows the skeleton.
 */

const PRIMER_KEY = "cheeku.pushPrimer";

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const qc = useQueryClient();
  const inbox = useInbox();
  const actions = useInboxActions();
  const open = useOpenNotification();
  const appointments = useAppointmentList();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [menu, setMenu] = useState<InboxItem | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Relative times ("5 min") stay true while the screen is open.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Fresh on every visit, on top of whatever the cache showed instantly.
  useEffect(() => {
    void inbox.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- phone alerts -------------------------------------------------------
  const permission = useQuery({ queryKey: ["push-permission"], queryFn: pushPermission });
  const primerSeen = useQuery({ queryKey: ["push-primer"], queryFn: () => kv.get(PRIMER_KEY) });
  const [enabling, setEnabling] = useState(false);
  const showPrimer = permission.data === "undetermined" && primerSeen.isSuccess && !primerSeen.data;

  async function turnOn() {
    setEnabling(true);
    const status = await enablePush();
    if (status === "granted") {
      // The three that matter most, on together, since they just said yes.
      await updateNotificationPrefs({ appointmentReminders: true, reportNotifications: true, accountSecurity: true });
      void qc.invalidateQueries({ queryKey: ["own-family"] });
    }
    await kv.set(PRIMER_KEY, new Date().toISOString());
    setEnabling(false);
    void permission.refetch();
    void primerSeen.refetch();
  }

  async function later() {
    await kv.set(PRIMER_KEY, new Date().toISOString());
    void primerSeen.refetch();
  }

  // --- the list -----------------------------------------------------------
  const items = useMemo(() => inbox.data ?? [], [inbox.data]);
  const unread = unreadCount(items);
  const visible = useMemo(() => applyFilter(items, filter), [items, filter]);
  const sections = useMemo(() => groupByDay(visible, now), [visible, now]);

  const categories = useMemo(() => {
    const present = new Set(items.map((i) => i.category));
    return (Object.keys(CATEGORY_LABEL) as NotificationCategory[]).filter((c) => present.has(c));
  }, [items]);

  // If the filter's last row was removed, fall back rather than show an empty chip.
  useEffect(() => {
    if (filter !== "all" && filter !== "unread" && !categories.includes(filter)) setFilter("all");
  }, [categories, filter]);

  // Who each row is about, from the profiles Home already loaded.
  const members = useMemo(() => {
    const ctx = qc.getQueryData<{ access: { all: ActiveProfile[] } }>(["home-context"]);
    const map = new Map<string, Member>();
    for (const p of ctx?.access.all ?? []) map.set(p.id, p);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, inbox.dataUpdatedAt]);

  const nextAppt = appointments.items
    .filter((a) => isUpcoming(a, now))
    .sort((a, b) => startsAt(a).getTime() - startsAt(b).getTime())[0];
  const soon = nextAppt && startsAt(nextAppt).getTime() - now.getTime() < 24 * 3_600_000 ? nextAppt : undefined;

  const onRow = useCallback((item: InboxItem) => open(item), [open]);

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader
        fallback="/home"
        right={
          <GlassCircle label="Notification settings" onPress={() => router.push("/settings/notifications")}>
            <Settings2 size={20} color={ink[900]} />
          </GlassCircle>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={inbox.isRefetching && !inbox.isPending}
            onRefresh={() => void inbox.refetch()}
            tintColor={brand[600]}
          />
        }
      >
        {/* Title row. */}
        <View className="mt-2 flex-row items-end justify-between gap-3">
          <View className="flex-1">
            <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: ink[900] }}>
              Notifications
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 3 }}>
              {inbox.isPending
                ? "Checking for news"
                : unread > 0
                  ? `${unread} new for you`
                  : items.length > 0
                    ? "Nothing new since you last looked"
                    : "Reports, bookings and reminders, all in one place"}
            </Text>
          </View>
          {unread > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void actions.markAllRead()}
              hitSlop={8}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: 38,
                paddingHorizontal: 13,
                borderRadius: 999,
                backgroundColor: pressed ? "#e4defd" : brand[50],
              })}
            >
              <CheckCheck size={16} color={brand[700]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>

        {showPrimer ? <PushPrimer busy={enabling} onEnable={() => void turnOn()} onLater={() => void later()} /> : null}
        {permission.data === "denied" ? <PushBlocked onOpenSettings={() => void Linking.openSettings()} /> : null}

        {soon ? (
          <Animated.View entering={still ? undefined : FadeIn.duration(220)} className="mt-5">
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[500], marginBottom: 8, marginLeft: 4 }}>Coming up</Text>
            <AppointmentCard appt={soon} hero />
          </Animated.View>
        ) : null}

        {/* Filters. Only categories that have something in them. */}
        {items.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            <Chip label="All" on={filter === "all"} onPress={() => setFilter("all")} />
            <Chip label={unread ? `Unread · ${unread}` : "Unread"} on={filter === "unread"} onPress={() => setFilter("unread")} />
            {categories.map((c) => (
              <Chip key={c} label={CATEGORY_LABEL[c]} on={filter === c} onPress={() => setFilter(c)} />
            ))}
          </ScrollView>
        ) : null}

        {inbox.isPending ? (
          <InboxSkeleton />
        ) : inbox.isError && items.length === 0 ? (
          <Glass strong className="mt-4 items-center rounded-[28px] px-6 py-8">
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], textAlign: "center" }}>Couldn&apos;t load your notifications</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 4, textAlign: "center" }}>
              Check your connection and try again.
            </Text>
            <PillButton onPress={() => void inbox.refetch()} style={{ marginTop: 16, alignSelf: "stretch" }}>
              Try again
            </PillButton>
          </Glass>
        ) : sections.length === 0 ? (
          <InboxEmpty filterLabel={filter === "all" ? null : filter === "unread" ? "Unread" : CATEGORY_LABEL[filter]} />
        ) : (
          sections.map((section, si) => (
            <Animated.View
              key={section.title}
              layout={still ? undefined : LinearTransition.duration(180)}
              entering={still ? undefined : FadeInDown.delay(si * 40).duration(240)}
              style={{ marginTop: 20 }}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[500], marginBottom: 8, marginLeft: 4 }}>{section.title}</Text>
              <Glass strong className="overflow-hidden rounded-[26px]">
                {section.items.map((item, i) => (
                  <Animated.View key={item.id} layout={still ? undefined : LinearTransition.duration(180)}>
                    <NotificationRow
                      item={item}
                      member={item.profileId ? members.get(item.profileId) : undefined}
                      first={i === 0}
                      now={now}
                      onPress={() => onRow(item)}
                      onLongPress={() => setMenu(item)}
                    />
                  </Animated.View>
                ))}
              </Glass>
            </Animated.View>
          ))
        )}

        {items.length > 0 ? (
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center", marginTop: 18 }}>
            Long press any notification for more options.
          </Text>
        ) : null}
      </ScrollView>

      <RowMenu
        item={menu}
        onClose={() => setMenu(null)}
        onToggleRead={() => {
          if (!menu) return;
          void (menu.readAt ? actions.markUnread(menu.id) : actions.markRead([menu.id]));
        }}
        onRemove={() => menu && void actions.dismiss([menu.id])}
        onSettings={() => router.push("/settings/notifications")}
      />
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        on ? null : glassShadow,
        {
          height: 40,
          paddingHorizontal: 16,
          borderRadius: 999,
          justifyContent: "center",
          backgroundColor: on ? ink[900] : pressed ? "#ffffff" : glass.fillStrong,
          borderWidth: on ? 0 : 1,
          borderColor: glass.rim,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 13.5, color: on ? "#fff" : ink[700] }}>{label}</Text>
    </Pressable>
  );
}
