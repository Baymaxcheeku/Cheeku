import { StyleSheet, View, type ViewProps } from "react-native";

import { Tap } from "@/components/ui/tap";
import { ink, surface } from "@/theme/tokens";

/** Perceived lightness of a #rrggbb colour, dark enough to carry white text. */
function isDark(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1] ?? "ffffff", 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 110;
}

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

// Flat since the neutral redesign: "glass" is a plain white surface on the
// grey canvas, with a hairline only where white meets white.
export const glass = {
  // A chip or inset sitting on a white card: the canvas grey.
  fill: "#f2f2f4",
  // A panel sitting on the canvas: white.
  fillStrong: "#ffffff",
  rim: "rgba(17,17,20,0.04)",
} as const;

/** The soft lift under glass: wide and faint rather than tight and dark. */
export const glassShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.03,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 1 },
  elevation: 0,
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
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={[
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
        },
      ]}
      scale={0.95}
    >
      {children}
    </Tap>
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
  /*
   * NEUTRAL REDESIGN (November 2026): surfaces are flat. A light gradient is
   * a plain white fill, a dark one is its own first stop, and one that fades
   * into the canvas (the old top-of-screen wash) draws nothing. The props
   * stay so the fifty call sites need no change.
   */
  void angle;
  void glow;
  if (to === surface.canvas) return null;
  const fill = isDark(from) ? from : "#ffffff";
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />;
}
