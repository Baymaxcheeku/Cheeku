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
import Svg, { Circle, ClipPath, Defs, Ellipse, FeGaussianBlur, Filter, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { useReducedMotion } from "@/components/ui/motion";

/*
 * CHEEKU, THE CHIKOO PEBBLE. The finalised mascot from the Mascot Playbook:
 * a soft, sapodilla-coloured pebble with a purple sprout, big glossy eyes,
 * blush cheeks, tiny arms and feet. Warm, friendly, reassuring, intelligent.
 *
 * ┌─ HOW IT LOOKS LIKE SOFT CLAY, WITHOUT IMAGES ────────────────────────────┐
 * │                                                                          │
 * │ REWORKED 2026-10-05 after the first pass read as a shiny balloon (hard   │
 * │ dark rim, glossy highlight, visible specks). Every part is now matte:    │
 * │ a flat mid tone, then, clipped inside the shape, a Gaussian-blurred pool │
 * │ of light from the top left and a blurred form shadow toward the bottom   │
 * │ right, a warm bounce light on the far edge, occlusion pooling at the     │
 * │ base, and a near-invisible grain. No specular anywhere. Eyes have white  │
 * │ sclera with a soft lid shadow and deep brown irises, the mouth is        │
 * │ recessed, the blush is blurred into the skin, the leaf is matte.         │
 * │                                                                          │
 * │ Under 64 px the blurs are swapped for two gentle gradients: invisible    │
 * │ at that size, and a chat thread can hold dozens of marks.                │
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
  clay: "#EDC6A4",
  clayLight: "#FAE2CC",
  clayShade: "#D29A73",
  clayDeep: "#B97E59",
  clayBounce: "#F6D6BC",
  blush: "#F598A6",
  iris: "#2A1A16",
  line: "#3A2622",
  sprout: "#B39BF7",
  sproutLight: "#D9CEFF",
  sproutDeep: "#8C6FE9",
  lilac: "#C4B5FD",
  lavender: "#EDE9FE",
  navy: "#0F0B2D",
  stem: "#6E4127",
} as const;

// ------------------------------------------------------------------ ids --

/*
 * Per-instance ids, plus the detail level. On web every SVG shares the
 * document's id space, and Expo Router keeps hidden screens mounted, so two
 * mascots with the same ids would paint with each other's filters. One prefix
 * per character. `hi` is false for small marks (under 64 px): they skip the
 * blur filters, which nobody could see at that size and which would cost real
 * time on a thread full of them.
 */
const Ids = createContext<{ p: string; hi: boolean }>({ p: "ck", hi: true });
function useU() {
  const { p } = useContext(Ids);
  return (name: string) => `${p}-${name}`;
}
function useHi() {
  return useContext(Ids).hi;
}

// ------------------------------------------------------------- geometry --

const BODY = "M100 59 C135 59 160 85 162 118 C164 151 140 174 100 174 C60 174 36 151 38 118 C40 85 65 59 100 59 Z";

/** Fine clay grain: fixed, so it never shimmers between renders. */
const GRAIN: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  let s = 11;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 240; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd());
    out.push([100 + Math.cos(a) * r * 58, 117 + Math.sin(a) * r * 53, rnd() < 0.55 ? 0 : 1]);
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

/** A Gaussian blur, sized so the soft edge is never clipped by the filter box. */
function Blur({ id, amount }: { id: string; amount: number }) {
  return (
    <Filter id={id} x="-60%" y="-60%" width="220%" height="220%">
      <FeGaussianBlur stdDeviation={amount} />
    </Filter>
  );
}

type Oval = [number, number, number, number];

/*
 * One soft clay part. A flat mid tone, then, clipped inside the shape, a
 * blurred pool of light from the top left and a blurred form shadow toward the
 * bottom right. That is the whole trick behind the matte, squeezable look: no
 * hard rim, no gloss, the light wraps.
 *
 * Small sizes get the same light from two gentle gradients instead of blurs.
 */
function ClayPart({
  name,
  d,
  oval,
  light,
  shade,
  base = PALETTE.clay,
  lightColor = PALETTE.clayLight,
  shadeColor = PALETTE.clayShade,
  soft = 12,
  extra,
}: {
  name: string;
  d?: string;
  oval?: Oval;
  light: Oval;
  shade: Oval;
  base?: string;
  lightColor?: string;
  shadeColor?: string;
  soft?: number;
  extra?: React.ReactNode;
}) {
  const u = useU();
  const hi = useHi();
  const shape = (props: Record<string, unknown>) =>
    d ? <Path d={d} {...props} /> : <Ellipse cx={oval?.[0]} cy={oval?.[1]} rx={oval?.[2]} ry={oval?.[3]} {...props} />;
  if (!hi) {
    return (
      <>
        <Defs>
          <RadialGradient id={u(`${name}-l`)} cx="34%" cy="28%" rx="80%" ry="80%" fx="34%" fy="28%">
            <Stop offset="0" stopColor={lightColor} />
            <Stop offset="0.5" stopColor={base} />
            <Stop offset="1" stopColor={shadeColor} />
          </RadialGradient>
        </Defs>
        {shape({ fill: `url(#${u(`${name}-l`)})` })}
      </>
    );
  }
  return (
    <>
      <Defs>
        <ClipPath id={u(`${name}-c`)}>{shape({})}</ClipPath>
        <Blur id={u(`${name}-b`)} amount={soft} />
        <Blur id={u(`${name}-b2`)} amount={soft * 0.6} />
      </Defs>
      {shape({ fill: base })}
      <G clipPath={`url(#${u(`${name}-c`)})`}>
        <Ellipse cx={shade[0]} cy={shade[1]} rx={shade[2]} ry={shade[3]} fill={shadeColor} opacity={0.8} filter={`url(#${u(`${name}-b`)})`} />
        <Ellipse cx={light[0]} cy={light[1]} rx={light[2]} ry={light[3]} fill={lightColor} opacity={0.85} filter={`url(#${u(`${name}-b`)})`} />
        {extra}
      </G>
    </>
  );
}

function ShadowLayer() {
  const u = useU();
  const hi = useHi();
  return (
    <Layer>
      <Defs>
        <Blur id={u("gs")} amount={5} />
        <Blur id={u("gc")} amount={2.5} />
        <RadialGradient id={u("gl")} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#4b3c7a" stopOpacity="0.22" />
          <Stop offset="1" stopColor="#4b3c7a" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {hi ? (
        <>
          <Ellipse cx="100" cy="184" rx="58" ry="8" fill="#4b3c7a" opacity={0.14} filter={`url(#${u("gs")})`} />
          <Ellipse cx="100" cy="181" rx="40" ry="4" fill="#4b3c7a" opacity={0.2} filter={`url(#${u("gc")})`} />
        </>
      ) : (
        <Ellipse cx="100" cy="183" rx="56" ry="9" fill={`url(#${u("gl")})`} />
      )}
    </Layer>
  );
}

function Feet({ pose }: { pose: Pose }) {
  if (pose === "curl") return null;
  const sit = pose === "sit";
  const y = sit ? 172 : 169;
  const rx = sit ? 21 : 18;
  return (
    <Layer>
      {[sit ? 75 : 78, sit ? 125 : 122].map((x, i) => (
        <ClayPart key={i} name={`foot${i}`} oval={[x, y, rx, 11]} light={[x - 6, y - 9, rx, 7]} shade={[x + 6, y + 9, rx + 4, 9]} soft={4} />
      ))}
    </Layer>
  );
}

/** One arm: a soft round mitt beside the body; the rig turns it around the shoulder. */
function Arm({ side, front = false, raised = false }: { side: "left" | "right"; front?: boolean; raised?: boolean }) {
  const s = side === "left" ? -1 : 1;
  const [x, y, rot] = raised ? [100 + s * 64, 94, s * 30] : front ? [100 + s * 30, 150, s * 40] : [100 + s * 64, 124, s * -26];
  const transform = `rotate(${rot} ${x} ${y})`;
  return (
    <Layer>
      <G transform={transform}>
        <ClayPart name={`arm${side}${raised ? "u" : front ? "f" : ""}`} oval={[x, y, 16.5, 21]} light={[x - 7, y - 10, 13, 13]} shade={[x + 8, y + 10, 16, 16]} soft={5} />
      </G>
    </Layer>
  );
}

function Body({ glow }: { glow: boolean }) {
  const u = useU();
  const hi = useHi();
  return (
    <Layer>
      <Defs>
        <Blur id={u("bd")} amount={9} />
        <Blur id={u("bb")} amount={6} />
        <Blur id={u("core")} amount={8} />
      </Defs>
      <ClayPart
        name="body"
        d={BODY}
        light={[80, 88, 60, 44]}
        shade={[128, 152, 78, 58]}
        soft={17}
        extra={
          hi ? (
            <>
              <Ellipse cx="100" cy="184" rx="68" ry="18" fill={PALETTE.clayDeep} opacity={0.55} filter={`url(#${u("bd")})`} />
              <Ellipse cx="164" cy="128" rx="11" ry="34" fill={PALETTE.clayBounce} opacity={0.5} filter={`url(#${u("bb")})`} />
              {GRAIN.map(([x, y, light], i) => (
                <Circle key={i} cx={x} cy={y} r={0.5} fill={light ? "#ffffff" : "#9a6646"} opacity={light ? 0.1 : 0.07} />
              ))}
            </>
          ) : null
        }
      />
      {glow ? <Path d="M100 168 C88 160 84 153 84 147 C84 142 88 139 92 139 C95.5 139 98.5 141 100 144 C101.5 141 104.5 139 108 139 C112 139 116 142 116 147 C116 153 112 160 100 168 Z" fill="#ffb3cf" opacity={0.75} filter={hi ? `url(#${u("core")})` : undefined} /> : null}
    </Layer>
  );
}

function Blush() {
  const u = useU();
  const hi = useHi();
  return (
    <Layer>
      <Defs>
        <Blur id={u("bl")} amount={3} />
        <ClipPath id={u("blc")}>
          <Path d={BODY} />
        </ClipPath>
        <RadialGradient id={u("blg")} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={PALETTE.blush} stopOpacity="0.9" />
          <Stop offset="1" stopColor={PALETTE.blush} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <G clipPath={`url(#${u("blc")})`}>
      {[53, 147].map((x) =>
        hi ? (
          <Ellipse key={x} cx={x} cy={141} rx="15" ry="10" fill={PALETTE.blush} opacity={0.95} filter={`url(#${u("bl")})`} />
        ) : (
          <Ellipse key={x} cx={x} cy={141} rx="16" ry="11" fill={`url(#${u("blg")})`} />
        ),
      )}
      </G>
    </Layer>
  );
}

/** A white-sclera eye: soft lid shadow, a deep brown iris, two catchlights. */
function OpenEye({ cx, cy, look, n }: { cx: number; cy: number; look: [number, number]; n: number }) {
  const u = useU();
  const hi = useHi();
  return (
    <G>
      <Defs>
        <ClipPath id={u(`sc${n}`)}>
          <Ellipse cx={cx} cy={cy} rx="18" ry="20" />
        </ClipPath>
      </Defs>
      <Ellipse cx={cx} cy={cy} rx="18" ry="20" fill="#ffffff" />
      {hi ? (
        <G clipPath={`url(#${u(`sc${n}`)})`}>
          <Ellipse cx={cx} cy={cy - 18} rx="21" ry="10" fill="#d8cdd3" opacity={0.75} filter={`url(#${u("lid")})`} />
        </G>
      ) : null}
      <Ellipse cx={cx + 1.5 + look[0]} cy={cy + 3 + look[1]} rx="13" ry="14.5" fill={`url(#${u("iris")})`} />
      <Circle cx={cx + 6 + look[0]} cy={cy - 2.5 + look[1]} r="5.4" fill="#fff" />
      <Circle cx={cx - 3 + look[0]} cy={cy + 9 + look[1]} r="2" fill="#fff" opacity={0.85} />
      <Ellipse cx={cx} cy={cy} rx="18" ry="20" fill="none" stroke="#c9a589" strokeOpacity={0.45} strokeWidth="0.9" />
    </G>
  );
}

const CLOSED_HAPPY = (cx: number, cy: number) => `M${cx - 13} ${cy + 3} Q${cx} ${cy - 10} ${cx + 13} ${cy + 3}`;
const CLOSED_SLEEPY = (cx: number, cy: number) => `M${cx - 13} ${cy - 1} Q${cx} ${cy + 10} ${cx + 13} ${cy - 1}`;

/** The eyes on their own layer, so a blink can squash just them. */
function Eyes({ mood }: { mood: Mood }) {
  const u = useU();
  const stroke = { stroke: PALETTE.line, strokeWidth: 4, strokeLinecap: "round" as const, fill: "none" };
  const look: [number, number] = mood === "thinking" ? [-3, -4] : mood === "curious" ? [1.5, -1] : [0, 0];
  return (
    <Layer>
      <Defs>
        <RadialGradient id={u("iris")} cx="45%" cy="30%" rx="70%" ry="70%">
          <Stop offset="0" stopColor="#5a3a32" />
          <Stop offset="0.55" stopColor={PALETTE.iris} />
          <Stop offset="1" stopColor="#140b09" />
        </RadialGradient>
        <Blur id={u("lid")} amount={3} />
      </Defs>
      {mood === "calm" ? (
        <>
          <Path d={CLOSED_HAPPY(72, 114)} {...stroke} />
          <Path d={CLOSED_HAPPY(128, 114)} {...stroke} />
        </>
      ) : mood === "sleepy" ? (
        <>
          <Path d={CLOSED_SLEEPY(72, 116)} {...stroke} />
          <Path d={CLOSED_SLEEPY(128, 116)} {...stroke} />
        </>
      ) : mood === "reassuring" ? (
        <>
          <Path d={CLOSED_HAPPY(72, 114)} {...stroke} />
          <OpenEye cx={128} cy={110} look={look} n={1} />
        </>
      ) : (
        <>
          <OpenEye cx={72} cy={mood === "curious" ? 108 : 110} look={look} n={0} />
          <OpenEye cx={128} cy={mood === "curious" ? 107 : 110} look={look} n={1} />
        </>
      )}
    </Layer>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  const u = useU();
  const line = { stroke: PALETTE.line, strokeWidth: 3.4, strokeLinecap: "round" as const, fill: "none" };
  const OPEN = "M84 136 C85 157 115 157 116 136 C107 139.5 93 139.5 84 136 Z";
  const SMALL = "M88 137 C90 150 110 150 112 137 C104 140 96 140 88 137 Z";
  const open = mood === "happy" || mood === "reassuring";
  const d = mood === "happy" ? OPEN : SMALL;
  return (
    <Layer>
      {open ? (
        <>
          <Defs>
            <ClipPath id={u("mc")}>
              <Path d={d} />
            </ClipPath>
            <LinearGradient id={u("mg")} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3a161d" />
              <Stop offset="1" stopColor="#5e2630" />
            </LinearGradient>
          </Defs>
          <Path d={d} fill={`url(#${u("mg")})`} />
          <G clipPath={`url(#${u("mc")})`}>
            <Ellipse cx="100" cy={mood === "happy" ? 153 : 149} rx={mood === "happy" ? 13 : 9} ry="8" fill="#F2919F" />
          </G>
        </>
      ) : mood === "curious" ? (
        <Ellipse cx="101" cy="140" rx="5" ry="6" fill="#4a1f27" />
      ) : mood === "thinking" ? (
        <Path d="M93 141 Q101 137.5 109 140.5" {...line} />
      ) : mood === "sleepy" ? (
        <Ellipse cx="100" cy="140" rx="3.6" ry="2.6" fill="#4a1f27" />
      ) : (
        <Path d="M90 137 Q100 146 110 137" {...line} />
      )}
    </Layer>
  );
}

function Sprout() {
  const u = useU();
  return (
    <Layer>
      <Defs>
        <LinearGradient id={u("stem")} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#8a5634" />
          <Stop offset="1" stopColor={PALETTE.stem} />
        </LinearGradient>
      </Defs>
      <Path d="M99 64 C97 55 100 47 107 42" stroke={`url(#${u("stem")})`} strokeWidth="8" strokeLinecap="round" fill="none" />
      <Path d="M97.5 60 C96.5 54 98.5 49 102 46" stroke="#a87150" strokeOpacity={0.6} strokeWidth="2" strokeLinecap="round" fill="none" />
      <ClayPart
        name="leaf"
        d="M105 45 C106 22 133 9 161 15 C158 38 133 54 105 45 Z"
        light={[132, 18, 28, 11]}
        shade={[124, 52, 34, 11]}
        base={PALETTE.sprout}
        lightColor={PALETTE.sproutLight}
        shadeColor={PALETTE.sproutDeep}
        soft={5}
        extra={<Path d="M109 44 C123 35 138 26 154 19" stroke={PALETTE.sproutDeep} strokeOpacity={0.35} strokeWidth="1.6" strokeLinecap="round" fill="none" />}
      />
    </Layer>
  );
}

function HeldHeart() {
  const u = useU();
  const hi = useHi();
  const HEART = "M100 176 C76 162 69 148 69 137 C69 127 77 120 86 120 C93 120 97 125 100 130 C103 125 107 120 114 120 C123 120 131 127 131 137 C131 148 124 162 100 176 Z";
  return (
    <Layer>
      <Defs>
        <Blur id={u("hg")} amount={9} />
      </Defs>
      {hi ? <Ellipse cx="100" cy="150" rx="40" ry="30" fill="#ffb3cf" opacity={0.45} filter={`url(#${u("hg")})`} /> : null}
      <ClayPart name="heart" d={HEART} light={[88, 128, 22, 14]} shade={[112, 166, 30, 18]} base="#FF9FBE" lightColor="#FFE1EC" shadeColor="#F07A9F" soft={7} />
    </Layer>
  );
}

function Phone() {
  return (
    <Layer>
      <G transform="rotate(-14 140 124)">
        <Rect x="124" y="98" width="34" height="52" rx="8" fill={PALETTE.sproutDeep} />
        <Rect x="127.5" y="102" width="27" height="42" rx="5" fill={PALETTE.lavender} />
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
      <Ids.Provider value={{ p: ctx, hi: size >= 64 }}>
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
