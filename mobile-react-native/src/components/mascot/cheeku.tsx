import { createContext, useContext, useEffect, useId, useMemo } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
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
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { useReducedMotion } from "@/components/ui/motion";

/*
 * CHEEKU, THE CHIKOO PEBBLE. The finalised mascot from the Mascot Playbook:
 * a soft, sapodilla-coloured pebble with a purple sprout, big glossy eyes,
 * blush cheeks, tiny arms and feet. Warm, friendly, reassuring, intelligent.
 *
 * ┌─ HOW IT LOOKS 3D WITHOUT IMAGES ─────────────────────────────────────────┐
 * │                                                                          │
 * │ Clay-style shading in plain SVG, so it stays crisp at 28px and at 200px  │
 * │ and costs no bundle weight: a key light from the top left (radial base), │
 * │ ambient occlusion pooling at the bottom, a cool rim light on the right,  │
 * │ a soft specular, and a sprinkle of darker and lighter specks for the     │
 * │ fine clay texture. Eyes are glossy with two catchlights. Every part has  │
 * │ its own gradient so arms and feet sit in the same light as the body.     │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * HOW IT MOVES. The character is a small rig of stacked layers, each its own
 * <Svg> in the same 200×200 box, wrapped in Animated.Views that turn around
 * real pivots (shoulder, stem base, eye line). Everything runs on the UI
 * thread. The six motion styles from the playbook:
 *
 *   idle      soft bob + breathing + blinks + sprout sway (natural idle)
 *   bounce    gentle bounce with a little squash at the bottom
 *   hop       a tiny hop every few seconds (playful moments)
 *   wave      micro-wave of one arm (quick and friendly)
 *   breathe   slow breathing only (calm and grounded, sleepy)
 *   none      still (lists, avatars in every message)
 *
 * Tapping an interactive Cheeku gets a reaction: a hop, a cheek lift, and a
 * sprout wiggle. With "Reduce motion" on, it is a still, finished drawing.
 *
 * WHICH ONE WHERE (see `MOOD_FOR` in sprout.tsx for the map): wave + happy to
 * greet, thinking while reading a report or typing, listening on help and
 * permission asks, holding a heart when something is booked or bought,
 * sleepy curl when the inbox is empty, with a report while a scan is read.
 */

export type Mood = "happy" | "calm" | "curious" | "reassuring" | "thinking" | "sleepy";
export type Pose = "stand" | "wave" | "sit" | "heart" | "listen" | "curl" | "phone";
export type Motion = "idle" | "bounce" | "hop" | "wave" | "breathe" | "none";

export const PALETTE = {
  bodyLight: "#FCE7D6",
  bodyBase: "#F7D7C4",
  bodyShadow: "#EDC2A3",
  bodyDeep: "#D69E78",
  blush: "#FFB3C1",
  eye: "#1F1B2E",
  sprout: "#A78BFA",
  sproutDeep: "#7C5CEB",
  lilac: "#C4B5FD",
  lavender: "#EDE9FE",
  navy: "#0F0B2D",
  stem: "#7A4A2B",
} as const;

// ------------------------------------------------------------------ ids --

/*
 * Per-instance gradient ids. On web every SVG shares the document's id space,
 * and Expo Router keeps hidden screens mounted, so two mascots with the same
 * ids would paint with each other's gradients. One prefix per character.
 */
const Ids = createContext("ck");
function useU() {
  const p = useContext(Ids);
  return (name: string) => `${p}-${name}`;
}

// ------------------------------------------------------------- geometry --

const BODY = "M100 60 C135 60 161 85 162 117 C163 149 139 173 100 173 C61 173 37 149 38 117 C39 85 65 60 100 60 Z";

/** Clay specks: fixed, so the texture never shimmers between renders. */
const SPECKS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd());
    const x = 100 + Math.cos(a) * r * 54;
    const y = 117 + Math.sin(a) * r * 48;
    out.push([x, y, 0.6 + rnd() * 0.8, rnd() < 0.7 ? 0 : 1]);
  }
  return out;
})();

// -------------------------------------------------------------- layers --

function Layer({ children }: { children: React.ReactNode }) {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 200 200">
      {children}
    </Svg>
  );
}

function ClayGradient({ id, cx = "36%", cy = "30%" }: { id: string; cx?: string; cy?: string }) {
  return (
    <RadialGradient id={id} cx={cx} cy={cy} rx="78%" ry="78%" fx={cx} fy={cy}>
      <Stop offset="0" stopColor={PALETTE.bodyLight} />
      <Stop offset="0.42" stopColor={PALETTE.bodyBase} />
      <Stop offset="0.78" stopColor={PALETTE.bodyShadow} />
      <Stop offset="1" stopColor={PALETTE.bodyDeep} />
    </RadialGradient>
  );
}

function ShadowLayer() {
  const u = useU();
  return (
    <Layer>
      <Defs>
        <RadialGradient id={u("ground")} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#2f2578" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#2f2578" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="100" cy="184" rx="56" ry="9" fill={`url(#${u("ground")})`} />
    </Layer>
  );
}

function Feet({ pose }: { pose: Pose }) {
  const u = useU();
  if (pose === "curl") return null;
  const sit = pose === "sit";
  return (
    <Layer>
      <Defs>
        <ClayGradient id={u("foot")} cx="40%" cy="20%" />
      </Defs>
      <Ellipse cx={sit ? 76 : 78} cy={sit ? 172 : 170} rx={sit ? 20 : 17} ry={sit ? 11 : 10} fill={`url(#${u("foot")})`} />
      <Ellipse cx={sit ? 124 : 122} cy={sit ? 172 : 170} rx={sit ? 20 : 17} ry={sit ? 11 : 10} fill={`url(#${u("foot")})`} />
    </Layer>
  );
}

/** One arm, drawn at rest beside the body; the rig turns it around the shoulder. */
function Arm({ side, front = false, raised = false }: { side: "left" | "right"; front?: boolean; raised?: boolean }) {
  const u = useU();
  if (raised) {
    // Up beside the head, clear of the body, so a wave reads at any size.
    const rx = side === "left" ? 30 : 170;
    return (
      <Layer>
        <Defs>
          <ClayGradient id={u(`armup${side}`)} cx="40%" cy="25%" />
        </Defs>
        <Ellipse cx={rx} cy="88" rx="14" ry="20" fill={`url(#${u(`armup${side}`)})`} transform={`rotate(${side === "left" ? -32 : 32} ${rx} 88)`} />
      </Layer>
    );
  }
  const x = side === "left" ? 37 : 163;
  const rot = side === "left" ? 28 : -28;
  return (
    <Layer>
      <Defs>
        <ClayGradient id={u(`arm${side}`)} cx={side === "left" ? "30%" : "45%"} cy="25%" />
      </Defs>
      <Ellipse cx={front ? (side === "left" ? 70 : 130) : x} cy={front ? 150 : 126} rx="15" ry="19.5" fill={`url(#${u(`arm${side}`)})`} transform={`rotate(${front ? (side === "left" ? -40 : 40) : rot} ${front ? (side === "left" ? 70 : 130) : x} ${front ? 150 : 126})`} />
    </Layer>
  );
}

function Body({ glow }: { glow: boolean }) {
  const u = useU();
  return (
    <Layer>
      <Defs>
        <ClayGradient id={u("body")} />
        <LinearGradient id={u("ao")} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.55" stopColor="#8a4f2a" stopOpacity="0" />
          <Stop offset="1" stopColor="#8a4f2a" stopOpacity="0.28" />
        </LinearGradient>
        <RadialGradient id={u("rim")} cx="96%" cy="62%" rx="34%" ry="44%">
          <Stop offset="0" stopColor="#e9e2ff" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#e9e2ff" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={u("spec")} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={u("core")} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#fff2f7" stopOpacity="0.7" />
          <Stop offset="0.5" stopColor="#ff9ec4" stopOpacity="0.32" />
          <Stop offset="1" stopColor="#ff9ec4" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Path d={BODY} fill={`url(#${u("body")})`} />
      <Path d={BODY} fill={`url(#${u("ao")})`} />
      <Path d={BODY} fill={`url(#${u("rim")})`} />
      <G>
        {SPECKS.map(([x, y, r, light], i) => (
          <Circle key={i} cx={x} cy={y} r={r} fill={light ? "#ffffff" : "#a8683f"} opacity={light ? 0.35 : 0.16} />
        ))}
      </G>
      <Ellipse cx="74" cy="82" rx="24" ry="13" fill={`url(#${u("spec")})`} transform="rotate(-28 74 82)" />
      {glow ? <Ellipse cx="100" cy="150" rx="22" ry="18" fill={`url(#${u("core")})`} /> : null}
    </Layer>
  );
}

function Blush() {
  const u = useU();
  return (
    <Layer>
      <Defs>
        <RadialGradient id={u("blush")} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={PALETTE.blush} stopOpacity="0.95" />
          <Stop offset="1" stopColor={PALETTE.blush} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="58" cy="133" rx="15" ry="9" fill={`url(#${u("blush")})`} />
      <Ellipse cx="142" cy="133" rx="15" ry="9" fill={`url(#${u("blush")})`} />
    </Layer>
  );
}

function OpenEye({ cx, cy, look }: { cx: number; cy: number; look: [number, number] }) {
  const u = useU();
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx="13" ry="15.5" fill={`url(#${u("iris")})`} />
      <Circle cx={cx + 4 + look[0]} cy={cy - 5.5 + look[1]} r="5.2" fill="#fff" />
      <Circle cx={cx - 4.5 + look[0]} cy={cy + 6 + look[1]} r="2.2" fill="#fff" opacity="0.9" />
    </G>
  );
}

const CLOSED_HAPPY = (cx: number, cy: number) => `M${cx - 11} ${cy + 3} Q${cx} ${cy - 9} ${cx + 11} ${cy + 3}`;
const CLOSED_SLEEPY = (cx: number, cy: number) => `M${cx - 11} ${cy - 1} Q${cx} ${cy + 9} ${cx + 11} ${cy - 1}`;

/** The eyes on their own layer, so a blink can squash just them. */
function Eyes({ mood }: { mood: Mood }) {
  const u = useU();
  const stroke = { stroke: PALETTE.eye, strokeWidth: 4, strokeLinecap: "round" as const, fill: "none" };
  const look: [number, number] = mood === "thinking" ? [-2.5, -3] : mood === "curious" ? [1.5, -1] : [0, 0];
  return (
    <Layer>
      <Defs>
        <RadialGradient id={u("iris")} cx="40%" cy="35%" rx="70%" ry="70%">
          <Stop offset="0" stopColor="#4a4466" />
          <Stop offset="0.6" stopColor={PALETTE.eye} />
          <Stop offset="1" stopColor="#0d0a1a" />
        </RadialGradient>
      </Defs>
      {mood === "calm" ? (
        <>
          <Path d={CLOSED_HAPPY(76, 111)} {...stroke} />
          <Path d={CLOSED_HAPPY(124, 111)} {...stroke} />
        </>
      ) : mood === "sleepy" ? (
        <>
          <Path d={CLOSED_SLEEPY(76, 113)} {...stroke} />
          <Path d={CLOSED_SLEEPY(124, 113)} {...stroke} />
        </>
      ) : mood === "reassuring" ? (
        <>
          <Path d={CLOSED_HAPPY(76, 111)} {...stroke} />
          <OpenEye cx={124} cy={110} look={look} />
        </>
      ) : (
        <>
          <OpenEye cx={76} cy={mood === "curious" ? 109 : 110} look={look} />
          <OpenEye cx={124} cy={mood === "curious" ? 108 : 110} look={look} />
        </>
      )}
    </Layer>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  const line = { stroke: "#3a1f2b", strokeWidth: 3.2, strokeLinecap: "round" as const, fill: "none" };
  return (
    <Layer>
      {mood === "happy" ? (
        <G>
          <Path d="M85 129 C87 146 113 146 115 129 C106 132.5 94 132.5 85 129 Z" fill="#3a1f2b" />
          <Ellipse cx="100" cy="139.5" rx="7.5" ry="4" fill="#ff8fa3" />
        </G>
      ) : mood === "reassuring" ? (
        <G>
          <Path d="M89 128 C92 139 108 139 111 128 C104 130.5 96 130.5 89 128 Z" fill="#3a1f2b" />
          <Ellipse cx="100" cy="134.5" rx="4.6" ry="2.4" fill="#ff8fa3" />
        </G>
      ) : mood === "curious" ? (
        <Ellipse cx="101" cy="133" rx="4.4" ry="5.2" fill="#3a1f2b" />
      ) : mood === "thinking" ? (
        <Path d="M93 134 Q101 130.5 109 133.5" {...line} />
      ) : mood === "sleepy" ? (
        <Ellipse cx="100" cy="134" rx="3.4" ry="2.4" fill="#3a1f2b" />
      ) : (
        <Path d="M91 130 Q100 138 109 130" {...line} />
      )}
    </Layer>
  );
}

function Sprout() {
  const u = useU();
  return (
    <Layer>
      <Defs>
        <LinearGradient id={u("leaf")} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={PALETTE.sproutDeep} />
          <Stop offset="0.6" stopColor={PALETTE.sprout} />
          <Stop offset="1" stopColor={PALETTE.lilac} />
        </LinearGradient>
      </Defs>
      <Path d="M100 63 C99 55 101 49 106 44" stroke={PALETTE.stem} strokeWidth="5" strokeLinecap="round" fill="none" />
      <Path d="M105 45 C108 27 130 15 152 18 C148 37 128 51 105 45 Z" fill={`url(#${u("leaf")})`} />
      <Path d="M107 44 C120 35 133 27 147 21" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <Ellipse cx="128" cy="26" rx="8" ry="3" fill="#ffffff" opacity="0.28" transform="rotate(-24 128 26)" />
    </Layer>
  );
}

function HeldHeart() {
  const u = useU();
  return (
    <Layer>
      <Defs>
        <RadialGradient id={u("heart")} cx="38%" cy="30%" rx="75%" ry="75%">
          <Stop offset="0" stopColor="#ffe3ee" />
          <Stop offset="0.5" stopColor="#ffa9c8" />
          <Stop offset="1" stopColor="#ff7fae" />
        </RadialGradient>
        <RadialGradient id={u("hglow")} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#ffb6d2" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#ffb6d2" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="100" cy="150" rx="48" ry="38" fill={`url(#${u("hglow")})`} />
      <G transform="translate(100 148) scale(1.3) translate(-100 -148)">
      <Path d="M100 172 C80 160 74 148 74 139 C74 130 81 124 88 124 C94 124 98 128 100 132 C102 128 106 124 112 124 C119 124 126 130 126 139 C126 148 120 160 100 172 Z" fill={`url(#${u("heart")})`} />
      <Ellipse cx="86" cy="133" rx="5" ry="3.2" fill="#fff" opacity="0.7" transform="rotate(-30 86 133)" />
      </G>
    </Layer>
  );
}

function Phone() {
  return (
    <Layer>
      <G transform="rotate(-14 140 124)">
        <Rect x="124" y="98" width="34" height="52" rx="7" fill={PALETTE.sproutDeep} />
        <Rect x="127.5" y="102" width="27" height="42" rx="4.5" fill={PALETTE.lavender} />
        <Rect x="131" y="108" width="18" height="3" rx="1.5" fill={PALETTE.sprout} />
        <Rect x="131" y="115" width="14" height="3" rx="1.5" fill={PALETTE.lilac} />
        <Rect x="131" y="122" width="16" height="3" rx="1.5" fill={PALETTE.lilac} />
        <Path d="M131 136 L136 131 L140 134 L147 127" stroke={PALETTE.sproutDeep} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>
    </Layer>
  );
}

// ------------------------------------------------------------------ fx --

/** Floating extras: hearts, zzz, a question mark, motion lines. Text-free SVG, or tiny text. */
function Fx({ kind, t, size }: { kind: "hearts" | "zzz" | "question" | "lines" | "sound" | null; t: SharedValue<number>; size: number }) {
  const a = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]), transform: [{ translateY: interpolate(t.value, [0, 1], [6, -14]) }] }));
  const b = useAnimatedStyle(() => {
    const v = (t.value + 0.5) % 1;
    return { opacity: interpolate(v, [0, 0.2, 0.8, 1], [0, 1, 1, 0]), transform: [{ translateY: interpolate(v, [0, 1], [6, -14]) }] };
  });
  const pulse = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 0.5, 1], [0.35, 1, 0.35]) }));
  if (!kind || size < 56) return null;
  const s = size / 200;
  if (kind === "zzz") {
    return (
      <>
        <Animated.Text style={[{ position: "absolute", left: 140 * s, top: 34 * s, fontSize: 22 * s, fontWeight: "800", color: PALETTE.sprout }, a]}>z</Animated.Text>
        <Animated.Text style={[{ position: "absolute", left: 160 * s, top: 18 * s, fontSize: 28 * s, fontWeight: "800", color: PALETTE.sproutDeep }, b]}>z</Animated.Text>
      </>
    );
  }
  if (kind === "question") {
    return <Animated.Text style={[{ position: "absolute", left: 48 * s, top: 18 * s, fontSize: 34 * s, fontWeight: "800", color: PALETTE.sprout }, pulse]}>?</Animated.Text>;
  }
  if (kind === "hearts") {
    return (
      <>
        <Animated.View style={[{ position: "absolute", left: 34 * s, top: 46 * s }, a]}>
          <MiniHeart size={20 * s} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 150 * s, top: 70 * s }, b]}>
          <MiniHeart size={14 * s} />
        </Animated.View>
      </>
    );
  }
  // Short strokes beside the head: excitement ("lines") or listening ("sound").
  const lines = kind === "lines" ? [[34, 58, -40], [26, 76, -70], [44, 44, -15]] : [[168, 96, 20], [176, 112, 0], [168, 128, -20]];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, pulse]} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 200 200">
        {lines.map(([x, y, r], i) => (
          <Path key={i} d={`M${x} ${y} l0 -10`} stroke={PALETTE.sprout} strokeWidth="4" strokeLinecap="round" transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </Svg>
    </Animated.View>
  );
}

function MiniHeart({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21 C5 16 2 12.5 2 8.6 C2 5.6 4.4 3.5 7 3.5 C9.1 3.5 10.8 4.7 12 6.4 C13.2 4.7 14.9 3.5 17 3.5 C19.6 3.5 22 5.6 22 8.6 C22 12.5 19 16 12 21 Z" fill="#ff9ec4" />
    </Svg>
  );
}

// ----------------------------------------------------------------- rig --

const ease = Easing.inOut(Easing.sin);

export type CheekuProps = {
  size?: number;
  mood?: Mood;
  pose?: Pose;
  motion?: Motion;
  /** A soft pink glow in the chest: "subtle glowing core" from the playbook. */
  glow?: boolean;
  /** Tap for a reaction (hop, cheek lift, sprout wiggle). */
  interactive?: boolean;
  onPress?: () => void;
  /** Hide floating extras (hearts, zzz) when space is tight. */
  quiet?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Cheeku({
  size = 160,
  mood = "happy",
  pose = "stand",
  motion = "idle",
  glow = false,
  interactive = false,
  onPress,
  quiet = false,
  style,
  accessibilityLabel = "Cheeku",
}: CheekuProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const still = useReducedMotion();
  const m: Motion = still ? "none" : motion;

  const bob = useSharedValue(0);
  const breath = useSharedValue(0);
  const blink = useSharedValue(0);
  const sway = useSharedValue(0);
  const wave = useSharedValue(0);
  const hop = useSharedValue(0);
  const react = useSharedValue(0);
  const fx = useSharedValue(0);

  const eyesOpen = mood !== "calm" && mood !== "sleepy";

  useEffect(() => {
    if (m === "none") return;
    const slow = m === "breathe" || pose === "curl" || mood === "sleepy";
    breath.value = withRepeat(withTiming(1, { duration: slow ? 3600 : 2600, easing: ease }), -1, true);
    sway.value = withRepeat(withTiming(1, { duration: slow ? 4200 : 3000, easing: ease }), -1, true);
    fx.value = withRepeat(withTiming(1, { duration: slow ? 3200 : 2400, easing: Easing.linear }), -1, false);
    if (!slow) bob.value = withRepeat(withTiming(1, { duration: m === "bounce" ? 900 : 1700, easing: ease }), -1, true);
    if (eyesOpen) blink.value = withRepeat(withSequence(withDelay(2600 + Math.random() * 1600, withTiming(1, { duration: 80 })), withTiming(0, { duration: 130 })), -1, false);
    if (m === "wave" || pose === "wave") wave.value = withRepeat(withSequence(withTiming(1, { duration: 260, easing: ease }), withTiming(0, { duration: 260, easing: ease })), -1, false);
    if (m === "hop") hop.value = withRepeat(withSequence(withDelay(1900, withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) })), withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })), -1, false);
  }, [m, pose, mood, eyesOpen, bob, breath, blink, sway, wave, hop, fx]);

  const k = size / 200;

  // The whole character: bob, breathing, hop, and the tap reaction.
  const rig = useAnimatedStyle(() => {
    const lift = (m === "bounce" ? 9 : 4) * bob.value + 15 * hop.value + 10 * react.value;
    const squash = m === "bounce" ? interpolate(bob.value, [0, 0.12, 1], [0.05, 0, 0]) : interpolate(hop.value, [0, 0.1, 1], [0.04, 0, 0]);
    const b = 0.018 * breath.value;
    return {
      transform: [
        { translateY: -lift * k },
        { scaleX: 1 + b * 0.6 + squash + 0.04 * react.value },
        { scaleY: 1 + b - squash + 0.04 * react.value },
      ],
    };
  });
  const shadow = useAnimatedStyle(() => {
    const up = 0.5 * bob.value + hop.value + react.value * 0.8;
    return { opacity: 1 - up * 0.35, transform: [{ scaleX: 1 - up * 0.18 }] };
  });
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - 0.88 * blink.value }] }));
  const sprout = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(sway.value, [0, 1], [-5, 6]) + 18 * react.value}deg` }] }));
  const blush = useAnimatedStyle(() => ({ opacity: 0.85 + 0.15 * breath.value, transform: [{ translateY: -3 * react.value * k }, { scale: 1 + 0.12 * react.value }] }));
  const waveArm = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(wave.value, [0, 1], [-16, 16])}deg` }] }));
  const restArm = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(breath.value, [0, 1], [-3, 3])}deg` }] }));

  const ctx = useMemo(() => `ck${id}`, [id]);

  const body =
    pose === "curl"
      ? { transform: [{ translateY: 18 * k }, { scaleX: 1.2 }, { scaleY: 0.8 }] }
      : pose === "listen"
        ? { transform: [{ rotate: "-7deg" }] }
        : pose === "sit"
          ? { transform: [{ translateY: 4 * k }] }
          : null;

  const fxKind = quiet
    ? null
    : pose === "heart" || mood === "reassuring"
      ? "hearts"
      : mood === "sleepy" || pose === "curl"
        ? "zzz"
        : mood === "curious"
          ? "question"
          : pose === "listen"
            ? "sound"
            : pose === "wave" || mood === "happy"
              ? "lines"
              : null;

  const leftUp = pose === "wave";
  const rightUp = pose === "listen";
  const heldFront = pose === "heart";
  const tuckArms = pose === "curl";

  const content = (
    <View style={[{ width: size, height: size }, style]} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Ids.Provider value={ctx}>
        <Animated.View style={[StyleSheet.absoluteFill, shadow]}>
          <ShadowLayer />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: "50% 92%" }, rig]}>
          <View style={[StyleSheet.absoluteFill, body]}>
            <Feet pose={pose} />
            {!tuckArms && !heldFront ? (
              <>
                <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: leftUp ? "22% 52%" : "24% 58%" }, leftUp ? waveArm : restArm]}>
                  <Arm side="left" raised={leftUp} />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: rightUp ? "78% 52%" : "76% 58%" }, rightUp ? waveArm : restArm]}>
                  <Arm side="right" raised={rightUp} />
                </Animated.View>
              </>
            ) : null}
            <Body glow={glow} />
            <Animated.View style={[StyleSheet.absoluteFill, blush]}>
              <Blush />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: "50% 56%" }, eyesOpen ? eyes : null]}>
              <Eyes mood={pose === "curl" ? "sleepy" : mood} />
            </Animated.View>
            <Mouth mood={pose === "curl" ? "sleepy" : mood} />
            <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: "50% 31%" }, sprout]}>
              <Sprout />
            </Animated.View>
            {heldFront ? (
              <>
                <HeldHeart />
                <Arm side="left" front />
                <Arm side="right" front />
              </>
            ) : null}
            {pose === "phone" ? <Phone /> : null}
          </View>
        </Animated.View>
        <Fx kind={fxKind} t={fx} size={size} />
      </Ids.Provider>
    </View>
  );

  if (!interactive && !onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        if (!still) react.value = withSequence(withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 6, stiffness: 140 }));
        onPress?.();
      }}
    >
      {content}
    </Pressable>
  );
}

/**
 * Head-and-shoulders framing for avatars and small corners: the same
 * character, cropped to the pebble and sprout, without feet or the ground.
 */
export function CheekuBust({ size = 64, ...rest }: CheekuProps) {
  // Crop the 200 box to x 18..182, y 10..174: the pebble, arms and sprout.
  const inner = (size * 200) / 164;
  return (
    <View style={{ width: size, height: size, overflow: "hidden" }} pointerEvents={rest.interactive || rest.onPress ? "auto" : "none"}>
      <View style={{ position: "absolute", left: (-18 * inner) / 200, top: (-10 * inner) / 200 }}>
        <Cheeku size={inner} quiet={size < 72} {...rest} />
      </View>
    </View>
  );
}
