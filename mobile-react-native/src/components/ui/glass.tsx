import { useId } from "react";
import { Pressable, StyleSheet, View, type ViewProps } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { ink } from "@/theme/tokens";

/*
 * Glass and gradient, without new native modules.
 *
 * A real backdrop blur needs `expo-blur`, which is a native module and would
 * force a new development build for every tester. Frosted glass on a LIGHT
 * canvas reads almost entirely from three cheaper cues, so those are what this
 * draws: a translucent white fill, a brighter one-pixel rim, and a soft, wide,
 * low shadow. Over a pastel card it looks like glass; over the canvas it looks
 * like a raised white chip, which is also fine.
 *
 * Gradients are SVG, via `react-native-svg`, which the app already ships for
 * the mascot. Same reason: `expo-linear-gradient` is native.
 */

export const glass = {
  fill: "rgba(255,255,255,0.62)",
  fillStrong: "rgba(255,255,255,0.86)",
  rim: "rgba(255,255,255,0.95)",
} as const;

/** The soft lift under glass: wide and faint rather than tight and dark. */
export const glassShadow = {
  shadowColor: "#2a1f6b",
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

export function Glass({
  children,
  strong,
  style,
  className,
}: {
  children?: React.ReactNode;
  strong?: boolean;
  style?: ViewProps["style"];
  className?: string;
}) {
  return (
    <View
      className={className}
      style={[
        glassShadow,
        { backgroundColor: strong ? glass.fillStrong : glass.fill, borderWidth: 1, borderColor: glass.rim },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A round glass button. 48pt: comfortably over the 44pt touch minimum. */
export function GlassCircle({
  children,
  onPress,
  label,
  size = 48,
  dark,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  label: string;
  size?: number;
  /** Ink-filled, for the one primary action in a group. */
  dark?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        glassShadow,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: dark ? ink[900] : glass.fillStrong,
          borderWidth: dark ? 0 : 1,
          borderColor: glass.rim,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

/**
 * A gradient that fills its parent. Put it first inside a positioned,
 * `overflow: hidden` container. `glow` adds a soft radial highlight in one
 * corner, the way light sits on a glossy card.
 */
export function Gradient({
  from,
  to,
  angle = "diagonal",
  glow,
}: {
  from: string;
  to: string;
  angle?: "vertical" | "diagonal";
  glow?: string;
}) {
  // Unique per instance: two gradients with the same id on one screen would
  // both render the first one's colours on web.
  const id = useId().replace(/:/g, "");
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient
            id={`g${id}`}
            x1="0"
            y1="0"
            x2={angle === "diagonal" ? "1" : "0"}
            y2="1"
          >
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
          {glow ? (
            <RadialGradient id={`r${id}`} cx="0.85" cy="0.1" r="0.7">
              <Stop offset="0" stopColor={glow} stopOpacity="0.9" />
              <Stop offset="1" stopColor={glow} stopOpacity="0" />
            </RadialGradient>
          ) : null}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#g${id})`} />
        {glow ? <Rect x="0" y="0" width="100%" height="100%" fill={`url(#r${id})`} /> : null}
      </Svg>
    </View>
  );
}
