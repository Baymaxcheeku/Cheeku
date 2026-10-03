import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CheckCheck, ChevronDown, Settings2, Trash2, Undo2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
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
  ReadMark,
  RowMenu,
  type Member,
} from "@/components/notifications/parts";
import { Glass, GlassCircle, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { isUpcoming, startsAt, useAppointmentList } from "@/lib/booking/appointments";
import { applyFilter, groupByDay, splitByRead, unreadCount } from "@/lib/notifications/inbox";
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
  const [showRead, setShowRead] = useState(false);
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
    setShowRead(false);
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
  const split = useMemo(() => splitByRead(visible), [visible]);
  const sections = useMemo(() => groupByDay(split.fresh, now), [split.fresh, now]);
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

        {items.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <StatusTile
              read={false}
              count={unread}
              label="new"
              note={unread ? "Waiting for a look" : "Nothing waiting"}
              on={filter === "unread"}
              onPress={() => setFilter(filter === "unread" ? "all" : "unread")}
            />
            <StatusTile
              read
              count={readTotal}
              label="read"
              note={readTotal ? (showRead ? "Showing below" : "Folded away") : "None yet"}
              on={showRead && filter !== "unread"}
              onPress={() => {
                if (filter === "unread") setFilter("all");
                setShowRead((v) => !v);
              }}
              action={readTotal ? { label: "Clear", run: clearRead } : undefined}
            />
          </View>
        ) : null}

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
            <Chip label={unread ? `New · ${unread}` : "New"} on={filter === "unread"} onPress={() => setFilter("unread")} />
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
        ) : visible.length === 0 ? (
          <InboxEmpty filterLabel={filter === "all" ? null : filter === "unread" ? "New" : CATEGORY_LABEL[filter]} />
        ) : (
          <>
            {sections.length === 0 ? (
              <Animated.View entering={still ? undefined : FadeIn.duration(220)} style={{ marginTop: 20 }}>
                <Glass strong className="flex-row items-center gap-3 rounded-[22px] px-4 py-3.5">
                  <ReadMark read size={11} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>You&apos;re all caught up</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>Nothing new. Older ones are in Read below.</Text>
                  </View>
                </Glass>
              </Animated.View>
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
                        <SwipeToClear onClear={() => clearOne(item)}>
                          <NotificationRow
                            item={item}
                            member={item.profileId ? members.get(item.profileId) : undefined}
                            first={i === 0}
                            now={now}
                            onPress={() => onRow(item)}
                            onLongPress={() => setMenu(item)}
                          />
                        </SwipeToClear>
                      </Animated.View>
                    ))}
                  </Glass>
                </Animated.View>
              ))
            )}

            {/* Read ones, folded. One tap opens them, one tap clears them. */}
            {split.seen.length > 0 ? (
              <Animated.View layout={still ? undefined : LinearTransition.duration(200)} style={{ marginTop: 22 }}>
                <Glass strong className="overflow-hidden rounded-[26px]">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 14, paddingRight: 8, height: 56 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showRead }}
                      accessibilityLabel={`${split.seen.length} read. ${showRead ? "Hide" : "Show"}`}
                      onPress={() => setShowRead((v) => !v)}
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 56 }}
                    >
                      <ReadMark read size={10} />
                      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Read</Text>
                      <Text style={{ fontFamily: font.medium, fontSize: 13.5, color: ink[500] }}>{split.seen.length}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{showRead ? "Hide" : "Show"}</Text>
                      <View style={{ transform: [{ rotate: showRead ? "180deg" : "0deg" }] }}>
                        <ChevronDown size={17} color={ink[500]} />
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear all read notifications"
                      onPress={clearRead}
                      hitSlop={6}
                      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: pressed ? "#e4defd" : brand[50] })}
                    >
                      <Trash2 size={14} color={brand[700]} />
                      <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: brand[700] }}>Clear</Text>
                    </Pressable>
                  </View>
                  {showRead
                    ? split.seen.map((item) => (
                        <Animated.View key={item.id} entering={still ? undefined : FadeIn.duration(160)} layout={still ? undefined : LinearTransition.duration(180)}>
                          <SwipeToClear onClear={() => clearOne(item)}>
                            <NotificationRow
                              item={item}
                              compact
                              member={item.profileId ? members.get(item.profileId) : undefined}
                              first={false}
                              now={now}
                              onPress={() => onRow(item)}
                              onLongPress={() => setMenu(item)}
                            />
                          </SwipeToClear>
                        </Animated.View>
                      ))
                    : null}
                </Glass>
              </Animated.View>
            ) : null}
          </>
        )}

        {items.length > 0 ? (
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center", marginTop: 18 }}>
            Swipe left to clear one. Long press for more options.
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
        onRemove={() => menu && clearOne(menu)}
        onSettings={() => router.push("/settings/notifications")}
      />

      {undo ? (
        <Animated.View
          entering={still ? undefined : FadeInDown.duration(200)}
          exiting={still ? undefined : FadeOutDown.duration(160)}
          style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 16, paddingRight: 6, height: 52, borderRadius: 999, backgroundColor: ink[900] }}>
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, color: "#fff" }}>{undo.label}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void actions.restore(undo.items);
                setUndo(null);
              }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: pressed ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)" })}
            >
              <Undo2 size={15} color="#fff" />
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>Undo</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** One of the two status tiles: yellow for new, green for read. */
function StatusTile({
  read,
  count,
  label,
  note,
  on,
  onPress,
  action,
}: {
  read: boolean;
  count: number;
  label: string;
  note: string;
  on: boolean;
  onPress: () => void;
  action?: { label: string; run: () => void };
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${count} ${label}. ${note}`}
      onPress={onPress}
      style={({ pressed }) => [
        glassShadow,
        {
          flex: 1,
          padding: 14,
          borderRadius: 22,
          backgroundColor: pressed ? "#fff" : glass.fillStrong,
          borderWidth: on ? 2 : 1,
          borderColor: on ? (read ? semantic.safe : semantic.caution) : glass.rim,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <ReadMark read={read} size={10} />
        {action ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${action.label} read notifications`} onPress={action.run} hitSlop={10}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: ink[900], marginTop: 8 }}>
        {count} <Text style={{ fontFamily: font.medium, fontSize: 15, letterSpacing: 0, color: ink[700] }}>{label}</Text>
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 1 }}>{note}</Text>
    </Pressable>
  );
}

/** Swipe a row left to clear it. Undo is offered by the screen. */
function SwipeToClear({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <Swipeable
      friction={1.6}
      rightThreshold={70}
      overshootRight={false}
      // Solid, so the Clear panel behind stays hidden until the row moves.
      childrenContainerStyle={{ backgroundColor: "#fcfcff" }}
      onSwipeableOpen={(direction) => {
        if (direction === "left") onClear();
      }}
      renderRightActions={() => (
        <View style={{ width: 96, alignItems: "center", justifyContent: "center", backgroundColor: ink[900] }}>
          <Trash2 size={18} color="#fff" />
          <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: "#fff", marginTop: 4 }}>Clear</Text>
        </View>
      )}
    >
      {children}
    </Swipeable>
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
