import LottieView, { type AnimationObject } from "lottie-react-native";
import { Image, Platform, Pressable, View, type ImageSourcePropType, type ViewStyle } from "react-native";

import { useReducedMotion } from "@/components/ui/motion";

import "./wasm";

import celebrateJson from "../../../assets/mascot/celebrate.json";
import celebrateStill from "../../../assets/mascot/celebrate-still.png";
import FACE from "../../../assets/mascot/face.png";
import shrugJson from "../../../assets/mascot/shrug.json";
import shrugStill from "../../../assets/mascot/shrug-still.png";
import waveJson from "../../../assets/mascot/wave.json";
import waveStill from "../../../assets/mascot/wave-still.png";
import workingJson from "../../../assets/mascot/working.json";
import workingStill from "../../../assets/mascot/working-still.png";

/*
 * CHEEKU, ANIMATED. The mascot is four Lottie animations of the same
 * character, recoloured from the artist's yellow into the app's lilac and
 * violet by scripts/recolor-mascot.mjs (originals kept in
 * assets/mascot/source so the palette can be redone in one command).
 *
 *   wave       says hello: greetings, sign in, the chat's empty state
 *   working    at a desk with a phone: reading a report, typing, scanning
 *   celebrate  arms up with sparks: booked, bought, sent
 *   shrug      open arms: nothing here yet, not sure, how can I help
 *
 * Each animation's canvas carries a lot of empty space around the character,
 * and it differs per file. `FRAME` is the box the character actually uses
 * (measured across the whole animation), so `size` means the character's
 * height on screen, whichever animation it is, and nothing gets cropped
 * mid-wave.
 *
 * STILLS. A chat thread can show dozens of tiny marks, and Reduce motion asks
 * for no animation at all. Both get a transparent PNG of a good frame
 * instead of a running animation: same look, no cost.
 */

export type Moment = "wave" | "working" | "celebrate" | "shrug";

const SOURCE: Record<Moment, AnimationObject> = {
  wave: waveJson as unknown as AnimationObject,
  working: workingJson as unknown as AnimationObject,
  celebrate: celebrateJson as unknown as AnimationObject,
  shrug: shrugJson as unknown as AnimationObject,
};

const STILL: Record<Moment, ImageSourcePropType> = { wave: waveStill, working: workingStill, celebrate: celebrateStill, shrug: shrugStill };

/** Canvas aspect (width / height) and the character's box inside it, as fractions. */
const FRAME: Record<Moment, { aspect: number; box: [number, number, number, number]; stillAspect: number }> = {
  wave: { aspect: 1355 / 1526, box: [0.22, 0.21, 0.9, 0.85], stillAspect: 354 / 449 },
  working: { aspect: 452 / 560, box: [0.09, 0.24, 0.91, 0.97], stillAspect: 351 / 389 },
  celebrate: { aspect: 1355 / 1526, box: [0.11, 0.09, 0.91, 0.85], stillAspect: 480 / 440 },
  shrug: { aspect: 1355 / 1526, box: [0.1, 0.22, 0.93, 0.85], stillAspect: 480 / 422 },
};

export type CheekuProps = {
  moment?: Moment;
  /** The character's height on screen, in points. */
  size?: number;
  /** Run the animation (default) or show the still frame. */
  animate?: boolean;
  loop?: boolean;
  speed?: number;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Cheeku({ moment = "wave", size = 160, animate = true, loop = true, speed = 1, onPress, style, accessibilityLabel = "Cheeku" }: CheekuProps) {
  const still = useReducedMotion();
  const f = FRAME[moment];
  const [x1, y1, x2, y2] = f.box;
  const canvasH = size / (y2 - y1);
  const canvasW = canvasH * f.aspect;
  const boxW = (x2 - x1) * canvasW;

  const body =
    still || !animate ? (
      <Image alt="" source={STILL[moment]} style={{ width: Math.min(boxW, size * f.stillAspect), height: size, alignSelf: "center" }} resizeMode="contain" />
    ) : (
      <View style={{ position: "absolute", left: -x1 * canvasW, top: -y1 * canvasH, width: canvasW, height: canvasH }} pointerEvents="none">
        <LottieView
          source={SOURCE[moment]}
          autoPlay
          loop={loop}
          speed={speed}
          style={{ width: canvasW, height: canvasH }}
          webStyle={{ width: canvasW, height: canvasH }}
          resizeMode="contain"
          // Android: hardware rendering keeps several on screen smooth.
          renderMode={Platform.OS === "android" ? "HARDWARE" : "AUTOMATIC"}
        />
      </View>
    );

  const box = (
    <View style={[{ width: boxW, height: size, overflow: "visible", alignItems: "center", justifyContent: "flex-end" }, style]} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {body}
    </View>
  );
  if (!onPress) return box;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}>
      {box}
    </Pressable>
  );
}

/**
 * The square mark for avatars and speech bubbles: head and shoulders, always
 * a still (there can be one per message). From 64 px up it can animate, as the
 * whole character fitted into the square.
 */
export function CheekuMark({ size = 40, moment = "wave", animate }: { size?: number; moment?: Moment; animate?: boolean }) {
  const reduced = useReducedMotion();
  if (size < 64 || reduced || animate === false) {
    return <Image alt="Cheeku" source={size < 64 ? FACE : STILL[moment]} style={{ width: size, height: size }} resizeMode="contain" accessibilityRole="image" accessibilityLabel="Cheeku" />;
  }
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", overflow: "visible" }}>
      <Cheeku moment={moment} size={size * 0.94} />
    </View>
  );
}
