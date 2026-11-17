import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { ArrowUp, BellRing, CalendarClock, Camera, Check, ChevronDown, FileUp, Footprints, Lock, Mic, Plus } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { MascotBust } from "@/components/illustrations/sprout";
import { Avatar } from "@/components/ui/avatar";
import { Tap } from "@/components/ui/tap";
import { unlockRows } from "@/lib/home/content";
import type { HomeSignals } from "@/lib/home/rules";
import type { ActiveProfile } from "@/lib/profiles/context";
import { brand, ink, surface } from "@/theme/tokens";
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
 * 3D icons: Microsoft Fluent 3D emoji, MIT licence (assets/care3d/LICENSE-fluentui-emoji.txt).
 */

const SKY_TOP = "#d9d6ff";
const SKY_MID = "#ecebff";
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
}: {
  members: readonly ActiveProfile[];
  activeId: string;
  locked: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
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
      <Tap accessibilityRole="button" accessibilityLabel={locked ? "Add your family with the Family plan" : "Add a family member"} onPress={onAdd} style={{ alignItems: "center", width: 72 }} scale={0.95}>
        <View style={{ margin: 3, width: 64, height: 64, borderRadius: 999, borderWidth: 1.5, borderStyle: "dashed", borderColor: brand[400], backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
          <Plus size={22} color={brand[600]} strokeWidth={2.4} />
        </View>
        <Text style={{ marginTop: 8, fontFamily: font.medium, fontSize: 12, color: brand[700] }}>{members.length > 1 ? "Add" : "Family"}</Text>
      </Tap>
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

/* eslint-disable @typescript-eslint/no-require-imports */
const CARE = [
  { label: "Doctor", ask: "Book a doctor", art: require("../../../assets/care3d/stethoscope.png") },
  { label: "Lab test", ask: "Book a lab test at home", art: require("../../../assets/care3d/test_tube.png") },
  { label: "Medicines", ask: "Order my medicines", art: require("../../../assets/care3d/pill.png") },
  { label: "Fitness", ask: "Find a fitness class near me", art: require("../../../assets/care3d/running_shoe.png") },
  { label: "Dental", ask: "Book a dentist", art: require("../../../assets/care3d/tooth.png") },
  { label: "Eye care", ask: "Book an eye check-up", art: require("../../../assets/care3d/eye.png") },
  { label: "Mind", ask: "Book a therapist", art: require("../../../assets/care3d/brain.png") },
] as const;
/* eslint-enable @typescript-eslint/no-require-imports */

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
              <Image source={c.art} style={{ width: 50, height: 50 }} contentFit="contain" accessibilityIgnoresInvertColors />
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
          <FileUp size={22} color={brand[600]} strokeWidth={1.9} />
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

const FAN = [
  { icon: Footprints, title: "Daily step", tilt: "-10deg", y: 12, x: 0 },
  { icon: CalendarClock, title: "What's due", tilt: "0deg", y: 0, x: 48 },
  { icon: BellRing, title: "Alerts", tilt: "10deg", y: 12, x: 96 },
] as const;

/** One picture of what a first report opens: three cards fanned like a hand, still locked. */
export function UnlocksFan() {
  return (
    <View style={{ borderRadius: 24, overflow: "hidden", padding: 18, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 140, backgroundColor: "#efedff" }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 17, lineHeight: 21, color: ink[900] }}>Your first report opens</Text>
        <Text style={{ marginTop: 4, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>A daily step, what&apos;s due for everyone, and alerts when a parent&apos;s test slips.</Text>
      </View>
      <View style={{ width: 160, height: 112 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {FAN.map((f, i) => {
          const Icon = f.icon;
          return (
            <View
              key={f.title}
              style={[
                SOFT_SHADOW,
                { position: "absolute", left: f.x, top: f.y, width: 64, height: 88, borderRadius: 16, backgroundColor: "#fff", padding: 9, justifyContent: "space-between", transform: [{ rotate: f.tilt }], shadowOpacity: 0.14, zIndex: i + 1 },
              ]}
            >
              <Icon size={18} color={brand[600]} strokeWidth={1.9} />
              <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 11, lineHeight: 13, color: ink[900] }}>{f.title}</Text>
            </View>
          );
        })}
        <View style={{ position: "absolute", right: 0, bottom: 0, zIndex: 3, width: 26, height: 26, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" }}>
          <Lock size={12} color="#fff" strokeWidth={2.6} />
        </View>
      </View>
    </View>
  );
}
