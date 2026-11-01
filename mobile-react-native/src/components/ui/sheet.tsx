import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { EASE_OUT, useReducedMotion } from "@/components/ui/motion";
import { feel } from "@/lib/feel";

/*
 * THE bottom sheet. Every sheet in the app goes through this (UI audit,
 * October 2026), because the old pattern, a Modal with animationType="slide"
 * and the dim layer inside it, slid the dim layer up from the bottom with the
 * sheet and drew a grabber that could not be dragged.
 *
 * Here the layers are separate:
 * - the backdrop fades (200ms in, 180ms out), it never moves;
 * - the sheet rises from its own height on a spring and leaves faster than it
 *   came (220ms), because the system responding should feel quicker than the
 *   person deciding;
 * - the grabber area drags: down to dismiss on a flick or past 40% of the
 *   height, a rubber band if pulled up, and the release velocity is handed to
 *   the spring so there is no seam.
 *
 * The drag zone is the centre of the top edge (where every sheet draws its
 * grabber), so it never covers a close button. Content below keeps its own
 * scrolling and taps.
 *
 * Reduce Motion: the sheet and backdrop fade, nothing slides.
 *
 * Children draw the sheet's surface (background, radius, padding), as they
 * always have; this owns the grabber, position, motion and dismissal.
 */

const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

function project(velocity: number): number {
  "worklet";
  // Where a flick would come to rest (Apple's exponential decay form).
  return ((velocity / 1000) * 0.998) / (1 - 0.998);
}

function rubberband(overshoot: number, dimension: number): number {
  "worklet";
  const c = 0.55;
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}

/**
 * A sheet's height cap in points. Percentages no longer work inside a sheet:
 * its box is sized by its content, so "86%" had nothing to be 86% of.
 */
export function useSheetMax(fraction: number): number {
  return Math.round(useWindowDimensions().height * fraction);
}

export function Sheet({
  open,
  onClose,
  children,
  label = "Close",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** What the backdrop says to a screen reader. */
  label?: string;
  /** False while something is in flight that must not be abandoned. */
  dismissible?: boolean;
}) {
  const still = useReducedMotion();
  const { height: screen } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const [height, setHeight] = useState(0);

  const y = useSharedValue(screen);
  const shown = useSharedValue(0);
  const start = useSharedValue(0);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // Enter once the sheet has been measured; leave whenever `open` drops.
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      if (!height) return;
      shown.set(withTiming(1, { duration: 200, easing: EASE_OUT }));
      if (still) {
        y.set(0);
      } else {
        y.set(height);
        y.set(withSpring(0, { duration: 300, dampingRatio: 0.9 }));
      }
      return;
    }
    shown.set(withTiming(0, { duration: 180, easing: EASE_OUT }));
    const done = () => setMounted(false);
    if (still) {
      y.set(withTiming(0, { duration: 180 }, (finished) => {
        if (finished) scheduleOnRN(done);
      }));
    } else {
      y.set(withTiming(height || screen, { duration: 220, easing: EASE_SHEET }, (finished) => {
        if (finished) scheduleOnRN(done);
      }));
    }
  }, [open, mounted, height, still, screen, shown, y]);

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    failOffsetX: [-24, 24],
    onActivate: () => {
      "worklet";
      start.set(y.get());
    },
    onUpdate: (e) => {
      "worklet";
      const next = start.get() + e.translationY;
      y.set(next >= 0 ? next : rubberband(next, height || screen));
    },
    onDeactivate: (e) => {
      "worklet";
      const h = height || screen;
      const projected = y.get() + project(e.velocityY);
      if (dismissible && projected > h * 0.4) {
        y.set(withSpring(h, { duration: 300, dampingRatio: 1, velocity: e.velocityY, overshootClamping: true }));
        shown.set(withTiming(0, { duration: 180, easing: EASE_OUT }));
        scheduleOnRN(feel.tap);
        scheduleOnRN(onClose);
      } else {
        y.set(withSpring(0, { duration: 300, dampingRatio: 0.8, velocity: e.velocityY }));
      }
    },
  });

  const backdrop = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const sheet = useAnimatedStyle(() => ({
    opacity: still ? shown.get() : 1,
    transform: [{ translateY: y.get() }],
  }));

  function measure(e: LayoutChangeEvent) {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h && h !== height) setHeight(h);
  }

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismissible ? onClose : () => undefined}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15,16,48,0.4)" }, backdrop]}>
        <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={dismissible ? onClose : undefined} style={{ flex: 1 }} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
        <Animated.View onLayout={measure} style={sheet}>
          {children}
          <GestureDetector gesture={pan}>
            {/* The grabber is drawn here, once, so every sheet has one and it
                always works. */}
            <View accessible={false} style={{ position: "absolute", top: 0, alignSelf: "center", width: 160, height: 30, alignItems: "center" }}>
              <View style={{ marginTop: 8, width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(15,16,48,0.14)" }} />
            </View>
          </GestureDetector>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
