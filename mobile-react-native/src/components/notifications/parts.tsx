import {
  BellRing,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  ChevronRight,
  Crown,
  FileCheck2,
  FileSearch,
  FlaskConical,
  HeartHandshake,
  KeyRound,
  LifeBuoy,
  Package,
  PartyPopper,
  Pill,
  Rocket,
  Settings2,
  Sparkles,
  Trash2,
  UserRoundMinus,
  UserRoundPlus,
  Activity,
  Check,
  CheckCheck,
  CircleDot,
  Dumbbell,
  X,
  type LucideIcon,
} from "lucide-react-native";
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

import { MascotBust, MascotFigure } from "@/components/illustrations/sprout";
import { Avatar } from "@/components/ui/avatar";
import { Glass, glass } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { PillButton } from "@/components/ui/screen";
import { relativeTime } from "@/lib/notifications/inbox";
import { ACTION_LABEL, type InboxItem, type NotificationKind } from "@/lib/notifications/types";
import { brand, hue, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Brand, brandify } from "@/components/ui/brand";
import { Tap } from "@/components/ui/tap";

/*
 * The pieces of the inbox.
 *
 * COLOUR. Each category gets its own pastel tile so the list reads at a glance
 * (violet reports, blue appointments, pink family, grey account, peach news).
 * None of those are green, amber or red: those mean something about health in
 * this app (PLAN.md rule 3). The one row that IS about health, values outside
 * the printed range, uses the caution amber, and only the tile, never the text.
 *
 * READ STATE. The one exception to the rule above, asked for by the product
 * owner on 2026-10-03 because a long inbox made it hard to tell what still
 * needed a look: a yellow dot marks a new notification and a green tick marks
 * one that has been read. They are small, always paired with words ("3 new",
 * "Read"), and never used for anything else on this screen.
 */

/** New: a yellow dot with a soft halo. Read: a small green tick. */
export function ReadMark({ read, size = 10 }: { read: boolean; size?: number }) {
  if (read) {
    return (
      <View style={{ width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, backgroundColor: semantic.safeBg, alignItems: "center", justifyContent: "center" }}>
        <Check size={size - 1} color={semantic.safe} strokeWidth={3.2} />
      </View>
    );
  }
  return (
    <View style={{ width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, backgroundColor: semantic.cautionBg, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand[600] }} />
    </View>
  );
}

type Tone = { bg: string; fg: string; icon: LucideIcon };

export const KIND_STYLE: Record<NotificationKind, Tone> = {
  report_ready: { bg: lilac.base, fg: brand[600], icon: FileCheck2 },
  report_review: { bg: lilac.base, fg: brand[600], icon: FileSearch },
  report_flagged: { bg: semantic.cautionBg, fg: semantic.cautionText, icon: Activity },
  appointment_booked: { bg: hue.blue.wash, fg: hue.blue.fg, icon: CalendarCheck2 },
  appointment_rescheduled: { bg: hue.blue.wash, fg: hue.blue.fg, icon: CalendarClock },
  appointment_cancelled: { bg: hue.slate.bg, fg: ink[500], icon: CalendarX2 },
  lab_booked: { bg: hue.blue.bg, fg: hue.blue.fg, icon: FlaskConical },
  lab_update: { bg: hue.blue.bg, fg: hue.blue.fg, icon: FlaskConical },
  lab_cancelled: { bg: hue.slate.bg, fg: ink[500], icon: FlaskConical },
  family_added: { bg: hue.rose.bg, fg: hue.rose.fg, icon: UserRoundPlus },
  family_removed: { bg: hue.slate.bg, fg: ink[500], icon: UserRoundMinus },
  plan_changed: { bg: lilac.base, fg: "#7b3fd4", icon: Crown },
  plan_ended: { bg: hue.slate.bg, fg: ink[500], icon: Crown },
  password_changed: { bg: hue.slate.bg, fg: ink[700], icon: KeyRound },
  support_update: { bg: hue.slate.bg, fg: ink[700], icon: LifeBuoy },
  service_live: { bg: hue.orange.wash, fg: hue.orange.fg, icon: Rocket },
  welcome: { bg: hue.orange.wash, fg: hue.orange.fg, icon: PartyPopper },
  dose_due: { bg: hue.plum.bg, fg: hue.plum.fg, icon: Pill },
  refill_due: { bg: hue.orange.wash, fg: hue.orange.fg, icon: Package },
  daily_nudge: { bg: lilac.base, fg: brand[600], icon: Sparkles },
  retest_due: { bg: hue.teal.bg, fg: hue.teal.fg, icon: CalendarClock },
  sunday_review: { bg: lilac.base, fg: brand[600], icon: CalendarDays },
  parent_alert: { bg: hue.rose.bg, fg: hue.rose.fg, icon: HeartHandshake },
  fitness_booked: { bg: hue.teal.bg, fg: hue.teal.fg, icon: Dumbbell },
  fitness_cancelled: { bg: hue.slate.bg, fg: ink[500], icon: Dumbbell },
};

export type Member = {
  name: string;
  avatar: string;
  avatarBackground: string;
  avatarImage?: ImageSourcePropType | null;
  photo?: string | null;
  isPrimary: boolean;
};

/** The category tile, with the family member's face tucked in the corner when it is about someone else. */
export function NotificationIcon({ kind, member, size = 46 }: { kind: NotificationKind; member?: Member; size?: number }) {
  const tone = KIND_STYLE[kind];
  const Icon = tone.icon;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: tone.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={size * 0.44} color={tone.fg} strokeWidth={1.9} />
      </View>
      {member && !member.isPrimary ? (
        <View
          style={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 22,
            height: 22,
            borderRadius: 999,
            overflow: "hidden",
            borderWidth: 2,
            borderColor: "#fff",
            backgroundColor: member.avatarBackground,
          }}
        >
          <Avatar svg={member.avatar} image={member.avatarImage} photo={member.photo} background={member.avatarBackground} size={18} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * One notification.
 *
 * Unread rows carry a violet dot and a faint violet wash, and the title is a
 * weight heavier; read rows settle back to the panel. The action chip names
 * what a tap does ("Check it", "Join", "Book now"), so the row is a promise,
 * not a mystery. Long press opens the row's own menu.
 */
export function NotificationRow({
  item,
  member,
  first,
  now,
  onPress,
  onLongPress,
  compact = false,
}: {
  item: InboxItem;
  member?: Member;
  first: boolean;
  now: Date;
  onPress: () => void;
  onLongPress: () => void;
  /** Read rows in the folded group: one line each, no action chip. */
  compact?: boolean;
}) {
  const unread = !item.readAt;
  const action = item.route && !compact ? ACTION_LABEL[item.kind] : undefined;
  const who = member && !member.isPrimary ? member.name.split(" ")[0] : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "New. " : "Read. "}${item.title}. ${item.body}`}
      accessibilityHint="Long press for more options"
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: compact ? "center" : "flex-start",
        gap: 13,
        paddingHorizontal: 14,
        paddingVertical: compact ? 11 : 14,
        backgroundColor: pressed ? surface.tint : "transparent",
        borderTopWidth: first ? 0 : 1,
        borderTopColor: "rgba(15,16,48,0.06)",
        transform: [{ scale: pressed ? 0.992 : 1 }],
      })}
    >
      <NotificationIcon kind={item.kind} member={member} size={compact ? 36 : 46} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <Text
            numberOfLines={compact ? 1 : 2}
            style={{
              flex: 1,
              fontFamily: unread ? font.semibold : font.medium,
              fontSize: 15,
              lineHeight: 20,
              letterSpacing: -0.15,
              color: ink[900],
            }}
          >
            {brandify(item.title)}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 20, color: ink[300] }}>
            {relativeTime(item.createdAt, now)}
          </Text>
        </View>
        <Text
          numberOfLines={compact ? 1 : 2}
          style={{ fontFamily: font.regular, fontSize: 13, lineHeight: compact ? 17 : 19, color: unread ? ink[700] : ink[500], marginTop: 2 }}
        >
          {brandify(item.body)}
        </Text>
        {who || action ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 }}>
            {who ? (
              <View style={{ paddingHorizontal: 9, height: 24, borderRadius: 999, justifyContent: "center", backgroundColor: "rgba(15,16,48,0.05)" }}>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[700] }}>For {who}</Text>
              </View>
            ) : null}
            {action ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                  paddingLeft: 10,
                  paddingRight: 6,
                  height: 24,
                  borderRadius: 999,
                  backgroundColor: surface.tint,
                }}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: ink[900] }}>{action}</Text>
                <ChevronRight size={13} color={ink[900]} strokeWidth={2.4} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={{ paddingTop: compact ? 0 : 4 }}>
        <ReadMark read={!unread} size={compact ? 9 : 10} />
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
      <Glass strong className="overflow-hidden rounded-xl">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{ flexDirection: "row", gap: 13, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: "rgba(15,16,48,0.06)" }}
          >
            <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: surface.line }} />
            <View style={{ flex: 1, gap: 8, paddingTop: 3 }}>
              <View style={{ height: 13, width: "70%", borderRadius: 999, backgroundColor: surface.line }} />
              <View style={{ height: 11, width: "92%", borderRadius: 6, backgroundColor: surface.tint }} />
              <View style={{ height: 11, width: "55%", borderRadius: 6, backgroundColor: surface.tint }} />
            </View>
          </View>
        ))}
      </Glass>
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
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: brand[50], alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <MascotBust size={60} mood="curious" pose="listen" />
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
