import { useEffect, useRef, useState } from "react";
import { Platform, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";

import { Tap } from "@/components/ui/tap";
import { useReducedMotion } from "@/components/ui/motion";
import { feel } from "@/lib/feel";
import { ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import type { SnapshotTile } from "../insights";
import { Bars, Ring, toneColor } from "./parts";

/*
 * Your numbers on a lens.
 *
 * A row of slides you swipe sideways without leaving Home, built like the
 * zoom ring of a camera: the slide in the middle is in focus, full size and
 * facing you; its neighbours turn away round a barrel, shrink and dim, and a
 * ruler of ticks under the row slides with your thumb, a long tick for each
 * metric, so you can feel where you are. It settles on a slide, never
 * between two, with one soft tick of the phone when it does.
 *
 * Tapping the slide in focus opens that metric. Tapping a neighbour brings it
 * into focus first. With Reduce Motion on, it is a plain paging row.
 */

const MAJOR = 46; // ruler px between two metrics
const MINOR_PER_MAJOR = 5;

export function LensStrip({ tiles, onOpen }: { tiles: SnapshotTile[]; onOpen: (key: SnapshotTile["key"]) => void }) {
  const still = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const x = useSharedValue(0);
  const scroller = useAnimatedRef<Animated.ScrollView>();
  const hinted = useRef(false);

  const item = Math.max(120, Math.round(width * 0.44));
  const side = Math.max(0, (width - item) / 2);

  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => (x.value = e.contentOffset.x) });

  function settle(offset: number) {
    const i = Math.max(0, Math.min(tiles.length - 1, Math.round(offset / item)));
    if (i !== index) {
      setIndex(i);
      feel.tick();
    }
  }

  function go(i: number) {
    scroller.current?.scrollTo({ x: i * item, animated: true });
    if (Platform.OS === "web") settle(i * item);
  }

  /*
   * Once per visit to Home, the lens turns a little and back, so it is plain
   * that it moves. Not with Reduce Motion, and not with a single slide.
   */
  useEffect(() => {
    if (still || hinted.current || width === 0 || tiles.length < 2) return;
    hinted.current = true;
    const a = setTimeout(() => scroller.current?.scrollTo({ x: item * 0.38, animated: true }), 700);
    const b = setTimeout(() => scroller.current?.scrollTo({ x: 0, animated: true }), 1150);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [still, width, item, tiles.length, scroller]);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ marginHorizontal: -16 }}>
      {width > 0 ? (
        <>
          <Animated.ScrollView
            ref={scroller}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={item}
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEventThrottle={16}
            onScroll={onScroll}
            onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
            onScrollEndDrag={(e) => Platform.OS === "web" && settle(e.nativeEvent.contentOffset.x)}
            contentContainerStyle={{ paddingHorizontal: side, paddingVertical: 6 }}
            accessibilityRole="adjustable"
            accessibilityLabel={`Your numbers, ${index + 1} of ${tiles.length}. ${describe(tiles[index])}`}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }, { name: "activate" }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === "increment") go(Math.min(tiles.length - 1, index + 1));
              if (e.nativeEvent.actionName === "decrement") go(Math.max(0, index - 1));
              if (e.nativeEvent.actionName === "activate" && tiles[index]) onOpen(tiles[index]!.key);
            }}
          >
            {tiles.map((t, i) => (
              <Slide key={t.key} tile={t} i={i} x={x} item={item} still={still} focused={i === index} onPress={() => (i === index ? onOpen(t.key) : go(i))} />
            ))}
          </Animated.ScrollView>

          <Ruler x={x} item={item} count={tiles.length} width={width} still={still} />
        </>
      ) : (
        <View style={{ height: 196 }} />
      )}
    </View>
  );
}

function describe(t: SnapshotTile | undefined): string {
  if (!t) return "";
  return `${t.label}, ${t.value}${t.unit ? ` ${t.unit}` : ""}. ${t.line}.`;
}

function Slide({ tile, i, x, item, still, focused, onPress }: { tile: SnapshotTile; i: number; x: SharedValue<number>; item: number; still: boolean; focused: boolean; onPress: () => void }) {
  const lens = useAnimatedStyle(() => {
    const d = (x.value - i * item) / item;
    if (still) return { opacity: interpolate(Math.abs(d), [0, 1], [1, 0.55], Extrapolation.CLAMP) };
    return {
      opacity: interpolate(d, [-2, -1, 0, 1, 2], [0.15, 0.55, 1, 0.55, 0.15], Extrapolation.CLAMP),
      transform: [
        { perspective: 700 },
        // Pull the neighbours in a little so the row reads as one curved glass.
        { translateX: interpolate(d, [-1, 0, 1], [-item * 0.1, 0, item * 0.1], Extrapolation.EXTEND) },
        { rotateY: `${interpolate(d, [-1, 0, 1], [-34, 0, 34], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(Math.abs(d), [0, 1, 2], [1, 0.84, 0.74], Extrapolation.CLAMP) },
      ],
    };
  });
  // The focus corners fade in as a slide reaches the middle.
  const ring = useAnimatedStyle(() => ({ opacity: interpolate(Math.abs((x.value - i * item) / item), [0, 0.6], [1, 0], Extrapolation.CLAMP) }));

  return (
    <Animated.View style={[{ width: item, alignItems: "center" }, lens]}>
      <Tap onPress={onPress} scale={0.97} accessibilityElementsHidden={!focused} importantForAccessibility={focused ? "auto" : "no-hide-descendants"} style={{ width: item - 10 }}>
        <View style={{ borderRadius: 22, backgroundColor: surface.tint, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, height: 172 }}>
          {/* Focus corners, like the autofocus frame in a viewfinder. Only on the slide in the middle. */}
          <Animated.View pointerEvents="none" style={[{ position: "absolute", inset: 7 }, ring]}>
            <Corner at="tl" />
            <Corner at="tr" />
            <Corner at="bl" />
            <Corner at="br" />
          </Animated.View>
          <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>
            {tile.label}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, marginTop: 6 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 30, letterSpacing: -1, color: ink[900], fontVariant: ["tabular-nums"] }}>
              {tile.value}
            </Text>
            {tile.unit ? <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500], marginBottom: 6 }}>{tile.unit}</Text> : null}
          </View>
          <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: toneColor(tile.tone), marginTop: 1 }}>
            {tile.line}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            {tile.progress !== null ? <Ring size={30} stroke={4} progress={tile.progress} /> : null}
            <View style={{ flex: 1 }}>
              <Bars values={tile.bars} height={30} />
            </View>
          </View>
        </View>
      </Tap>
    </Animated.View>
  );
}

const ARM = 12;

function Corner({ at }: { at: "tl" | "tr" | "bl" | "br" }) {
  const top = at[0] === "t";
  const left = at[1] === "l";
  return (
    <View
      style={{
        position: "absolute",
        width: ARM,
        height: ARM,
        ...(top ? { top: 0 } : { bottom: 0 }),
        ...(left ? { left: 0 } : { right: 0 }),
        borderColor: ink[900],
        borderTopWidth: top ? 2 : 0,
        borderBottomWidth: top ? 0 : 2,
        borderLeftWidth: left ? 2 : 0,
        borderRightWidth: left ? 0 : 2,
        borderTopLeftRadius: top && left ? 8 : 0,
        borderTopRightRadius: top && !left ? 8 : 0,
        borderBottomLeftRadius: !top && left ? 8 : 0,
        borderBottomRightRadius: !top && !left ? 8 : 0,
      }}
    />
  );
}

/** The zoom ring: ticks that slide with the row, a long one for each metric, under a fixed marker. */
function Ruler({ x, item, count, width, still }: { x: SharedValue<number>; item: number; count: number; width: number; still: boolean }) {
  const ticks = (count - 1) * MINOR_PER_MAJOR + 1;
  const gap = MAJOR / MINOR_PER_MAJOR;
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: width / 2 - (x.value / item) * MAJOR }] }));
  return (
    <View style={{ height: 26, marginTop: 6, overflow: "hidden" }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ position: "absolute", left: 0, top: 4, flexDirection: "row", alignItems: "flex-start" }, move]}>
        {Array.from({ length: ticks }, (_, n) => {
          const major = n % MINOR_PER_MAJOR === 0;
          return <Tick key={n} n={n} gap={gap} major={major} x={x} item={item} still={still} />;
        })}
      </Animated.View>
      {/* The fixed marker the ruler slides under. */}
      <View style={{ position: "absolute", left: width / 2 - 1.5, top: 0, width: 3, height: 18, borderRadius: 2, backgroundColor: ink[900] }} />
    </View>
  );
}

function Tick({ n, gap, major, x, item, still }: { n: number; gap: number; major: boolean; x: SharedValue<number>; item: number; still: boolean }) {
  // Ticks near the marker stand a little taller and darker, like a lit scale.
  const lit = useAnimatedStyle(() => {
    const at = (x.value / item) * MINOR_PER_MAJOR;
    const near = interpolate(Math.abs(at - n), [0, 6], [1, 0], Extrapolation.CLAMP);
    return { opacity: 0.25 + near * 0.6, transform: [{ scaleY: still ? 1 : 1 + near * 0.4 }] };
  });
  return (
    <View style={{ width: gap, alignItems: "flex-start", marginLeft: n === 0 ? -0.75 : 0 }}>
      <Animated.View style={[{ width: 1.5, height: major ? 12 : 6, borderRadius: 1, backgroundColor: ink[900], transformOrigin: "top" }, lit]} />
    </View>
  );
}
