import { useEffect, useRef, useState } from "react";
import { Platform, Text, TextInput, View, type TextInputInstance } from "react-native";
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
import { cleanCode } from "@/lib/auth/code";
import { brand, ink, radius, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The code boxes.
 *
 * ONE real input, many drawn boxes. The input sits invisibly over the row and
 * takes every keystroke, paste and autofill; the boxes only draw its value.
 * Six separate inputs would break the thing that matters most here: iOS
 * offering the code from Mail above the keyboard ("From Mail: 482913") fills
 * ONE field, and pasting "482 913" needs one field to land in.
 *
 * Motion, each earned by something the person did:
 * - a digit springs into its box as it is typed,
 * - the caret breathes in the box that is waiting,
 * - a wrong code shakes the row (the macOS password-field shake: "no"),
 * - a right code runs a small wave across the boxes before the screen moves on.
 * Under Reduce Motion every one of these is replaced by its end state.
 */

export type CodeState = "idle" | "checking" | "right";

export function CodeCells({
  value,
  onChange,
  length,
  state,
  wrongCount,
  onComplete,
}: {
  value: string;
  onChange: (next: string) => void;
  length: number;
  state: CodeState;
  /** Goes up by one on every wrong code; each step shakes the row once. */
  wrongCount: number;
  onComplete: (code: string) => void;
}) {
  const still = useReducedMotion();
  const input = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const x = useSharedValue(0);

  useEffect(() => {
    if (wrongCount === 0) return;
    if (!still) {
      const t = (to: number, ms: number) => withTiming(to, { duration: ms, easing: Easing.out(Easing.quad) });
      x.value = withSequence(t(-12, 50), t(10, 70), t(-8, 70), t(6, 70), t(-3, 60), t(0, 60));
    }
    // Ready for the next try without another tap.
    input.current?.focus();
  }, [wrongCount, still, x]);

  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const locked = state !== "idle";

  return (
    <Animated.View style={[{ position: "relative" }, shake]}>
      <View
        className="flex-row justify-center gap-2"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length }, (_, i) => (
          <Cell
            key={i}
            index={i}
            char={value[i] ?? ""}
            active={focused && !locked && i === Math.min(value.length, length - 1) && value.length < length}
            filled={i < value.length}
            right={state === "right"}
            still={still}
          />
        ))}
      </View>

      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => {
          const next = cleanCode(t, length);
          onChange(next);
          if (next.length === length) onComplete(next);
        }}
        editable={!locked}
        autoFocus
        maxLength={length + 4 /* room for a pasted space or dash; cleaned above */}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete={Platform.select({ android: "sms-otp", default: "one-time-code" })}
        caretHidden
        selectionColor="transparent"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={`Verification code, ${length} digits`}
        accessibilityHint="Type or paste the code from the email"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          // Not 0: some Android builds skip autofill for a fully transparent field.
          opacity: 0.02,
          color: "transparent",
          fontSize: 1,
        }}
      />
    </Animated.View>
  );
}

function Cell({
  index,
  char,
  active,
  filled,
  right,
  still,
}: {
  index: number;
  char: string;
  active: boolean;
  filled: boolean;
  right: boolean;
  still: boolean;
}) {
  const pop = useSharedValue(char ? 1 : 0);
  const wave = useSharedValue(1);

  useEffect(() => {
    if (!char) {
      pop.value = 0;
      return;
    }
    pop.value = still
      ? 1
      : withSequence(withTiming(0, { duration: 0 }), withSpring(1, { damping: 13, stiffness: 340, mass: 0.6 }));
  }, [char, still, pop]);

  useEffect(() => {
    if (!right || still) return;
    wave.value = withDelay(
      index * 35,
      withSequence(
        withTiming(1.08, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 12, stiffness: 260 }),
      ),
    );
  }, [right, still, index, wave]);

  const digit = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.5], [0, 1], "clamp"),
    transform: [
      { translateY: interpolate(pop.value, [0, 1], [6, 0]) },
      { scale: interpolate(pop.value, [0, 1], [0.6, 1]) },
    ],
  }));
  const box = useAnimatedStyle(() => ({ transform: [{ scale: wave.value }] }));

  const borderColor = right ? brand[600] : active ? brand[500] : filled ? brand[200] : surface.line;
  const backgroundColor = right ? brand[50] : active || filled ? surface.base : surface.canvas;

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          maxWidth: 52,
          height: 58,
          borderRadius: radius.md,
          borderWidth: active || right ? 2 : 1.5,
          borderColor,
          backgroundColor,
          alignItems: "center",
          justifyContent: "center",
        },
        box,
      ]}
    >
      {char ? (
        <Animated.View style={digit}>
          <Text
            style={{
              fontFamily: font.semibold,
              fontSize: 24,
              color: right ? brand[700] : ink[900],
              fontVariant: ["tabular-nums"],
            }}
          >
            {char}
          </Text>
        </Animated.View>
      ) : active ? (
        <Caret still={still} />
      ) : null}
    </Animated.View>
  );
}

/** The waiting box's caret. Breathes rather than blinks: softer at rest, the way iOS draws it. */
function Caret({ still }: { still: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    o.value = withRepeat(withTiming(0.15, { duration: 520, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [still, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ width: 2, height: 26, borderRadius: 1, backgroundColor: brand[600] }, style]} />
  );
}
