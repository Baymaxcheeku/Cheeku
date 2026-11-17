import { useEffect } from "react";
import { AccessibilityInfo, View, type ViewProps } from "react-native";
import { Pressable } from "@/components/ui/pressable";
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
import { useState } from "react";

import { EASE_SETTLE, brand, ink, semantic, surface } from "@/theme/tokens";
import { feel } from "@/lib/feel";
import { Tap } from "@/components/ui/tap";

/*
 * The motion vocabulary, ported from the web app's `components/ui/motion.tsx`.
 *
 * TWO ADAPTATIONS, both forced by the platform.
 *
 * `whileInView` does not exist here. Framer used an IntersectionObserver; React
 * Native has no equivalent that is worth the cost for screens this short.
 * Entrance animations therefore run on MOUNT. On a phone viewport almost
 * everything these decorate is at or near the fold anyway, and a list that
 * animates as you scroll into it is a scroll-jank risk on Android.
 *
 * Reduced motion is read explicitly. The web build leaned on a CSS media query
 * that collapsed every animation; Reanimated runs on the UI thread and inherits
 * nothing, so every component here checks and returns static values.
 */

const ease = Easing.bezier(...(EASE_SETTLE as unknown as [number, number, number, number]));

/** Strong ease-out for anything entering or leaving (UI audit, October 2026). */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/*
 * <Enter>: for things that appear in place, from 95% and transparent, never
 * from nothing. "quick" (160ms) is for state that changes often, "soft"
 * (220ms) for occasional moments, "pop" (90% to a 104% overshoot and back) for
 * the rare success moment only (booked, filed).
 *
 * Driven by a shared value on mount rather than a layout-animation Keyframe:
 * on web a finished Keyframe left the element collapsed (the member page
 * avatar slid under the name). Remount it with a `key` to play it again.
 */
export function Enter({
  kind = "soft",
  delay = 0,
  style,
  children,
}: {
  kind?: "quick" | "soft" | "pop";
  delay?: number;
  style?: ViewProps["style"];
  children: React.ReactNode;
}) {
  const still = useReducedMotion();
  const o = useSharedValue(still ? 1 : 0);
  const s = useSharedValue(still ? 1 : kind === "pop" ? 0.9 : 0.95);

  useEffect(() => {
    if (still) return;
    const ms = kind === "quick" ? 160 : kind === "soft" ? 220 : 200;
    o.value = withDelay(delay, withTiming(1, { duration: ms, easing: EASE_OUT }));
    s.value = withDelay(
      delay,
      kind === "pop"
        ? withSequence(withTiming(1.04, { duration: 240, easing: EASE_OUT }), withTiming(1, { duration: 140, easing: Easing.inOut(Easing.quad) }))
        : withTiming(1, { duration: ms, easing: EASE_OUT }),
    );
  }, [still, kind, delay, o, s]);

  const animated = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** True when the OS asks for reduced motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

function useEnter(delay: number, still: boolean): SharedValue<number> {
  const progress = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) {
      progress.value = 1;
      return;
    }
    // 240ms: UI entrances stay under 300 (UI audit, October 2026).
    progress.value = withDelay(delay, withTiming(1, { duration: 240, easing: ease }));
  }, [delay, still, progress]);
  return progress;
}

/**
 * A soft continuous drift, plus an entrance.
 *
 * Used for the search-noise chips on About. Each item takes its own phase so
 * they never sync up, which is the point: the noise does not resolve.
 */
export function Drift({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewProps["style"];
}) {
  const still = useReducedMotion();
  const enter = useEnter(delay * 1000, still);
  const float = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    float.value = withDelay(
      delay * 1000,
      withRepeat(
        withTiming(1, { duration: 5000 + delay * 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [delay, still, float]);

  const animated = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: interpolate(enter.value, [0, 1], [10, 0]) + float.value * -3.5 },
      { scale: interpolate(enter.value, [0, 1], [0.96, 1]) },
    ],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * Arrives with weight, then does not move again.
 *
 * The stillness is the payload: on About it is the one element in a drifting
 * composition that holds, which is what makes it read as something to hold on
 * to.
 */
export function Settle({
  children,
  delay = 0.4,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewProps["style"];
}) {
  const still = useReducedMotion();
  const progress = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay * 1000, withSpring(1, { damping: 20, stiffness: 260 }));
  }, [delay, still, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [18, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.94, 1]) },
    ],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Expanding rings: still searching, still unresolved. */
export function PulseRing({ size = 72 }: { size?: number }) {
  const still = useReducedMotion();
  if (still) return null;
  return (
    <>
      <Ring size={size} delay={0} />
      <Ring size={size} delay={1300} />
    </>
  );
}

function Ring({ size, delay }: { size: number; delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.ease) }), -1, false),
    );
  }, [delay, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.55]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: brand[300],
        },
        animated,
      ]}
    />
  );
}

/** One item in a staggered list. Index drives the delay; capped so long lists land. */
export function StaggerItem({
  children,
  index = 0,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  style?: ViewProps["style"];
}) {
  const still = useReducedMotion();
  const enter = useEnter(Math.min(index, 8) * 40, still);

  const animated = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [12, 0]) }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** A springy pop-in. Used for the small trait icons. */
export function PopIn({
  children,
  index = 0,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  style?: ViewProps["style"];
}) {
  const still = useReducedMotion();
  const progress = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(index * 70, withSpring(1, { damping: 16, stiffness: 480 }));
  }, [index, still, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.9, 1]) }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * A row that dips under the thumb.
 *
 * Every settings row was a static rectangle on web until this landed: tapping
 * one gave no acknowledgement until the next screen rendered, which on a slow
 * connection reads as a dead control.
 */
export function PressRow({
  children,
  onPress,
  index = 0,
  style,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  index?: number;
  style?: ViewProps["style"];
  disabled?: boolean;
}) {
  const still = useReducedMotion();
  const enter = useEnter(Math.min(index, 6) * 30, still);
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: interpolate(enter.value, [0, 1], [10, 0]) },
      { scale: interpolate(pressed.value, [0, 1], [1, 0.98]) },
    ],
  }));

  return (
    <Animated.View style={[style, animated]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          if (!still) pressed.value = withTiming(1, { duration: 120, easing: EASE_OUT });
        }}
        onPressOut={() => {
          if (!still) pressed.value = withTiming(0, { duration: 160, easing: EASE_OUT });
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Poke the mascot and it reacts. Establishes "friendly" faster than copy can. */
export function TapToWiggle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewProps["style"];
}) {
  const still = useReducedMotion();
  const wiggle = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${wiggle.value}deg` },
      { scale: interpolate(Math.abs(wiggle.value), [0, 7], [1, 1.06]) },
    ],
  }));

  return (
    <Animated.View style={[style, animated]}>
      <Tap
        onPress={() => {
          if (still) return;
          wiggle.value = withSequence(
            withTiming(-7, { duration: 90 }),
            withTiming(6, { duration: 100 }),
            withTiming(-4, { duration: 90 }),
            withTiming(0, { duration: 110 }),
          );
        }}
      >
        {children}
      </Tap>
    </Animated.View>
  );
}

/**
 * The notification switch.
 *
 * A knob that slides linearly feels like a form field; one that arrives with a
 * little weight feels like a switch. This is the control someone will flip
 * repeatedly, so it earns the spring.
 */
export function SpringSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  const still = useReducedMotion();
  const knob = useSharedValue(checked ? 22 : 2);

  useEffect(() => {
    const to = checked ? 22 : 2;
    knob.value = still ? to : withSpring(to, { damping: 30, stiffness: 620, mass: 0.6 });
  }, [checked, still, knob]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: knob.value }] }));

  return (
    <Tap scale={0.95}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => {
        feel.tick();
        onChange();
      }}
      style={{
        width: 48,
        height: 28,
        borderRadius: 999,
        backgroundColor: checked ? brand[600] : surface.line,
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            width: 24,
            height: 24,
            borderRadius: 999,
            backgroundColor: "#fff",
            shadowColor: ink[900],
            shadowOpacity: 0.12,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          },
          animated,
        ]}
      />
    </Tap>
  );
}

/**
 * A count-up meter for profile completeness.
 *
 * The number is real: it counts fields actually saved. A bar that is simply
 * *there* states a fact; a bar that fills says "you moved this", which is the
 * only honest way to make a form feel like progress rather than paperwork.
 */
export function Meter({ value, total }: { value: number; total: number }) {
  const still = useReducedMotion();
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const width = useSharedValue(still ? pct : 0);

  useEffect(() => {
    width.value = still ? pct : withTiming(pct, { duration: 800, easing: ease });
  }, [pct, still, width]);

  const animated = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  const complete = value >= total;

  return (
    <View style={{ height: 8, borderRadius: 999, backgroundColor: brand[100], overflow: "hidden" }}>
      <Animated.View
        style={[
          { height: "100%", borderRadius: 999, backgroundColor: complete ? semantic.safe : brand[600] },
          animated,
        ]}
      />
    </View>
  );
}

/**
 * Folds a finished card away before the list moves on (UI audit batch 4).
 * When `gone` turns true the card's own height closes to nothing while it
 * fades and dips, then `onGone` fires and the caller writes the change, so
 * the cards below slide up into the gap instead of jumping. 220ms, strong
 * ease-out. Reduce Motion: a quick fade, no height change.
 */
export function Fold({ gone, onGone, children }: { gone: boolean; onGone: () => void; children: React.ReactNode }) {
  const still = useReducedMotion();
  const [height, setHeight] = useState<number | null>(null);
  const h = useSharedValue(1);
  const o = useSharedValue(1);

  useEffect(() => {
    if (!gone) return;
    // Called once, on a timer: an animation's "finished" callback can be skipped on a phone.
    o.value = withTiming(0, { duration: still ? 120 : 180, easing: EASE_OUT });
    h.value = withTiming(0, { duration: still ? 120 : 220, easing: EASE_OUT });
    const t = setTimeout(() => onGone(), still ? 140 : 240);
    return () => clearTimeout(t);
  }, [gone, still, h, o, onGone]);

  const animated = useAnimatedStyle(() => {
    if (!gone || height === null || still) return { opacity: o.value };
    return { opacity: o.value, height: height * h.value, transform: [{ scale: 0.97 + 0.03 * h.value }], overflow: "hidden" };
  });

  return (
    <Animated.View onLayout={(e) => (height === null || !gone) && setHeight(e.nativeEvent.layout.height)} style={animated}>
      {children}
    </Animated.View>
  );
}
