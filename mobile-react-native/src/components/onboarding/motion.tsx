import { useEffect, useState } from "react";
import { View, type ViewProps } from "react-native";
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
import { EASE_SETTLE } from "@/theme/tokens";

/*
 * Onboarding's own motion, on top of the shared vocabulary in `ui/motion`.
 *
 * Onboarding is the one place in the app allowed to be playful, because it is
 * the one place nothing is at stake: no result is on screen, nobody is worried
 * yet. Everything here still earns its movement — a bubble pops because a
 * message arrived, the mascot bobs because it is alive and listening, a bar
 * fills because a step was finished — and every piece renders its final state
 * at once under reduced motion.
 *
 * Springs, not durations, for anything that arrives. A spring that settles
 * reads as an object with weight; a fixed-duration ease reads as a slide.
 */

const settle = Easing.bezier(...(EASE_SETTLE as unknown as [number, number, number, number]));

/**
 * A chat bubble arriving. Pops from its tail corner, the way a message does in
 * every messenger the reader already knows.
 */
export function BubblePop({
  children,
  delay = 0,
  from = "left",
  style,
}: {
  children: React.ReactNode;
  /** Seconds. */
  delay?: number;
  /** Which bottom corner the bubble grows out of. */
  from?: "left" | "right";
  style?: ViewProps["style"];
}) {
  const still = useReducedMotion();
  const p = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) {
      p.value = 1;
      return;
    }
    p.value = withDelay(delay * 1000, withSpring(1, { damping: 14, stiffness: 220, mass: 0.8 }));
  }, [delay, still, p]);

  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.4], [0, 1], "clamp"),
    transform: [
      { translateY: interpolate(p.value, [0, 1], [10, 0]) },
      { scale: interpolate(p.value, [0, 1], [0.72, 1]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        style,
        { transformOrigin: from === "left" ? "left bottom" : "right bottom" },
        animated,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Alive, listening. A slow bob with a touch of squash at the bottom of each
 * cycle, so the mascot reads as a character rather than a sticker.
 */
export function Bob({ children, style }: { children: React.ReactNode; style?: ViewProps["style"] }) {
  const still = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [still, t]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [0, -6]) },
      { scaleX: interpolate(t.value, [0, 0.15, 1], [1.02, 1, 1]) },
      { scaleY: interpolate(t.value, [0, 0.15, 1], [0.98, 1, 1]) },
    ],
  }));

  return <Animated.View style={[style, { transformOrigin: "center bottom" }, animated]}>{children}</Animated.View>;
}

/** "Cheeku is typing". Three dots in a travelling wave. */
export function TypingDots({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <View
      accessibilityLabel="Cheeku is typing"
      style={{ flexDirection: "row", alignItems: "center", gap: size * 0.7, height: size * 3 }}
    >
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} color={color} size={size} />
      ))}
    </View>
  );
}

function Dot({ index, color, size }: { index: number; color: string; size: number }) {
  const still = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    t.value = withDelay(
      index * 140,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 260 }),
        ),
        -1,
        false,
      ),
    );
  }, [index, still, t]);

  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.45, 1]),
    transform: [{ translateY: interpolate(t.value, [0, 1], [0, -size * 0.6]) }],
  }));

  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size, backgroundColor: color }, animated]}
    />
  );
}

/**
 * Typing first, then the message. The pause is what makes a reply feel like a
 * reply rather than a caption that was always there.
 *
 * Under reduced motion the message is simply present: a fake wait with nothing
 * moving would only be a delay.
 */
export function useTypedReveal(after: number): boolean {
  const still = useReducedMotion();
  const [shown, setShown] = useState(still);

  useEffect(() => {
    if (still) {
      setShown(true);
      return;
    }
    const id = setTimeout(() => setShown(true), after * 1000);
    return () => clearTimeout(id);
  }, [after, still]);

  return shown;
}

/**
 * A bar that fills to `value` (0–1). Used for the setup quest: finishing a step
 * moves something on screen, which is the smallest honest reward there is.
 */
export function FillBar({
  value,
  color,
  track,
  height = 6,
}: {
  value: number;
  color: string;
  track: string;
  height?: number;
}) {
  const still = useReducedMotion();
  const w = useSharedValue(still ? value : 0);

  useEffect(() => {
    w.value = still ? value : withTiming(value, { duration: 700, easing: settle });
  }, [value, still, w]);

  const animated = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }));

  return (
    <View style={{ height, borderRadius: 999, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={[{ height: "100%", borderRadius: 999, backgroundColor: color }, animated]} />
    </View>
  );
}

/** A small springy bounce whenever `trigger` changes. For "you picked this". */
export function Boop({
  trigger,
  children,
  style,
}: {
  trigger: unknown;
  children: React.ReactNode;
  style?: ViewProps["style"];
}) {
  const still = useReducedMotion();
  const s = useSharedValue(1);

  useEffect(() => {
    if (still) return;
    s.value = withSequence(
      withTiming(0.94, { duration: 80 }),
      withSpring(1, { damping: 9, stiffness: 320 }),
    );
    // Only the trigger should replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
