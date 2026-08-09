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

/*
 * LIGHT TINTS ON A LIGHT APP.
 *
 * The first version of this rail used saturated fields — deep violet, deep
 * teal — with white type on them. Two things were wrong. Against a canvas of
 * #fafafe and a screen of white cards, a block of dark colour reads as a
 * foreign object rather than part of the page; and body copy at 12px in
 * translucent white on a mid-tone is the worst contrast on the screen.
 *
 * These are washes: a pale field, a deeper accent for the one element that
 * needs to lead, and INK-ON-LIGHT for everything readable. Contrast goes up,
 * the panels sit down into the page, and the accent still carries the
 * article's identity through to its reader header.
 *
 * Still outside the semantic set. Green, amber and red mean health severity
 * everywhere else in this app.
 */
const TINTS: Record<
  ArticleTint,
  { field: string; edge: string; accent: string; title: string; body: string }
> = {
  violet: { field: "#eeecff", edge: "#dcd8fb", accent: "#4a2ade", title: "#231a52", body: "#5b5580" },
  teal: { field: "#e4f5f2", edge: "#c9e9e3", accent: "#0e8478", title: "#123f3a", body: "#4a6f69" },
  amber: { field: "#fdf0dc", edge: "#f7e1bd", accent: "#a9631a", title: "#4a2f0d", body: "#77603f" },
  rose: { field: "#fdeaf0", edge: "#f8d3de", accent: "#c4396c", title: "#4d1730", body: "#7d5566" },
  indigo: { field: "#e9eaf7", edge: "#d3d5ee", accent: "#3835a0", title: "#1d1c4d", body: "#575682" },
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
        height: 168,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: tint.field,
        // A hairline in the tint's own family rather than a shadow. On a pale
        // panel a drop shadow muddies the edge; a border defines it cleanly.
        borderWidth: 1,
        borderColor: tint.edge,
      }}
    >
      <PanelArt accent={tint.accent} width={width} />

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
              style={{ backgroundColor: tint.accent }}
            >
              <Text
                className="text-[10px] font-semibold text-white"
                style={{ letterSpacing: 0.6 }}
              >
                For you
              </Text>
            </View>
          ) : null}
        </View>

        <View>
          {/*
           * Semibold, not bold, and tracked in slightly.
           *
           * Bold at 20px on a short line shouts without adding hierarchy —
           * there is nothing here for it to be louder THAN. Weight 600 with
           * negative tracking reads as considered rather than urgent, which is
           * the right register for a health explainer.
           */}
          <Text
            className="text-[20px] font-semibold leading-[25px]"
            style={{ color: tint.title, letterSpacing: -0.3 }}
            numberOfLines={2}
          >
            {article.title}
          </Text>
          <Text
            className="mt-1.5 text-[12.5px] leading-[18px]"
            style={{ color: tint.body }}
            numberOfLines={2}
          >
            {article.standfirst}
          </Text>

          <View className="mt-3 flex-row items-center gap-1.5">
            <Clock3 size={12} color={tint.body} />
            <Text className="text-[11.5px]" style={{ color: tint.body }}>
              {article.readMinutes} min read
            </Text>
            <View className="ml-auto flex-row items-center gap-1">
              <Text className="text-[12px] font-semibold" style={{ color: tint.accent }}>
                Read
              </Text>
              <ArrowUpRight size={14} color={tint.accent} />
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
function PanelArt({ accent, width }: { accent: string; width: number }) {
  const id = accent.slice(1);
  return (
    <Svg width={width} height={168} style={{ position: "absolute" }}>
      <Defs>
        <RadialGradient id={`bloom-${id}`} cx="0.88" cy="0.08" r="0.9">
          <Stop offset="0" stopColor={accent} stopOpacity="0.22" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* One soft bloom in the corner the type does not occupy, and two thin
          arcs in the accent. Enough to stop the panel reading as flat colour,
          quiet enough that 12.5px body copy still wins the contrast. */}
      <Circle cx={width * 0.96} cy={6} r={width * 0.62} fill={`url(#bloom-${id})`} />
      <Path
        d={`M${width * 0.58} 168 A ${width * 0.46} ${width * 0.46} 0 0 1 ${width} 30`}
        stroke={accent}
        strokeOpacity="0.14"
        strokeWidth="1.2"
        fill="none"
      />
      <Path
        d={`M${width * 0.76} 168 A ${width * 0.32} ${width * 0.32} 0 0 1 ${width} 70`}
        stroke={accent}
        strokeOpacity="0.1"
        strokeWidth="1.2"
        fill="none"
      />
    </Svg>
  );
}
