import { useRouter } from "expo-router";
import { BookOpen, ChevronRight, FolderHeart } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Glass, glass, glassShadow } from "@/components/ui/glass";
import type { ArticleCard } from "@/lib/knowledge/queries";
import type { HealthOverview } from "@/lib/records/overview";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The small blocks at the bottom of Home. Each is one line tall on purpose:
 * they point somewhere else, and the screen's height belongs to Cheeku.
 */

/**
 * Worth knowing, as glass pills. Title and minutes are enough to decide
 * whether to tap, which is the only decision this block exists to prompt.
 */
export function ReadsStrip({ articles }: { articles: readonly ArticleCard[] }) {
  const router = useRouter();
  if (articles.length === 0) return null;

  return (
    <View className="mt-7">
      <Text style={{ fontFamily: font.semibold, fontSize: 21, letterSpacing: -0.4, color: ink[900], paddingHorizontal: 20 }}>
        Worth knowing
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 8 }}
      >
        {articles.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            accessibilityLabel={`${a.title}. ${a.readMinutes} minute read`}
            onPress={() => router.push(`/article/${a.slug}`)}
            style={({ pressed }) => [
              glassShadow,
              {
                maxWidth: 280,
                height: 48,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingLeft: 6,
                paddingRight: 16,
                borderRadius: 999,
                backgroundColor: glass.fillStrong,
                borderWidth: 1,
                borderColor: glass.rim,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <View className="h-9 w-9 items-center justify-center rounded-pill" style={{ backgroundColor: brand[50] }}>
              <BookOpen size={16} color={brand[600]} strokeWidth={1.8} />
            </View>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.medium, fontSize: 13.5, color: ink[900] }}>
              {a.title}
            </Text>
            <Text numberOfLines={1} style={{ flexShrink: 0, fontFamily: font.regular, fontSize: 12, color: ink[300] }}>
              {a.readMinutes} min
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** The health file, as one glass row. The full summary lives at /health-file. */
export function FileStrip({ overview }: { overview: HealthOverview }) {
  const router = useRouter();
  const docs = overview.totalDocuments;
  const meds = overview.medications.length;
  const meta =
    docs === 0
      ? "Nothing filed yet"
      : `${docs} ${docs === 1 ? "report" : "reports"} · ${overview.dataPoints} values · ${meds} ${meds === 1 ? "medicine" : "medicines"}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Health file. ${meta}`}
      onPress={() => router.push("/health-file")}
      style={({ pressed }) => ({ marginHorizontal: 20, marginTop: 12, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <Glass strong className="flex-row items-center gap-3 rounded-[26px] p-2.5 pr-3">
        <View className="h-12 w-12 items-center justify-center rounded-[16px]" style={{ backgroundColor: brand[50] }}>
          <FolderHeart size={21} color={brand[600]} strokeWidth={1.8} />
        </View>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 15.5, color: ink[900] }}>Health file</Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 2 }}>
            {meta}
          </Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-pill" style={{ backgroundColor: brand[50] }}>
          <ChevronRight size={18} color={ink[700]} />
        </View>
      </Glass>
    </Pressable>
  );
}
