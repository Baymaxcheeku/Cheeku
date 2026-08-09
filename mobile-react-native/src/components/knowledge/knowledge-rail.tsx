import { useRouter } from "expo-router";
import { ArrowUpRight, BookOpen, Clock3 } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";

import type { ArticleCard, ArticleTint } from "@/lib/knowledge/queries";
import { ink } from "@/theme/tokens";

/*
 * The knowledge rail.
 *
 * COLOUR-BLOCKED PANELS, NOT CARDS. A card is a white rectangle with a border
 * and a shadow, and this screen already has five of them — another one would
 * be read as more of the same and skipped. These are full-bleed fields of
 * colour with the type sitting directly on them, which is why a Monzo account
 * tile reads instantly from across a room while a bordered list row does not.
 *
 * The palette is deliberately OUTSIDE the semantic set. Green, amber and red
 * carry health meaning everywhere else in this app, so an article about
 * diabetes must not arrive on an amber panel that elsewhere means "caution
 * about your own results". These five hues are editorial only.
 */

const TINTS: Record<ArticleTint, { from: string; to: string; ink: string; soft: string }> = {
  violet: { from: "#5b4ef0", to: "#3b2bc9", ink: "#ffffff", soft: "rgba(255,255,255,0.72)" },
  teal: { from: "#0f9b8e", to: "#0b6c6b", ink: "#ffffff", soft: "rgba(255,255,255,0.75)" },
  amber: { from: "#f0a13a", to: "#d2761b", ink: "#2b1a05", soft: "rgba(43,26,5,0.62)" },
  rose: { from: "#f2789e", to: "#d24d7d", ink: "#33101f", soft: "rgba(51,16,31,0.62)" },
  indigo: { from: "#3f3d9e", to: "#22206b", ink: "#ffffff", soft: "rgba(255,255,255,0.72)" },
};

/** Gutter and gap must match the rail's padding, or the snap lands off-centre. */
const GUTTER = 20;
const GAP = 12;

export function KnowledgeRail({ articles }: { articles: readonly ArticleCard[] }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  if (articles.length === 0) return null;

  /*
   * A panel is the screen minus the gutters minus a peek of the next one.
   * The peek is the affordance: without it a single panel looks like a static
   * banner and nobody swipes. 28pt is enough to read as "there is more".
   */
  const panelWidth = Math.min(width, 393) - GUTTER * 2 - 28;
  const snap = panelWidth + GAP;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / snap);
    if (next !== index) setIndex(next);
  }

  return (
    <View className="mt-6">
      <View className="flex-row items-center gap-2 px-5">
        <BookOpen size={15} color={ink[300]} />
        <Text className="text-[12px] font-bold uppercase tracking-wide text-ink-300">
          Worth knowing
        </Text>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snap}
        snapToAlignment="start"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: GAP, paddingVertical: 10 }}
      >
        {articles.map((article) => (
          <Panel
            key={article.id}
            article={article}
            width={panelWidth}
            onPress={() => router.push(`/article/${article.slug}`)}
          />
        ))}
      </ScrollView>

      {/*
       * Dots only when there is more than one. A single dot is a decoration
       * that tells the reader nothing and implies something is missing.
       */}
      {articles.length > 1 ? (
        <View className="mt-0.5 flex-row justify-center gap-1.5">
          {articles.map((article, i) => (
            <View
              key={article.id}
              style={{
                height: 5,
                width: i === index ? 18 : 5,
                borderRadius: 999,
                backgroundColor: i === index ? ink[500] : ink[300],
                opacity: i === index ? 1 : 0.4,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Panel({
  article,
  width,
  onPress,
}: {
  article: ArticleCard;
  width: number;
  onPress: () => void;
}) {
  const tint = TINTS[article.tint] ?? TINTS.violet;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${article.title}. ${article.readMinutes} minute read`}
      onPress={onPress}
      style={{
        width,
        height: 172,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: tint.from,
        // A coloured shadow rather than a grey one: a grey shadow under a
        // saturated panel reads as dirt on the screen.
        shadowColor: tint.to,
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      }}
    >
      <PanelArt from={tint.from} to={tint.to} width={width} />

      <View className="flex-1 justify-between p-4">
        <View className="flex-row">
          {article.forYou ? (
            /*
             * Only shown when the article genuinely matched something the
             * reader declared. A "for you" badge on a general pick is the
             * cheapest possible lie and readers spot it immediately.
             */
            <View
              className="rounded-pill px-2.5 py-1"
              style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
            >
              <Text className="text-[10.5px] font-bold" style={{ color: tint.ink }}>
                FOR YOU
              </Text>
            </View>
          ) : null}
        </View>

        <View>
          <Text
            className="text-[19px] font-bold leading-[23px] tracking-tight"
            style={{ color: tint.ink }}
            numberOfLines={2}
          >
            {article.title}
          </Text>
          <Text
            className="mt-1 text-[12px] leading-[17px]"
            style={{ color: tint.soft }}
            numberOfLines={2}
          >
            {article.standfirst}
          </Text>

          <View className="mt-2.5 flex-row items-center gap-1.5">
            <Clock3 size={12} color={tint.soft} />
            <Text className="text-[11px] font-medium" style={{ color: tint.soft }}>
              {article.readMinutes} min read
            </Text>
            <View className="ml-auto flex-row items-center gap-1">
              <Text className="text-[11.5px] font-bold" style={{ color: tint.ink }}>
                Read
              </Text>
              <ArrowUpRight size={13} color={tint.ink} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * The light in the corner and the two arcs.
 *
 * Flat colour at this size looks like a placeholder, and a photograph would
 * mean sourcing and shipping images for editorial that changes weekly. A
 * radial highlight plus two thin arcs gives the panel depth and a little
 * motion for nothing, and it scales to any article without an asset.
 */
function PanelArt({ from, to, width }: { from: string; to: string; width: number }) {
  return (
    <Svg width={width} height={172} style={{ position: "absolute" }}>
      <Defs>
        <RadialGradient id={`glow-${from.slice(1)}`} cx="0.82" cy="0.1" r="0.95">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.34" />
          <Stop offset="0.55" stopColor={from} stopOpacity="0" />
          <Stop offset="1" stopColor={to} stopOpacity="0.55" />
        </RadialGradient>
      </Defs>
      <Circle cx={width} cy={0} r={width} fill={`url(#glow-${from.slice(1)})`} />
      <Path
        d={`M${width * 0.55} 172 A ${width * 0.5} ${width * 0.5} 0 0 1 ${width} 24`}
        stroke="#ffffff"
        strokeOpacity="0.16"
        strokeWidth="1.4"
        fill="none"
      />
      <Path
        d={`M${width * 0.72} 172 A ${width * 0.36} ${width * 0.36} 0 0 1 ${width} 62`}
        stroke="#ffffff"
        strokeOpacity="0.12"
        strokeWidth="1.4"
        fill="none"
      />
    </Svg>
  );
}
