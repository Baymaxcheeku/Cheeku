import { useRouter } from "expo-router";
import { Clock3, ShieldCheck, Truck, X } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PartnerBadge, RatingLine, rupees, SampleNote } from "@/components/labs/parts";
import { Glass, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PageTitle, PillButton, ScreenHeader } from "@/components/ui/screen";
import { rankPartners } from "@/lib/labs/logic";
import { useCatalog, useLabCart, useRatings } from "@/lib/labs/queries";
import { brand, hue, ink } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";
import { CardListSkeleton } from "@/components/ui/skeleton";

/*
 * Choose a lab for everything in the cart.
 *
 * Only labs that do EVERY test are shown, cheapest total first (ties to the
 * faster report), with the collection fee already in the total, because the
 * number people compare should be the number they pay. Two honest tags:
 * "Best price" on the cheapest and "Fastest report" on the quickest. The
 * card opens the lab's own page; the button picks it.
 */
export default function ChooseLab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const catalog = useCatalog();
  const ratings = useRatings("lab");
  const cart = useLabCart();

  const tests = catalog.data?.tests ?? [];
  const ranked = catalog.data ? rankPartners(catalog.data, cart.tests) : [];
  const fastest = ranked.length ? Math.min(...ranked.map((r) => r.partner.reportHours)) : 0;

  const empty = cart.tests.length === 0;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Choose a lab" fallback="/labs" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        {/* With nothing in the cart every lab "does all of it" for ₹0, which is
            true and useless. The title and the list wait for a test. */}
        <PageTitle
          title={empty ? "Pick a test first" : !catalog.data ? "Finding your labs" : `${ranked.length} ${ranked.length === 1 ? "lab does" : "labs do"} all of it`}
          line={empty ? "Then we'll show every lab that does it, cheapest first." : "Prices include the home visit. Tap a lab to see reviews."}
          style={{ marginTop: 6 }}
        />

        {/* The cart, removable. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", alignContent: "flex-start", gap: 8, marginTop: 14 }}>
          {cart.tests.map((id) => (
            <View key={id} style={{ height: 34, paddingLeft: 12, paddingRight: 6, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: brand[50] }}>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: brand[700] }}>{tests.find((t) => t.id === id)?.name ?? id}</Text>
              <Tap scale={0.95} accessibilityLabel="Remove" hitSlop={6} onPress={() => cart.remove(id)} style={{ width: 22, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
                <X size={12} color={brand[700]} />
              </Tap>
            </View>
          ))}
        </View>

        {empty ? (
          <Glass strong className="mt-6 items-center rounded-xl p-6">
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Your cart is empty</Text>
            <PillButton onPress={() => router.replace("/labs")} style={{ marginTop: 14, alignSelf: "stretch" }}>
              Find a test
            </PillButton>
          </Glass>
        ) : null}

        <View style={{ marginTop: 18, gap: 12 }}>
          {!empty && !catalog.data ? <CardListSkeleton count={3} /> : null}
          {(empty ? [] : ranked).map(({ partner: p, quote: q }, i) => (
            <Animated.View key={p.id} entering={still ? undefined : FadeInDown.delay(i * 50).duration(260)}>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/labs/partner/[id]", params: { id: p.id } })} style={({ pressed }) => [glassShadow, { borderRadius: 24, padding: 14, backgroundColor: pressed ? "#fff" : glass.fillStrong, borderWidth: i === 0 ? 2 : 1, borderColor: i === 0 ? brand[500] : glass.rim }]}>
                <View className="flex-row items-center gap-3">
                  <PartnerBadge partner={p} size={52} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{p.name}</Text>
                    <View style={{ marginTop: 3 }}>
                      <RatingLine rating={ratings.data?.get(p.id)} />
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{rupees(q.total)}</Text>
                    {q.mrp > q.subtotal ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textDecorationLine: "line-through" }}>{rupees(q.mrp + q.fee)}</Text> : null}
                  </View>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 6, marginTop: 12 }}>
                  {i === 0 ? <Tag text="Best price" lime /> : null}
                  {p.reportHours === fastest ? <Tag text="Fastest report" lime={i !== 0} /> : null}
                  <Tag icon={<Clock3 size={11} color={ink[700]} />} text={`Report in ${p.reportHours}h`} />
                  <Tag icon={<Truck size={11} color={ink[700]} />} text={q.fee ? `${rupees(q.fee)} visit` : "Free visit"} />
                  {p.accreditation.length ? <Tag icon={<ShieldCheck size={11} color={ink[700]} />} text={p.accreditation.join(" · ")} /> : null}
                </View>
                <PillButton
                  onPress={() => {
                    cart.setPartner(p.id);
                    router.push("/labs/book");
                  }}
                  style={{ marginTop: 12, height: 48 }}
                >
                  {`Book with ${p.name.split(" ")[0] === "Dr" ? p.name : p.name.split(" ")[0]}`}
                </PillButton>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {catalog.data && cart.tests.length && ranked.length === 0 ? (
          <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 12 }}>No single lab does all of these. Remove one and try again.</Text>
        ) : null}

        <View style={{ marginTop: 18 }}>
          <SampleNote />
        </View>
      </ScrollView>
    </View>
  );
}

function Tag({ text, icon, lime }: { text: string; icon?: React.ReactNode; lime?: boolean }) {
  return (
    <View style={{ height: 26, paddingHorizontal: 9, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: lime ? hue.lime.bg : "rgba(15,16,48,0.05)" }}>
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: lime ? hue.lime.fg : ink[700] }}>{text}</Text>
    </View>
  );
}
