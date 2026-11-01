import { useRouter } from "expo-router";
import {
  Activity,
  Apple,
  Baby,
  BookOpen,
  Check,
  Clock3,
  Droplet,
  FlaskConical,
  Gauge,
  Heart,
  HeartPulse,
  House,
  Moon,
  Pill,
  Ruler,
  ShieldCheck,
  Syringe,
  type LucideIcon,
} from "lucide-react-native";
import { Text, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";

import { Tap } from "@/components/ui/tap";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { CATEGORY_LABEL, readLabel, type ArticleCard, type ArticleCategory, type ArticleIcon } from "@/lib/knowledge/catalog";
import { brand, hue, ink, lilac } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE CONTENT DESIGN LANGUAGE.
 *
 * Articles are the editorial side of the app, so they look like it: each
 * category has its own colour family (a pale field, a soft ring, an accent,
 * a deep ink for titles), and each article its own mark, drawn as a small
 * layered emblem rather than a stock icon in a grey square. A reader learns
 * the families quickly: violet is reading your reports, teal is caring for
 * family, blue is staying ahead.
 *
 * None of these are the semantic hues. Green, amber and red say how a health
 * result reads, and an article about blood pressure is not "bad news" because
 * it is about blood pressure.
 */

export type CategoryStyle = { field: string; soft: string; accent: string; deep: string; body: string };

export const CATEGORY_STYLE: Record<ArticleCategory, CategoryStyle> = {
  reports: { field: lilac.base, soft: lilac.violet, accent: brand[600], deep: "#221a55", body: hue.slate.fg },
  family: { field: hue.teal.bg, soft: "#c4ebe3", accent: hue.teal.fg, deep: "#113f39", body: "#4a6f69" },
  prevention: { field: hue.blue.wash, soft: hue.blue.bg, accent: hue.blue.fg, deep: "#0f2e52", body: "#4f6886" },
  pregnancy: { field: hue.rose.bg, soft: "#f8d2df", accent: hue.rose.fg, deep: "#4d1730", body: "#7d5566" },
  living: { field: hue.orange.wash, soft: hue.orange.bg, accent: "#b5532a", deep: "#4a230f", body: "#7a5c4b" },
};

export const ICONS: Record<ArticleIcon, LucideIcon> = {
  book: BookOpen,
  droplet: Droplet,
  ruler: Ruler,
  heart: HeartPulse,
  activity: Activity,
  gauge: Gauge,
  baby: Baby,
  syringe: Syringe,
  shield: ShieldCheck,
  home: House,
  flask: FlaskConical,
  pill: Pill,
  apple: Apple,
  moon: Moon,
};

/** The article's mark: a soft ring, a white disc, the icon, two small dots. */
export function Emblem({ icon, category, size = 56 }: { icon: ArticleIcon; category: ArticleCategory; size?: number }) {
  const s = CATEGORY_STYLE[category];
  const Icon = ICONS[icon] ?? BookOpen;
  const inner = size * 0.68;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: s.soft }} />
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" }}>
        <Icon size={size * 0.34} color={s.accent} strokeWidth={1.8} />
      </View>
      <View style={{ position: "absolute", top: size * 0.04, right: size * 0.02, width: size * 0.14, height: size * 0.14, borderRadius: size, backgroundColor: s.accent, opacity: 0.85 }} />
      <View style={{ position: "absolute", bottom: size * 0.1, left: -size * 0.02, width: size * 0.09, height: size * 0.09, borderRadius: size, backgroundColor: s.accent, opacity: 0.4 }} />
    </View>
  );
}

export function Eyebrow({ category, color }: { category: ArticleCategory; color?: string }) {
  return (
    <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: color ?? CATEGORY_STYLE[category].accent }}>
      {CATEGORY_LABEL[category]}
    </Text>
  );
}

/** Minutes, "For you", or "Read", in the category's ink. */
export function ReadMeta({ card, light }: { card: ArticleCard; light?: boolean }) {
  const s = CATEGORY_STYLE[card.category];
  const finished = card.read?.finished;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {finished ? <Check size={12} color={s.accent} strokeWidth={2.6} /> : <Clock3 size={12} color={s.body} />}
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: finished ? s.accent : s.body }}>{readLabel(card)}</Text>
      </View>
      {card.forYou && !finished ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, backgroundColor: light ? "rgba(255,255,255,0.85)" : s.field }}>
          <Heart size={10} color={s.accent} />
          <Text style={{ fontFamily: font.semibold, fontSize: 11, color: s.accent }}>For you</Text>
        </View>
      ) : null}
    </View>
  );
}

/** How far through, as a hairline along the bottom of a card. */
export function ProgressLine({ card }: { card: ArticleCard }) {
  if (!card.read || card.read.finished || card.read.progress < 0.05) return null;
  return (
    <View style={{ height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.7)", overflow: "hidden" }}>
      <View style={{ width: `${Math.round(card.read.progress * 100)}%`, height: 3, backgroundColor: CATEGORY_STYLE[card.category].accent }} />
    </View>
  );
}

/**
 * The Home rail's card: a pastel panel in the category's colour, the emblem
 * top right, the category as an eyebrow, the title doing the work.
 */
export function RailCard({ card, width = 236 }: { card: ArticleCard; width?: number }) {
  const router = useRouter();
  const s = CATEGORY_STYLE[card.category];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${CATEGORY_LABEL[card.category]}. ${readLabel(card)}`}
      onPress={() => router.push(`/article/${card.slug}`)}
      style={[glassShadow, { width, height: 204, borderRadius: 32, overflow: "hidden" }]}
    >
      <Gradient from={s.soft} to={s.field} angle="diagonal" glow="#ffffff" />
      <View style={{ position: "absolute", right: -36, top: -36, width: 140, height: 140, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.45)" }} />
      <View style={{ flex: 1, padding: 16, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View style={{ flex: 1, paddingTop: 4 }}>
            <Eyebrow category={card.category} />
          </View>
          <Emblem icon={card.icon} category={card.category} size={52} />
        </View>
        <View style={{ gap: 10 }}>
          <Text numberOfLines={3} style={{ fontFamily: font.semibold, fontSize: 17, lineHeight: 21.5, letterSpacing: -0.3, color: s.deep }}>
            {card.title}
          </Text>
          <ReadMeta card={card} light />
          <ProgressLine card={card} />
        </View>
      </View>
    </Tap>
  );
}

/** A row in the library: emblem, eyebrow, title, standfirst, meta. */
export function ArticleRow({ card, showCategory = true }: { card: ArticleCard; /** Off inside a category's own shelf. */ showCategory?: boolean }) {
  const router = useRouter();
  const s = CATEGORY_STYLE[card.category];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${readLabel(card)}`}
      onPress={() => router.push(`/article/${card.slug}`)}
      style={({ pressed }) => ({ flexDirection: "row", gap: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ width: 64, height: 76, borderRadius: 24, backgroundColor: s.field, alignItems: "center", justifyContent: "center" }}>
        <Emblem icon={card.icon} category={card.category} size={44} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        {showCategory ? <Eyebrow category={card.category} /> : null}
        <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: ink[900] }}>
          {card.title}
        </Text>
        {card.standfirst ? (
          <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500] }}>
            {card.standfirst}
          </Text>
        ) : null}
        <View style={{ marginTop: 2 }}>
          <ReadMeta card={card} />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * The compact pill for Home: emblem, title, minutes. Two rows of these take
 * about half the height of one row of rail cards, and still say the category
 * at a glance through its colour.
 */
export function ArticlePill({ card, width = 268 }: { card: ArticleCard; width?: number }) {
  const router = useRouter();
  const s = CATEGORY_STYLE[card.category];
  const finished = card.read?.finished;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${CATEGORY_LABEL[card.category]}. ${readLabel(card)}`}
      onPress={() => router.push(`/article/${card.slug}`)}
      style={{
        width,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        paddingLeft: 8,
        paddingRight: 16,
        borderRadius: 999,
        backgroundColor: s.field,
        borderWidth: 1,
        borderColor: s.soft,
      }}
    >
      <Emblem icon={card.icon} category={card.category} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 13, lineHeight: 17, letterSpacing: -0.1, color: s.deep }}>
          {card.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {finished ? <Check size={11} color={s.accent} strokeWidth={2.6} /> : card.forYou ? <Heart size={11} color={s.accent} /> : null}
          <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12, color: finished || card.forYou ? s.accent : s.body }}>
            {[card.forYou && !finished ? "For you" : null, readLabel(card)].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </View>
    </Tap>
  );
}
