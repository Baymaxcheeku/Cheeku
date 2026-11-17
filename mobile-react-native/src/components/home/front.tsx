import { useRouter } from "expo-router";
import { ArrowUp, Camera, Check, ChevronDown, ChevronRight, Flame, Lock, Mic, Plus } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { MascotBust } from "@/components/illustrations/sprout";
import { Avatar } from "@/components/ui/avatar";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { Tap } from "@/components/ui/tap";
import { WINDOW_LABEL } from "@/lib/home/catalog";
import { PILLARS, unlockRows } from "@/lib/home/content";
import type { Plan, PlanTask } from "@/lib/home/plan";
import type { Streak } from "@/lib/home/today";
import type { AreaKey } from "@/lib/longevity/areas";
import { areaQuestion, type AreasView } from "@/lib/longevity/use-areas";
import type { HomeSignals } from "@/lib/home/rules";
import type { ActiveProfile } from "@/lib/profiles/context";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * HOME, THE FRONT (owner's brief, 17 Nov 2026).
 *
 * "The wow factor has gone" and "too much happening". So the top of Home is
 * one calm sky with three things in it, in order of importance:
 *
 *   the family    a row of faces; switching person is one tap
 *   the greeting  one line, then
 *   Ask Cheeku    the hero: a big white card with Cheeku perched on it
 *
 * Below the sky: booking as 3D objects that open the chat (booking is
 * chat-first), one compact card for setting up, one picture of what the
 * first report opens, and the health file. Nothing black and heavy; the
 * one strong colour is the violet send button.
 *
 * 3D icons: Cheeku's own set (components/ui/icon3d.tsx).
 */

const PLATE = "#f4f3ff";
const SOFT_SHADOW = { shadowColor: "#3b2bc9", shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 4 } as const;

/**
 * The sky behind the top of Home: periwinkle at the top, a soft white glow
 * where Cheeku sits, fading into the page. Drawn with SVG (the shared
 * Gradient is flat on purpose since the neutral redesign). Scrolls with the content.
 */
export function SkyWash({ top }: { top: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top, left: 0, right: 0, height: 700 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 700">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#c9c6ff" />
            <Stop offset="0.38" stopColor="#e3e1ff" />
            <Stop offset="0.72" stopColor="#efeef9" />
            <Stop offset="1" stopColor={surface.canvas} />
          </LinearGradient>
          <RadialGradient id="glow" cx="78" cy="300" rx="70" ry="190" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="700" fill="url(#sky)" />
        <Rect x="0" y="0" width="100" height="700" fill="url(#glow)" />
      </Svg>
    </View>
  );
}

// ------------------------------------------------------------ the family --

/**
 * Everyone on the plan as a face; the one being viewed is ringed and named.
 * The last bubble adds someone (on the free plan it opens the family offer).
 */
export function FamilyRow({
  members,
  activeId,
  locked,
  onSelect,
  onAdd,
  hideAdd = false,
}: {
  members: readonly ActiveProfile[];
  activeId: string;
  locked: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  /** Screens that only switch person (Records) leave the add bubble out. */
  hideAdd?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingVertical: 4 }}>
      {members.map((m) => {
        const on = m.id === activeId;
        return (
          <Tap key={m.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? `Viewing ${m.name}` : `Switch to ${m.name}`} onPress={() => onSelect(m.id)} style={{ alignItems: "center", width: 72 }} scale={0.95}>
            <View style={{ padding: 3, borderRadius: 999, borderWidth: 2.5, borderColor: on ? brand[500] : "transparent" }}>
              <View style={{ opacity: on ? 1 : 0.82 }}>
                <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={58} />
              </View>
            </View>
            <View style={{ marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: on ? "#fff" : "transparent" }}>
              <Text numberOfLines={1} style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 12, color: on ? ink[900] : ink[500] }}>
                {m.isPrimary ? "You" : m.name.split(/\s+/)[0]}
              </Text>
            </View>
          </Tap>
        );
      })}
      {hideAdd ? null : <Tap accessibilityRole="button" accessibilityLabel={locked ? "Add your family with the Family plan" : "Add a family member"} onPress={onAdd} style={{ alignItems: "center", width: 72 }} scale={0.95}>
        <View style={{ margin: 3, width: 64, height: 64, borderRadius: 999, borderWidth: 1.5, borderStyle: "dashed", borderColor: brand[400], backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
          <Plus size={22} color={brand[600]} strokeWidth={2.4} />
        </View>
        <Text style={{ marginTop: 8, fontFamily: font.medium, fontSize: 12, color: brand[700] }}>{members.length > 1 ? "Add" : "Family"}</Text>
      </Tap>}
    </ScrollView>
  );
}

// ------------------------------------------------------------- Ask, hero --

const SUGGESTIONS = ["What does my last report say?", "Book a blood test at home", "Is my BP normal for my age?"];

/** The hero: one big place to ask, with Cheeku sitting on top of it. */
export function AskHero({ name, isSelf }: { name: string; isSelf: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [voice, setVoice] = useState(false);

  const ask = (q: string) => {
    const t = q.trim();
    router.push(t ? `/ask?q=${encodeURIComponent(t)}` : "/ask");
  };

  return (
    <View style={{ paddingTop: 58 }}>
      {/* Cheeku peeking over the card's top edge: the card is a conversation with him. */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 22 }}>
        <MascotBust size={96} mood="happy" />
      </View>
      <View style={[SOFT_SHADOW, { borderRadius: 28, backgroundColor: "#fff", padding: 18, paddingTop: 20 }]}>

        <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>
          {isSelf ? "Ask me anything about your health" : `Ask me anything about ${name}'s health`}
        </Text>

        <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: PLATE, paddingLeft: 14, paddingRight: 6, flexDirection: "row", alignItems: "center", minHeight: 56 }}>
          <TextInput
            value={value}
            onChangeText={setValue}
            onSubmitEditing={() => ask(value)}
            returnKeyType="send"
            placeholder="Type a question"
            placeholderTextColor={ink[300]}
            accessibilityLabel="Ask Cheeku"
            style={{ flex: 1, minWidth: 0, fontFamily: font.regular, fontSize: 17, color: ink[900], paddingVertical: 14 }}
          />
          <Tap accessibilityRole="button" accessibilityLabel="Photograph a report to ask about" onPress={() => router.push("/ask?upload=1")} hitSlop={6} style={{ width: 34, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Camera size={21} color={ink[500]} strokeWidth={1.8} />
          </Tap>
          <Tap accessibilityRole="button" accessibilityLabel="Voice. Coming soon" onPress={() => setVoice(true)} hitSlop={6} style={{ width: 34, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Mic size={21} color={ink[500]} strokeWidth={1.8} />
          </Tap>
          <Tap accessibilityRole="button" accessibilityLabel="Send" onPress={() => ask(value)} scale={0.92} style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center", marginLeft: 2 }}>
            <ArrowUp size={20} color="#fff" strokeWidth={2.4} />
          </Tap>
        </View>
        {voice ? <Text style={{ marginTop: 8, fontFamily: font.regular, fontSize: 12, color: ink[500] }}>Talking to me is coming soon. Type for now.</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
          {SUGGESTIONS.map((s) => (
            <Tap key={s} accessibilityRole="button" onPress={() => ask(s)} scale={0.97} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#e4e1ff", backgroundColor: "#fff" }}>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: brand[700] }}>{s}</Text>
            </Tap>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// --------------------------------------------------------- book, by chat --

const CARE: readonly { label: string; ask: string; icon: Icon3DName }[] = [
  { label: "Doctor", ask: "Book a doctor", icon: "doctor" },
  { label: "Lab test", ask: "Book a lab test at home", icon: "test-tube" },
  { label: "Medicines", ask: "Order my medicines", icon: "capsule" },
  { label: "Online", ask: "Talk to a doctor online", icon: "video" },
  { label: "Fitness", ask: "Find a fitness class near me", icon: "shoe" },
  { label: "Diet", ask: "Find a dietitian", icon: "food" },
  { label: "Mind", ask: "Book a therapist", icon: "lotus" },
];

/** Booking is a conversation: each object opens the chat with the request already said. */
export function CareShelf() {
  const router = useRouter();
  return (
    <View>
      <View style={{ paddingHorizontal: 20 }}>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>
          Book anything, just ask
        </Text>
        <Text style={{ marginTop: 3, fontFamily: font.regular, fontSize: 13, color: ink[500] }}>Tap one and tell Cheeku who it&apos;s for.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, gap: 12 }}>
        {CARE.map((c) => (
          <Tap key={c.label} accessibilityRole="button" accessibilityLabel={c.label} onPress={() => router.push(`/ask?q=${encodeURIComponent(c.ask)}` as never)} scale={0.94} style={{ alignItems: "center", width: 76 }}>
            <View style={[SOFT_SHADOW, { width: 76, height: 76, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowOpacity: 0.07 }]}>
              <Icon3D name={c.icon} size={52} />
            </View>
            <Text numberOfLines={1} style={{ marginTop: 8, fontFamily: font.medium, fontSize: 12, color: ink[700] }}>{c.label}</Text>
          </Tap>
        ))}
      </ScrollView>
    </View>
  );
}

// --------------------------------------------------------- setting up --

/** The four setup steps in one card: progress, the next step, the rest folded away. */
export function SetupCard({ signals, name, isSelf }: { signals: HomeSignals; name: string; isSelf: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rows = unlockRows(signals);
  const done = rows.filter((r) => r.done).length;
  const next = rows.find((r) => !r.done) ?? rows[0]!;
  const rest = rows.filter((r) => r.key !== next.key);

  return (
    <View style={{ borderRadius: 24, backgroundColor: "#fff", padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{isSelf ? "Build your health memory" : `Build ${name}'s health memory`}</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{done} of {rows.length}</Text>
      </View>
      <View style={{ marginTop: 10, flexDirection: "row", gap: 5 }} accessibilityLabel={`${done} of ${rows.length} steps done`}>
        {rows.map((r) => (
          <View key={r.key} style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: r.done ? brand[500] : "#e9e7ff" }} />
        ))}
      </View>

      <Tap accessibilityRole="button" accessibilityLabel={`${next.title}. ${next.unlocks}`} onPress={() => router.push(next.route as never)} scale={0.98} style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: PLATE, alignItems: "center", justifyContent: "center" }}>
          <Icon3D name="report" size={34} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{next.title}</Text>
          <Text style={{ marginTop: 1, fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{next.unlocks}</Text>
        </View>
        <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: brand[600] }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>Start</Text>
        </View>
      </Tap>

      {open ? (
        <View style={{ marginTop: 12, gap: 2 }}>
          {rest.map((r) => (
            <Tap key={r.key} accessibilityRole="button" accessibilityLabel={`${r.title}${r.done ? ". Done" : ""}`} onPress={() => router.push(r.route as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 999, borderWidth: r.done ? 0 : 1.5, borderColor: "#d9d6ff", backgroundColor: r.done ? brand[500] : "transparent", alignItems: "center", justifyContent: "center" }}>
                {r.done ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
              </View>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: r.done ? ink[500] : ink[900], textDecorationLine: r.done ? "line-through" : "none" }}>{r.title}</Text>
            </Tap>
          ))}
        </View>
      ) : null}
      <Tap accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{open ? "Hide the other steps" : `${rest.length} more steps`}</Text>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevronDown size={15} color={ink[500]} />
        </View>
      </Tap>
    </View>
  );
}

// ------------------------------------------------ what the first record opens --

const UNLOCKS: readonly { icon: Icon3DName; label: string }[] = [
  { icon: "calendar-check", label: "Daily plan" },
  { icon: "bell", label: "What's due" },
  { icon: "family", label: "Family alerts" },
];

/**
 * The promise of the first report, as three objects behind a small lock.
 * One line of words; the pictures say the rest.
 */
export function FirstReportCard() {
  return (
    <View style={{ borderRadius: 24, backgroundColor: "#efedff", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20 }} accessible accessibilityLabel="Your first report unlocks a daily plan, what's due, and family alerts">
      <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Your first report unlocks</Text>
      <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between" }}>
        {UNLOCKS.map((u) => (
          <View key={u.label} style={{ alignItems: "center", flex: 1 }}>
            <View style={[SOFT_SHADOW, { width: 72, height: 72, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowOpacity: 0.08 }]}>
              <Icon3D name={u.icon} size={44} />
              <View style={{ position: "absolute", right: -4, bottom: -4, width: 24, height: 24, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#efedff" }}>
                <Lock size={11} color="#fff" strokeWidth={2.6} />
              </View>
            </View>
            <Text numberOfLines={1} style={{ marginTop: 10, fontFamily: font.medium, fontSize: 13, color: ink[700] }}>{u.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ------------------------------------------------------- today, in brief --

const PILLAR_3D: Record<PlanTask["pillar"], Icon3DName> = { move: "shoe", eat: "food", sleep: "moon", mind: "lotus", check: "stethoscope" };
const KIND_3D: Partial<Record<PlanTask["kind"], Icon3DName>> = { steps: "shoe", meal: "food", reading: "heart", rating: "moon", dose: "blister" };

function taskIcon(t: PlanTask): Icon3DName {
  if (t.due) return /follow|doctor|dr\./i.test(t.title) ? "doctor" : "test-tube";
  return KIND_3D[t.kind] ?? PILLAR_3D[t.pillar];
}

function taskRoute(t: PlanTask): string {
  return t.kind === "dose" ? "/medicines" : t.kind === "habit" ? `/today?pillar=${t.pillar}` : `/today?task=${encodeURIComponent(t.key)}`;
}

/** Today's plan and the streak in one card: how far along, and the next three things. */
export function TodayPlanCard({ plan, streak, skip }: { plan: Plan; streak: Streak; skip: string | null }) {
  const router = useRouter();
  // Three different kinds of thing (one per pillar first), so the card isn't three meals in a row.
  const open = plan.tasks.filter((t) => t.status === "open" && t.key !== skip);
  const seen = new Set<string>();
  const varied = open.filter((t) => (seen.has(t.pillar) ? false : (seen.add(t.pillar), true)));
  const nextUp = [...varied, ...open.filter((t) => !varied.includes(t))].slice(0, 3);
  const pct = plan.total ? plan.done / plan.total : 0;
  return (
    <View style={[SOFT_SHADOW, { borderRadius: 24, backgroundColor: "#fff", padding: 18, paddingBottom: 8, shadowOpacity: 0.06 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Today&apos;s plan</Text>
          <Text style={{ marginTop: 2, fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{plan.done} of {plan.total} done</Text>
        </View>
        {streak.count > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#fff4e5" }}>
            <Flame size={14} color="#e8590c" strokeWidth={2.2} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#b14a08" }}>{streak.count}-day streak</Text>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 12, height: 6, borderRadius: 999, backgroundColor: "#ecebff", overflow: "hidden" }}>
        <View style={{ width: `${Math.max(4, pct * 100)}%`, height: 6, borderRadius: 999, backgroundColor: brand[500] }} />
      </View>
      <View style={{ marginTop: 6 }}>
        {nextUp.map((t) => (
          <Tap key={t.key} accessibilityRole="button" accessibilityLabel={t.title} onPress={() => router.push(taskRoute(t) as never)} scale={0.99} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: PLATE, alignItems: "center", justifyContent: "center" }}>
              <Icon3D name={taskIcon(t)} size={30} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{t.title}</Text>
              <Text numberOfLines={1} style={{ marginTop: 1, fontFamily: font.regular, fontSize: 12, color: ink[500] }}>
                {[t.due ? t.dueLabel : null, PILLARS.find((p) => p.key === t.pillar)?.label, t.window !== "anytime" ? WINDOW_LABEL[t.window] : null].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <ChevronRight size={16} color={ink[300]} />
          </Tap>
        ))}
      </View>
      <Tap accessibilityRole="button" onPress={() => router.push("/today" as never)} style={{ paddingVertical: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: surface.line, marginTop: 2 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[600] }}>See the whole day</Text>
      </Tap>
    </View>
  );
}

// ------------------------------------------------------- health, at a glance --

const AREA_3D: Record<AreaKey, Icon3DName> = { heart: "heart", sugar: "glucose", sleep: "moon", movement: "shoe", weight: "scale", checkups: "clipboard" };
const AREA_SHORT: Record<AreaKey, string> = { heart: "Heart", sugar: "Sugar", sleep: "Sleep", movement: "Movement", weight: "Weight", checkups: "Check-ups" };
const AREA_STATUS = {
  act: { word: "Needs a step", color: semantic.attentionText, dot: "#f08c00" },
  watch: { word: "Keep an eye", color: semantic.cautionText, dot: "#f2c94c" },
  on_track: { word: "On track", color: semantic.safeText, dot: "#2f9e44" },
  unknown: { word: "Add data", color: ink[300], dot: "#d9d9e3" },
} as const;

/**
 * The six areas as six objects, two rows of three. The status is one word
 * and a dot; tapping an area talks it through with Cheeku (or, with no data,
 * goes to where the data comes from).
 */
export function HealthGrid({ view, title }: { view: AreasView; title: string }) {
  const router = useRouter();
  return (
    <View style={[SOFT_SHADOW, { borderRadius: 24, backgroundColor: "#fff", padding: 18, shadowOpacity: 0.06 }]}>
      <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{title}</Text>
      <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", rowGap: 10 }}>
        {view.areas.map((a) => {
          const st = AREA_STATUS[a.status];
          const go = () =>
            a.status === "unknown"
              ? router.push((a.key === "sleep" || a.key === "movement" ? "/wearables/connect" : "/scan") as never)
              : router.push({ pathname: "/ask", params: { q: areaQuestion(a), t: String(Date.now()) } });
          return (
            <View key={a.key} style={{ width: "33.33%", paddingHorizontal: 4 }}>
              <Tap accessibilityRole="button" accessibilityLabel={`${AREA_SHORT[a.key]}, ${st.word}`} onPress={go} scale={0.96} style={{ alignItems: "center", paddingVertical: 10, borderRadius: 18, backgroundColor: PLATE }}>
                <View style={{ opacity: a.status === "unknown" ? 0.45 : 1 }}>
                  <Icon3D name={AREA_3D[a.key]} size={36} />
                </View>
                <Text numberOfLines={1} style={{ marginTop: 6, fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{AREA_SHORT[a.key]}</Text>
                <View style={{ marginTop: 3, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: st.dot }} />
                  <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 11, color: st.color }}>{st.word}</Text>
                </View>
              </Tap>
            </View>
          );
        })}
      </View>
    </View>
  );
}
