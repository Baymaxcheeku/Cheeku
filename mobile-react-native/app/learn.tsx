import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Award, Bookmark } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArticleRow, CATEGORY_STYLE, Emblem, Eyebrow, RailCard, ReadMeta } from "@/components/learn/parts";
import { Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { CATEGORIES, CATEGORY_CHIP, CATEGORY_LABEL, continueReading, featuredPick, type ArticleCard, type ArticleCategory } from "@/lib/knowledge/catalog";
import { allArticles } from "@/lib/knowledge/queries";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE LIBRARY. Everything the health desk has published.
 *
 *   filters    All · Saved · one chip per category, in its colour
 *   featured   the team's pick, as a large card
 *   continue   anything started and not finished
 *   shelves    every category, its articles as rows
 *
 * Chips for categories with nothing published yet are left out, so a filter
 * never opens on an empty shelf.
 */

type Filter = "all" | "saved" | ArticleCategory;

export default function Learn() {
  const insets = useSafeAreaInsets();
  const family = useFamily();
  const profileId = family.data?.profile?.id;
  const [filter, setFilter] = useState<Filter>("all");
  const library = useQuery({ queryKey: ["learn", profileId], queryFn: () => allArticles(profileId), enabled: Boolean(profileId) });

  const cards = library.data ?? [];
  const present = CATEGORIES.filter((c) => cards.some((a) => a.category === c));
  const hero = featuredPick(cards);
  const started = continueReading(cards);
  const saved = cards.filter((c) => c.read?.saved);

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Worth knowing" fallback="/home" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={library.isRefetching} onRefresh={() => void library.refetch()} tintColor={brand[600]} />}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500] }}>
            Plain-language explainers, written and checked by the Cheeku health desk against the sources they cite. They explain; they never advise.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 }}>
          <Chip label="All" on={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label={saved.length ? `Saved · ${saved.length}` : "Saved"} on={filter === "saved"} onPress={() => setFilter("saved")} icon={<Bookmark size={13} color={filter === "saved" ? "#fff" : ink[700]} />} />
          {present.map((c) => (
            <Chip key={c} label={CATEGORY_CHIP[c]} on={filter === c} onPress={() => setFilter(c)} dot={CATEGORY_STYLE[c].accent} />
          ))}
        </ScrollView>

        {library.isPending ? <ActivityIndicator color={brand[600]} style={{ marginTop: 40 }} /> : null}
        {library.isSuccess && cards.length === 0 ? <Empty text="Nothing published yet. New explainers land here as the team writes them." /> : null}

        {filter === "all" && cards.length ? (
          <View>
            {hero ? <Featured card={hero} /> : null}

            {started.length ? (
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, color: ink[900], paddingHorizontal: 20 }}>Continue reading</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                  {started.map((c) => (
                    <RailCard key={c.id} card={c} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {present.map((c) => (
              <Shelf key={c} category={c} cards={cards.filter((a) => a.category === c && a.id !== hero?.id)} />
            ))}
          </View>
        ) : null}

        {filter === "saved" ? (
          saved.length ? <List cards={saved} /> : <Empty text="Tap the bookmark on any article to keep it here." icon />
        ) : null}

        {filter !== "all" && filter !== "saved" ? <List cards={cards.filter((a) => a.category === filter)} showCategory={false} /> : null}
      </ScrollView>
    </View>
  );
}

function Chip({ label, on, onPress, dot, icon }: { label: string; on: boolean; onPress: () => void; dot?: string; icon?: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[on ? null : glassShadow, { flexDirection: "row", alignItems: "center", gap: 7, height: 40, paddingHorizontal: 15, borderRadius: 999, backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim }]}
    >
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: on ? "#fff" : ink[900] }}>{label}</Text>
    </Pressable>
  );
}

function Featured({ card }: { card: ArticleCard }) {
  const router = useRouter();
  const s = CATEGORY_STYLE[card.category];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Featured. ${card.title}`}
      onPress={() => router.push(`/article/${card.slug}`)}
      style={({ pressed }) => [glassShadow, { marginHorizontal: 20, marginTop: 14, borderRadius: 30, overflow: "hidden", transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      <Gradient from={s.field} to="#ffffff" angle="diagonal" glow="#ffffff" />
      <View style={{ position: "absolute", right: -40, top: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: s.soft, opacity: 0.6 }} />
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "#fff" }}>
            <Award size={12} color={s.accent} />
            <Text style={{ fontFamily: font.semibold, fontSize: 11.5, color: s.accent }}>Featured</Text>
          </View>
          <Emblem icon={card.icon} category={card.category} size={76} />
        </View>
        <View style={{ marginTop: 6 }}>
          <Eyebrow category={card.category} />
        </View>
        <Text style={{ fontFamily: font.semibold, fontSize: 22, lineHeight: 27, letterSpacing: -0.5, color: s.deep, marginTop: 6 }}>{card.title}</Text>
        {card.standfirst ? (
          <Text numberOfLines={3} style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: s.body, marginTop: 6 }}>
            {card.standfirst}
          </Text>
        ) : null}
        <View style={{ marginTop: 14 }}>
          <ReadMeta card={card} light />
        </View>
      </View>
    </Pressable>
  );
}

function Shelf({ category, cards }: { category: ArticleCategory; cards: ArticleCard[] }) {
  if (cards.length === 0) return null;
  const s = CATEGORY_STYLE[category];
  return (
    <View style={{ marginTop: 26, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.accent }} />
        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, color: ink[900] }}>{CATEGORY_LABEL[category]}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[500] }}>{cards.length}</Text>
      </View>
      <List cards={cards} inset={false} showCategory={false} />
    </View>
  );
}

function List({ cards, inset = true, showCategory = true }: { cards: ArticleCard[]; inset?: boolean; showCategory?: boolean }) {
  return (
    <View style={{ paddingHorizontal: inset ? 20 : 0, marginTop: inset ? 10 : 4 }}>
      {cards.map((c, i) => (
        <View key={c.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
          <ArticleRow card={c} showCategory={showCategory} />
        </View>
      ))}
    </View>
  );
}

function Empty({ text, icon }: { text: string; icon?: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 40, marginTop: 40, gap: 10 }}>
      {icon ? <Bookmark size={26} color={ink[300]} /> : null}
      <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], textAlign: "center" }}>{text}</Text>
    </View>
  );
}
