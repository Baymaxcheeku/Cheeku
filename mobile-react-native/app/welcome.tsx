import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  FileText,
  Lock,
  ShieldCheck,
  Stethoscope,
} from "lucide-react-native";

import { CastAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MascotBust } from "@/components/illustrations/sprout";
import { Drift, PopIn, PressRow, Settle, StaggerItem } from "@/components/ui/motion";
import { PANELS } from "@/lib/onboarding/panels";
import { rememberJourney } from "@/lib/onboarding/journey-store";
import { JOURNEYS, type JourneyId } from "@/lib/onboarding/journeys";
import { castFaces } from "@/lib/profiles/avatar";
import { brand, ink, shadow, surface } from "@/theme/tokens";

/*
 * A2 — the value carousel, before any account exists.
 *
 * Four panels, each with its OWN composition. Four panels sharing one hero
 * shape with swapped copy is a slideshow, not a story; that was the note that
 * drove the web redesign and it carries over.
 *
 * Panel 2 names the five lives the product is built around instead of listing
 * file types. The choice persists as a personalisation hint only — it is never
 * a clinical fact and nothing downstream may read it as history.
 */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [journey, setJourney] = useState<JourneyId | null>(null);

  const panel = PANELS[index];
  if (!panel) return null;
  const isLast = index === PANELS.length - 1;
  const faces = castFaces(3);

  function next() {
    if (isLast) router.push("/sign-in");
    else setIndex((i) => i + 1);
  }

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      {/* Step rail. Segments fill rather than switch on, so moving forward
          reads as progress made. */}
      {/* pt-3, not pt-2: the rail sits directly under the Dynamic Island and
          needs to clear it optically, not just numerically. */}
      <View className="flex-row gap-1.5 px-5 pt-3">
        {PANELS.map((_, i) => (
          <View key={i} className="h-1 flex-1 overflow-hidden rounded-pill bg-white">
            <View
              style={{
                height: "100%",
                borderRadius: 999,
                backgroundColor: brand[600],
                width: i <= index ? "100%" : "0%",
              }}
            />
          </View>
        ))}
      </View>

      <View className="h-11 flex-row items-center px-5">
        {index > 0 ? (
          <Pressable
            accessibilityLabel="Previous"
            onPress={() => setIndex((i) => i - 1)}
            className="h-9 w-9 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <ChevronLeft size={19} color={ink[700]} />
          </Pressable>
        ) : null}
        <Pressable className="ml-auto" onPress={() => router.push("/sign-in")}>
          <Text className="text-[14px] font-semibold text-ink-500">Skip</Text>
        </Pressable>
      </View>

      {/*
       * The art takes the slack, not the gap above the button.
       *
       * With the hero at a fixed height and the group centred, the leftover
       * space split evenly above and below it: the composition floated and the
       * CTA read as exiled at the bottom of an empty screen. Giving the hero
       * `flex-1` with a floor and a ceiling means spare height goes into the
       * picture, where it looks deliberate, and the copy stays anchored just
       * above the button where the thumb already is.
       */}
      <View key={index} className="flex-1">
        {/* No max height on the hero: capping it put the leftover space back
            between the copy and the button, which is the gap this restructure
            exists to remove. The art centres inside whatever it is given. */}
        {panel.kind !== "journeys" ? (
          <View className="min-h-[210px] flex-1">
            {panel.kind === "meet" ? <HeroMeet /> : null}
            {panel.kind === "memory" ? <HeroMemory /> : null}
            {panel.kind === "family" ? <HeroFamily faces={faces} /> : null}
          </View>
        ) : null}

        <View className={panel.kind === "journeys" ? "flex-1 px-5 pt-1" : "px-5 pt-5"}>
          {/*
           * The eyebrow. One word, in the panel's own tint, so the four screens
           * read as chapters of one thing rather than four separate pitches —
           * and so the headline never has to spend a clause labelling itself.
           */}
          <View
            className="mb-2.5 self-start rounded-pill px-2.5 py-1"
            style={{ backgroundColor: (EYEBROW[panel.kind] ?? EYEBROW.meet)?.bg }}
          >
            <Text
              className="text-[10px] font-bold uppercase"
              style={{ color: (EYEBROW[panel.kind] ?? EYEBROW.meet)?.fg, letterSpacing: 1.1 }}
            >
              {panel.eyebrow}
            </Text>
          </View>

          {/*
           * -0.6 tracking at 28pt. Large type reads loose at the default; the
           * negative value is size-specific and deliberately not applied to the
           * body copy below, where it would cost legibility.
           */}
          <Text
            className="text-[28px] font-bold leading-[33px] text-ink-900"
            style={{ letterSpacing: -0.6 }}
          >
            {panel.lead} <Text className="text-brand-600">{panel.accent}</Text>
          </Text>
          <Text className="mt-2.5 text-[14px] leading-[21px] text-ink-500">{panel.body}</Text>

          {panel.kind === "journeys" ? (
            <JourneyGrid
              selected={journey}
              onPick={(picked) => {
                setJourney(picked);
                /*
                 * Written the moment it is tapped, not on Continue. There is no
                 * profile to write to yet — this is picked before sign-up — so
                 * it goes to local storage and is transferred onto the profile
                 * when one is created. Until this landed the answer lived in
                 * component state and died on the next navigation, so nothing
                 * downstream could ever read it.
                 */
                void rememberJourney(picked);
              }}
            />
          ) : null}
        </View>
      </View>

      {/* One consistent footer rhythm on every panel: 20pt above the block,
          the safe-area inset plus 8 below it. */}
      <View className="gap-3.5 px-5 pt-5" style={{ paddingBottom: insets.bottom + 8 }}>
        {index > 0 ? (
          <View className="flex-row items-center justify-center gap-2">
            <Lock size={12} color={ink[300]} />
            <Text className="text-[11.5px] text-ink-300">
              Bank-level encryption. Only you and your family can access.
            </Text>
          </View>
        ) : null}

        <Button onPress={next}>
          <Text className="text-[16px] font-bold text-white">{panel.cta}</Text>
          <ArrowRight size={17} color="#fff" />
        </Button>

        {index === 0 ? (
          <Pressable onPress={() => router.push("/sign-in")}>
            <Text className="text-center text-[13px] text-ink-500">
              Already have an account? <Text className="font-bold text-brand-600">Log in</Text>
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/*
 * HEROES
 *
 * All three lay their content out in FLOW and centre it, rather than pinning
 * pieces to the top and bottom of the box. The box is now flexible — it
 * absorbs whatever height the screen has spare — and absolutely-positioned
 * children in a variable-height parent drift: the family faces ended up
 * hard against the top with a void beneath them, and the pills anchored to
 * `bottom` disappeared off the composition entirely.
 */

/*
 * Panel 1 — the questions, and who is listening.
 *
 * WHAT CHANGED AND WHY. The old panel put a badge above the mascot and a single
 * quoted line beneath it, and the quote was the PRODUCT talking: "Your iron is
 * low. Here's what changed." Two problems. It is the app claiming a finding
 * before a reader has uploaded anything, and it sells a feature to somebody who
 * has not yet been given a reason to care.
 *
 * A person arrives here holding a question, not a feature request. So the
 * questions lead — three real ones, in the reader's own voice, drawn from the
 * lives the product is built around — and the mascot sits among them as the
 * thing that will listen. That is the whole pitch of panel 1, made before a
 * word of the headline is read.
 *
 * EVERY QUESTION HERE IS ONE BAYMAX CAN HONESTLY TAKE. Each asks it to read
 * back, compare or prepare — never to judge a result or name a treatment.
 * Putting "should I take this?" on this screen would be a promise broken on
 * the first real conversation.
 */
const OPENING_QUESTIONS = [
  { text: "What did this report actually say?", align: "flex-start" as const, delay: 0 },
  { text: "What should I ask my doctor tomorrow?", align: "flex-end" as const, delay: 0.34 },
] as const;

function HeroMeet() {
  return (
    <View className="flex-1 items-center justify-center px-5">
      <Drift delay={OPENING_QUESTIONS[0].delay} style={{ alignSelf: OPENING_QUESTIONS[0].align }}>
        <QuestionChip text={OPENING_QUESTIONS[0].text} />
      </Drift>

      {/*
       * The mascot overlaps the chips slightly rather than sitting in a lane of
       * its own. A stack of three separated blocks reads as a list; an overlap
       * reads as one scene, and the scene is "these are being heard".
       */}
      {/* -6 above, 0 below. The earlier -10/-10 pulled the second chip up over
          the mascot's body: an overlap that reads as one scene at the top edge
          reads as an obstruction when it covers the character. */}
      <Settle delay={0.08} style={{ marginTop: -6 }}>
        <MascotBust size={178} />
      </Settle>

      <Drift delay={OPENING_QUESTIONS[1].delay} style={{ alignSelf: OPENING_QUESTIONS[1].align }}>
        <QuestionChip text={OPENING_QUESTIONS[1].text} />
      </Drift>

      <Settle delay={0.46} style={{ marginTop: 10, width: 252 }}>
        <View
          className="flex-row items-center gap-2.5 rounded-pill bg-surface px-3.5 py-2.5"
          style={shadow.e2}
        >
          <View
            className="h-8 w-8 items-center justify-center rounded-pill"
            style={{ backgroundColor: brand[600] }}
          >
            <Stethoscope size={15} color="#fff" />
          </View>
          <Text className="flex-1 text-[11px] leading-[15px] text-ink-700">
            <Text className="font-bold text-ink-900">No question is too small. </Text>
            Or too late at night.
          </Text>
        </View>
      </Settle>
    </View>
  );
}

/** A question in the reader's voice: quoted, unanswered, waiting. */
function QuestionChip({ text }: { text: string }) {
  return (
    <View
      className="max-w-[250px] rounded-card bg-surface px-3.5 py-2.5"
      style={shadow.e2}
    >
      <Text className="text-[12px] leading-[16px] text-ink-700">&ldquo;{text}&rdquo;</Text>
    </View>
  );
}

/*
 * Panel 3 — memory, shown as the round trip it actually is.
 *
 * The old version stacked three unrelated-looking cards: a document, a heart
 * rate, an answer. It depicted the PARTS of the memory layer and left the
 * reader to infer the connection between them, which is the one thing worth
 * showing.
 *
 * So it is drawn as a conversation with a document at the top of it, reading
 * top to bottom the way the reader's own transcript will: a report goes in,
 * months pass, a question is asked in ordinary words, and the answer comes
 * back quoting that exact page. The date on the report and the date in the
 * answer are the same date on purpose — that is the proof, and it is the
 * difference between this and a chatbot that sounds confident.
 *
 * THE ANSWER READS BACK, IT DOES NOT INTERPRET. "Below the range your lab
 * printed" is the laboratory's own finding restated. Anything approaching
 * "you're anaemic" would be this screen promising a diagnosis the app must
 * never give.
 */
function HeroMemory() {
  return (
    <View className="flex-1 items-center justify-center px-5">
      <Drift delay={0} style={{ alignSelf: "flex-start", width: 196 }}>
        <View className="rounded-card bg-surface p-3" style={shadow.e2}>
          <View className="flex-row items-center gap-2">
            <View
              className="h-8 w-8 items-center justify-center rounded-tile"
              style={{ backgroundColor: "#f3e9fd" }}
            >
              <FileText size={14} color="#7b3fd4" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[11.5px] font-semibold text-ink-900">Blood test</Text>
              <Text className="text-[9.5px] text-ink-300">14 March</Text>
            </View>
            <View className="h-5 w-5 items-center justify-center rounded-pill bg-safe-bg">
              <Check size={11} color="#23af5f" strokeWidth={3} />
            </View>
          </View>
          <View className="mt-2.5 gap-1.5">
            <View className="h-1.5 w-full rounded-pill bg-line" />
            <View className="h-1.5 w-3/4 rounded-pill bg-line" />
          </View>
        </View>
      </Drift>

      {/* Months later, in ordinary words. The gap is the point of the product. */}
      <Drift delay={0.16} style={{ alignSelf: "flex-end", marginTop: 12 }}>
        <View
          className="max-w-[214px] rounded-card px-3.5 py-2.5"
          style={{ backgroundColor: surface.tint, borderWidth: 1, borderColor: surface.line }}
        >
          <Text className="text-[11.5px] leading-[15px] text-ink-700">
            Was my iron low the last time I checked?
          </Text>
        </View>
      </Drift>

      <Settle delay={0.32} style={{ alignSelf: "flex-start", width: 244, marginTop: 12 }}>
        <View className="rounded-card p-3.5" style={[{ backgroundColor: brand[600] }, shadow.e2]}>
          <Text className="text-[12px] leading-[17px] text-white">
            Your ferritin was{" "}
            <Text className="font-bold text-white">9 ng/mL on 14 March</Text> — below the range your
            lab printed.
          </Text>
          <View
            className="mt-2.5 flex-row items-center gap-1.5 pt-2.5"
            style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.22)" }}
          >
            <FileText size={10} color={brand[200]} />
            <Text className="text-[9.5px] font-bold" style={{ color: brand[200] }}>
              From your own blood test
            </Text>
          </View>
        </View>
      </Settle>
    </View>
  );
}

/** Panel 4 — the family, and the promise wrapped around it. */
function HeroFamily({ faces }: { faces: readonly string[] }) {
  return (
    <View className="flex-1 items-center justify-center px-5">
      <Drift delay={0.3} style={{ alignSelf: "flex-end" }}>
        <View className="rounded-pill bg-surface px-2.5 py-1.5" style={shadow.e2}>
          <Text className="text-[10px] font-bold text-brand-700">Up to 4 people</Text>
        </View>
      </Drift>

      <View className="mt-3 flex-row items-end">
        {faces.slice(0, 3).map((svg, i) => (
          <StaggerItem key={i} index={i} style={{ marginLeft: i > 0 ? -20 : 0 }}>
            <View
              className="rounded-pill bg-surface"
              style={[shadow.e2, { borderWidth: 3, borderColor: "#fff", borderRadius: 999 }]}
            >
              <CastAvatar svg={svg} size={i === 1 ? 84 : 68} />
            </View>
          </StaggerItem>
        ))}
      </View>

      <Settle delay={0.22} style={{ marginTop: 18, width: 268 }}>
        <View
          className="flex-row items-center gap-2.5 rounded-pill bg-surface px-3.5 py-2.5"
          style={shadow.e2}
        >
          <View className="h-8 w-8 items-center justify-center rounded-pill bg-brand-50">
            <ShieldCheck size={16} color={brand[600]} />
          </View>
          <Text className="flex-1 text-[11px] leading-[15px] text-ink-700">
            <Text className="font-bold text-ink-900">Private by default. </Text>
            Never sold, never shared.
          </Text>
        </View>
      </Settle>
    </View>
  );
}

/**
 * The six journeys, as a picker.
 *
 * Selectable rather than illustrative: letting someone say "this is me" is the
 * moment the product stops being generic. Nothing is required, because a
 * stranger should never have to classify their own life before being allowed to
 * see the app.
 */
function JourneyGrid({
  selected,
  onPick,
}: {
  selected: JourneyId | null;
  onPick: (id: JourneyId) => void;
}) {
  return (
    <View className="mt-4 flex-row flex-wrap" style={{ gap: 8 }}>
      {JOURNEYS.map((j, i) => {
        const active = selected === j.id;
        const Icon = j.icon;
        return (
          <PressRow
            key={j.id}
            index={i}
            onPress={() => onPick(j.id)}
            style={{ width: "48%" }}
          >
            <View
              className="h-full rounded-card p-3"
              style={[
                shadow.e1,
                {
                  backgroundColor: active ? brand[50] : surface.base,
                  borderWidth: 1,
                  borderColor: active ? brand[500] : surface.line,
                },
              ]}
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-tile"
                style={{ backgroundColor: TINT[j.id] ?? brand[50] }}
              >
                <Icon size={17} color={TINT_FG[j.id] ?? brand[600]} />
              </View>
              <Text className="mt-2 text-[13px] font-bold leading-[16px] text-ink-900">{j.label}</Text>
              <Text className="mt-1 text-[11px] leading-[14px] text-ink-500">{j.problem}</Text>

              {active ? (
                <PopIn index={0} style={{ position: "absolute", right: 10, top: 10 }}>
                  <View
                    className="h-5 w-5 items-center justify-center rounded-pill"
                    style={{ backgroundColor: brand[600] }}
                  >
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                </PopIn>
              ) : null}
            </View>
          </PressRow>
        );
      })}
    </View>
  );
}

/*
 * The journey tints as values. `journeys.ts` carries them as Tailwind class
 * strings for the web build; NativeWind cannot apply an arbitrary class to an
 * SVG icon's `color` prop, so the same palette is mirrored here. Non-semantic
 * on purpose: green, amber and red mean health status everywhere else.
 */
/*
 * The eyebrow tints, one per chapter.
 *
 * NON-SEMANTIC, like every other category colour in this app: green, amber and
 * red state how a health result reads and are never spent on decoration. These
 * four are borrowed from the journey palette so onboarding and the picker on
 * panel 2 belong to the same world.
 */
const EYEBROW: Record<string, { bg: string; fg: string }> = {
  meet: { bg: brand[50], fg: brand[600] },
  journeys: { bg: "#f3e9fd", fg: "#7b3fd4" },
  memory: { bg: "#e6f1fd", fg: "#1a6fc2" },
  family: { bg: "#fdeaf0", fg: "#c22a6b" },
};

const TINT: Record<string, string> = {
  expecting: "#f3e9fd",
  fertility: "#e6f1fd",
  caregiver: "#fdeee0",
  new_parent: "#fdeaf0",
  optimiser: "#eaf6ec",
  other: brand[50],
};

const TINT_FG: Record<string, string> = {
  expecting: "#7b3fd4",
  fertility: "#1a6fc2",
  caregiver: "#c2650b",
  new_parent: "#c22a6b",
  optimiser: "#1f8a45",
  other: brand[600],
};
