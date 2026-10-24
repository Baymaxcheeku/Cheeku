import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronRight, Clock3, Droplet, Hourglass, ListChecks, Plus } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { artFor, PartnerBadge, RatingLine, rupees, SampleNote } from "@/components/labs/parts";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { ScreenHeader } from "@/components/ui/screen";
import { quote } from "@/lib/labs/logic";
import { useCatalog, useLabCart, useRatings } from "@/lib/labs/queries";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * One test or package, in the reference's detail layout:
 *
 *   hero        tall pastel panel with the test's mark
 *   title       name, "N checks", price from and the struck-through MRP
 *   facts       sample · fasting · report time, as three tiles
 *   includes    for a package, every test inside it
 *   about       what it checks, in plain words
 *   labs        every lab that does it, with its price, rating and speed
 *   sticky      the from-price, and Add to cart
 *
 * No claim here about what a result will mean. It says what the test
 * measures and leaves the reading to the report and the doctor.
 */
export default function LabTestDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const ratings = useRatings("lab");
  const cart = useLabCart();

  const test = catalog.data?.tests.find((t) => t.id === id);
  if (!test || !catalog.data) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Lab test" fallback="/labs" />
      </View>
    );
  }

  const art = artFor(test);
  const labs = catalog.data.partners
    .map((p) => ({ p, o: catalog.data.offers.find((o) => o.partnerId === p.id && o.testId === test.id) }))
    .filter((x): x is { p: (typeof x)["p"]; o: NonNullable<(typeof x)["o"]> } => Boolean(x.o))
    .sort((a, b) => a.o.price - b.o.price);
  const cheapest = labs[0]?.o;
  const added = cart.tests.includes(test.id);
  const inside = test.includes.map((tid) => catalog.data.tests.find((t) => t.id === tid)).filter(Boolean);

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        {/* Hero. */}
        <View style={{ height: insets.top + 260, marginHorizontal: 10, marginTop: 6, paddingTop: insets.top, borderRadius: 34, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          <Gradient from={art.from} to={art.to} glow="#ffffff" />
          <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.75)", alignItems: "center", justifyContent: "center" }}>
            <art.Icon size={70} color={art.fg} strokeWidth={1.5} />
          </View>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
            <ScreenHeader fallback="/labs" />
          </View>
          {test.kind === "package" ? (
            <View style={{ position: "absolute", bottom: 16, left: 16 }}>
              <Glass strong className="rounded-pill px-3 py-1.5">
                <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[900] }}>Package · {test.includes.length} tests</Text>
              </Glass>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View className="flex-row items-start justify-between gap-3">
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: ink[900] }}>{test.name}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 3 }}>{test.parameters} {test.parameters === 1 ? "check" : "checks"} · home collection</Text>
            </View>
            {cheapest && cheapest.mrp > cheapest.price ? (
              <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: "#e4ff7a", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font.regular, fontSize: 10.5, color: "#2f3d00" }}>Up to</Text>
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: "#2f3d00" }}>{Math.round((1 - cheapest.price / cheapest.mrp) * 100)}%</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 10.5, color: "#2f3d00" }}>off</Text>
              </View>
            ) : null}
          </View>
          {cheapest ? (
            <Text style={{ fontFamily: font.semibold, fontSize: 26, color: ink[900], marginTop: 10 }}>
              {rupees(cheapest.price)}{" "}
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[300], textDecorationLine: "line-through" }}>{rupees(cheapest.mrp)}</Text>
            </Text>
          ) : null}

          {/* Facts. */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <Fact icon={<Droplet size={16} color={brand[600]} />} label="Sample" value={test.sample} />
            <Fact icon={<Hourglass size={16} color={brand[600]} />} label="Fasting" value={test.fastingHours ? `${test.fastingHours} hours` : "Not needed"} />
            <Fact icon={<Clock3 size={16} color={brand[600]} />} label="Report" value={labs.length ? `in ${Math.min(...labs.map((l) => l.p.reportHours))}h` : "-"} />
          </View>

          {inside.length ? (
            <>
              <Heading icon={<ListChecks size={17} color={ink[900]} />} text="What's inside" />
              <View style={{ gap: 8 }}>
                {inside.map((t) =>
                  t ? (
                    <Pressable key={t.id} onPress={() => router.push({ pathname: "/labs/test/[id]", params: { id: t.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
                      <Check size={15} color={brand[600]} strokeWidth={2.6} />
                      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14.5, color: ink[900] }}>{t.name}</Text>
                      <ChevronRight size={15} color={ink[300]} />
                    </Pressable>
                  ) : null,
                )}
              </View>
            </>
          ) : null}

          <Heading text="About this test" />
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[700] }}>{test.about}</Text>
          {test.fastingHours ? (
            <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], marginTop: 8 }}>
              Nothing to eat or drink except water for {test.fastingHours} hours before the collection. Morning slots make that easy.
            </Text>
          ) : null}

          <Heading text={`Labs that do it (${labs.length})`} />
          <View style={{ gap: 10 }}>
            {labs.map(({ p, o }, i) => (
              <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/labs/partner/[id]", params: { id: p.id } })} style={({ pressed }) => [glassShadow, { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 22, backgroundColor: pressed ? "#fff" : glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}>
                <PartnerBadge partner={p} size={46} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View className="flex-row items-center gap-2">
                    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 14.5, color: ink[900] }}>{p.name}</Text>
                    {i === 0 ? <View style={{ paddingHorizontal: 7, height: 20, borderRadius: 999, justifyContent: "center", backgroundColor: "#e4ff7a" }}><Text style={{ fontFamily: font.semibold, fontSize: 10.5, color: "#2f3d00" }}>Best price</Text></View> : null}
                  </View>
                  <View style={{ marginTop: 3, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <RatingLine rating={ratings.data?.get(p.id)} />
                    <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500] }}>· {p.reportHours}h</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{rupees(o.price)}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[300] }}>
                    {quote(catalog.data.offers, p, [test.id]).fee ? `+ ${rupees(p.collectionFee)} visit` : "free visit"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 18 }}>
            <SampleNote />
          </View>
        </View>
      </ScrollView>

      {/* Sticky: price and add. */}
      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12, flexDirection: "row", gap: 10 }}>
        <View style={[glassShadow, { height: 58, paddingHorizontal: 20, borderRadius: 999, backgroundColor: "#fff", justifyContent: "center" }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{cheapest ? rupees(cheapest.price) : "-"}</Text>
        </View>
        <Tap
          accessibilityRole="button"
          onPress={() => (added ? router.push("/labs/choose") : cart.toggle(test.id))}
          style={[glassShadow, { flex: 1, height: 58, borderRadius: 999, backgroundColor: brand[600], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }]} scale={0.98}
        >
          {added ? <Check size={18} color="#fff" strokeWidth={2.6} /> : <Plus size={18} color="#fff" strokeWidth={2.6} />}
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: "#fff" }}>{added ? `In cart · Choose lab` : "Add to cart"}</Text>
        </Tap>
      </View>
    </View>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Glass strong className="flex-1 rounded-[18px] p-3">
      {icon}
      <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[500], marginTop: 6 }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 13.5, color: ink[900], marginTop: 1 }}>{value}</Text>
    </Glass>
  );
}

function Heading({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2" style={{ marginTop: 26, marginBottom: 12 }}>
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, color: ink[900] }}>{text}</Text>
    </View>
  );
}
