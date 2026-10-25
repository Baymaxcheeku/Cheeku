import { useRouter } from "expo-router";
import { ChevronRight, MessageCircle, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TierDot } from "@/components/chat/tier";
import { glassShadow } from "@/components/ui/glass";
import { Backdrop, PageTitle, ScreenHeader } from "@/components/ui/screen";
import { useSittings, type Sitting } from "@/lib/memory/store";
import { TIER_SHORT } from "@/lib/memory/types";
import { useFamily } from "@/lib/profiles/family";
import { ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { ListSkeleton } from "@/components/ui/skeleton";

/*
 * EVERY CONVERSATION ABOUT ONE PERSON.
 *
 * The chat is one continuous thread; this is the same thread cut into
 * sittings (a new one starts after six quiet hours), so a month of questions
 * about a newborn can be found again by date or by words. Each row carries the
 * most urgent tier it reached, so "the night we called the doctor" is easy to
 * spot.
 */

function monthOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function Chats() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const member = useFamily().data?.profile ?? null;
  const sittings = useSittings(member?.id);
  const [query, setQuery] = useState("");
  const name = member?.name.split(/\s+/)[0] ?? "";

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (sittings.data ?? []).filter((s) => !q || s.title.toLowerCase().includes(q));
    const out: { month: string; items: Sitting[] }[] = [];
    for (const s of list) {
      const month = monthOf(s.lastAt);
      const last = out[out.length - 1];
      if (last && last.month === month) last.items.push(s);
      else out.push({ month, items: [s] });
    }
    return out;
  }, [sittings.data, query]);

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader fallback="/ask" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 32, gap: 18 }} keyboardShouldPersistTaps="handled">
        <PageTitle title="Conversations" line={`Everything you've talked through with Cheeku about ${name}, kept with ${name}'s records.`} />

        <View style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 14 }]}>
          <Search size={16} color={ink[300]} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search by what was asked" placeholderTextColor={ink[300]} accessibilityLabel="Search conversations" style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: ink[900] }} />
        </View>

        {sittings.isPending ? <ListSkeleton rows={5} /> : null}
        {sittings.isSuccess && groups.length === 0 ? (
          <View style={{ alignItems: "center", gap: 10, marginTop: 30 }}>
            <MessageCircle size={26} color={ink[300]} />
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], textAlign: "center" }}>{query ? "Nothing matches that." : `No conversations about ${name} yet.`}</Text>
          </View>
        ) : null}

        {groups.map((g) => (
          <View key={g.month} style={{ gap: 8 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: ink[500] }}>{g.month}</Text>
            <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", overflow: "hidden" }]}>
              {g.items.map((s, i) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: "/chats/[id]", params: { id: s.id } })}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line, backgroundColor: pressed ? surface.tint : "#fff" })}
                >
                  <View style={{ width: 40, alignItems: "center" }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{new Date(s.lastAt).getDate()}</Text>
                    <Text style={{ fontFamily: font.medium, fontSize: 11, color: ink[500] }}>{new Date(s.lastAt).toLocaleDateString("en-IN", { weekday: "short" })}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text numberOfLines={2} style={{ fontFamily: font.medium, fontSize: 15, lineHeight: 19, color: ink[900] }}>
                      {s.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {s.tier ? <TierDot tier={s.tier} /> : null}
                      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>
                        {s.tier ? `${TIER_SHORT[s.tier]} · ` : ""}
                        {s.messages} message{s.messages === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={ink[300]} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
