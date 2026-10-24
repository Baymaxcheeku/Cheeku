import { useRouter } from "expo-router";
import { ChevronRight, Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AskToBook, Grid2, SERVICE_ICON, ServiceTile } from "@/components/services/parts";
import { glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { marketplace } from "@/lib/services/provider";
import { onShelf, routeFor, searchServices, SHELVES } from "@/lib/services/catalog";
import { useServiceRequestList, whenText } from "@/lib/services/requests";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/*
 * Every service, by shelf, with a search that reaches inside them ("nurse",
 * "braces", "therapy"). Your open requests sit on top so the hub is also where
 * you come back to check on one.
 */
export default function ServicesHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const requests = useServiceRequestList();
  const open = requests.items.filter((r) => r.status !== "cancelled" && r.status !== "done").slice(0, 3);
  const results = query.trim() ? searchServices(query) : null;
  const go = (route: string) => router.push(route as never);

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Book services" subtitle={marketplace().preview ? "Partner network · preview" : "Partner network"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, marginTop: 6 }]}>
          <Search size={18} color={ink[500]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search: dentist, nurse, eye test, therapy"
            placeholderTextColor={ink[300]}
            accessibilityLabel="Search services"
            style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: ink[900], paddingVertical: 0 }}
          />
          {query ? (
            <Tap accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}>
              <X size={17} color={ink[500]} />
            </Tap>
          ) : null}
        </View>

        {results ? (
          results.length ? (
            <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", overflow: "hidden" }]}>
              {results.map((s, i) => {
                const Icon = SERVICE_ICON[s.icon];
                return (
                  <Pressable key={s.id} accessibilityRole="button" onPress={() => go(routeFor(s))} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line, backgroundColor: pressed ? brand[50] : "#fff" })}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: s.tint.from, alignItems: "center", justifyContent: "center" }}>
                      {Icon ? <Icon size={19} color={s.tint.fg} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{s.title}</Text>
                      <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 1 }}>{s.line}</Text>
                    </View>
                    <ChevronRight size={18} color={ink[300]} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], textAlign: "center", marginTop: 12 }}>
              Nothing called that yet. Try asking in the chat instead.
            </Text>
          )
        ) : (
          <>
            {open.length ? (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 4 }}>Your requests</Text>
                {open.map((r) => (
                  <Pressable key={r.id} accessibilityRole="button" onPress={() => go(`/services/booking/${r.id}`)} style={({ pressed }) => [glassShadow, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: pressed ? brand[50] : "#fff" }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{r.title}</Text>
                      <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>For {r.forName} · {whenText(r)}</Text>
                    </View>
                    <ChevronRight size={18} color={ink[300]} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            <AskToBook onPress={() => go("/ask")} />

            {SHELVES.map((shelf) => {
              const items = onShelf(shelf.id);
              if (!items.length) return null;
              return (
                <View key={shelf.id} style={{ marginTop: 14, gap: 12 }}>
                  <View>
                    <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>{shelf.title}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>{shelf.line}</Text>
                  </View>
                  <Grid2>
                    {items.map((s) => (
                      <ServiceTile key={s.id} service={s} tall={shelf.id === "core"} onPress={() => go(routeFor(s))} />
                    ))}
                  </Grid2>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
