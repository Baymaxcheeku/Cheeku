import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Image, PanResponder, Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInLeft, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  FileText,
  FolderCheck,
  Image as ImageIcon,
  Lightbulb,
  Mail,
  MessageCircle,
  Plus,
  ShieldCheck,
} from "lucide-react-native";

import { CastAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MascotBust } from "@/components/illustrations/sprout";
import { CheekuMark } from "@/components/mascot/lottie";
import { CtaLabel, ReassuranceStrip } from "@/components/onboarding/chrome";
import { BubblePop, FillBar, TypingDots, useTypedReveal } from "@/components/onboarding/motion";
import { Drift } from "@/components/ui/motion";
import { doctorById } from "@/lib/booking/catalog";
import { doctorFace } from "@/lib/booking/faces";
import { PANELS } from "@/lib/onboarding/panels";
import { castFaces } from "@/lib/profiles/avatar";
import { brand, ink, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";

import brain3d from "../assets/icons3d/brain.png";
import house3d from "../assets/icons3d/house.png";
import pill3d from "../assets/icons3d/pill.png";
import stethoscope3d from "../assets/icons3d/stethoscope.png";
import testTube3d from "../assets/icons3d/test-tube.png";

/*
 * The eyebrow tints, one per chapter.
 *
 * NON-SEMANTIC, like every other category colour in this app: green, amber and
 * red state how a health result reads and are never spent on decoration. These
 * come from the journey palette so the carousel and the picker that follows
 * sign-up belong to the same world.
 */
const CHAPTER: Record<"meet" | "memory" | "family" | "care", { bg: string; fg: string }> = {
  meet: { bg: brand[50], fg: brand[600] },
  memory: { bg: "#e6f1fd", fg: "#1a6fc2" },
  family: { bg: "#fdeaf0", fg: "#c22a6b" },
  care: { bg: "#e2f3fb", fg: "#0b6f99" },
};

/*
 * A2 — the value carousel, before any account exists.
 *
 * Four panels, each with its OWN composition: a conversation, a round trip
 * from paperwork to answer, a family, and a booking picked from memory. Panels sharing one hero with swapped
 * copy is a slideshow, not a story.
 *
 * SWIPE AND TAP BOTH WORK. People swipe onboarding carousels by reflex, and a
 * carousel that ignores the reflex feels broken before a word is read. The
 * button stays the primary path because it is the one that also says what
 * comes next. PanResponder rather than a gesture-handler hook: it is plain JS,
 * behaves identically on web and device, and a horizontal swipe on one screen
 * does not need the UI thread.
 *
 * IT ASKS FOR NOTHING. Every screen here is something Cheeku offers; the one
 * question about the reader's life lives at `/journey`, after the account
 * exists, where the answer has somewhere to go.
 */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Under ~760pt (iPhone SE, mini, small Androids) the scenes drop their third
  // element instead of squeezing everything: a crowded hero reads as clutter.
  const compact = height < 760;

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  const panel = PANELS[index];
  const isLast = index === PANELS.length - 1;
  const faces = useMemo(() => castFaces(3), []);

  function go(to: number) {
    if (to < 0 || to >= PANELS.length) return;
    setDir(to > index ? 1 : -1);
    setIndex(to);
  }

  function next() {
    if (isLast) router.push("/sign-in");
    else go(index + 1);
  }

  // Refs, because PanResponder is created once and would otherwise close over
  // the first render's index forever.
  const indexRef = useRef(index);
  indexRef.current = index;
  const goRef = useRef(go);
  goRef.current = go;

  const swipe = useMemo(
    () =>
      PanResponder.create({
        // Claim only clearly horizontal drags, so a vertical scroll or a tap on
        // a button is never swallowed.
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -48) goRef.current(indexRef.current + 1);
          else if (g.dx > 48) goRef.current(indexRef.current - 1);
        },
      }),
    [],
  );

  if (!panel) return null;
  const chapter = CHAPTER[panel.kind];
  const entering = (dir > 0 ? FadeInRight : FadeInLeft).duration(320);

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }} {...swipe.panHandlers}>
      {/* Story rail. Each segment fills rather than switching on, so moving
          forward reads as progress made. Tappable, like a story. */}
      <View className="flex-row gap-1.5 px-5 pt-3">
        {PANELS.map((p, i) => (
          <Pressable
            key={p.kind}
            className="flex-1 py-1.5"
            accessibilityRole="button"
            accessibilityLabel={`Go to screen ${i + 1} of ${PANELS.length}`}
            onPress={() => go(i)}
          >
            <FillBar value={i <= index ? 1 : 0} color={brand[600]} track={brand[100]} height={5} />
          </Pressable>
        ))}
      </View>

      <View className="h-12 flex-row items-center px-5">
        {index > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous"
            onPress={() => go(index - 1)}
            className="h-10 w-10 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <ChevronLeft size={20} color={ink[700]} />
          </Pressable>
        ) : null}
        {!isLast ? (
          <Pressable
            className="ml-auto h-10 justify-center"
            hitSlop={10}
            accessibilityRole="button"
            onPress={() => router.push("/sign-in")}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      {/*
       * The art takes the slack, not the gap above the button: spare height
       * goes into the picture, where it looks deliberate, and the copy stays
       * anchored just above the thumb.
       */}
      {/* `style`, not `className`: NativeWind does not reach Reanimated views. */}
      <Animated.View key={index} entering={entering} style={{ flex: 1 }}>
        <View className="min-h-[220px] flex-1">
          {panel.kind === "meet" ? <SceneMeet compact={compact} /> : null}
          {panel.kind === "memory" ? <SceneMemory compact={compact} /> : null}
          {panel.kind === "family" ? <SceneFamily faces={faces} compact={compact} /> : null}
          {panel.kind === "care" ? <SceneCare faces={faces} compact={compact} /> : null}
        </View>

        <View className="px-6 pt-4">
          <View className="mb-3 self-start rounded-pill px-3 py-1.5" style={{ backgroundColor: chapter.bg }}>
            <Text style={[type.eyebrow, { color: chapter.fg }]}>{panel.eyebrow}</Text>
          </View>
          <Text accessibilityRole="header" style={type.hero}>
            {panel.lead} <Text style={{ color: brand[600] }}>{panel.accent}</Text>
          </Text>
          <Text style={[type.body, { marginTop: 12 }]}>{panel.body}</Text>
        </View>
      </Animated.View>

      <View className="gap-3.5 px-6 pt-5" style={{ paddingBottom: insets.bottom + 10 }}>
        <Button onPress={next}>
          <CtaLabel>{panel.cta}</CtaLabel>
        </Button>

        {index === 0 ? (
          <Pressable onPress={() => router.push("/sign-in")} hitSlop={6} accessibilityRole="button">
            <Text style={[type.bodySmall, { textAlign: "center" }]}>
              Already have an account?{" "}
              <Text style={{ fontFamily: font.bold, color: brand[600] }}>Log in</Text>
            </Text>
          </Pressable>
        ) : (
          <ReassuranceStrip />
        )}
      </View>
    </View>
  );
}

/*
 * SCENES
 *
 * All three lay their content out in FLOW and centre it, rather than pinning
 * pieces to the top and bottom of the box. The box is flexible — it absorbs
 * whatever height the screen has spare — and absolutely positioned children in
 * a variable-height parent drift apart.
 */

/*
 * Panel 1 — a conversation.
 *
 * The reader's questions arrive one by one as their own messages, then Cheeku
 * types and answers. It is the product demonstrated rather than described: you
 * ask like you would ask a friend, and something answers.
 *
 * EVERY QUESTION HERE IS ONE CHEEKU CAN HONESTLY TAKE. Each asks it to explain
 * a word, read something back, or help prepare — never to judge a result or
 * name a treatment. "Should I take this?" on this screen would be a promise
 * broken on the first real conversation. The reply promises only to explain.
 */
const QUESTIONS = [
  "What does HbA1c actually mean?",
  "Can you read Papa's blood report to me?",
  "What should I ask the doctor tomorrow?",
] as const;

function SceneMeet({ compact }: { compact: boolean }) {
  const asked = compact ? QUESTIONS.filter((_, i) => i !== 1) : QUESTIONS;
  const replyAt = 0.35 + asked.length * 0.5 + 0.9;
  const replied = useTypedReveal(replyAt);

  return (
    <View className="flex-1 justify-center gap-2.5 px-6">
      {asked.map((q, i) => (
        <BubblePop key={q} delay={0.25 + i * 0.5} from="right" style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
          <View
            className="rounded-[20px] px-4 py-2.5"
            style={[shadow.e1, { backgroundColor: surface.base, borderBottomRightRadius: 6 }]}
          >
            <Text style={{ fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: ink[700] }}>{q}</Text>
          </View>
        </BubblePop>
      ))}

      <View className="mt-1 flex-row items-end gap-2">
        <BubblePop delay={0.1} from="left">
          <MascotBust size={compact ? 78 : 96} mood="happy" motion="bounce" />
        </BubblePop>
        <BubblePop delay={replyAt - 0.9} from="left" style={{ flexShrink: 1, marginBottom: 10 }}>
          <View
            className="rounded-[20px] px-4 py-3"
            style={[shadow.e2, { backgroundColor: brand[600], borderBottomLeftRadius: 6, minWidth: 64 }]}
          >
            {replied ? (
              <Animated.Text
                entering={FadeIn.duration(220)}
                style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: "#ffffff" }}
              >
                Ask away. I&apos;ll explain it simply, no judgement.
              </Animated.Text>
            ) : (
              <TypingDots color="#ffffff" />
            )}
          </View>
        </BubblePop>
      </View>
    </View>
  );
}

/*
 * Panel 2 — from scattered paperwork to one answer.
 *
 * Top: where medical paper actually lives in an Indian household, tilted and
 * loose. Bottom: a question asked months later and answered from that paper,
 * with the source named. The date in the answer is the date on the report: that
 * is the proof, and the difference between this and a chatbot that sounds
 * confident.
 *
 * THE ANSWER READS BACK, IT DOES NOT INTERPRET. "Above the range her lab
 * printed" is the laboratory's own finding restated. Anything approaching
 * "she has hypothyroidism" would be this screen promising a diagnosis.
 */
const SOURCES = [
  { label: "WhatsApp forward", Icon: MessageCircle, tint: "#e7f7ee", fg: "#1f8a45", tilt: "-5deg" },
  { label: "Email PDF", Icon: Mail, tint: "#e6f1fd", fg: "#1a6fc2", tilt: "3deg" },
  { label: "Gallery photo", Icon: ImageIcon, tint: "#fdeee0", fg: "#c2650b", tilt: "-2deg" },
] as const;

function SceneMemory({ compact }: { compact: boolean }) {
  const sources = compact ? SOURCES.slice(0, 2) : SOURCES;
  return (
    <View className="flex-1 justify-center px-6">
      <View className="flex-row flex-wrap items-start justify-center" style={{ gap: 8 }}>
        {sources.map((s, i) => (
          <BubblePop key={s.label} delay={0.15 + i * 0.18}>
            {/* The tilt lives on the inner view: BubblePop owns its own
                transform, and a rotate passed to it would be overwritten. */}
            <View
              className="flex-row items-center gap-2 rounded-pill bg-surface py-2 pl-2 pr-3.5"
              style={[shadow.e1, { transform: [{ rotate: s.tilt }] }]}
            >
              <View className="h-7 w-7 items-center justify-center rounded-pill" style={{ backgroundColor: s.tint }}>
                <s.Icon size={14} color={s.fg} />
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[700] }}>{s.label}</Text>
            </View>
          </BubblePop>
        ))}
      </View>

      <BubblePop delay={0.75} style={{ alignSelf: "center", marginVertical: compact ? 10 : 14 }}>
        <View className="flex-row items-center gap-1.5 rounded-pill px-3 py-1.5" style={{ backgroundColor: brand[50] }}>
          <FolderCheck size={13} color={brand[600]} />
          <Text style={{ fontFamily: font.bold, fontSize: 11.5, color: brand[700] }}>Saved to Mummy&apos;s file</Text>
        </View>
      </BubblePop>

      <BubblePop delay={1.05} from="left">
        <View className="rounded-[22px] bg-surface p-4" style={[shadow.e2, { borderWidth: 1, borderColor: surface.line }]}>
          <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[500] }}>
            When was Mummy&apos;s last thyroid test?
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[900], marginTop: 6 }}>
            On <Text style={{ fontFamily: font.bold }}>14 March</Text>. Her TSH was{" "}
            <Text style={{ fontFamily: font.bold }}>6.2 mIU/L</Text>, above the range her lab printed.
          </Text>
          <View
            className="mt-3 flex-row items-center gap-1.5 self-start rounded-pill px-2.5 py-1"
            style={{ backgroundColor: brand[50] }}
          >
            <FileText size={11} color={brand[600]} />
            <Text style={{ fontFamily: font.bold, fontSize: 11, color: brand[700] }}>
              From: Thyroid profile, 14 Mar
            </Text>
          </View>
        </View>
      </BubblePop>
    </View>
  );
}

/*
 * Panel 3 — the family, named the way families name themselves.
 *
 * Name tags say "Mummy", "Papa", "You" rather than first names: that is how a
 * household refers to each other's reports, and it lets the reader cast their
 * own family into the picture. The dashed "+" is the fourth seat, left open.
 */
const FAMILY = ["Mummy", "You", "Papa"] as const;
/** Which of `castFaces(3)` (mother, father, daughter) wears each name tag. */
const FACE_FOR = [0, 2, 1] as const;

function SceneFamily({ faces, compact }: { faces: readonly string[]; compact: boolean }) {
  const big = compact ? 84 : 100;
  const small = compact ? 66 : 78;
  return (
    <View className="flex-1 items-center justify-center px-6">
      <BubblePop delay={0.7} style={{ alignSelf: "flex-end", marginBottom: 6 }}>
        <View className="rounded-pill bg-surface px-3 py-1.5" style={shadow.e1}>
          <Text style={{ fontFamily: font.bold, fontSize: 11.5, color: brand[700] }}>Up to 4 people</Text>
        </View>
      </BubblePop>

      <View className="flex-row items-end" style={{ gap: 6 }}>
        {FAMILY.map((name, i) => {
          const size = i === 1 ? big : small;
          return (
            <BubblePop key={name} delay={0.1 + i * 0.16} style={{ alignItems: "center" }}>
              <View style={[shadow.e2, { borderRadius: 999, borderWidth: 3, borderColor: "#fff" }]}>
                <CastAvatar svg={faces[FACE_FOR[i] ?? 0] ?? ""} size={size} />
              </View>
              <View
                className="-mt-3 rounded-pill px-2.5 py-1"
                style={[shadow.e1, { backgroundColor: i === 1 ? brand[600] : surface.base }]}
              >
                <Text
                  style={{ fontFamily: font.bold, fontSize: 11.5, color: i === 1 ? "#ffffff" : ink[700] }}
                >
                  {name}
                </Text>
              </View>
            </BubblePop>
          );
        })}
        <BubblePop delay={0.62} style={{ alignItems: "center", marginBottom: 18 }}>
          <View
            accessibilityLabel="Add another family member"
            className="items-center justify-center rounded-pill"
            style={{
              width: 44,
              height: 44,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: brand[300],
              backgroundColor: brand[50],
            }}
          >
            <Plus size={18} color={brand[600]} />
          </View>
        </BubblePop>
      </View>

      <BubblePop delay={0.9} style={{ marginTop: compact ? 14 : 20 }}>
        <View className="flex-row items-center gap-2.5 rounded-pill bg-surface py-2.5 pl-2.5 pr-4" style={shadow.e2}>
          <View className="h-8 w-8 items-center justify-center rounded-pill" style={{ backgroundColor: brand[50] }}>
            <ShieldCheck size={16} color={brand[600]} />
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[700] }}>
            <Text style={{ fontFamily: font.bold, color: ink[900] }}>Private by default.</Text> Never sold, never shared.
          </Text>
        </View>
      </BubblePop>
    </View>
  );
}

/*
 * Panel 4 — care, picked from memory.
 *
 * Top: the shelf, as four 3D icons (Microsoft's Fluent Emoji 3D set, MIT
 * licensed, licence in assets/icons3d). They are the one place in the app
 * that uses rendered 3D art: onboarding is a poster, and a poster can carry
 * richer pictures than a screen people work in every day.
 *
 * Below: what makes it different from every other booking app, shown on one
 * family member. Papa's HbA1c is DUE because his doctor asked for it every
 * three months (a note on file, not Cheeku's judgement), the follow-up is
 * with the same doctor, and the lipid profile is SKIPPED because the report
 * from three weeks ago is already in his memory. That last line is the
 * "smart choice": the test you were about to pay for twice.
 *
 * Tints are pastel and never green, amber or red (PLAN.md rule 3).
 */
const SHELF = [
  { label: "Doctors", image: stethoscope3d, tint: "#efeaff" },
  { label: "Lab tests", image: testTube3d, tint: "#e6f1fd" },
  { label: "Medicines", image: pill3d, tint: "#fdeaf0" },
  { label: "Therapy", image: brain3d, tint: "#fff1e6" },
] as const;

function SceneCare({ faces, compact }: { faces: readonly string[]; compact: boolean }) {
  // Small phones keep every idea but lose the extras: shelf labels, the home
  // collection chip and the doctor row, in that order of how little they add.
  const well = compact ? 42 : 64;
  const doctor = doctorById("d17");
  const doc = doctor ? doctorFace(doctor) : null;

  return (
    <View className="flex-1 justify-center px-6" style={{ gap: compact ? 8 : 16 }}>
      <View className="flex-row justify-between">
        {SHELF.map((s, i) => (
          <Drift key={s.label} delay={0.1 + i * 0.12} style={{ alignItems: "center", width: well + 12 }}>
            {/* The label is the accessible name whether or not it is drawn. */}
            <View
              className="items-center justify-center"
              accessible
              accessibilityLabel={s.label}
              style={[
                shadow.e1,
                { width: well, height: well, borderRadius: well * 0.34, backgroundColor: s.tint, borderWidth: 2, borderColor: "#ffffff" },
              ]}
            >
              <Image alt="" source={s.image} style={{ width: well * 0.7, height: well * 0.7 }} resizeMode="contain" />
            </View>
            {compact ? null : (
              <Text style={{ fontFamily: font.semibold, fontSize: 11.5, color: ink[700], marginTop: 6 }}>{s.label}</Text>
            )}
          </Drift>
        ))}
      </View>

      <BubblePop delay={0.65} from="left">
        <View className="rounded-[24px] bg-surface p-3.5" style={[shadow.e2, { borderWidth: 1, borderColor: surface.line, gap: compact ? 10 : 12 }]}>
          <View className="flex-row items-center gap-2.5">
            <View style={{ borderRadius: 999, borderWidth: 2, borderColor: "#fff" }}>
              <CastAvatar svg={faces[1] ?? ""} size={34} />
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: font.bold, fontSize: 14, color: ink[900] }}>For Papa</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[500] }}>Based on his records</Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-pill py-1 pl-1 pr-2.5" style={{ backgroundColor: brand[50] }}>
              <CheekuMark size={20} />
              <Text style={{ fontFamily: font.bold, fontSize: 11, color: brand[700] }}>Cheeku&apos;s picks</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="items-center justify-center" style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: "#e6f1fd" }}>
              <Image alt="" source={testTube3d} style={{ width: 30, height: 30 }} resizeMode="contain" />
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: font.bold, fontSize: 14, color: ink[900] }}>HbA1c is due this week</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>Every 3 months, as Dr. Bhat asked</Text>
              {compact ? null : (
                <View className="mt-1.5 flex-row items-center gap-1 self-start rounded-pill py-0.5 pl-1 pr-2" style={{ backgroundColor: surface.tint }}>
                  <Image alt="" source={house3d} style={{ width: 14, height: 14 }} resizeMode="contain" />
                  <Text style={{ fontFamily: font.semibold, fontSize: 11, color: ink[700] }}>Home collection, Sat 7 am</Text>
                </View>
              )}
            </View>
          </View>

          {!compact && doc ? (
            <View className="flex-row items-center gap-3">
              <View style={{ width: 44, height: 44, borderRadius: 15, overflow: "hidden" }}>
                <CastAvatar svg={doc.svg} background={doc.background} size={44} />
              </View>
              <View className="flex-1">
                <Text style={{ fontFamily: font.bold, fontSize: 14, color: ink[900] }}>Follow-up with Dr. Bhat</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>Same doctor, new report sent ahead</Text>
              </View>
            </View>
          ) : null}

          <View className="flex-row items-center gap-2.5 rounded-[16px] px-3" style={{ backgroundColor: brand[50], paddingVertical: compact ? 8 : 10 }}>
            <Lightbulb size={16} color={brand[600]} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[700] }}>
              <Text style={{ fontFamily: font.bold, color: ink[900] }}>Lipid profile skipped.</Text>
              {compact ? " Already on file." : " Done 3 weeks ago, already on file."}
            </Text>
          </View>
        </View>
      </BubblePop>
    </View>
  );
}
