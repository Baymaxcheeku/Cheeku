import { useRouter } from "expo-router";
import { ChevronRight, ClipboardCheck, Droplet, Footprints, HeartPulse, Moon, Plus, Scale } from "lucide-react-native";
import { Text, View } from "react-native";

import { glassShadow } from "@/components/ui/glass";
import { Tap } from "@/components/ui/tap";
import type { Area, AreaKey, AreaStatus } from "@/lib/longevity/areas";
import { areaQuestion, type AreasView } from "@/lib/longevity/use-areas";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE SIX AREAS, AS A LIST.
 *
 * Redesigned 16 Nov 2026 after the owner called the tinted tile grid "vibe
 * coded". Now an inset list in the manner of Apple Health: a quiet outline
 * icon, the area, the person's own reason in one line, and the status in
 * words. Colour is spent only on the status word, and only where it means
 * something (keep an eye, needs a step). Areas worth acting on come first;
 * the ones with nothing to go on fold into one row that says how to fill
 * them in, instead of three grey tiles saying "no data".
 *
 * Every row asks Cheeku about that area, so the card opens the conversation.
 */

const ICON: Record<AreaKey, typeof HeartPulse> = {
  heart: HeartPulse,
  sugar: Droplet,
  sleep: Moon,
  movement: Footprints,
  weight: Scale,
  checkups: ClipboardCheck,
};

const NAME: Record<AreaKey, string> = { heart: "Heart and BP", sugar: "Sugar", sleep: "Sleep", movement: "Movement", weight: "Weight", checkups: "Check-ups" };

const STATUS: Record<Exclude<AreaStatus, "unknown">, { word: string; color: string }> = {
  act: { word: "Needs a step", color: semantic.attentionText },
  watch: { word: "Keep an eye", color: semantic.cautionText },
  on_track: { word: "On track", color: semantic.safeText },
};

const RANK: Record<AreaStatus, number> = { act: 0, watch: 1, on_track: 2, unknown: 3 };

function ask(router: ReturnType<typeof useRouter>, q: string) {
  router.push({ pathname: "/ask", params: { q, t: String(Date.now()) } });
}

/** How an area reads mid-sentence: "heart and BP", "check-ups". */
const SAY: Record<AreaKey, string> = { heart: "heart and BP", sugar: "sugar", sleep: "sleep", movement: "movement", weight: "weight", checkups: "check-ups" };

function joinNames(keys: AreaKey[]): string {
  const n = keys.map((k) => SAY[k]);
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
}

/**
 * `name` is "you" on the account holder's own screens, else a first name.
 * `compact` (Today's plan) lists only the areas worth working on.
 */
export function AreaCard({ view, name, title, compact = false }: { view: AreasView; name: string; title?: string; compact?: boolean }) {
  const router = useRouter();
  const self = name === "you";
  const known = [...view.areas].filter((a) => a.status !== "unknown").sort((a, b) => RANK[a.status] - RANK[b.status]);
  const rows = compact ? known.filter((a) => a.status === "act" || a.status === "watch").slice(0, 3) : known;
  const missing = compact ? [] : view.areas.filter((a) => a.status === "unknown").map((a) => a.key);
  if (!rows.length && !missing.length) return null;

  const heading = title ?? (self ? "Your six areas" : `${name}'s six areas`);
  const first = view.focus[0];
  const sub = first
    ? `Start with ${SAY[first.key]}. Tap any area to talk it through.`
    : known.length && missing.length < 3
      ? "Everything Cheeku can see is on track."
      : `Not much to go on yet for ${self ? "you" : name}.`;
  // Heart and sugar come from blood reports; sleep and movement from a watch.
  const needsReport = missing.some((k) => k === "heart" || k === "sugar" || k === "checkups");
  const missingLine = missing.length > 3 ? `${missing.length} areas have no data yet` : `No data yet for ${joinNames(missing)}`;

  return (
    <View className="rounded-xl bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: surface.line, paddingBottom: 6 }]}>
      <View style={{ paddingBottom: 4 }}>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>
          {heading}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>{sub}</Text>
      </View>

      {rows.map((a, i) => (
        <AreaRow key={a.key} area={a} divider={i > 0} onPress={() => ask(router, areaQuestion(a))} />
      ))}

      {missing.length ? (
        <Tap
          scale={0.99}
          accessibilityRole="button"
          accessibilityLabel={`${missingLine}. ${needsReport ? "Add a report" : "Connect a watch"}`}
          onPress={() => router.push((needsReport ? "/scan" : "/wearables/connect") as never)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderTopWidth: rows.length ? 1 : 0, borderTopColor: surface.line }}
        >
          <View className="h-9 w-9 items-center justify-center rounded-md" style={{ borderWidth: 1, borderStyle: "dashed", borderColor: ink[300] }}>
            <Plus size={16} color={ink[500]} strokeWidth={1.9} />
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
              {needsReport ? "Add a blood report" : "Connect a watch"}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>
              {missingLine}
            </Text>
          </View>
          <ChevronRight size={16} color={ink[300]} />
        </Tap>
      ) : null}
    </View>
  );
}

function AreaRow({ area, divider, onPress }: { area: Area; divider: boolean; onPress: () => void }) {
  const Icon = ICON[area.key];
  const status = STATUS[area.status as keyof typeof STATUS];
  return (
    <Tap
      scale={0.99}
      accessibilityRole="button"
      accessibilityLabel={`${NAME[area.key]}, ${status.word}. ${area.line} Ask Cheeku about it`}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderTopWidth: divider ? 1 : 0, borderTopColor: surface.line }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: brand[50] }}>
        <Icon size={17} color={ink[900]} strokeWidth={1.9} />
      </View>
      <View className="min-w-0 flex-1">
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
            {NAME[area.key]}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 13, color: status.color }}>
            {status.word}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>
          {area.line}
        </Text>
      </View>
      <ChevronRight size={16} color={ink[300]} />
    </Tap>
  );
}
