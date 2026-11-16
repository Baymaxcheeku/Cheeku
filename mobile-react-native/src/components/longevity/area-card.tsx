import { useRouter } from "expo-router";
import { ChevronRight, ClipboardCheck, Droplet, Footprints, HeartPulse, Moon, Scale } from "lucide-react-native";
import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Tap } from "@/components/ui/tap";
import type { Area, AreaKey, AreaStatus } from "@/lib/longevity/areas";
import { areaQuestion, type AreasView } from "@/lib/longevity/use-areas";
import { ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE SIX AREAS, AS A CARD.
 *
 * Home and Today's plan show the same six areas the chat talks about, with
 * no score. Each tile says how that area looks in two words; tapping it asks
 * Cheeku about it, so the card is a door into the conversation rather than a
 * dashboard to decode.
 */

const ICON: Record<AreaKey, typeof HeartPulse> = {
  heart: HeartPulse,
  sugar: Droplet,
  sleep: Moon,
  movement: Footprints,
  weight: Scale,
  checkups: ClipboardCheck,
};

const SHORT: Record<AreaKey, string> = { heart: "Heart & BP", sugar: "Sugar", sleep: "Sleep", movement: "Movement", weight: "Weight", checkups: "Check-ups" };

const LOOK: Record<AreaStatus, { word: string; dot: string; text: string; bg: string }> = {
  on_track: { word: "On track", dot: semantic.safe, text: semantic.safeText, bg: semantic.safeBg },
  watch: { word: "Keep an eye", dot: semantic.caution, text: semantic.cautionText, bg: semantic.cautionBg },
  act: { word: "Needs a step", dot: semantic.attention, text: semantic.attentionText, bg: semantic.attentionBg },
  unknown: { word: "No data yet", dot: ink[300], text: ink[500], bg: surface.tint },
};

function ask(router: ReturnType<typeof useRouter>, q: string) {
  router.push({ pathname: "/ask", params: { q, t: String(Date.now()) } });
}

/** One line under the title: the area to work on, in plain words. */
function headline(view: AreasView, name: string): string {
  const first = view.focus[0];
  if (first) return `${first.label} is the one to work on. Tap any area to talk it through.`;
  if (view.known) return `Everything Cheeku can see for ${name} is on track.`;
  return `A blood report or a connected watch fills these in for ${name}.`;
}

/** `name` is "you" for the account holder's own Home, else the member's first name. */
export function AreaCard({ view, name, title, compact = false }: { view: AreasView; name: string; title?: string; compact?: boolean }) {
  const self = name === "you";
  const whose = self ? "your" : `${name}'s`;
  const heading = title ?? (self ? "Your six areas" : `${name}'s six areas`);
  const router = useRouter();
  const tiles = compact ? [...view.focus, ...view.areas.filter((a) => !view.focus.includes(a))].slice(0, 3) : view.areas;
  return (
    <Card className="p-4" style={{ gap: 12 }}>
      <Tap accessibilityRole="button" accessibilityLabel={`${heading}. Ask Cheeku how ${self ? "you are" : `${name} is`} doing overall`} onPress={() => ask(router, "How am I doing overall?")} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>{heading}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>{headline(view, name)}</Text>
        </View>
        <ChevronRight size={18} color={ink[300]} style={{ marginTop: 2 }} />
      </Tap>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {tiles.map((a) => (
          <AreaTile key={a.key} area={a} onPress={() => ask(router, areaQuestion(a))} />
        ))}
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 11, lineHeight: 15, color: ink[300] }}>No score, no health age. Just where to look, from {whose} reports, readings and watch.</Text>
    </Card>
  );
}

function AreaTile({ area, onPress }: { area: Area; onPress: () => void }) {
  const look = LOOK[area.status];
  const Icon = ICON[area.key];
  return (
    <Tap
      scale={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${SHORT[area.key]}: ${look.word}. ${area.line} Ask Cheeku about it`}
      onPress={onPress}
      style={{ flexBasis: "30%", flexGrow: 1, minHeight: 92, borderRadius: 14, padding: 10, backgroundColor: look.bg, justifyContent: "space-between" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Icon size={17} color={ink[900]} />
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: look.dot }} />
      </View>
      <View>
        <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>
          {SHORT[area.key]}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 11, color: look.text, marginTop: 1 }}>
          {look.word}
        </Text>
      </View>
    </Tap>
  );
}
