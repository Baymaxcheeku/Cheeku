import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Settings2, Trash2, Undo2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeIn, FadeInDown, FadeOutDown, LinearTransition } from "react-native-reanimated";
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
import { Glass, GlassCircle } from "@/components/ui/glass";
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
import { brand, ink, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Notifications, the whole screen.
 *
 * REDESIGN, 17 Nov 2026 (owner: "no UI/UX familiarity"). Now shaped like the
 * inboxes people know: a big title with how many are new, one segmented
 * filter, then every notification as its own card, grouped by day, new ones
 * marked with a violet dot and an action button. The status tiles, the black
 * chips, the "caught up" card and the folded Read panel are gone; clearing
 * read ones is one quiet link at the end. The notes below still describe the
 * swipe, undo and speed behaviour.
 *
 * Was a bottom sheet listing flagged records. It is now a proper inbox, the
 * way people already know from every app on their phone:
 *
 *   header       back · settings
 *   title        "Notifications" + how many are new, and Mark all read
 *   primer       ask for phone alerts, once, in our words before the OS's
 *   coming up    the next appointment within a day, as a live card
 *   status       two tiles: yellow "3 new", green "12 read" with Clear
 *   filters      All · New · one chip per category that has anything
 *   new          Today · Yesterday · Earlier this week · Earlier, in full
 *   read         folded into one group you open on demand, one line each
 *
 * CLEANING UP (2026-10-03). Read notifications used to sit in the same list
 * as new ones, so a busy week buried what still needed a look. Now they fold
 * away, "Clear read" removes them in one tap, and any single row can be
 * swiped left to clear it. Every clear offers Undo for a few seconds. Cleared
 * rows are hidden, not deleted: they stay in the table and in an export.
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
  const [undo, setUndo] = useState<{ items: InboxItem[]; label: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function offerUndo(removed: InboxItem[], label: string) {
    if (removed.length === 0) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ items: removed, label });
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  }

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  function clearRead() {
    const removed = actions.clearRead();
    offerUndo(removed, removed.length === 1 ? "1 read notification cleared" : `${removed.length} read notifications cleared`);
  }

  function clearOne(item: InboxItem) {
    void actions.dismiss([item.id]);
    offerUndo([item], "Notification cleared");
  }
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
  const readTotal = items.length - unread;

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
            <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -1, color: ink[900] }}>
              Notifications
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 2 }}>
              {inbox.isPending ? "Checking for news" : unread > 0 ? (unread === 1 ? "1 new for you" : `${unread} new for you`) : items.length > 0 ? "You're all caught up" : "Reports, bookings and reminders land here"}
            </Text>
          </View>
          {unread > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => void actions.markAllRead()} hitSlop={10} style={({ pressed }) => ({ height: 36, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>

        {showPrimer ? <PushPrimer busy={enabling} onEnable={() => void turnOn()} onLater={() => void later()} /> : null}
        {permission.data === "denied" ? <PushBlocked onOpenSettings={() => void Linking.openSettings()} /> : null}

        {/* One segmented filter: All, New, then only the kinds that have something. */}
        {items.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
            <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 4, borderRadius: 999, backgroundColor: "#e9e8f3" }}>
              <Segment label="All" on={filter === "all"} onPress={() => setFilter("all")} />
              <Segment label="New" count={unread} on={filter === "unread"} onPress={() => setFilter("unread")} />
              {categories.map((c) => (
                <Segment key={c} label={CATEGORY_LABEL[c]} on={filter === c} onPress={() => setFilter(c)} />
              ))}
            </View>
          </ScrollView>
        ) : null}

        {soon ? (
          <Animated.View entering={still ? undefined : FadeIn.duration(220)} style={{ marginTop: 22 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginBottom: 10 }}>Coming up</Text>
            <AppointmentCard appt={soon} hero />
          </Animated.View>
        ) : null}

        {inbox.isPending ? (
          <InboxSkeleton />
        ) : inbox.isError && items.length === 0 ? (
          <Glass strong className="mt-4 items-center rounded-2xl px-6 py-8">
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], textAlign: "center" }}>Couldn&apos;t load your notifications</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 4, textAlign: "center" }}>
              Check your connection and try again.
            </Text>
            <PillButton onPress={() => void inbox.refetch()} style={{ marginTop: 16, alignSelf: "stretch" }}>
              Try again
            </PillButton>
          </Glass>
        ) : visible.length === 0 ? (
          <InboxEmpty filterLabel={filter === "all" ? null : filter === "unread" ? "New" : CATEGORY_LABEL[filter]} />
        ) : (
          <>
            {sections.map((section, si) => (
              <Animated.View
                key={section.title}
                layout={still ? undefined : LinearTransition.duration(180)}
                entering={still ? undefined : FadeInDown.delay(Math.min(si, 3) * 40).duration(240)}
                style={{ marginTop: 24 }}
              >
                <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginBottom: 10 }}>{section.title}</Text>
                <View style={{ gap: 10 }}>
                  {section.items.map((item) => (
                    <Animated.View key={item.id} layout={still ? undefined : LinearTransition.duration(180)}>
                      <SwipeToClear onClear={() => clearOne(item)}>
                        <NotificationRow
                          item={item}
                          member={item.profileId ? members.get(item.profileId) : undefined}
                          now={now}
                          onPress={() => onRow(item)}
                          onLongPress={() => setMenu(item)}
                        />
                      </SwipeToClear>
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            ))}

            {readTotal > 0 && filter !== "unread" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Clear ${readTotal} read notifications`}
                onPress={clearRead}
                hitSlop={8}
                style={({ pressed }) => ({ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 24, height: 40, paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 })}
              >
                <Trash2 size={15} color={ink[500]} />
                <Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500] }}>Clear read notifications</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      <RowMenu
        item={menu}
        onClose={() => setMenu(null)}
        onToggleRead={() => {
          if (!menu) return;
          void (menu.readAt ? actions.markUnread(menu.id) : actions.markRead([menu.id]));
        }}
        onRemove={() => menu && clearOne(menu)}
        onSettings={() => router.push("/settings/notifications")}
      />

      {undo ? (
        <Animated.View
          entering={still ? undefined : FadeInDown.duration(200)}
          exiting={still ? undefined : FadeOutDown.duration(160)}
          style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 16, paddingRight: 6, height: 52, borderRadius: 999, backgroundColor: brand[700] }}>
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: "#fff" }}>{undo.label}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void actions.restore(undo.items);
                setUndo(null);
              }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: pressed ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)" })}
            >
              <Undo2 size={15} color="#fff" />
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Undo</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Swipe a row left to clear it. Undo is offered by the screen. */
function SwipeToClear({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <Swipeable
      friction={1.6}
      rightThreshold={70}
      overshootRight={false}
      containerStyle={{ overflow: "visible" }}
      onSwipeableOpen={(direction) => {
        if (direction === "left") onClear();
      }}
      renderRightActions={() => (
        // A round button clear of the card, so nothing red shows at the card's rounded edge.
        <View style={{ width: 88, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: semantic.dangerText, alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={19} color="#fff" />
          </View>
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: semantic.dangerText, marginTop: 5 }}>Clear</Text>
        </View>
      )}
    >
      {children}
    </Swipeable>
  );
}

/** One option in the segmented filter: the chosen one is a white pill on the grey track. */
function Segment({ label, count, on, onPress }: { label: string; count?: number; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={count ? `${label}, ${count}` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 36,
        paddingHorizontal: 16,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: on ? "#fff" : "transparent",
        shadowColor: "#0f1030",
        shadowOpacity: on ? 0.08 : 0,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: on ? 1 : 0,
        opacity: pressed && !on ? 0.6 : 1,
      })}
    >
      <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? ink[900] : ink[500] }}>{label}</Text>
      {count ? (
        <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 11, color: "#fff" }}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
