import LottieView, { type AnimationObject } from "lottie-react-native";
import { useEffect, useState } from "react";
import { Image, Platform, Pressable, View, type ImageSourcePropType, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "@/components/ui/motion";

import "./wasm";

import celebrateJson from "../../../assets/mascot/celebrate.json";
import celebrateStill from "../../../assets/mascot/celebrate-still.png";
import cheerJson from "../../../assets/mascot/cheer.json";
import cheerStill from "../../../assets/mascot/cheer-still.png";
import FACE from "../../../assets/mascot/face.png";
import idleJson from "../../../assets/mascot/idle.json";
import idleStill from "../../../assets/mascot/idle-still.png";
import joyJson from "../../../assets/mascot/joy.json";
import joyStill from "../../../assets/mascot/joy-still.png";
import presentJson from "../../../assets/mascot/present.json";
import presentLoopJson from "../../../assets/mascot/present-loop.json";
import presentStill from "../../../assets/mascot/present-still.png";
import shrugJson from "../../../assets/mascot/shrug.json";
import shrugStill from "../../../assets/mascot/shrug-still.png";
import thinkJson from "../../../assets/mascot/think.json";
import thinkStill from "../../../assets/mascot/think-still.png";
import waveJson from "../../../assets/mascot/wave.json";
import waveStill from "../../../assets/mascot/wave-still.png";
import workingJson from "../../../assets/mascot/working.json";
import workingStill from "../../../assets/mascot/working-still.png";
import worriedJson from "../../../assets/mascot/worried.json";
import worriedStill from "../../../assets/mascot/worried-still.png";

/*
 * CHEEKU, ANIMATED.
 *
 * Four Lottie files from the artist, recoloured into the brand lilac
 * (scripts/recolor-mascot.mjs), and seven more cut from them
 * (scripts/mascot-variants.mjs). Eleven moments:
 *
 *   STANDING
 *   wave       waves on a loop: the welcome carousel's first hello
 *   hello      waves ONCE, then stands glancing about (idle). Home, splash
 *   idle       standing, glancing about. Calm screens, the app lock, peeks
 *   present    opens his arms with a smile, then holds them open: "here you
 *              go", "just tell me", empty states that invite an action.
 *              A new pose: shrug's arms with celebrate's face
 *   shrug      open arms, unsure face: nothing here yet, not found
 *   celebrate  jumps with sparks ONCE, then holds his arms up (cheer)
 *   cheer      arms up, held: a quieter celebration
 *
 *   AT THE DESK
 *   working    typing on the phone: reading a report, scanning
 *   think      one eyebrow up, mulling it over: deciding, "not sure who to see"
 *   worried    a worried face: something failed, the connection dropped
 *   joy        throws an arm up and laughs: filed, done, all in range
 *
 * Each canvas carries empty space around the character, and it differs per
 * file. `FRAME` is the box the character uses across the whole animation
 * (measured), so `size` is always the character's height on screen.
 *
 * STILLS. Marks under 64 px (one per chat message) and Reduce motion get a
 * transparent PNG of a good frame instead: same look, no cost.
 *
 * MOVES sit on top of the animation, as whole-body motion: `float` (a slow
 * bob), `sway` (a gentle rock from the feet), `pop` (springs in once). Any
 * Cheeku with `onPress` or `hop` hops when tapped. `flip` mirrors him to face
 * the other way, toward whatever he is presenting.
 */

export type Moment = "wave" | "hello" | "idle" | "present" | "shrug" | "celebrate" | "cheer" | "working" | "think" | "worried" | "joy";
export type Move = "none" | "float" | "sway" | "pop";

type Clip = { source: AnimationObject; still: ImageSourcePropType };
type Frame = { aspect: number; box: [number, number, number, number]; stillAspect: number };

const json = (j: unknown) => j as AnimationObject;

const CLIPS = {
  wave: { source: json(waveJson), still: waveStill },
  idle: { source: json(idleJson), still: idleStill },
  present: { source: json(presentJson), still: presentStill },
  presentLoop: { source: json(presentLoopJson), still: presentStill },
  shrug: { source: json(shrugJson), still: shrugStill },
  celebrate: { source: json(celebrateJson), still: celebrateStill },
  cheer: { source: json(cheerJson), still: cheerStill },
  working: { source: json(workingJson), still: workingStill },
  think: { source: json(thinkJson), still: thinkStill },
  worried: { source: json(worriedJson), still: worriedStill },
  joy: { source: json(joyJson), still: joyStill },
} satisfies Record<string, Clip>;
type ClipName = keyof typeof CLIPS;

const STAND = 1355 / 1526;
const DESK = 452 / 560;

/** Canvas aspect, the character's box in it (fractions), and the still's aspect. */
const FRAME: Record<Moment, Frame> = {
  wave: { aspect: STAND, box: [0.22, 0.21, 0.9, 0.85], stillAspect: 354 / 449 },
  hello: { aspect: STAND, box: [0.22, 0.21, 0.9, 0.85], stillAspect: 280 / 357 },
  idle: { aspect: STAND, box: [0.26, 0.24, 0.78, 0.84], stillAspect: 280 / 357 },
  present: { aspect: STAND, box: [0.14, 0.22, 0.9, 0.85], stillAspect: 406 / 356 },
  shrug: { aspect: STAND, box: [0.1, 0.22, 0.93, 0.85], stillAspect: 480 / 422 },
  celebrate: { aspect: STAND, box: [0.11, 0.09, 0.91, 0.85], stillAspect: 480 / 440 },
  cheer: { aspect: STAND, box: [0.14, 0.25, 0.88, 0.84], stillAspect: 363 / 354 },
  working: { aspect: DESK, box: [0.09, 0.24, 0.91, 0.97], stillAspect: 351 / 389 },
  think: { aspect: DESK, box: [0.11, 0.27, 0.88, 0.96], stillAspect: 375 / 412 },
  worried: { aspect: DESK, box: [0.11, 0.27, 0.88, 0.96], stillAspect: 375 / 414 },
  // Measured without the sparkle lines, which may spill past the box.
  joy: { aspect: DESK, box: [0.08, 0.17, 0.88, 0.96], stillAspect: 405 / 416 },
};

/** What plays: some moments play an opening once, then settle into a loop. */
const PLAY: Record<Moment, { intro?: ClipName; loop: ClipName; still: ClipName }> = {
  wave: { loop: "wave", still: "wave" },
  hello: { intro: "wave", loop: "idle", still: "idle" },
  idle: { loop: "idle", still: "idle" },
  present: { intro: "present", loop: "presentLoop", still: "present" },
  shrug: { loop: "shrug", still: "shrug" },
  celebrate: { intro: "celebrate", loop: "cheer", still: "celebrate" },
  cheer: { loop: "cheer", still: "cheer" },
  working: { loop: "working", still: "working" },
  think: { loop: "think", still: "think" },
  worried: { loop: "worried", still: "worried" },
  joy: { loop: "joy", still: "joy" },
};

export type CheekuProps = {
  moment?: Moment;
  /** The character's height on screen, in points. */
  size?: number;
  /** Run the animation (default) or show the still frame. */
  animate?: boolean;
  loop?: boolean;
  speed?: number;
  move?: Move;
  /** Mirror him to face the other way. */
  flip?: boolean;
  /** Hop when tapped, even with nothing else to do on tap. */
  hop?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Cheeku({
  moment = "wave",
  size = 160,
  animate = true,
  loop = true,
  speed = 1,
  move = "none",
  flip = false,
  hop = false,
  onPress,
  style,
  accessibilityLabel = "Cheeku",
}: CheekuProps) {
  const still = useReducedMotion();
  // A tap makes him react for a moment (the game in it): cheers if standing,
  // laughs if at the desk. The layout stays the base moment's, so he does not
  // jump; both families share a canvas, so the reaction lines up.
  const [reaction, setReaction] = useState<Moment | null>(null);
  const shown = reaction ?? moment;
  const plan = PLAY[shown];
  const f = FRAME[moment];
  const [x1, y1, x2, y2] = f.box;
  const canvasH = size / (y2 - y1);
  const canvasW = canvasH * f.aspect;
  const boxW = (x2 - x1) * canvasW;

  // Opening first (if any), then the loop. Resets when the moment changes.
  const [phase, setPhase] = useState<"intro" | "loop">(plan.intro ? "intro" : "loop");
  useEffect(() => setPhase(PLAY[shown].intro ? "intro" : "loop"), [shown]);
  useEffect(() => {
    if (!reaction) return;
    const t = setTimeout(() => setReaction(null), 2600);
    return () => clearTimeout(t);
  }, [reaction]);
  const react = () => setReaction(reactionFor(moment));
  const clip = CLIPS[phase === "intro" && plan.intro ? plan.intro : plan.loop];

  const body =
    still || !animate ? (
      <Image
        alt=""
        source={CLIPS[plan.still].still}
        style={{ width: Math.min(boxW, size * f.stillAspect), height: size, alignSelf: "center" }}
        resizeMode="contain"
      />
    ) : (
      <View style={{ position: "absolute", left: -x1 * canvasW, top: -y1 * canvasH, width: canvasW, height: canvasH }} pointerEvents="none">
        <LottieView
          key={`${shown}-${phase}`}
          source={clip.source}
          autoPlay
          loop={phase === "loop" ? loop : false}
          speed={speed}
          onAnimationFinish={() => {
            if (phase === "intro") setPhase("loop");
          }}
          style={{ width: canvasW, height: canvasH }}
          webStyle={{ width: canvasW, height: canvasH }}
          resizeMode="contain"
          // Android: hardware rendering keeps several on screen smooth.
          renderMode={Platform.OS === "android" ? "HARDWARE" : "AUTOMATIC"}
        />
      </View>
    );

  const box = (
    <View
      style={[{ width: boxW, height: size, overflow: "visible", alignItems: "center", justifyContent: "flex-end", transform: flip ? [{ scaleX: -1 }] : undefined }, style]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {body}
    </View>
  );

  return (
    <Moves move={still ? "none" : move} hop={!still && (hop || Boolean(onPress))} onPress={onPress} onTap={react} label={accessibilityLabel}>
      {box}
    </Moves>
  );
}

/** Whole-body motion on top of the animation, and the hop on tap. */
const DESK_MOMENTS: readonly Moment[] = ["working", "think", "worried", "joy"];

/** What he does when tapped: same family as the moment, so it lines up. */
function reactionFor(m: Moment): Moment {
  if (DESK_MOMENTS.includes(m)) return m === "joy" ? "think" : "joy";
  return m === "cheer" || m === "celebrate" ? "present" : "cheer";
}

function Moves({ move, hop, onPress, onTap, label, children }: { move: Move; hop: boolean; onPress?: () => void; onTap?: () => void; label: string; children: React.ReactNode }) {
  const t = useSharedValue(0);
  const enter = useSharedValue(move === "pop" ? 0 : 1);
  const jump = useSharedValue(0);

  useEffect(() => {
    if (move === "float" || move === "sway") {
      // Three slow cycles, then he rests. Endless slow oscillation on a screen
      // seen every day turns into noise, and a 0.2 Hz loop is the band
      // motion-sensitive people find hardest (UI audit, October 2026).
      t.value = withRepeat(withTiming(1, { duration: move === "float" ? 2400 : 3000, easing: Easing.inOut(Easing.sin) }), 6, true);
    }
    if (move === "pop") enter.value = withDelay(120, withSpring(1, { damping: 11, stiffness: 140 }));
  }, [move, t, enter]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0, 0.3], [0, 1], "clamp"),
    transform: [
      { translateY: (move === "float" ? -6 * t.value : 0) - 14 * jump.value },
      { rotate: move === "sway" ? `${interpolate(t.value, [0, 1], [-2.5, 2.5])}deg` : "0deg" },
      { scale: interpolate(enter.value, [0, 1], [0.6, 1]) },
      { scaleY: 1 + 0.04 * jump.value },
      { scaleX: 1 - 0.03 * jump.value },
    ],
  }));

  const content = <Animated.View style={[{ transformOrigin: "center bottom" }, style]}>{children}</Animated.View>;
  if (!hop) return content;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "image"}
      accessibilityLabel={label}
      onPress={() => {
        jump.value = withSequence(withSpring(1, { damping: 7, stiffness: 320 }), withSpring(0, { damping: 9, stiffness: 180 }));
        onTap?.();
        onPress?.();
      }}
    >
      {content}
    </Pressable>
  );
}

/**
 * The square mark for avatars and speech bubbles. Under 64 px it is his face
 * (there can be one per chat message, and a Lottie each would be wasteful),
 * but never a frozen one: it breathes and glances about, ponders with a slow
 * tilt when he is thinking, and bounces when he is pleased. From 64 px up it
 * is the whole animated character fitted into the square.
 */
export function CheekuMark({ size = 40, moment = "wave", animate, move }: { size?: number; moment?: Moment; animate?: boolean; move?: Move }) {
  const reduced = useReducedMotion();
  if (size < 64) return <FaceMark size={size} moment={moment} still={reduced || animate === false} />;
  if (reduced || animate === false) {
    return (
      <Image
        alt="Cheeku"
        source={CLIPS[PLAY[moment].still].still}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Cheeku"
      />
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", overflow: "visible" }}>
      <Cheeku moment={moment} size={size * 0.94} move={move} />
    </View>
  );
}

let markCount = 0;

/** The face, alive. Each one starts at its own offset so a column of them never moves in step. */
function FaceMark({ size, moment, still }: { size: number; moment: Moment; still: boolean }) {
  const kind = DESK_MOMENTS.includes(moment) && moment !== "joy" ? "ponder" : moment === "joy" || moment === "cheer" || moment === "celebrate" ? "bounce" : "alive";
  const [offset] = useState(() => (markCount++ % 5) * 380);
  const breath = useSharedValue(0);
  const look = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    if (kind === "bounce") {
      breath.value = withDelay(offset / 3, withRepeat(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }), 6, true));
      return;
    }
    // A few breaths on arrival, then still (even count: ends at rest).
    breath.value = withDelay(offset, withRepeat(withTiming(1, { duration: kind === "ponder" ? 1700 : 2600, easing: Easing.inOut(Easing.sin) }), 6, true));
    if (kind === "alive") {
      // Every few seconds: a quick glance to one side and back.
      look.value = withDelay(
        1800 + offset,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
            withDelay(700, withTiming(-0.6, { duration: 300 })),
            withDelay(400, withTiming(0, { duration: 240 })),
            withDelay(3600, withTiming(0, { duration: 1 })),
          ),
          2,
          false,
        ),
      );
    }
  }, [still, kind, offset, breath, look]);

  const style = useAnimatedStyle(() => {
    if (kind === "bounce") {
      return { transform: [{ translateY: -size * 0.1 * breath.value }, { scaleY: 1 - 0.04 * (1 - breath.value) }] };
    }
    if (kind === "ponder") {
      return { transform: [{ rotate: `${interpolate(breath.value, [0, 1], [-7, 7])}deg` }, { translateY: -size * 0.03 * breath.value }] };
    }
    return {
      transform: [
        { scale: 1 + 0.05 * breath.value },
        { rotate: `${look.value * 8}deg` },
        { translateX: look.value * size * 0.04 },
      ],
    };
  });

  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: "center bottom" }, style]} accessibilityRole="image" accessibilityLabel="Cheeku">
      <Image alt="" source={FACE} style={{ width: size, height: size }} resizeMode="contain" />
    </Animated.View>
  );
}

/**
 * CHEEKU PEEKS. Head and shoulders rise over an edge, look about for a few
 * seconds, and duck back down, every so often. Sits on top of a card's edge
 * (position it with `style`); the card does not move. Reduce motion leaves him
 * up, still.
 */
export function CheekuPeek({ size = 76, moment = "idle", every = 7000, style }: { size?: number; moment?: Moment; every?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const f = FRAME[moment];
  const boxW = ((f.box[2] - f.box[0]) / (f.box[3] - f.box[1])) * f.aspect * size;
  const show = size * 0.56;
  const up = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      up.value = 1;
      return;
    }
    const rise = withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.6)) });
    // Exits ease out too: ease-in delays the moment the eye is on.
    const sink = withTiming(0, { duration: 300, easing: Easing.bezier(0.23, 1, 0.32, 1) });
    // Peeks twice, then stays put.
    up.value = withDelay(900, withRepeat(withSequence(rise, withDelay(3200, sink), withDelay(Math.max(1200, every - 4020), withTiming(0, { duration: 1 }))), 2, false));
  }, [reduced, every, up]);

  const rising = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(up.value, [0, 1], [show + 6, 0]) }] }));

  return (
    <View pointerEvents="none" style={[{ width: boxW, height: show, overflow: "hidden" }, style]}>
      <Animated.View style={[{ position: "absolute", top: 0, left: 0 }, rising]}>
        <Cheeku moment={moment} size={size} animate={!reduced} />
      </Animated.View>
    </View>
  );
}
