import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUp, Camera, Stethoscope } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { MascotBust } from "@/components/illustrations/sprout";
import { promptsFor } from "@/lib/ask/prompts";
import { profileSignalsFor } from "@/lib/knowledge/queries";
import { activeProfile } from "@/lib/profiles/context";
import { brand, ink, shadow } from "@/theme/tokens";

/**
 * The Ask Cheeku entry on Home.
 *
 * IT DOES NOT ANSWER HERE. It carries the question into /ask, where the safety
 * gate runs before anything is sent. Answering inline would mean a second place
 * that has to remember to run the gate, and the one guarantee that must never
 * depend on a developer remembering is that one.
 *
 * Given the most space and the first stop after the insight row: for an anxious
 * or pregnant reader this box, not the record list, is the reason they opened
 * the app.
 */
export function HomeAskBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  /*
   * The chips follow what this reader told us about themselves.
   *
   * They were three hardcoded strings led by "Is this safe during pregnancy?",
   * which is what somebody tracking their general health saw on their own home
   * screen. Same signals the knowledge rail uses — the journey picked at
   * onboarding and the conditions typed into the profile — and, as there,
   * never anything read out of a document.
   *
   * The query is keyed on the active profile so switching member re-reads it;
   * `promptsFor` always returns three, so there is no empty state to design and
   * no layout shift while it loads.
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

  function ask(question: string) {
    const trimmed = question.trim();
    router.push(trimmed ? `/ask?q=${encodeURIComponent(trimmed)}` : "/ask");
  }

  /*
   * Carries the typed question along, so reaching for the camera mid-thought
   * ("is this cream safe…") does not throw away what was already typed.
   */
  function openUpload() {
    const trimmed = value.trim();
    const query = trimmed ? `&q=${encodeURIComponent(trimmed)}` : "";
    router.push(`/ask?upload=1${query}`);
  }

  return (
    <View className="mx-5 mt-4 overflow-hidden rounded-card bg-brand-100 p-5" style={shadow.e1}>
      {/* The web card is a three-stop gradient. There is no gradient here
          without pulling in expo-linear-gradient for one surface, so it is the
          gradient's mid tone flat — the mascot and the glow are what carried
          the depth anyway. */}
      {/*
       * INSIDE the card, not hanging off it.
       *
       * It was at -right-3 -top-1 in a card with `overflow-hidden`, so the
       * waving arm was sliced down the right edge and the top of the head was
       * shaved — the mascot appeared here as a fragment while every other
       * screen shows it whole. A character that is drawn differently on the
       * one screen it introduces itself on reads as a rendering bug, which is
       * exactly what it was.
       */}
      <View className="absolute right-1 top-2" pointerEvents="none">
        <MascotBust size={132} />
      </View>

      <View className="pr-[36%]">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[21px] font-bold text-ink-900">Ask Cheeku</Text>
          <Stethoscope size={17} color={brand[500]} />
        </View>
        <Text className="mt-1.5 text-[13px] leading-[18px] text-ink-700">
          Hi, I&apos;m Cheeku, your personalised healthcare companion.
        </Text>
      </View>

      <View
        className="mt-4 flex-row items-center gap-2 rounded-pill bg-surface p-1.5 pl-4"
        style={[shadow.e1, { borderWidth: 1, borderColor: focused ? brand[300] : "transparent" }]}
      >
        <TextInput
          value={value}
          onChangeText={setValue}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => ask(value)}
          returnKeyType="send"
          placeholder="Ask anything…"
          placeholderTextColor={ink[300]}
          accessibilityLabel="Ask Cheeku a question"
          style={{ flex: 1, fontSize: 15, color: ink[900], fontFamily: "Inter_400Regular" }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upload a photo to ask about"
          onPress={openUpload}
          hitSlop={6}
          className="h-9 w-9 items-center justify-center rounded-pill"
        >
          <Camera size={18} color={brand[600]} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask"
          onPress={() => ask(value)}
          className="h-10 w-10 items-center justify-center rounded-pill bg-brand-500"
        >
          <ArrowUp size={18} color="#ffffff" />
        </Pressable>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {prompts.map((prompt) => (
          <Pressable
            key={prompt}
            accessibilityRole="button"
            onPress={() => ask(prompt)}
            className="rounded-pill bg-surface px-3 py-1.5"
            style={shadow.e1}
          >
            <Text className="text-[12px] font-medium text-brand-700">{prompt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
