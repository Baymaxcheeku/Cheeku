import {
  BellRing,
  Check,
  ChevronRight,
  Dumbbell,
  FlaskConical,
  HeartHandshake,
  Lock,
  Pill,
  Salad,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import { Boop, BubblePop } from "@/components/onboarding/motion";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { fetchWaitlist, setWaitlisted } from "@/lib/notifications/queries";
import { kv } from "@/lib/storage";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Brand } from "@/components/ui/brand";

/*
 * Book care — the marketplace roadmap, as a front door that is honest about
 * being unbuilt.
 *
 * ┌─ WHAT THIS IS AND IS NOT ────────────────────────────────────────────────┐
 * │                                                                          │
 * │ Phase 2 turns Cheeku from a companion into something that books:         │
 * │ consultations, lab tests, medicines. Phase 3 carries that into diet,     │
 * │ fitness and the day-to-day. None of it exists yet, so the section shows  │
 * │ the SHAPE of it and says "coming soon" plainly on every card.            │
 * │                                                                          │
 * │ Deliberately NOT here: invented doctors, ratings, prices or slots, and   │
 * │ any "recommended specialist" inferred from records. The last one is      │
 * │ triage, a clinical judgement this app does not make.                     │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * The layout follows the reference the owner chose: filter chips with the
 * selected one in ink, then soft pastel cards, each with a white tile, a title,
 * one line, and a round glass arrow.
 *
 * PASTELS ARE NON-SEMANTIC and deliberately avoid green, amber and red, which
 * mean a health result everywhere in this app.
 *
 * "Notify me" joins a real waitlist (`service_waitlist`, migration 0024). On
 * launch day the team runs announce_service_launch() and everyone on it gets
 * an inbox row, and a buzz if they allowed it. Taps from before this existed
 * lived only on the phone (`cheeku.notify`); they are carried over once.
 */
type Filter = "all" | "doctors" | "tests" | "medicines" | "women" | "wellness" | "insurance";

type Service = {
  id: string;
  filter: Exclude<Filter, "all">;
  title: string;
  line: string;
  promise: string;
  /** Opens a working flow instead of the coming-soon sheet. */
  route?: string;
  /** Shown with a padlock: the module exists in the plan, not in the app yet. */
  locked?: boolean;
  Icon: LucideIcon;
  from: string;
  to: string;
  fg: string;
};

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "doctors", label: "Doctors" },
  { id: "tests", label: "Lab tests" },
  { id: "medicines", label: "Medicines" },
  { id: "women", label: "Women's health" },
  { id: "wellness", label: "Diet & fitness" },
  { id: "insurance", label: "Insurance" },
];

const SERVICES: readonly Service[] = [
  {
    id: "doctor",
    filter: "doctors",
    title: "Doctor consult",
    line: "Chat, then book online or at a clinic",
    route: "/book/consult",
    promise: "Tell me what's bothering you, and I'll find a doctor and a time that suits you. Your reports go with you.",
    Icon: Stethoscope,
    from: "#ece6ff",
    to: "#f6f3ff",
    fg: brand[600],
  },
  {
    id: "labs",
    filter: "tests",
    title: "Lab tests at home",
    line: "Top labs, results filed for you",
    route: "/labs",
    promise: "Book a home sample collection, and the report lands straight in your health file.",
    Icon: FlaskConical,
    from: "#dcecff",
    to: "#eef6ff",
    fg: "#1a6fc2",
  },
  {
    id: "medicines",
    filter: "medicines",
    title: "Medicine delivery",
    line: "Delivered to your door",
    promise: "Order what's on your prescription, delivered, with the prescription kept on file.",
    Icon: Pill,
    from: "#ffe3d3",
    to: "#fff1e9",
    fg: "#c2650b",
  },
  {
    id: "gynae",
    filter: "women",
    title: "Gynaecologist",
    line: "Online or in person",
    promise: "Book a gynaecologist, online or at a clinic near you, with your history already there.",
    Icon: HeartHandshake,
    from: "#ffdcee",
    to: "#fff0f7",
    fg: "#c22a6b",
  },
  {
    id: "diet",
    filter: "wellness",
    title: "Dietician",
    line: "Starts from your own reports",
    promise: "A dietician who can see your reports, so the plan starts from your own numbers.",
    Icon: Salad,
    from: "#f0e2ff",
    to: "#f8f1ff",
    fg: "#7b3fd4",
  },
  {
    id: "fitness",
    filter: "wellness",
    title: "Fitness classes",
    line: "Yoga, strength, prenatal",
    promise: "Classes and trainers, online or at home, that fit around your routine.",
    Icon: Dumbbell,
    from: "#dfe6ff",
    to: "#f0f3ff",
    fg: "#3f5bd9",
  },
  {
    id: "insurance",
    filter: "insurance",
    title: "Health insurance",
    line: "Compare family floater plans",
    promise: "Compare health cover for your family, with your records ready for the claim when you need it.",
    Icon: ShieldCheck,
    from: "#e3f5ef",
    to: "#f1faf6",
    fg: "#0f7a5c",
    locked: true,
  },
];

/** Cards under "All" before the list asks to expand. Keeps Home short. */
const ALL_PREVIEW = 3;

export function CareSection() {
  const router = useRouter();
  const still = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState<Service | null>(null);
  const qc = useQueryClient();
  const waitlist = useQuery({ queryKey: ["waitlist"], queryFn: fetchWaitlist });
  const notify = waitlist.data ?? [];

  // One-time carry-over of taps that were only ever saved on this phone.
  useEffect(() => {
    void kv.get(KEY).then(async (raw) => {
      if (!raw) return;
      try {
        const ids = JSON.parse(raw) as string[];
        await Promise.all(ids.map((id) => setWaitlisted(id, true)));
        await kv.remove(KEY);
        void qc.invalidateQueries({ queryKey: ["waitlist"] });
      } catch {
        // Try again next time; nothing is lost while the key is still there.
      }
    });
  }, [qc]);

  // Optimistic: the pill flips on tap, and flips back if the save fails.
  async function toggle(id: string) {
    const on = !notify.includes(id);
    qc.setQueryData<string[]>(["waitlist"], (old = []) => (on ? [...old, id] : old.filter((n) => n !== id)));
    try {
      await setWaitlisted(id, on);
    } catch {
      qc.setQueryData<string[]>(["waitlist"], (old = []) => (on ? old.filter((n) => n !== id) : [...old, id]));
    }
  }

  const matching = SERVICES.filter((s) => filter === "all" || s.filter === filter);
  const shown = filter === "all" && !expanded ? matching.slice(0, ALL_PREVIEW) : matching;
  const hidden = matching.length - shown.length;

  return (
    <View className="mt-8">
      <View className="px-5">
        <View className="flex-row items-center gap-2.5">
          <Text style={{ fontFamily: font.semibold, fontSize: 21, letterSpacing: -0.4, color: ink[900] }}>
            Book care
          </Text>
          {/*
           * Lime, not green. Green means "healthy" everywhere else in this app
           * (PLAN.md rule 3), so this is a citrus lime a long way from the
           * semantic #23af5f: bright enough to say "open now", with no health
           * meaning attached.
           */}
          <View className="flex-row items-center gap-1.5 rounded-pill px-2.5 py-1" style={{ backgroundColor: LIVE.bg }}>
            <LiveDot />
            <Text style={{ fontFamily: font.semibold, fontSize: 11.5, color: LIVE.fg }}>Doctors & labs open</Text>
          </View>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: ink[500], marginTop: 3 }}>
          Tell <Brand /> what you need. It books and files it.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, gap: 8 }}
        accessibilityRole="tablist"
      >
        {FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <Pressable
              key={f.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setFilter(f.id);
                setExpanded(false);
              }}
              style={[
                on ? null : glassShadow,
                {
                  height: 44,
                  paddingHorizontal: 18,
                  borderRadius: 999,
                  justifyContent: "center",
                  backgroundColor: on ? ink[900] : glass.fillStrong,
                  borderWidth: on ? 0 : 1,
                  borderColor: glass.rim,
                },
              ]}
            >
              <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? "#ffffff" : ink[700] }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mt-2 gap-2.5 px-5">
        {shown.map((s, i) => (
          <Animated.View key={`${filter}-${s.id}`} entering={still ? undefined : FadeInDown.delay(i * 60).duration(320)}>
            <ServiceCard
              service={s}
              notified={notify.includes(s.id)}
              onPress={() => (s.route ? router.push(s.route as never) : setOpen(s))}
            />
          </Animated.View>
        ))}
        {hidden > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded(true)}
            className="h-11 items-center justify-center"
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[600] }}>
              Show {hidden} more
            </Text>
          </Pressable>
        ) : null}
      </View>

      <SoonSheet
        service={open}
        on={open ? notify.includes(open.id) : false}
        onToggle={() => open && void toggle(open.id)}
        onClose={() => setOpen(null)}
      />
    </View>
  );
}

const KEY = "cheeku.notify";

/** The "open now" accent: citrus lime on deep olive. See the note on the pill. */
export const LIVE = { bg: "#e4ff7a", fg: "#2f3d00", dot: "#5f7a00" } as const;

function LiveDot() {
  const still = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    o.value = withRepeat(withSequence(withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
  }, [still, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: LIVE.dot }, style]} />;
}

function ServiceCard({ service: s, notified, onPress }: { service: Service; notified: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${s.title}. ${s.line}.${s.route ? "" : " Coming soon"}`}
      onPress={onPress}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      <View className="flex-row items-center gap-3.5 overflow-hidden rounded-[26px] p-2.5 pr-3">
        <Gradient from={s.from} to={s.to} />
        <View
          className="h-[68px] w-[68px] items-center justify-center rounded-[20px]"
          style={[glassShadow, { backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: glass.rim }]}
        >
          <s.Icon size={28} color={s.fg} strokeWidth={1.7} />
          {notified ? (
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-pill" style={{ backgroundColor: ink[900] }}>
              <BellRing size={10} color="#fff" />
            </View>
          ) : null}
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text style={{ fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.2, color: ink[900] }}>{s.title}</Text>
            {s.locked ? (
              <View className="flex-row items-center gap-1 rounded-pill px-2 py-0.5" style={{ backgroundColor: "rgba(15,16,48,0.08)" }}>
                <Lock size={9} color={ink[700]} />
                <Text style={{ fontFamily: font.semibold, fontSize: 10.5, color: ink[700] }}>Locked</Text>
              </View>
            ) : (
              <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: s.route ? LIVE.bg : "rgba(255,255,255,0.75)" }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 10.5, color: s.route ? LIVE.fg : ink[500] }}>
                  {s.route ? "Live" : "Soon"}
                </Text>
              </View>
            )}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 3 }}>
            {s.line}
          </Text>
        </View>
        <View
          className="h-10 w-10 items-center justify-center rounded-pill"
          style={{ backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: glass.rim }}
        >
          <ChevronRight size={18} color={ink[700]} />
        </View>
      </View>
    </Pressable>
  );
}

function SoonSheet({
  service,
  on,
  onToggle,
  onClose,
}: {
  service: Service | null;
  on: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(service)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.35)" }} />
      {service ? (
        <View className="overflow-hidden rounded-t-[32px] px-6 pt-3" style={{ paddingBottom: insets.bottom + 18, backgroundColor: "#ffffff" }}>
          <Gradient from={service.from} to="#ffffff" angle="vertical" />
          <View className="mb-4 h-1 w-10 self-center rounded-pill" style={{ backgroundColor: "rgba(15,16,48,0.12)" }} />

          <View className="flex-row items-center gap-3.5">
            <View
              className="h-16 w-16 items-center justify-center rounded-[20px]"
              style={[glassShadow, { backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: glass.rim }]}
            >
              <service.Icon size={28} color={service.fg} strokeWidth={1.7} />
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: font.semibold, fontSize: 21, letterSpacing: -0.4, color: ink[900] }}>
                {service.title}
              </Text>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: service.fg, marginTop: 2 }}>
                Coming soon to <Brand />
              </Text>
            </View>
          </View>

          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[700], marginTop: 14 }}>
            {service.promise}
          </Text>

          <View className="mt-4 flex-row items-end gap-2.5">
            <MascotBust size={56} />
            <BubblePop from="left" style={{ flexShrink: 1, marginBottom: 6 }}>
              <Glass strong className="rounded-[16px] px-3.5 py-2.5" style={{ borderBottomLeftRadius: 5 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
                  I&apos;m still learning this one. Want a nudge when it&apos;s ready?
                </Text>
              </Glass>
            </BubblePop>
          </View>

          <Boop trigger={on} style={{ marginTop: 20 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={onToggle}
              className="h-[54px] flex-row items-center justify-center gap-2 rounded-pill"
              style={{ backgroundColor: on ? "#ffffff" : ink[900], borderWidth: on ? 1.5 : 0, borderColor: brand[200] }}
            >
              {on ? <Check size={18} color={brand[700]} strokeWidth={3} /> : <BellRing size={18} color="#fff" />}
              <Text style={{ fontFamily: font.semibold, fontSize: 15.5, color: on ? brand[700] : "#ffffff" }}>
                {on ? "You're on the list" : "Notify me when it's live"}
              </Text>
            </Pressable>
          </Boop>
          <Pressable accessibilityRole="button" onPress={onClose} className="mt-1.5 h-11 items-center justify-center">
            <Text style={{ fontFamily: font.medium, fontSize: 14.5, color: ink[500] }}>Maybe later</Text>
          </Pressable>
        </View>
      ) : null}
    </Modal>
  );
}
