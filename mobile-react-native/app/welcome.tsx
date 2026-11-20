import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInLeft, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronLeft } from "lucide-react-native";

import { CastAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MascotBust } from "@/components/illustrations/sprout";
import { CtaLabel, ReassuranceStrip } from "@/components/onboarding/chrome";
import { BubblePop, FillBar, TypingDots, useTypedReveal } from "@/components/onboarding/motion";
import { PANELS, type Panel } from "@/lib/onboarding/panels";
import { SkyWash } from "@/components/ui/sky-wash";
import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { castFaces } from "@/lib/profiles/avatar";
import { brand, hue, ink, semantic, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";
import { Tap } from "@/components/ui/tap";
import { resolveLanding } from "@/lib/auth/landing";
import { startFresh } from "@/lib/nav/start-fresh";
import { supabase } from "@/lib/supabase/client";


/*
 * The eyebrow tints, one per chapter.
 *
 * NON-SEMANTIC, like every other category colour in this app: green, amber and
 * red state how a health result reads and are never spent on decoration. These
 * come from the journey palette so the carousel and the picker that follows
 * sign-up belong to the same world.
 */
const CHAPTER: Record<Panel["kind"], { bg: string; fg: string; art: Icon3DName }> = {
  meet: { bg: PILLAR_TONE.sleep.bg, fg: PILLAR_TONE.sleep.deep, art: "chat" },
  memory: { bg: PILLAR_TONE.check.bg, fg: PILLAR_TONE.check.deep, art: "folder" },
  family: { bg: PILLAR_TONE.eat.bg, fg: PILLAR_TONE.eat.deep, art: "family" },
  care: { bg: PILLAR_TONE.mind.bg, fg: PILLAR_TONE.mind.deep, art: "doctor" },
  plan: { bg: PILLAR_TONE.move.bg, fg: PILLAR_TONE.move.deep, art: "shoe" },
};

/*
 * A2 — the value carousel, before any account exists.
 *
 * Four panels, each with its OWN composition: a conversation, a round trip
 * from paperwork to answer, a family, and the circle of care around you. Panels sharing one hero with swapped
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

  /*
   * Welcome is for people who are signed out. Anyone who reaches it with a
   * session (an old stack, a stale link) is sent where they belong instead of
   * being shown what looks like a sign-out. The session read is local; the
   * landing check only runs when there is one.
   */
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const landing = await resolveLanding();
      if (!cancelled && landing !== "/welcome") startFresh(router, landing);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

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
      <SkyWash top={0} />
      {/* Story rail. Each segment fills rather than switching on, so moving
          forward reads as progress made. Tappable, like a story. */}
      <View className="flex-row gap-1.5 px-5 pt-3">
        {PANELS.map((p, i) => (
          <Tap
            key={p.kind}
            className="flex-1 py-1.5"
            accessibilityRole="button"
            accessibilityLabel={`Go to screen ${i + 1} of ${PANELS.length}`}
            onPress={() => go(i)}
          >
            <FillBar value={i <= index ? 1 : 0} color={brand[600]} track="rgba(255,255,255,0.8)" height={5} />
          </Tap>
        ))}
      </View>

      <View className="h-12 flex-row items-center px-5">
        {index > 0 ? (
          <Tap scale={0.95}
            accessibilityRole="button"
            accessibilityLabel="Previous"
            onPress={() => go(index - 1)}
            className="h-10 w-10 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <ChevronLeft size={20} color={ink[700]} />
          </Tap>
        ) : null}
        {!isLast ? (
          <Tap
            className="ml-auto h-10 justify-center"
            hitSlop={10}
            accessibilityRole="button"
            onPress={() => router.push("/sign-in")}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>Skip</Text>
          </Tap>
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
          {panel.kind === "care" ? <SceneCare compact={compact} /> : null}
          {panel.kind === "plan" ? <ScenePlan compact={compact} /> : null}
        </View>

        <View className="px-6 pt-4">
          <View className="mb-3 flex-row items-center self-start rounded-pill" style={{ backgroundColor: chapter.bg, height: 32, paddingLeft: 4, paddingRight: 12, gap: 6 }}>
            <Icon3D name={chapter.art} size={24} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: chapter.fg }}>{panel.eyebrow}</Text>
          </View>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: compact ? 27 : 30, lineHeight: compact ? 32 : 36, letterSpacing: -0.9, color: ink[900] }}>
            {panel.lead}{"\n"}<Text style={{ color: brand[600] }}>{panel.accent}</Text>
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: ink[500], marginTop: 10 }}>{panel.body}</Text>
        </View>
      </Animated.View>

      <View className="gap-3.5 px-6 pt-5" style={{ paddingBottom: insets.bottom + 10 }}>
        <Button onPress={next}>
          <CtaLabel>{panel.cta}</CtaLabel>
        </Button>

        {index === 0 ? (
          <Tap onPress={() => router.push("/sign-in")} hitSlop={6} accessibilityRole="button">
            <Text style={[type.bodySmall, { textAlign: "center" }]}>
              Already have an account?{" "}
              <Text style={{ fontFamily: font.bold, color: brand[600] }}>Log in</Text>
            </Text>
          </Tap>
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
 * One per worry, each its own composition, built from the app's own pieces:
 * white glass cards, pastel tiles, Cheeku's 3D objects. Content is laid out in
 * flow and centred, so the scene can take whatever height the screen spares.
 *
 * EVERY ANSWER ON THESE SCREENS IS ONE CHEEKU CAN HONESTLY GIVE: explaining a
 * word, reading back what a lab printed, reminding, booking. Never "you're
 * fine" or "you have X".
 */

const WHITE = glassCard("#ffffff", "#0f1030");

function Chip({ art, tint, text, tilt = "0deg", delay }: { art: Icon3DName; tint: string; text: string; tilt?: string; delay: number }) {
  return (
    <BubblePop delay={delay}>
      <View style={[WHITE, { flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingLeft: 6, paddingRight: 14, borderRadius: 999, shadowOpacity: 0.07, transform: [{ rotate: tilt }] }]}>
        <View style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
          <Icon3D name={art} size={22} />
        </View>
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[700] }}>{text}</Text>
      </View>
    </BubblePop>
  );
}

/* 1 — the 2am search, asked here instead. */
const QUESTIONS = [
  "Fasting sugar 132. What does that mean?",
  "Papa's report has 4 values in red. Explain?",
  "What should I ask the doctor tomorrow?",
] as const;

function SceneMeet({ compact }: { compact: boolean }) {
  const asked = compact ? QUESTIONS.filter((_, i) => i !== 1) : QUESTIONS;
  const replyAt = 0.35 + asked.length * 0.5 + 0.9;
  const replied = useTypedReveal(replyAt);

  return (
    <View className="flex-1 justify-center gap-2.5 px-6">
      {asked.map((q, i) => (
        <BubblePop key={q} delay={0.25 + i * 0.5} from="right" style={{ alignSelf: "flex-end", maxWidth: "84%" }}>
          <View style={[WHITE, { borderRadius: 22, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 11, shadowOpacity: 0.06 }]}>
            <Text style={{ fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: ink[900] }}>{q}</Text>
          </View>
        </BubblePop>
      ))}

      <View className="mt-1 flex-row items-end gap-2">
        <BubblePop delay={0.1} from="left">
          <MascotBust size={compact ? 78 : 96} moment="wave" />
        </BubblePop>
        <BubblePop delay={replyAt - 0.9} from="left" style={{ flexShrink: 1, marginBottom: 10 }}>
          <View style={{ borderRadius: 22, borderBottomLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: brand[600], minWidth: 64 }}>
            {replied ? (
              <Animated.Text entering={FadeIn.duration(220)} style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: "#ffffff" }}>
                Let&apos;s go through it together. Plain words, no scary jargon.
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

/* 2 — paperwork from everywhere, then the trend the doctor asked for. */
const TSH = [
  { when: "Mar '25", value: "4.1", high: false },
  { when: "Sep '25", value: "5.3", high: true },
  { when: "Mar '26", value: "6.2", high: true },
] as const;

function SceneMemory({ compact }: { compact: boolean }) {
  return (
    <View className="flex-1 justify-center px-6">
      {/* Small screens skip the scattered paperwork and go straight to the answer. */}
      {!compact ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
          <Chip art="message" tint={PILLAR_TONE.move.bg} text="WhatsApp forward" tilt="-4deg" delay={0.15} />
          <Chip art="report" tint={PILLAR_TONE.check.bg} text="Email PDF" tilt="3deg" delay={0.3} />
          <Chip art="folder" tint={PILLAR_TONE.eat.bg} text="Almirah file" tilt="-2deg" delay={0.45} />
        </View>
      ) : null}

      <BubblePop delay={0.75} style={{ alignSelf: "center", marginVertical: compact ? 10 : 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: brand[600] }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: "#fff" }}>Saved to Mummy&apos;s file</Text>
        </View>
      </BubblePop>

      <BubblePop delay={1.05} from="left">
        <View style={[WHITE, { borderRadius: 24, padding: 16, shadowOpacity: 0.07 }]}>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>Doctor asked: Mummy&apos;s last thyroid tests?</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            {TSH.map((t) => (
              <View key={t.when} style={{ flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: "center", backgroundColor: t.high ? PILLAR_TONE.eat.bg : surface.tint }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: t.high ? PILLAR_TONE.eat.deep : ink[900] }}>{t.value}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 11, color: ink[500], marginTop: 1 }}>{t.when}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: ink[700], marginTop: 10 }}>
            TSH in mIU/L. The last two are above the range her lab printed.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 8, height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: brand[50] }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: brand[700] }}>From 3 reports, ready to show</Text>
          </View>
        </View>
      </BubblePop>
    </View>
  );
}

/* 3 — parents far away, and the nudge that closes the distance. */
const FAMILY = ["Mummy", "You", "Papa"] as const;
/** Which of `castFaces(3)` (mother, father, daughter) wears each name tag. */
const FACE_FOR = [0, 2, 1] as const;

function SceneFamily({ faces, compact }: { faces: readonly string[]; compact: boolean }) {
  const big = compact ? 80 : 94;
  const small = compact ? 64 : 74;
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="flex-row items-end" style={{ gap: 8 }}>
        {FAMILY.map((name, i) => {
          const size = i === 1 ? big : small;
          return (
            <BubblePop key={name} delay={0.1 + i * 0.16} style={{ alignItems: "center" }}>
              <View style={[shadow.e2, { borderRadius: 999, borderWidth: 3, borderColor: i === 1 ? brand[600] : "#fff" }]}>
                <CastAvatar svg={faces[FACE_FOR[i] ?? 0] ?? ""} size={size} />
              </View>
              <View className="-mt-3 rounded-pill px-2.5 py-1" style={[shadow.e1, { backgroundColor: i === 1 ? brand[600] : "#fff" }]}>
                <Text style={{ fontFamily: font.bold, fontSize: 12, color: i === 1 ? "#ffffff" : ink[700] }}>{name}</Text>
              </View>
            </BubblePop>
          );
        })}
      </View>

      <View style={{ alignSelf: "stretch", gap: 8, marginTop: compact ? 14 : 20 }}>
        <BubblePop delay={0.7} from="right">
          <View style={[glassCard(PILLAR_TONE.eat.glass), { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 20, padding: 10 }]}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Icon3D name="blister" size={28} />
            </View>
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: ink[900] }}>
              Papa&apos;s BP tablet isn&apos;t ticked yet today
            </Text>
          </View>
        </BubblePop>
        {!compact ? (
          <BubblePop delay={0.95} from="right">
            <View style={[glassCard(PILLAR_TONE.check.glass), { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 20, padding: 10 }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Icon3D name="test-tube" size={28} />
              </View>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: ink[900] }}>
                Mummy&apos;s HbA1c is due in 6 days
              </Text>
            </View>
          </BubblePop>
        ) : null}
      </View>
    </View>
  );
}

/* 4 — the doctor already knows; tests and medicines come home. */
function SceneCare({ compact }: { compact: boolean }) {
  return (
    <View className="flex-1 justify-center gap-2.5 px-6">
      <BubblePop delay={0.15}>
        <View style={[WHITE, { borderRadius: 24, padding: 14, shadowOpacity: 0.07 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: PILLAR_TONE.sleep.bg, alignItems: "center", justifyContent: "center" }}>
              <Icon3D name="doctor" size={38} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>Video call with your doctor</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>Today, 7:30 pm</Text>
            </View>
          </View>
          <BubblePop delay={0.6}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 10, borderRadius: 16, backgroundColor: PILLAR_TONE.sleep.glass }}>
              <Icon3D name="clipboard" size={24} />
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink[900] }}>Already has your note and 3 old reports</Text>
            </View>
          </BubblePop>
        </View>
      </BubblePop>

      <BubblePop delay={0.85} from="right">
        <View style={[WHITE, { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, padding: 10, shadowOpacity: 0.06 }]}>
          <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: PILLAR_TONE.check.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon3D name="test-tube" size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>Blood test at home</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>Tomorrow, 7 am · result filed for you</Text>
          </View>
        </View>
      </BubblePop>
      {!compact ? (
        <BubblePop delay={1.05} from="right">
          <View style={[WHITE, { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, padding: 10, shadowOpacity: 0.06 }]}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: PILLAR_TONE.move.bg, alignItems: "center", justifyContent: "center" }}>
              <Icon3D name="capsule" size={28} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>Medicines to your door</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>Arriving today</Text>
            </View>
          </View>
        </BubblePop>
      ) : null}
    </View>
  );
}

/* 5 — a small daily plan, from your own numbers. */
const PLAN: { art: Icon3DName; text: string; done: boolean }[] = [
  { art: "shoe", text: "10-minute walk after lunch", done: true },
  { art: "food", text: "Half plate sabzi at dinner", done: true },
  { art: "moon", text: "Lights off by 11 pm", done: false },
  { art: "test-tube", text: "HbA1c due this month", done: false },
];

function ScenePlan({ compact }: { compact: boolean }) {
  const rows = compact ? PLAN.slice(0, 3) : PLAN;
  const done = rows.filter((r) => r.done).length;
  return (
    <View className="flex-1 justify-center px-6">
      <BubblePop delay={0.1}>
        <View style={[WHITE, { borderRadius: 26, padding: compact ? 12 : 16, shadowOpacity: 0.07 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, color: ink[900] }}>Today&apos;s plan</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{done} of {rows.length} done</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingLeft: 4, paddingRight: 10, borderRadius: 999, backgroundColor: PILLAR_TONE.eat.bg }}>
              <Icon3D name="trophy" size={22} />
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: PILLAR_TONE.eat.deep }}>5-day streak</Text>
            </View>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: PILLAR_TONE.move.track, marginTop: 12, overflow: "hidden" }}>
            <View style={{ width: `${(done / rows.length) * 100}%`, height: 6, borderRadius: 3, backgroundColor: PILLAR_TONE.move.accent }} />
          </View>
          <View style={{ marginTop: 6 }}>
            {rows.map((r, i) => (
              <BubblePop key={r.text} delay={0.35 + i * 0.15} from="left">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: compact ? 4 : 8 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
                    <Icon3D name={r.art} size={28} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, color: r.done ? ink[500] : ink[900], textDecorationLine: r.done ? "line-through" : "none" }}>{r.text}</Text>
                  <View style={{ width: 24, height: 24, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: r.done ? PILLAR_TONE.move.accent : "transparent", borderWidth: r.done ? 0 : 2, borderColor: surface.line }}>
                    {r.done ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                  </View>
                </View>
              </BubblePop>
            ))}
          </View>
        </View>
      </BubblePop>
    </View>
  );
}
