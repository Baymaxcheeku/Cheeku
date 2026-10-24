import { createContext, useContext, useEffect } from "react";
import { useWindowDimensions, type LayoutChangeEvent, type ScrollViewProps, type ViewProps } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { useReducedMotion } from "./motion";

/*
 * SCROLL-TRIGGERED MOTION, for the long editorial pages (About, the plan
 * pages). A section fades and rises the first time it comes into view, once,
 * and then stays put; scrolling back never replays it.
 *
 * Everything runs on the UI thread: the scroll position is a shared value and
 * each <Reveal> watches it with an animated reaction, so a page full of them
 * costs nothing on the JS side while scrolling.
 *
 * With "Reduce motion" on, everything is simply there.
 *
 * <Reveal> must be a DIRECT child of the scroll content: it reads its own y
 * from onLayout, which is relative to its parent.
 */

type Ctx = { y: SharedValue<number>; height: number };
const RevealContext = createContext<Ctx | null>(null);

export function RevealScroll({ children, ...props }: ScrollViewProps & { children: React.ReactNode }) {
  const y = useSharedValue(0);
  const { height } = useWindowDimensions();
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  return (
    <RevealContext.Provider value={{ y, height }}>
      <Animated.ScrollView {...props} onScroll={onScroll} scrollEventThrottle={16}>
        {children}
      </Animated.ScrollView>
    </RevealContext.Provider>
  );
}

export function Reveal({ children, style, delay = 0, rise = 22 }: { children: React.ReactNode; style?: ViewProps["style"]; delay?: number; rise?: number }) {
  const ctx = useContext(RevealContext);
  const still = useReducedMotion();
  const top = useSharedValue(Number.POSITIVE_INFINITY);
  const shown = useSharedValue(still || !ctx ? 1 : 0);
  const fallbackY = useSharedValue(0);
  const scrollY = ctx?.y ?? fallbackY;
  const viewport = ctx?.height ?? 800;

  useEffect(() => {
    if (still) shown.value = 1;
  }, [still, shown]);

  useAnimatedReaction(
    () => scrollY.value + viewport - top.value,
    (visible) => {
      if (shown.value === 0 && visible > 60) {
        shown.value = withDelay(delay, withTiming(1, { duration: 360, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
      }
    },
  );

  const animated = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: interpolate(shown.value, [0, 1], [rise, 0]) }],
  }));

  return (
    <Animated.View
      style={[style, animated]}
      onLayout={(e: LayoutChangeEvent) => {
        top.value = e.nativeEvent.layout.y;
      }}
    >
      {children}
    </Animated.View>
  );
}

/** A slow, endless rotation, for decorative rings. Still when motion is reduced. */
export function Spin({ children, seconds = 24, style }: { children: React.ReactNode; seconds?: number; style?: ViewProps["style"] }) {
  const still = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    turn.value = withRepeat(withTiming(1, { duration: seconds * 1000, easing: Easing.linear }), -1, false);
  }, [still, seconds, turn]);
  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
