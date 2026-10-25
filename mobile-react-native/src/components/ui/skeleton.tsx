import { useEffect } from "react";
import { ScrollView, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { radius, surface } from "@/theme/tokens";

/*
 * First-load placeholders shaped like the screen that is coming (UI audit,
 * October 2026). A centred spinner says "wait"; a skeleton says "this is
 * where your things will be", and the layout does not jump when they land.
 * The pulse is a loading signal, so unlike decorative loops it runs until the
 * data arrives. Reduce Motion: still.
 *
 * EVERY FIRST LOAD (UI batch 5). Screens use the shaped skeletons below
 * (Home, a card list, the health file, Ask) or compose one from the kit:
 * ListSkeleton, FormSkeleton, DetailSkeleton, GridSkeleton, ChatSkeleton and
 * LinesSkeleton, inside ScreenSkeleton when the whole screen is waiting so
 * the header and the way back are already there. A spinner is only for an
 * action in progress (a button, an upload), never for a screen arriving.
 */

function usePulse() {
  const still = useReducedMotion();
  const o = useSharedValue(0.6);
  useEffect(() => {
    if (still) return;
    o.set(withRepeat(withSequence(withTiming(1, { duration: 650 }), withTiming(0.6, { duration: 650 })), -1));
  }, [still, o]);
  return useAnimatedStyle(() => ({ opacity: o.get() }));
}

export function Bone({ w = "100%", h, r = 8, tint = false, style }: { w?: DimensionValue; h: number; r?: number; tint?: boolean; style?: ViewStyle }) {
  return <View style={[{ width: w, height: h, borderRadius: r, backgroundColor: tint ? surface.tint : surface.line }, style]} />;
}

function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ backgroundColor: "#ffffff", borderRadius: radius.card, padding: 16, gap: 10 }, style]}>{children}</View>;
}

function Row() {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <Bone w={44} h={44} r={14} />
      <View style={{ flex: 1, gap: 7 }}>
        <Bone w="62%" h={13} r={7} />
        <Bone w="40%" h={11} r={6} tint />
      </View>
    </View>
  );
}

/** Home: the greeting, the step card and the plan list. */
export function HomeSkeleton({ topInset }: { topInset: number }) {
  const pulse = usePulse();
  return (
    <View accessibilityLabel="Loading" style={{ flex: 1, backgroundColor: surface.canvas, paddingTop: topInset + 12, paddingHorizontal: 20 }}>
      <Animated.View style={[{ gap: 18 }, pulse]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Bone w={170} h={48} r={24} />
          <Bone w={48} h={48} r={24} />
        </View>
        <View style={{ gap: 8 }}>
          <Bone w="58%" h={30} r={10} />
          <Bone w="72%" h={30} r={10} />
        </View>
        <Card style={{ height: 250, justifyContent: "flex-end" }}>
          <Bone w="70%" h={24} r={9} />
          <Bone w="50%" h={14} r={7} tint />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Bone w={150} h={46} r={23} />
            <Bone w={86} h={46} r={23} tint />
          </View>
        </Card>
        <Card>
          <Row />
          <Row />
          <Row />
        </Card>
      </Animated.View>
    </View>
  );
}

/** A list of record or plan cards. */
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  const pulse = usePulse();
  return (
    <Animated.View accessibilityLabel="Loading" style={[{ gap: 10, marginTop: 14 }, pulse]}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} style={{ padding: 10, borderRadius: 24 }}>
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <Bone w={68} h={68} r={20} />
            <View style={{ flex: 1, gap: 8 }}>
              <Bone w="34%" h={11} r={6} tint />
              <Bone w="66%" h={15} r={7} />
              <Bone w="48%" h={11} r={6} tint />
            </View>
          </View>
        </Card>
      ))}
    </Animated.View>
  );
}

/** The health file: who, three numbers, then values. */
export function FileSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View accessibilityLabel="Loading" style={[{ gap: 14, marginTop: 12 }, pulse]}>
      <Card>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <Bone w={64} h={64} r={32} />
          <View style={{ flex: 1, gap: 8 }}>
            <Bone w="60%" h={18} r={8} />
            <Bone w="44%" h={12} r={6} tint />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Bone w="31%" h={52} r={16} tint />
          <Bone w="31%" h={52} r={16} tint />
          <Bone w="31%" h={52} r={16} tint />
        </View>
      </Card>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Bone w="31%" h={64} r={20} />
        <Bone w="31%" h={64} r={20} />
        <Bone w="31%" h={64} r={20} />
      </View>
      <Card>
        <Row />
        <Row />
        <Row />
      </Card>
    </Animated.View>
  );
}

/** Ask: the header, a centred intro and the composer. */
export function AskSkeleton({ topInset, bottomInset }: { topInset: number; bottomInset: number }) {
  const pulse = usePulse();
  return (
    <View accessibilityLabel="Loading" style={{ flex: 1, backgroundColor: surface.canvas, paddingTop: topInset + 10, paddingHorizontal: 18, paddingBottom: bottomInset + 12 }}>
      <Animated.View style={[{ flex: 1, gap: 14 }, pulse]}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Bone w={44} h={44} r={22} />
          <View style={{ flex: 1, gap: 7 }}>
            <Bone w="30%" h={14} r={7} />
            <Bone w="50%" h={11} r={6} tint />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Bone w={96} h={30} r={15} />
          <Bone w={140} h={30} r={15} tint />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Bone w={120} h={120} r={60} tint />
          <Bone w="50%" h={22} r={9} />
          <Bone w="80%" h={13} r={7} tint />
          <Bone w="70%" h={13} r={7} tint />
        </View>
        <Bone h={56} r={28} />
      </Animated.View>
    </View>
  );
}

// ------------------------------------------------------------------ kit --

/** The pulse as a wrapper, for building a skeleton inside an existing layout. */
export function Pulse({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const pulse = usePulse();
  return (
    <Animated.View accessibilityLabel="Loading" style={[style, pulse]}>
      {children}
    </Animated.View>
  );
}

/** A whole screen waiting: the real header and back button, the shape below. */
export function ScreenSkeleton({ title, header = true, children }: { title?: string; header?: boolean; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      {header ? <ScreenHeader title={title} /> : null}
      <ScrollView scrollEnabled={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: header ? 8 : insets.top + 12, paddingBottom: insets.bottom + 24 }}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Rows in a card: settings lists, chats, members, bookings. */
export function ListSkeleton({ rows = 5, round = false, style }: { rows?: number; round?: boolean; style?: ViewStyle }) {
  return (
    <Pulse style={[{ marginTop: 12 }, style]}>
      <Card style={{ gap: 16 }}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Bone w={40} h={40} r={round ? 20 : radius.md} />
            <View style={{ flex: 1, gap: 7 }}>
              <Bone w={i % 2 ? "48%" : "64%"} h={13} r={7} />
              <Bone w={i % 2 ? "70%" : "38%"} h={11} r={6} tint />
            </View>
          </View>
        ))}
      </Card>
    </Pulse>
  );
}

/** Labels and fields: the settings forms. */
export function FormSkeleton({ fields = 4, style }: { fields?: number; style?: ViewStyle }) {
  return (
    <Pulse style={[{ marginTop: 12, gap: 12 }, style]}>
      <Card style={{ gap: 14 }}>
        {Array.from({ length: fields }, (_, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Bone w={i % 2 ? "26%" : "34%"} h={11} r={6} tint />
            <Bone h={48} r={radius.lg} />
          </View>
        ))}
      </Card>
    </Pulse>
  );
}

/** A hero, a few lines of text and a card of rows: a record, an article, a booking, a member. */
export function DetailSkeleton({ hero = 200, round = false }: { hero?: number; round?: boolean }) {
  return (
    <Pulse style={{ gap: 14, marginTop: 4 }}>
      <Card style={{ height: hero, alignItems: round ? "center" : "stretch", justifyContent: round ? "center" : "flex-end" }}>
        {round ? <Bone w={88} h={88} r={44} /> : null}
        <Bone w={round ? "52%" : "70%"} h={22} r={9} />
        <Bone w={round ? "36%" : "46%"} h={13} r={7} tint />
      </Card>
      <View style={{ gap: 8, paddingHorizontal: 4 }}>
        <Bone h={13} r={7} />
        <Bone w="92%" h={13} r={7} />
        <Bone w="64%" h={13} r={7} />
      </View>
      <Card>
        <Row />
        <Row />
        <Row />
      </Card>
    </Pulse>
  );
}

/** Two-up tiles: catalogues and libraries. */
export function GridSkeleton({ tiles = 4, height = 150 }: { tiles?: number; height?: number }) {
  return (
    <Pulse style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {Array.from({ length: tiles }, (_, i) => (
        <Card key={i} style={{ width: "47.5%", height, justifyContent: "flex-end" }}>
          <Bone w={36} h={36} r={radius.md} tint style={{ position: "absolute", top: 16, left: 16 }} />
          <Bone w="80%" h={14} r={7} />
          <Bone w="50%" h={11} r={6} tint />
        </Card>
      ))}
    </Pulse>
  );
}

/** A conversation arriving: bubbles on both sides. */
export function ChatSkeleton() {
  const widths: [DimensionValue, boolean][] = [["62%", false], ["48%", true], ["74%", false], ["40%", true], ["66%", false]];
  return (
    <Pulse style={{ gap: 12, marginTop: 12 }}>
      {widths.map(([w, mine], i) => (
        <Bone key={i} w={w} h={i % 2 ? 44 : 64} r={radius.xl} tint={mine} style={{ alignSelf: mine ? "flex-end" : "flex-start" }} />
      ))}
    </Pulse>
  );
}

/** A couple of lines inside a card that is already on screen. */
export function LinesSkeleton({ lines = 2, style }: { lines?: number; style?: ViewStyle }) {
  return (
    <Pulse style={[{ gap: 8, paddingVertical: 6 }, style]}>
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} w={i === lines - 1 ? "58%" : "100%"} h={12} r={6} tint={i > 0} />
      ))}
    </Pulse>
  );
}

