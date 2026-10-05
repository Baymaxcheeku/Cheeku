import { useEffect, useRef, useState } from "react";
import { Image, Pressable, View, type ImageSourcePropType } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useReducedMotion } from "@/components/ui/motion";
import { brand, ink, shadow } from "@/theme/tokens";
import { font } from "@/theme/type";

import careDoctor from "../../../assets/care/doctor.png";
import careLab from "../../../assets/care/lab.png";
import careMedicines from "../../../assets/care/medicines.png";
import careSpecialist from "../../../assets/care/specialist.png";
import careTherapy from "../../../assets/care/therapy.png";

/*
 * THE CIRCLE OF CARE, the picture on welcome panel 4.
 *
 * Four people the app can book sit on one ring around the medicines bag.
 * The motion tells the panel's one idea, "picked for you", without a word:
 *
 *   1. The ring opens and the bag pops in, with soft ripples behind it.
 *   2. The four people fly OUT of the centre to their places. Care starts
 *      from you, the middle, and reaches out.
 *   3. A small light orbits the ring for as long as the screen is open.
 *   4. Then a highlight moves from one service to the next, the way Cheeku
 *      picks: the tag fills violet and the face gives a little ping. Tapping
 *      a face picks it.
 *
 * All of it runs on the UI thread (Reanimated). Reduce motion gets the
 * finished picture, still, with nothing highlighted.
 *
 * Art: avatars and the medicines bag were supplied by the owner (see
 * PROGRESS.md for the licence note). Colours are brand violets and pastels,
 * never green, amber or red (PLAN.md rule 3).
 */

type Person = { label: string; image: ImageSourcePropType; angle: number };

const RING: readonly Person[] = [
  { label: "Doctors", image: careDoctor, angle: -145 },
  { label: "Lab tests", image: careLab, angle: -35 },
  { label: "Therapy", image: careTherapy, angle: 35 },
  { label: "Specialists", image: careSpecialist, angle: 145 },
];

/** Index 4 in the highlight cycle is the bag in the middle. */
const STEPS = RING.length + 1;
const PICK_EVERY = 1600;
const FIRST_PICK = 1900;

/** Little plus marks that twinkle just outside the ring, as fractions of the box. */
const MARKS = [
  { x: 0.5, y: 0.035, size: 12, color: brand[300], delay: 0 },
  { x: 0.03, y: 0.42, size: 9, color: "#f4a7c8", delay: 700 },
  { x: 0.97, y: 0.58, size: 11, color: "#9cc8f0", delay: 1300 },
  { x: 0.62, y: 0.975, size: 8, color: brand[300], delay: 400 },
] as const;

export function CareOrbit({ compact }: { compact: boolean }) {
  const still = useReducedMotion();
  const box = compact ? 260 : 340;
  const c = box / 2;
  const ring = box * 0.42;
  const disc = box * 0.56;
  const face = compact ? 58 : 76;

  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCycle(from: number) {
    if (timer.current) clearInterval(timer.current);
    setActive(from);
    timer.current = setInterval(() => setActive((a) => (a + 1) % STEPS), PICK_EVERY);
  }

  useEffect(() => {
    if (still) return;
    const t = setTimeout(() => startCycle(0), FIRST_PICK);
    return () => {
      clearTimeout(t);
      if (timer.current) clearInterval(timer.current);
    };
  }, [still]);

  /** A tap picks that face now, and the cycle carries on from it. */
  function pick(i: number) {
    if (still) return;
    startCycle(i);
  }

  const open = useSharedValue(still ? 1 : 0);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (still) {
      open.value = 1;
      return;
    }
    open.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    spin.value = withDelay(500, withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false));
  }, [still, open, spin]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: open.value,
    transform: [{ scale: interpolate(open.value, [0, 1], [0.72, 1]) }],
  }));
  const orbitStyle = useAnimatedStyle(() => ({
    opacity: open.value,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  // The light on the ring: a short arc with a dot at its leading end.
  const circ = 2 * Math.PI * ring;
  const arc = circ * 0.14;
  const head = arc / ring;
  const pad = 6;

  return (
    <View className="flex-1 items-center justify-center">
      <View style={{ width: box, height: box }}>
        {/* A soft glow so the picture lifts off the page. */}
        <Svg width={box} height={box} style={{ position: "absolute" }} pointerEvents="none">
          <Defs>
            <RadialGradient id="careGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={brand[100]} stopOpacity={0.9} />
              <Stop offset="0.6" stopColor={brand[50]} stopOpacity={0.5} />
              <Stop offset="1" stopColor={brand[50]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={c} fill="url(#careGlow)" />
        </Svg>

        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", left: c - ring, top: c - ring, width: ring * 2, height: ring * 2, borderRadius: ring, borderWidth: 1.5, borderColor: brand[100] },
            ringStyle,
          ]}
        />

        {still ? null : (
          <Animated.View
            pointerEvents="none"
            style={[{ position: "absolute", left: c - ring - pad, top: c - ring - pad, width: (ring + pad) * 2, height: (ring + pad) * 2 }, orbitStyle]}
          >
            <Svg width={(ring + pad) * 2} height={(ring + pad) * 2}>
              <Circle
                cx={ring + pad}
                cy={ring + pad}
                r={ring}
                fill="none"
                stroke={brand[400]}
                strokeOpacity={0.55}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={`${arc} ${circ}`}
              />
              <Circle cx={ring + pad + ring * Math.cos(head)} cy={ring + pad + ring * Math.sin(head)} r={4} fill={brand[500]} />
              <Circle cx={ring + pad + ring * Math.cos(head)} cy={ring + pad + ring * Math.sin(head)} r={8} fill={brand[400]} fillOpacity={0.18} />
            </Svg>
          </Animated.View>
        )}

        {MARKS.map((m, i) => (
          <PlusMark key={i} x={m.x * box} y={m.y * box} size={m.size} color={m.color} delay={m.delay} still={still} />
        ))}

        <Centre c={c} disc={disc} still={still} active={active === RING.length} onPress={() => pick(RING.length)} />

        {RING.map((p, i) => (
          <Face key={p.label} person={p} index={i} c={c} ring={ring} size={face} still={still} active={active === i} onPress={() => pick(i)} />
        ))}
      </View>
    </View>
  );
}

/** Eases a 0..1 value toward whether this item is the one picked. */
function usePicked(active: boolean): SharedValue<number> {
  const hl = useSharedValue(0);
  useEffect(() => {
    hl.value = withTiming(active ? 1 : 0, { duration: active ? 260 : 420 });
  }, [active, hl]);
  return hl;
}

/** One expanding ring each time the item is picked. */
function usePing(active: boolean): SharedValue<number> {
  const ping = useSharedValue(1);
  useEffect(() => {
    if (!active) return;
    ping.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
  }, [active, ping]);
  return ping;
}

function Tag({ label, hl, small }: { label: string; hl: SharedValue<number>; small?: boolean }) {
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(hl.value, [0, 1], ["#ffffff", brand[600]]),
    transform: [{ scale: 1 + hl.value * 0.06 }],
  }));
  const text = useAnimatedStyle(() => ({ color: interpolateColor(hl.value, [0, 1], [ink[700], "#ffffff"]) }));
  return (
    <Animated.View style={[shadow.e1, { borderRadius: 999, paddingHorizontal: small ? 10 : 12, paddingVertical: 4 }, box]}>
      <Animated.Text style={[{ fontFamily: font.bold, fontSize: small ? 11 : 11.5 }, text]}>{label}</Animated.Text>
    </Animated.View>
  );
}

function Face({
  person,
  index,
  c,
  ring,
  size,
  still,
  active,
  onPress,
}: {
  person: Person;
  index: number;
  c: number;
  ring: number;
  size: number;
  still: boolean;
  active: boolean;
  onPress: () => void;
}) {
  const a = (person.angle * Math.PI) / 180;
  const cx = c + ring * Math.cos(a);
  const cy = c + ring * Math.sin(a);
  const w = size + 28;

  const out = useSharedValue(still ? 1 : 0);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (still) {
      out.value = 1;
      return;
    }
    out.value = withDelay(380 + index * 130, withSpring(1, { damping: 13, stiffness: 120, mass: 0.9 }));
    bob.value = withDelay(1200 + index * 250, withRepeat(withTiming(1, { duration: 2100 + index * 260, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [still, index, out, bob]);

  const hl = usePicked(active);
  const ping = usePing(active);

  const body = useAnimatedStyle(() => ({
    opacity: interpolate(out.value, [0, 0.25], [0, 1], "clamp"),
    transform: [
      { translateX: (c - cx) * (1 - out.value) },
      { translateY: (c - cy) * (1 - out.value) - bob.value * 5 },
      { scale: interpolate(out.value, [0, 1], [0.25, 1]) },
    ],
  }));
  const photo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + hl.value * 0.07 }] }));
  const halo = useAnimatedStyle(() => ({
    opacity: interpolate(ping.value, [0, 1], [0.55, 0]),
    transform: [{ scale: interpolate(ping.value, [0, 1], [1, 1.45]) }],
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: cx - w / 2, top: cy - size / 2 - 3, width: w, alignItems: "center" }, body]}>
      <Pressable accessibilityRole="button" accessibilityLabel={person.label} onPress={onPress} hitSlop={6} style={{ alignItems: "center" }}>
        <View>
          <Animated.View
            pointerEvents="none"
            style={[{ position: "absolute", left: 0, top: 0, width: size + 6, height: size + 6, borderRadius: size, borderWidth: 2, borderColor: brand[400] }, halo]}
          />
          <Animated.View style={[shadow.e2, { borderRadius: size, borderWidth: 3, borderColor: "#fff", backgroundColor: "#fff" }, photo]}>
            <Image alt="" source={person.image} style={{ width: size, height: size, borderRadius: size / 2 }} />
          </Animated.View>
        </View>
        <View style={{ marginTop: -10 }}>
          <Tag label={person.label} hl={hl} small />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Centre({ c, disc, still, active, onPress }: { c: number; disc: number; still: boolean; active: boolean; onPress: () => void }) {
  const pop = useSharedValue(still ? 1 : 0);
  const float = useSharedValue(0);
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  useEffect(() => {
    if (still) {
      pop.value = 1;
      return;
    }
    pop.value = withDelay(120, withSpring(1, { damping: 12, stiffness: 150 }));
    float.value = withDelay(900, withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
    const ripple = { duration: 3000, easing: Easing.out(Easing.quad) };
    r1.value = withDelay(600, withRepeat(withTiming(1, ripple), -1, false));
    r2.value = withDelay(2100, withRepeat(withTiming(1, ripple), -1, false));
  }, [still, pop, float, r1, r2]);

  const hl = usePicked(active);

  const discStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.3], [0, 1], "clamp"),
    transform: [{ scale: interpolate(pop.value, [0, 1], [0.6, 1]) }],
  }));
  const bagStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -float.value * 5 },
      { rotate: `${interpolate(float.value, [0, 1], [-1.5, 1.5])}deg` },
      { scale: 1 + hl.value * 0.05 },
    ],
  }));
  return (
    <>
      {still ? null : (
        <>
          <Ripple v={r1} c={c} disc={disc} />
          <Ripple v={r2} c={c} disc={disc} />
        </>
      )}
      <Animated.View style={[{ position: "absolute", left: c - disc / 2, top: c - disc / 2, width: disc, alignItems: "center" }, discStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Medicines" onPress={onPress} style={{ alignItems: "center" }}>
          <View className="items-center justify-center" style={{ width: disc, height: disc, borderRadius: disc / 2, backgroundColor: "#efebff" }}>
            <Animated.View style={bagStyle}>
              <Image alt="" source={careMedicines} style={{ width: disc * 0.74, height: disc * 0.76, marginTop: -4 }} resizeMode="contain" />
            </Animated.View>
          </View>
          <View style={{ marginTop: -16 }}>
            <Tag label="Medicines" hl={hl} />
          </View>
        </Pressable>
      </Animated.View>
    </>
  );
}

/** One ring spreading out from the disc and fading, on a loop. */
function Ripple({ v, c, disc }: { v: SharedValue<number>; c: number; disc: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.15, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(v.value, [0, 1], [1, 1.48]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: c - disc / 2, top: c - disc / 2, width: disc, height: disc, borderRadius: disc / 2, borderWidth: 1.5, borderColor: brand[200] }, style]}
    />
  );
}

/** A small plus that breathes in and out, out of step with the others. */
function PlusMark({ x, y, size, color, delay, still }: { x: number; y: number; size: number; color: string; delay: number; still: boolean }) {
  const t = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    t.value = withDelay(800 + delay, withRepeat(withTiming(1, { duration: 1800 + delay, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [still, delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.25, 0.95]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.7, 1.1]) }, { rotate: `${t.value * 90}deg` }],
  }));
  const bar = Math.max(2, size * 0.28);
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }, style]}>
      <View style={{ position: "absolute", left: (size - bar) / 2, top: 0, width: bar, height: size, borderRadius: bar, backgroundColor: color }} />
      <View style={{ position: "absolute", top: (size - bar) / 2, left: 0, height: bar, width: size, borderRadius: bar, backgroundColor: color }} />
    </Animated.View>
  );
}
