import { useRouter } from "expo-router";
import { CalendarClock, ChevronRight, FolderHeart, ShieldAlert, Sparkles } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ArticlePill } from "@/components/learn/parts";
import { Avatar } from "@/components/ui/avatar";
import { Glass } from "@/components/ui/glass";
import { whenLabel, type HealthFile } from "@/lib/health/file";
import type { ArticleCard } from "@/lib/knowledge/catalog";
import type { ActiveProfile } from "@/lib/profiles/context";
import { shortDate } from "@/lib/records/details";
import { brand, ink, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The two blocks at the bottom of Home, which point elsewhere.
 *
 * WORTH KNOWING is two rows of pills that scroll together, each in its
 * category's own colour with the article's emblem. Tall rail cards took a
 * third of the screen for two titles; pills show six in less room. The full
 * editorial cards stay in the library, behind "See all".
 *
 * THE HEALTH FILE card is the member's file at a glance: whose it is, three
 * counts, and the one thing most worth knowing right now (the next dated
 * thing, else what the labs flagged, else allergies).
 */

export function ReadsStrip({ articles }: { articles: readonly ArticleCard[] }) {
  const router = useRouter();
  if (articles.length === 0) return null;

  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 20 }}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 21, letterSpacing: -0.4, color: ink[900] }}>
            Worth knowing
          </Text>
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push("/learn")} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingBottom: 2 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[600] }}>See all</Text>
          <ChevronRight size={16} color={brand[600]} />
        </Pressable>
      </View>
      {/* Columns of two, so both rows move as one shelf. Built by hand, no wrapping. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={278} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, gap: 10 }}>
        {pairs(articles.slice(0, 8)).map((col) => (
          <View key={col[0].id} style={{ gap: 10 }}>
            {col.map((a) => (
              <ArticlePill key={a.id} card={a} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function pairs<T>(items: readonly T[]): [T, ...T[]][] {
  const out: [T, ...T[]][] = [];
  for (let i = 0; i < items.length; i += 2) {
    const a = items[i] as T;
    const b = items[i + 1];
    out.push(b === undefined ? [a] : [a, b]);
  }
  return out;
}

type Highlight = { icon: typeof Sparkles; text: string; tint: string; bg: string };

function highlight(file: HealthFile): Highlight | null {
  const soon = file.upcoming.find((u) => u.days >= -30 && u.days <= 30);
  if (soon) {
    return { icon: CalendarClock, text: `${soon.title} · ${soon.days < 0 ? "Overdue" : whenLabel(soon.days)}`, tint: brand[700], bg: brand[50] };
  }
  if (file.flagged.length) {
    const n = file.flagged.length;
    return { icon: Sparkles, text: `${n} value${n === 1 ? "" : "s"} outside the lab's range`, tint: semantic.dangerText, bg: semantic.dangerBg };
  }
  if (file.person.allergies.length) {
    return { icon: ShieldAlert, text: `Allergic to ${file.person.allergies.join(", ")}`, tint: semantic.cautionText, bg: semantic.cautionBg };
  }
  return null;
}

export function FileCard({ file, member, loading }: { file: HealthFile | null | undefined; member: ActiveProfile; loading: boolean }) {
  const router = useRouter();
  const first = member.name.split(" ")[0] ?? member.name;
  const whose = member.isPrimary ? "Your health file" : `${first}'s health file`;
  const h = file ? highlight(file) : null;
  const stats: [string, string][] = file
    ? [
        [String(file.totals.records), file.totals.records === 1 ? "record" : "records"],
        [String(file.totals.valuesTracked), file.totals.valuesTracked === 1 ? "value tracked" : "values tracked"],
        [String(file.medicines.length), file.medicines.length === 1 ? "medicine" : "medicines"],
      ]
    : [];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${whose}. ${stats.map((s) => s.join(" ")).join(", ")}`}
      onPress={() => router.push("/health-file")}
      style={({ pressed }) => ({ marginHorizontal: 20, marginTop: 14, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <Glass strong className="rounded-[28px]" style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View>
            <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={46} />
            <View style={{ position: "absolute", right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <FolderHeart size={13} color={brand[600]} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>{whose}</Text>
            <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 2 }}>
              {loading && !file ? "Opening…" : file?.totals.lastEvent ? `Last record ${shortDate(file.totals.lastEvent)}` : "Nothing filed yet"}
            </Text>
          </View>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={18} color={ink[700]} />
          </View>
        </View>

        {stats.length ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {stats.map(([n, label]) => (
              <View key={label} style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 16, backgroundColor: "rgba(15,16,48,0.035)" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 17, color: ink[900] }}>{n}</Text>
                <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[500] }}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {h ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14, backgroundColor: h.bg }}>
            <h.icon size={14} color={h.tint} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.semibold, fontSize: 12.5, color: h.tint }}>{h.text}</Text>
          </View>
        ) : null}
      </Glass>
    </Pressable>
  );
}
