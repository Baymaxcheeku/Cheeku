import { BellRing, CheckCheck, CircleDot, Settings2, Trash2, X, type LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { Modal, Text, View, type ImageSourcePropType } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotFigure } from "@/components/illustrations/sprout";
import { Avatar } from "@/components/ui/avatar";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { Glass, glass } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { PillButton } from "@/components/ui/screen";
import { relativeTime } from "@/lib/notifications/inbox";
import { ACTION_LABEL, type InboxItem, type NotificationKind } from "@/lib/notifications/types";
import { brand, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Brand, brandify } from "@/components/ui/brand";
import { Tap } from "@/components/ui/tap";

/*
 * The pieces of the inbox (redesigned 17 Nov 2026, owner's brief: "no UI/UX
 * familiarity"). Modelled on the inboxes people already know: each
 * notification is its own soft card with one object for what it is about, a
 * bold title, one line of detail, the time, and, when there is something to
 * do, the action as a small button on the card. New ones carry a violet dot;
 * read ones settle back to grey text. Icons are Cheeku's own 3D set.
 */

const KIND_ICON: Record<NotificationKind, Icon3DName> = {
  report_ready: "report",
  report_review: "report",
  report_flagged: "clipboard",
  appointment_booked: "calendar-check",
  appointment_rescheduled: "calendar",
  appointment_cancelled: "calendar",
  lab_booked: "test-tube",
  lab_update: "test-tube",
  lab_cancelled: "test-tube",
  family_added: "family",
  family_removed: "family",
  plan_changed: "trophy",
  plan_ended: "trophy",
  password_changed: "shield",
  support_update: "headset",
  service_live: "star",
  welcome: "gift",
  dose_due: "blister",
  refill_due: "capsule",
  daily_nudge: "shoe",
  retest_due: "calendar",
  sunday_review: "star",
  parent_alert: "family",
  fitness_booked: "dumbbell",
  fitness_cancelled: "dumbbell",
};

/** Things that stopped (a cancelled booking, a removed member) sit back a little. */
const QUIET: ReadonlySet<NotificationKind> = new Set(["appointment_cancelled", "lab_cancelled", "family_removed", "plan_ended", "fitness_cancelled"]);

export type Member = {
  name: string;
  avatar: string;
  avatarBackground: string;
  avatarImage?: ImageSourcePropType | null;
  photo?: string | null;
  isPrimary: boolean;
};

/** The 3D object for the kind, on a soft plate, with the family member's face tucked in when it is about someone else. */
export function NotificationIcon({ kind, member, size = 48 }: { kind: NotificationKind; member?: Member; size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: "#f4f3ff", alignItems: "center", justifyContent: "center", opacity: QUIET.has(kind) ? 0.55 : 1 }}>
        <Icon3D name={KIND_ICON[kind]} size={Math.round(size * 0.66)} />
      </View>
      {member && !member.isPrimary ? (
        <View style={{ position: "absolute", right: -5, bottom: -5, width: 24, height: 24, borderRadius: 999, overflow: "hidden", borderWidth: 2, borderColor: "#fff", backgroundColor: member.avatarBackground }}>
          <Avatar svg={member.avatar} image={member.avatarImage} photo={member.photo} background={member.avatarBackground} size={20} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * One notification, as a card. The action (Check it, Join, Book now) is a
 * button on the card so the reader knows what a tap does. Long press for the
 * row's menu.
 */
export function NotificationRow({
  item,
  member,
  now,
  onPress,
  onLongPress,
}: {
  item: InboxItem;
  member?: Member;
  now: Date;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const unread = !item.readAt;
  const action = item.route ? ACTION_LABEL[item.kind] : undefined;
  const who = member && !member.isPrimary ? member.name.split(" ")[0] : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "New. " : ""}${item.title}. ${item.body}`}
      accessibilityHint="Swipe left to clear. Long press for more options"
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        padding: 16,
        borderRadius: 22,
        backgroundColor: "#fff",
        shadowColor: "#3b2bc9",
        shadowOpacity: unread ? 0.08 : 0.04,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <NotificationIcon kind={item.kind} member={member} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: unread ? font.semibold : font.medium, fontSize: 15, lineHeight: 20, letterSpacing: -0.15, color: unread ? ink[900] : ink[700] }}>
            {brandify(item.title)}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300] }}>{relativeTime(item.createdAt, now)}</Text>
          {unread ? <View aria-hidden style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: brand[500] }} /> : null}
        </View>
        <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 3 }}>
          {brandify(item.body)}
        </Text>
        {(unread && action) || who ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
            {unread && action ? (
              <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", backgroundColor: brand[50] }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{action}</Text>
              </View>
            ) : null}
            {who ? <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>For {who}</Text> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Placeholder rows while the first fetch is in flight. Shaped like the real thing, gently pulsing. */
export function InboxSkeleton() {
  const still = useReducedMotion();
  const o = useSharedValue(0.55);
  useEffect(() => {
    if (still) return;
    o.value = withRepeat(withSequence(withTiming(1, { duration: 650 }), withTiming(0.55, { duration: 650 })), -1);
  }, [still, o]);
  const pulse = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ marginTop: 18 }, pulse]}>
      <View style={{ gap: 10 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: "row", gap: 14, padding: 16, borderRadius: 22, backgroundColor: "#fff" }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: surface.line }} />
            <View style={{ flex: 1, gap: 8, paddingTop: 3 }}>
              <View style={{ height: 13, width: "70%", borderRadius: 999, backgroundColor: surface.line }} />
              <View style={{ height: 11, width: "92%", borderRadius: 6, backgroundColor: surface.tint }} />
              <View style={{ height: 11, width: "55%", borderRadius: 6, backgroundColor: surface.tint }} />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

/**
 * Asks before the OS does. iOS shows its permission dialog exactly once, so it
 * is only ever triggered from here, after someone has read what they are
 * agreeing to.
 */
export function PushPrimer({ onEnable, onLater, busy }: { onEnable: () => void; onLater: () => void; busy: boolean }) {
  return (
    <Glass strong className="mt-4 overflow-hidden rounded-xl p-4">
      <View className="flex-row items-start gap-3">
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
          <BellRing size={20} color={ink[900]} />
        </View>
        <View className="flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Want a tap on the shoulder?</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700], marginTop: 3 }}>
            I&apos;ll buzz you before appointments and when a report is ready. Your lock screen never shows anything
            private.
          </Text>
        </View>
        <Tap accessibilityRole="button" accessibilityLabel="Not now" onPress={onLater} hitSlop={10}>
          <X size={17} color={ink[300]} />
        </Tap>
      </View>
      <View className="mt-4 flex-row gap-2.5">
        <PillButton tone="light" onPress={onLater} style={{ flex: 1, height: 46 }}>
          Not now
        </PillButton>
        <PillButton tone="brand" loading={busy} onPress={onEnable} icon={<BellRing size={16} color="#fff" />} style={{ flex: 1.5, height: 46 }}>
          Turn on
        </PillButton>
      </View>
    </Glass>
  );
}

/** When the phone's settings have notifications off for the app. One line, one way out. */
export function PushBlocked({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpenSettings}
      style={({ pressed }) => ({
        marginTop: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: pressed ? lilac.base : brand[50],
      })}
    >
      <BellRing size={17} color={ink[900]} />
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
        Phone alerts are off for <Brand />. Everything still lands here.{" "}
        <Text style={{ fontFamily: font.semibold, color: brand[700] }}>Turn on in Settings</Text>
      </Text>
    </Pressable>
  );
}

/**
 * The row's own menu, on long press. Three things only: flip read state,
 * remove, and jump to settings for this kind of message.
 */
export function RowMenu({
  item,
  onClose,
  onToggleRead,
  onRemove,
  onSettings,
}: {
  item: InboxItem | null;
  onClose: () => void;
  onToggleRead: () => void;
  onRemove: () => void;
  onSettings: () => void;
}) {
  const insets = useSafeAreaInsets();
  const rows: { label: string; icon: LucideIcon; run: () => void; danger?: boolean }[] = item
    ? [
        { label: item.readAt ? "Mark as unread" : "Mark as read", icon: item.readAt ? CircleDot : CheckCheck, run: onToggleRead },
        { label: "Remove from inbox", icon: Trash2, run: onRemove, danger: true },
        { label: "Notification settings", icon: Settings2, run: onSettings },
      ]
    : [];

  return (
    <Modal visible={Boolean(item)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close menu" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.32)" }} />
      <View style={{ position: "absolute", left: 12, right: 12, bottom: insets.bottom + 12 }}>
        {item ? (
          <View style={{ borderRadius: 32, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim, overflow: "hidden" }}>
            <View className="flex-row items-center gap-3 px-4 pb-3 pt-4">
              <NotificationIcon kind={item.kind} size={38} />
              <Text numberOfLines={2} style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
                {item.title}
              </Text>
            </View>
            {rows.map((r) => (
              <Pressable
                key={r.label}
                accessibilityRole="button"
                onPress={() => {
                  r.run();
                  onClose();
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 18,
                  height: 54,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(15,16,48,0.06)",
                  backgroundColor: pressed ? "rgba(74,42,222,0.07)" : "transparent",
                })}
              >
                <r.icon size={19} color={r.danger ? semantic.dangerText : ink[700]} />
                <Text style={{ fontFamily: font.medium, fontSize: 15, color: r.danger ? semantic.dangerText : ink[900] }}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => ({
            marginTop: 10,
            height: 54,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? brand[50] : "#fff",
          })}
        >
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** The empty inbox, per filter. Cheeku, and one honest sentence about what shows up here. */
export function InboxEmpty({ filterLabel }: { filterLabel: string | null }) {
  return (
    <Glass strong className="mt-4 items-center rounded-2xl px-6 py-9">
      <MascotFigure size={96} moment="idle" move="float" hop />
      <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 10, textAlign: "center" }}>
        {filterLabel ? `Nothing in ${filterLabel.toLowerCase()} yet` : "You're all caught up"}
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[500], marginTop: 5, textAlign: "center" }}>
        {filterLabel
          ? "When something comes up, it lands here first."
          : "When a report is filed, a booking changes or something needs your eyes, you'll see it here."}
      </Text>
    </Glass>
  );
}
