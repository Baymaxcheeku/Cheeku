import { Check, Lock, Plus, Settings2, ShieldCheck, Sparkles, Users, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { PillButton } from "@/components/ui/screen";
import { formatPrice, PLANS } from "@/lib/billing/plans";
import { castFaces } from "@/lib/profiles/avatar";
import type { ActiveProfile } from "@/lib/profiles/context";
import type { FamilyMode } from "@/lib/profiles/family";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE FAMILY TRAY, for a Family plan.
 *
 * Was a list of names under "Your family". It is now the thing people see
 * when they think "whose health am I looking at": everyone as a big face
 * card, the one being viewed marked, a tap to switch, and room to add.
 *
 *   eyebrow   Family plan · 3 of 4 seats
 *   title     Whose health are we looking at?
 *   grid      two face cards per row (built by hand, never a wrapping row)
 *   add       dashed card while a seat is free
 *   paused    members a smaller plan paused: no name or face, one tap to plans
 *   footer    Manage family
 *
 * A tap switches straight away (the cache moves in the same frame) and the
 * sheet closes a beat later, so the check visibly lands on the new person
 * before the sheet goes.
 */

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

function chunk<T>(items: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

type Tile =
  | { kind: "member"; profile: ActiveProfile }
  | { kind: "paused"; key: string }
  | { kind: "add" };

export function FamilyTray({
  open,
  onClose,
  profiles,
  pausedCount,
  seats,
  activeId,
  onSelect,
  onAdd,
  onManage,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  profiles: readonly ActiveProfile[];
  pausedCount: number;
  seats: number;
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onManage: () => void;
  onUpgrade: () => void;
}) {
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const [picked, setPicked] = useState(activeId);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) setPicked(activeId);
  }, [open, activeId]);
  useEffect(() => () => {
    if (closing.current) clearTimeout(closing.current);
  }, []);

  const used = profiles.length;
  const tiles: Tile[] = [
    ...profiles.map((p) => ({ kind: "member" as const, profile: p })),
    ...Array.from({ length: pausedCount }, (_, i) => ({ kind: "paused" as const, key: `paused-${i}` })),
    ...(used < seats ? [{ kind: "add" as const }] : []),
  ];

  function choose(id: string) {
    if (id === picked) {
      onClose();
      return;
    }
    setPicked(id);
    onSelect(id);
    closing.current = setTimeout(onClose, still ? 0 : 260);
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.38)" }} />
      <View style={{ maxHeight: "86%", borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", backgroundColor: "#fafafe", paddingBottom: insets.bottom + 12 }}>
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 260 }}>
          <Gradient from="#ebe6ff" to="#fafafe" angle="vertical" />
        </View>
        <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(15,16,48,0.12)", marginTop: 8 }} />

        <View className="flex-row items-start gap-3 px-5 pt-4">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Users size={13} color={brand[600]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: brand[700] }}>
                Family plan · {used} of {seats} seats
              </Text>
            </View>
            <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: ink[900], marginTop: 6 }}>
              Whose health are we{"\n"}looking at?
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
            style={[glassShadow, { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
          >
            <X size={17} color={ink[700]} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, gap: 12 }} showsVerticalScrollIndicator={false}>
          {chunk(tiles, 2).map((row, r) => (
            <View key={r} style={{ flexDirection: "row", gap: 12 }}>
              {row.map((t, c) => (
                <Animated.View
                  key={t.kind === "member" ? t.profile.id : t.kind === "paused" ? t.key : "add"}
                  entering={still ? undefined : FadeInDown.delay((r * 2 + c) * 45).duration(260)}
                  style={{ flex: 1 }}
                >
                  {t.kind === "member" ? (
                    <MemberCard profile={t.profile} active={t.profile.id === picked} onPress={() => choose(t.profile.id)} />
                  ) : t.kind === "paused" ? (
                    <PausedCard onPress={() => { onClose(); onUpgrade(); }} />
                  ) : (
                    <AddCard left={seats - used} onPress={() => { onClose(); onAdd(); }} />
                  )}
                </Animated.View>
              ))}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}

          <View className="mt-1 flex-row items-center gap-2 px-1">
            <ShieldCheck size={14} color={ink[500]} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: ink[500] }}>
              Everyone&apos;s file stays separate. Cheeku only ever talks about the person you&apos;re viewing.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => { onClose(); onManage(); }}
            style={({ pressed }) => [glassShadow, {
              marginTop: 4,
              height: 52,
              borderRadius: 999,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: pressed ? "#ffffff" : glass.fillStrong,
              borderWidth: 1,
              borderColor: glass.rim,
            }]}
          >
            <Settings2 size={17} color={ink[900]} />
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Manage family</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function MemberCard({ profile, active, onPress }: { profile: ActiveProfile; active: boolean; onPress: () => void }) {
  const still = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? `${profile.name}, viewing now` : `Switch to ${profile.name}`}
      onPress={onPress}
      style={({ pressed }) => [glassShadow, {
        height: 158,
        borderRadius: 26,
        overflow: "hidden",
        padding: 14,
        borderWidth: active ? 2 : 1,
        borderColor: active ? brand[600] : glass.rim,
        backgroundColor: "#fff",
        transform: [{ scale: pressed ? 0.97 : 1 }],
      }]}
    >
      <Gradient from={profile.avatarBackground} to="#ffffff" angle="vertical" />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ borderRadius: 999, borderWidth: 3, borderColor: "#fff" }}>
          <Avatar svg={profile.avatar} background={profile.avatarBackground} size={62} />
        </View>
        {active ? (
          <Animated.View entering={still ? undefined : ZoomIn.springify().damping(12)}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}>
              <Check size={15} color="#fff" strokeWidth={3} />
            </View>
          </Animated.View>
        ) : null}
      </View>
      <View style={{ flex: 1 }} />
      <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 16.5, letterSpacing: -0.2, color: ink[900] }}>
        {firstName(profile.name)}
      </Text>
      <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12.5, color: active ? brand[700] : ink[500], marginTop: 1 }}>
        {active ? "Viewing now" : profile.isPrimary ? "You" : (profile.relationship ?? "Family")}
      </Text>
    </Pressable>
  );
}

/*
 * A member a smaller plan paused. No name and no face, on purpose: using a
 * real person's identity as bait for an upgrade would be selling against them
 * with their own data. The member screens (Manage family) do show names,
 * because there the reader is deciding what to do about them.
 */
function PausedCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Paused family member. Opens plans"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 158,
        borderRadius: 26,
        padding: 14,
        backgroundColor: pressed ? "#f1f0fe" : "rgba(255,255,255,0.6)",
        borderWidth: 1,
        borderColor: "rgba(15,16,48,0.08)",
      })}
    >
      <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "#eeecf8", alignItems: "center", justifyContent: "center" }}>
        <Lock size={20} color={ink[500]} />
      </View>
      <View style={{ flex: 1 }} />
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[700] }}>Paused</Text>
      <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: brand[700], marginTop: 1 }}>Unlock with Family</Text>
    </Pressable>
  );
}

function AddCard({ left, onPress }: { left: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a family member"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 158,
        borderRadius: 26,
        padding: 14,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: brand[300],
        backgroundColor: pressed ? "#ece8ff" : "rgba(241,240,254,0.7)",
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <Plus size={24} color={brand[600]} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }} />
      <Text style={{ fontFamily: font.semibold, fontSize: 16, color: brand[700] }}>Add someone</Text>
      <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[500], marginTop: 1 }}>
        {left === 1 ? "1 seat left" : `${left} seats left`}
      </Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------ upsell --

/*
 * THE LOCKED TRAY, for Free and Solo.
 *
 * Same tap on the same chip, so the family idea is discoverable where it
 * lives, but what opens is an honest pitch instead of a switcher that cannot
 * switch. It never shows anyone's real family (there is none on these plans)
 * and never pretends a feature works that doesn't.
 *
 * Free sees the Family plan at full price; Solo sees what the step up costs
 * from where they are. Both can compare every plan.
 */
export function FamilyUpsellSheet({
  open,
  mode,
  me,
  onClose,
  onUpgrade,
  onCompare,
}: {
  open: boolean;
  mode: Exclude<FamilyMode, "family">;
  me: ActiveProfile;
  onClose: () => void;
  onUpgrade: () => void;
  onCompare: () => void;
}) {
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const faces = castFaces(3);
  const step = PLANS.family.priceInPaise - PLANS.solo.priceInPaise;

  const perks: [React.ReactNode, string, string][] = [
    [<Users key="u" size={18} color={brand[600]} />, "Up to 4 people, one plan", "Parents, partner, kids. Everyone gets their own file."],
    [<ShieldCheck key="s" size={18} color={brand[600]} />, "Files never mix", "Switch in a tap. Cheeku only talks about who you're viewing."],
    [<Sparkles key="k" size={18} color={brand[600]} />, "Unlimited chats for all", "Ask about anyone's report, any time of day."],
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.38)" }} />
      <View style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", backgroundColor: "#fafafe", paddingBottom: insets.bottom + 14 }}>
        <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(15,16,48,0.12)", marginTop: 8 }} />

        {/* The picture: you, with three empty places beside you. */}
        <View style={{ marginHorizontal: 16, marginTop: 12, height: 150, borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          <Gradient from="#e2d9ff" to="#fff1f6" glow="#ffffff" />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {faces.slice(0, 1).map((svg, i) => (
              <Ghost key={`l${i}`} svg={svg} tilt={-8} />
            ))}
            <Animated.View entering={still ? undefined : ZoomIn.springify().damping(13)} style={{ marginHorizontal: -6, zIndex: 2, borderRadius: 999, borderWidth: 4, borderColor: "#fff" }}>
              <Avatar svg={me.avatar} background={me.avatarBackground} size={78} />
            </Animated.View>
            {faces.slice(1, 3).map((svg, i) => (
              <Ghost key={`r${i}`} svg={svg} tilt={i === 0 ? 6 : 10} />
            ))}
          </View>
          <View style={{ position: "absolute", top: 12, right: 12 }}>
            <Glass strong className="flex-row items-center gap-1 rounded-pill px-2.5 py-1">
              <Lock size={11} color={brand[700]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 11.5, color: brand[700] }}>Family plan</Text>
            </Glass>
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: ink[900] }}>
            {mode === "free" ? "Bring your family along" : "Make room for your family"}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: ink[700], marginTop: 6 }}>
            {mode === "free"
              ? "Keep Mummy's thyroid reports, Papa's prescriptions and yours in one place. Switch between them in a tap."
              : "Your Solo plan covers just you. Family keeps everyone's reports beside yours, each in their own file."}
          </Text>

          <View style={{ marginTop: 16, gap: 12 }}>
            {perks.map(([icon, title, line]) => (
              <View key={title} className="flex-row items-start gap-3">
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>{icon}</View>
                <View className="flex-1">
                  <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[900] }}>{title}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 1 }}>{line}</Text>
                </View>
              </View>
            ))}
          </View>

          <PillButton tone="brand" onPress={() => { onClose(); onUpgrade(); }} style={{ marginTop: 20 }}>
            {mode === "free"
              ? `Get Family · ${formatPrice(PLANS.family.priceInPaise)}/month`
              : `Upgrade to Family · +${formatPrice(step)}/month`}
          </PillButton>
          <Pressable accessibilityRole="button" onPress={() => { onClose(); onCompare(); }} style={{ height: 44, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[700] }}>Compare all plans</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Ghost({ svg, tilt }: { svg: string; tilt: number }) {
  return (
    <View style={{ marginHorizontal: -6, opacity: 0.55, transform: [{ rotate: `${tilt}deg` }], borderRadius: 999, borderWidth: 3, borderColor: "rgba(255,255,255,0.9)" }}>
      <Avatar svg={svg} size={54} />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}>
          <Plus size={14} color={brand[600]} strokeWidth={2.6} />
        </View>
      </View>
    </View>
  );
}
