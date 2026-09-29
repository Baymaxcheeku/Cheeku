import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUp, ArrowUpRight, Camera, Mic, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { MascotBust } from "@/components/illustrations/sprout";
import { Bob, BubblePop } from "@/components/onboarding/motion";
import { useReducedMotion } from "@/components/ui/motion";
import { promptsFor } from "@/lib/ask/prompts";
import { profileSignalsFor } from "@/lib/knowledge/queries";
import { activeProfile } from "@/lib/profiles/context";
import { brand, ink, shadow } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/**
 * Ask Cheeku, as the centre of Home.
 *
 * WHY IT IS THE LOUDEST THING ON THE SCREEN. The product's north star is a
 * conversation grounded in the reader's own records. Every other block on Home
 * is a pointer somewhere; this one is the product. So it gets the only dark
 * surface on the page, the mascot, and the first tap the thumb can reach.
 *
 * THE MEMORY LINE. "I remember 6 of your documents" is the one sentence that
 * separates this from a general chatbot, and it is a real count of what is on
 * file for the active member — never inflated, and when it is zero it asks for
 * the first document instead of pretending.
 *
 * IT DOES NOT ANSWER HERE. It carries the question into /ask, where the safety
 * gate runs before anything is sent. A second place that answers is a second
 * place that has to remember the gate.
 *
 * VOICE IS NOT BUILT. The mic is shown because talking is how a lot of this
 * audience would rather ask, and the button says so honestly when pressed
 * instead of pretending to listen.
 */
const HINTS = ["Ask me anything…", "Snap a report…", "Ask in your words…"] as const;

export function AskHero({
  name,
  isSelf,
  remembered,
}: {
  /** First name of the active family member. */
  name: string;
  /** True when the active member is the account holder. */
  isSelf: boolean;
  /** Documents on file for the active member. */
  remembered: number;
}) {
  const router = useRouter();
  const still = useReducedMotion();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [voiceHint, setVoiceHint] = useState(false);

  /*
   * Prompts follow what this reader told us about themselves — the journey and
   * the conditions typed into their profile — and never anything read out of a
   * document. Keyed on the active profile so switching member re-reads it.
   */
  const signals = useQuery({
    queryKey: ["ask-prompts"],
    queryFn: async () => {
      const profile = await activeProfile();
      return profileSignalsFor(profile?.id);
    },
    staleTime: 5 * 60 * 1000,
  });
  const prompts = promptsFor(signals.data?.journey, signals.data?.conditions ?? []);

  /*
   * The placeholder cycles through three short ways in. Not the suggested
   * questions: those are already the chips underneath, and a hint that repeats
   * the button below it is noise. Short enough to fit beside three buttons on
   * the narrowest phone. It stops while the box is in use, and does not move
   * at all under reduced motion.
   */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (still || focused || value) return;
    const id = setInterval(() => setTick((t) => t + 1), 3200);
    return () => clearInterval(id);
  }, [still, focused, value]);
  const hint = HINTS[tick % HINTS.length];

  useEffect(() => {
    if (!voiceHint) return;
    const id = setTimeout(() => setVoiceHint(false), 2600);
    return () => clearTimeout(id);
  }, [voiceHint]);

  function ask(question: string) {
    const trimmed = question.trim();
    router.push(trimmed ? `/ask?q=${encodeURIComponent(trimmed)}` : "/ask");
  }

  /** Carries what was typed along, so reaching for the camera loses nothing. */
  function openUpload() {
    const trimmed = value.trim();
    const query = trimmed ? `&q=${encodeURIComponent(trimmed)}` : "";
    router.push(`/ask?upload=1${query}`);
  }

  const headline = isSelf ? "What's on your mind today?" : `Anything about ${name}'s health?`;
  const memory =
    remembered > 0
      ? `I remember ${remembered} ${remembered === 1 ? "document" : "documents"} ${
          isSelf ? "of yours" : `of ${name}'s`
        }, so you never have to explain twice.`
      : "Send me one report and I'll remember it for good.";

  return (
    <View
      className="mx-5 mt-5 overflow-hidden rounded-[30px] p-5"
      style={[shadow.e2, { backgroundColor: brand[600] }]}
    >
      {/* Depth without a gradient dependency: two soft discs of lighter violet
          behind the content, where a gradient's highlights would sit. */}
      <View
        pointerEvents="none"
        className="absolute rounded-pill"
        style={{ width: 260, height: 260, right: -90, top: -110, backgroundColor: brand[500], opacity: 0.55 }}
      />
      <View
        pointerEvents="none"
        className="absolute rounded-pill"
        style={{ width: 180, height: 180, left: -70, bottom: -90, backgroundColor: brand[800], opacity: 0.45 }}
      />

      <View className="flex-row items-start">
        <View className="min-w-0 flex-1 pr-2">
          <View className="flex-row items-center gap-1.5 self-start rounded-pill px-2.5 py-1" style={{ backgroundColor: "rgba(255,255,255,0.16)" }}>
            <View className="h-1.5 w-1.5 rounded-pill" style={{ backgroundColor: "#8ff0b8" }} />
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: "#ffffff", letterSpacing: 0.3 }}>
              Ask Cheeku · awake 24/7
            </Text>
          </View>
          <Text accessibilityRole="header" style={[type.title, { color: "#ffffff", marginTop: 12, fontSize: 25, lineHeight: 30 }]}>
            {headline}
          </Text>
        </View>
        <Bob style={{ marginTop: -6, marginRight: -8 }}>
          <MascotBust size={96} />
        </Bob>
      </View>

      <View className="mt-2 flex-row items-start gap-2">
        <Sparkles size={14} color={brand[200]} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: "rgba(255,255,255,0.86)" }}>
          {memory}
        </Text>
      </View>

      {/* The input. White on violet, so the one thing to do is unmistakable. */}
      <View
        className="mt-4 flex-row items-center gap-1 rounded-[22px] bg-surface py-1.5 pl-4 pr-1.5"
        style={{ borderWidth: 2, borderColor: focused ? brand[300] : "transparent" }}
      >
        <View className="min-w-0 flex-1 justify-center" style={{ height: 44 }}>
          <TextInput
            value={value}
            onChangeText={setValue}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => ask(value)}
            returnKeyType="send"
            accessibilityLabel="Ask Cheeku a question"
            accessibilityHint="Opens a chat with Cheeku"
            style={{ fontSize: 15.5, color: ink[900], fontFamily: font.regular, height: 44 }}
          />
          {/* A drawn placeholder rather than the native one, so it can fade
              between prompts. Hidden the moment anything is typed. */}
          {!value ? (
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0 }}>
              <Animated.Text
                key={hint ?? "empty"}
                entering={still ? undefined : FadeIn.duration(300)}
                exiting={still ? undefined : FadeOut.duration(200)}
                numberOfLines={1}
                style={{ fontFamily: font.regular, fontSize: 15.5, color: ink[300] }}
              >
                {focused ? "Ask me anything…" : hint}
              </Animated.Text>
            </View>
          ) : null}
        </View>

        <IconButton label="Photograph a report or product to ask about" onPress={openUpload}>
          <Camera size={19} color={brand[600]} />
        </IconButton>
        <IconButton label="Voice. Coming soon" onPress={() => setVoiceHint(true)}>
          <Mic size={19} color={brand[600]} />
        </IconButton>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          onPress={() => ask(value)}
          className="h-11 w-11 items-center justify-center rounded-pill"
          style={{ backgroundColor: brand[600] }}
        >
          <ArrowUp size={19} color="#ffffff" />
        </Pressable>
      </View>

      {voiceHint ? (
        <BubblePop from="right" style={{ alignSelf: "flex-end", marginTop: 8 }}>
          <View accessibilityLiveRegion="polite" className="rounded-[14px] bg-surface px-3 py-2" style={shadow.e1}>
            <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[700] }}>
              Talking to me is coming soon. Type for now?
            </Text>
          </View>
        </BubblePop>
      ) : null}

      {/* Tap to send as-is. The fastest possible first conversation. */}
      <View className="mt-3.5 gap-2">
        {prompts.slice(0, 2).map((prompt) => (
          <Pressable
            key={prompt}
            accessibilityRole="button"
            accessibilityLabel={`Ask: ${prompt}`}
            onPress={() => ask(prompt)}
            className="flex-row items-center gap-2 self-start rounded-pill py-2 pl-3 pr-3.5"
            style={{ backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", maxWidth: "100%" }}
          >
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.medium, fontSize: 13, color: "#ffffff" }}>
              {prompt}
            </Text>
            <ArrowUpRight size={14} color="rgba(255,255,255,0.85)" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      className="h-11 w-10 items-center justify-center rounded-pill"
    >
      {children}
    </Pressable>
  );
}
