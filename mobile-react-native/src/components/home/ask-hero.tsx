import { useRouter } from "expo-router";
import { ArrowUp, Camera, ChevronDown, Clock3, MessageCircleHeart, Mic, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Tap } from "@/components/ui/tap";
import { MascotBust, MascotFigure } from "@/components/illustrations/sprout";
import { BubblePop } from "@/components/onboarding/motion";
import { Avatar } from "@/components/ui/avatar";
import { Glass, GlassCircle, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import type { ActiveProfile } from "@/lib/profiles/context";
import { brand, ink, lilac, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Brand, brandify } from "@/components/ui/brand";

/*
 * Home, top half: who you are looking after, the one question, and Cheeku.
 *
 * The visual language is borrowed from service-app home screens the owner
 * pointed at: an editorial headline with an italic accent line, round glass
 * controls, a search-shaped input, and one big pastel hero card with floating
 * glass pills. What makes it ours is what the pieces say: the hero is a
 * conversation, and the floating pills are how the reader's file reads and
 * that Cheeku is there at any hour.
 */

/**
 * The profile chip. The family switcher, folded into one control: it names
 * whose health the screen is showing and opens the family tray. The small
 * faces behind it say there are others to switch to without a second row.
 */
export function ProfileChip({
  active,
  others,
  greeting,
  locked = false,
  onPress,
}: {
  active: ActiveProfile;
  /** Free and Solo: the family is a Family-plan feature, so the chip offers it instead of switching. */
  locked?: boolean;
  /** "Good evening", shown above your own name. Another member says "Viewing". */
  greeting: string;
  others: readonly ActiveProfile[];
  onPress: () => void;
}) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={locked ? `${active.name}. Add your family with the Family plan` : `Viewing ${active.name}. Switch family member`}
      onPress={onPress}
      style={[
        glassShadow,
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 5,
          paddingLeft: 5,
          paddingRight: 14,
          borderRadius: 999,
          backgroundColor: glass.fillStrong,
          borderWidth: 1,
          borderColor: glass.rim,
        },
      ]}
      scale={0.98}
    >
      <Avatar svg={active.avatar} photo={active.photo} image={active.avatarImage} background={active.avatarBackground} size={40} />
      <View>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>
          {active.isPrimary ? greeting : "Viewing"}
        </Text>
        <View className="flex-row items-center gap-1">
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], maxWidth: 120 }}>
            {firstName(active.name)}
          </Text>
          {locked ? null : <ChevronDown size={14} color={ink[500]} />}
        </View>
      </View>
      {locked ? (
        // Two empty places and a plus: "your family could be here".
        <View className="ml-1 flex-row items-center">
          {[0, 1].map((i) => (
            <View
              key={i}
              style={{
                marginLeft: i === 0 ? 0 : -8,
                width: 26,
                height: 26,
                borderRadius: 999,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: brand[300],
                backgroundColor: i === 1 ? brand[600] : "rgba(241,240,254,0.9)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i === 1 ? <Plus size={13} color="#fff" strokeWidth={2.8} /> : null}
            </View>
          ))}
        </View>
      ) : others.length > 0 ? (
        <View className="ml-1 flex-row">
          {others.slice(0, 2).map((p, i) => (
            <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: 999, borderWidth: 2, borderColor: "#fff" }}>
              <Avatar svg={p.avatar} photo={p.photo} image={p.avatarImage} background={p.avatarBackground} size={24} />
            </View>
          ))}
        </View>
      ) : null}
    </Tap>
  );
}

/** The editorial headline: a plain first line, an italic violet second. */
export function HomeHeadline({ name, isSelf }: { name: string; isSelf: boolean }) {
  const [lead, accent] = isSelf
    ? [`Hi ${name},`, "what's on your mind?"]
    : [`${name}'s health,`, "all in one place."];
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: font.medium, fontSize: 34, lineHeight: 40, letterSpacing: -1.1, color: ink[900] }}
    >
      {lead}
      {"\n"}
      <Text style={{ fontFamily: font.italic, color: brand[600] }}>{accent}</Text>
    </Text>
  );
}

/*
 * The placeholder cycles through three short ways in, and stops while the box
 * is in use. Short enough to fit beside two icons on the narrowest phone.
 */
const HINTS = ["Tell Cheeku what's going on…", "Snap a report…", "Ask about any reading…"] as const;

/**
 * The input, shaped like a search bar because that is the gesture everybody
 * already knows: tap, type, go.
 *
 * IT DOES NOT ANSWER HERE. It carries the question into /ask, where the safety
 * gate runs before anything is sent.
 *
 * VOICE IS NOT BUILT, and the mic says so when pressed rather than pretending
 * to listen.
 */
export function AskBar() {
  const router = useRouter();
  const still = useReducedMotion();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [voiceHint, setVoiceHint] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (still || focused || value) return;
    const id = setInterval(() => setTick((t) => t + 1), 3200);
    return () => clearInterval(id);
  }, [still, focused, value]);

  useEffect(() => {
    if (!voiceHint) return;
    const id = setTimeout(() => setVoiceHint(false), 2600);
    return () => clearTimeout(id);
  }, [voiceHint]);

  const hint = HINTS[tick % HINTS.length];

  function ask(question: string) {
    const trimmed = question.trim();
    router.push(trimmed ? `/ask?q=${encodeURIComponent(trimmed)}` : "/ask");
  }

  function openUpload() {
    const trimmed = value.trim();
    router.push(`/ask?upload=1${trimmed ? `&q=${encodeURIComponent(trimmed)}` : ""}`);
  }

  return (
    <View>
      <View className="flex-row items-center gap-2.5">
        <Glass
          strong
          className="h-14 flex-1 flex-row items-center gap-2 rounded-pill pl-4 pr-1"
          style={{ borderColor: focused ? brand[300] : glass.rim, borderWidth: focused ? 1.5 : 1 }}
        >
          {/* Cheeku himself, small, where a generic AI sparkle used to be: the
              bar is a conversation with him, not with "AI". */}
          <View style={{ width: 34, height: 34, marginLeft: -6, alignItems: "center", justifyContent: "center" }}>
            <MascotBust size={34} mood="happy" />
          </View>
          <View className="min-w-0 flex-1 justify-center" style={{ height: 44 }}>
            <TextInput
              value={value}
              onChangeText={setValue}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={() => ask(value)}
              returnKeyType="send"
              accessibilityLabel="Ask Cheeku a question"
              style={{ fontSize: 15, color: ink[900], fontFamily: font.regular, height: 44 }}
            />
            {/* A drawn placeholder, so it can fade between hints. */}
            {!value ? (
              /*
               * Both hints are absolutely placed in the same spot, so the one
               * fading out sits exactly under the one fading in. They used to
               * stack in normal flow, and the outgoing line showed half a line
               * above the new one while it faded (seen on device 2026-09-30).
               */
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
                <Animated.Text
                  key={focused ? "focused" : hint}
                  entering={still ? undefined : FadeIn.duration(260)}
                  exiting={still ? undefined : FadeOut.duration(120)}
                  numberOfLines={1}
                  style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, lineHeight: 44, fontFamily: font.regular, fontSize: 15, color: ink[300] }}
                >
                  {brandify(focused ? "Ask Cheeku anything…" : hint, { size: 17 })}
                </Animated.Text>
              </View>
            ) : null}
          </View>
          <Tap scale={0.95}
            accessibilityRole="button"
            accessibilityLabel="Photograph a report to ask about"
            onPress={openUpload}
            hitSlop={4}
            className="h-11 w-10 items-center justify-center"
          >
            <Camera size={20} color={ink[700]} strokeWidth={1.8} />
          </Tap>
          <Tap scale={0.95}
            accessibilityRole="button"
            accessibilityLabel="Voice. Coming soon"
            onPress={() => setVoiceHint(true)}
            hitSlop={4}
            className="h-11 w-10 items-center justify-center"
          >
            <Mic size={20} color={ink[700]} strokeWidth={1.8} />
          </Tap>
        </Glass>
        <GlassCircle dark size={56} label="Send" onPress={() => ask(value)}>
          <ArrowUp size={21} color="#ffffff" />
        </GlassCircle>
      </View>

      {voiceHint ? (
        <BubblePop from="right" style={{ alignSelf: "flex-end", marginTop: 8, marginRight: 60 }}>
          <Glass strong className="rounded-lg px-3 py-2">
            <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
              Talking to me is coming soon. Type for now?
            </Text>
          </Glass>
        </BubblePop>
      ) : null}
    </View>
  );
}

/**
 * The hero card. Cheeku, large, on a soft violet gradient, with two glass pills
 * floating on top: how the active member's file reads, and that Cheeku is
 * awake at any hour.
 *
 * THE STATUS PILL is the one place on Home where green and red appear, because
 * it states how the records read — which is what those colours are for.
 *
 * THE MEMORY LINE is a real count for the active member and nothing more. At
 * zero it asks for the first report instead of pretending.
 */
export function CheekuCard({
  name,
  isSelf,
  remembered,
  needsReview,
  onStatus,
}: {
  name: string;
  isSelf: boolean;
  remembered: number;
  needsReview: number;
  onStatus: () => void;
}) {
  const router = useRouter();

  const status =
    remembered === 0
      ? { dot: brand[500], text: "No reports yet" }
      : needsReview === 0
        ? { dot: semantic.safe, text: "All in range" }
        : { dot: semantic.danger, text: `${needsReview} to review` };

  // Short and warm: an introduction, then one line that makes it personal.
  const memory =
    remembered > 0
      ? `Ask me anything about ${isSelf ? "your" : `${name}'s`} ${remembered} ${remembered === 1 ? "report" : "reports"}.`
      : "Snap one report and I'll take it from there.";

  return (
    <View className="overflow-hidden rounded-2xl" style={[glassShadow, { minHeight: 318 }]}>
      <Gradient from={lilac.base} to={lilac.deep} glow="#ffffff" />

      {/*
       * Cheeku, large and alive, anchored to the card's bottom-right corner.
       * His pose follows the person's state: open arms when there is nothing
       * yet ("snap one report"), thinking at his desk when reports wait for a
       * check, otherwise a hello that settles into glancing about. Tap him and
       * he hops.
       */}
      <View pointerEvents="box-none" style={{ position: "absolute", right: remembered === 0 ? -2 : -18, bottom: -14 }}>
        {/* Open arms are wider, so that pose sits further in and a touch smaller. */}
        <MascotFigure size={remembered === 0 ? 176 : 190} moment={remembered === 0 ? "present" : needsReview > 0 ? "think" : "hello"} hop />
      </View>

      <View className="flex-1 p-4">
        <View className="flex-row items-center justify-between">
          <Tap accessibilityRole="button" accessibilityLabel={`${status.text}. Open records`} onPress={onStatus}>
            <Glass className="flex-row items-center gap-2 rounded-pill py-2 pl-2.5 pr-3.5">
              <View className="h-5 w-5 items-center justify-center rounded-pill bg-white">
                <View className="h-2 w-2 rounded-pill" style={{ backgroundColor: status.dot }} />
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{status.text}</Text>
            </Glass>
          </Tap>
          <Glass className="flex-row items-center gap-1.5 rounded-pill px-3.5 py-2">
            <Clock3 size={14} color={ink[700]} strokeWidth={1.9} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>24/7</Text>
          </Glass>
        </View>

        <View className="mt-6 pr-[38%]">
          <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 31, letterSpacing: -0.7, color: ink[900] }}>
            Hi, I&apos;m <Brand size={28} />
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: ink[700], marginTop: 4 }}>Your personal health companion.</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 12 }}>{memory}</Text>
        </View>

        {/* The action: a dark disc joined to a glass label, one tap target. */}
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Start a chat with Cheeku"
          onPress={() => router.push("/ask")}
          style={{
            marginTop: "auto",
            paddingTop: 22,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View className="z-10 h-[52px] w-[52px] items-center justify-center rounded-pill" style={{ backgroundColor: ink[900] }}>
            <MessageCircleHeart size={21} color="#ffffff" strokeWidth={1.9} />
          </View>
          <Glass
            strong
            className="-ml-4 h-[46px] justify-center pl-7 pr-5"
            style={{ borderTopRightRadius: 999, borderBottomRightRadius: 999 }}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Start a chat</Text>
          </Glass>
        </Tap>
      </View>
    </View>
  );
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
