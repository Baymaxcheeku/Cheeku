import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Clock3, PenLine, Plus, ShieldCheck, Truck } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { PartnerBadge, ReviewList, ReviewSheet, rupees, SampleNote, Stars, TestArt } from "@/components/labs/parts";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { ScreenHeader } from "@/components/ui/screen";
import { fetchReviews, postReview, useCatalog, useLabBookings, useLabCart, useRatings } from "@/lib/labs/queries";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * A lab's own page: who they are, what they cost, what people say.
 *
 * Reviews can be written only by someone who has had results back from this
 * lab through Cheeku, so every review here (beyond the labelled samples) is
 * from a real booking. Posting again edits your review rather than adding
 * another; the database holds one per person per lab.
 */
export default function LabPartner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const ratings = useRatings("lab");
  const bookings = useLabBookings();
  const family = useFamily();
  const cart = useLabCart();
  const reviews = useQuery({ queryKey: ["reviews", "lab", id], queryFn: () => fetchReviews("lab", id), enabled: Boolean(id) });
  const [writing, setWriting] = useState(false);

  const p = catalog.data?.partners.find((x) => x.id === id);
  if (!p || !catalog.data) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Lab" fallback="/labs" />
      </View>
    );
  }

  const rating = ratings.data?.get(p.id);
  const offers = catalog.data.offers.filter((o) => o.partnerId === p.id);
  const popular = catalog.data.tests.filter((t) => t.popular && offers.some((o) => o.testId === t.id)).slice(0, 5);
  const canReview = (bookings.data ?? []).some((b) => b.partnerId === p.id && b.status === "ready");
  const me = family.data?.access.all.find((m) => m.isPrimary)?.name.split(" ")[0] ?? "Cheeku user";

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: insets.top + 220, marginHorizontal: 10, marginTop: 6, paddingTop: insets.top, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          <Gradient from={p.color} to="#ffffff" glow="#ffffff" />
          <View style={[glassShadow, { borderRadius: 112 * 0.3 }]}>
            <PartnerBadge partner={p} size={112} />
          </View>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
            <ScreenHeader fallback="/labs" />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.7, color: ink[900] }}>{p.name}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 2 }}>{p.tagline}</Text>

          {rating ? (
            <View className="mt-3 flex-row items-center gap-2">
              <Text style={{ fontFamily: font.semibold, fontSize: 20, color: ink[900] }}>{rating.rating.toFixed(1)}</Text>
              <Stars rating={rating.rating} size={15} />
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{rating.reviews} reviews</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <Stat icon={<Clock3 size={16} color={brand[600]} />} label="Report" value={`in ${p.reportHours}h`} />
            <Stat icon={<Truck size={16} color={brand[600]} />} label="Home visit" value={p.collectionFee ? `${rupees(p.collectionFee)}${p.freeCollectionAbove ? `, free over ${rupees(p.freeCollectionAbove)}` : ""}` : "Free"} />
            <Stat icon={<ShieldCheck size={16} color={brand[600]} />} label="Accredited" value={p.accreditation.join(", ") || "-"} />
          </View>

          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 26, marginBottom: 8 }}>About</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[700] }}>{p.about}</Text>

          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 26, marginBottom: 12 }}>Popular here</Text>
          <Glass strong className="overflow-hidden rounded-xl">
            {popular.map((t, i) => {
              const o = offers.find((x) => x.testId === t.id);
              const added = cart.tests.includes(t.id);
              return (
                <Tap key={t.id} onPress={() => router.push({ pathname: "/labs/test/[id]", params: { id: t.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: "rgba(15,16,48,0.06)" }}>
                  <TestArt test={t} size={42} radius={13} />
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{t.name}</Text>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{o ? rupees(o.price) : ""}</Text>
                  <Tap scale={0.95} accessibilityLabel={added ? "Remove from cart" : "Add to cart"} onPress={() => cart.toggle(t.id)} hitSlop={6} style={{ width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: added ? brand[600] : "#fff", borderWidth: added ? 0 : 1, borderColor: "rgba(15,16,48,0.1)" }}>
                    {added ? <Check size={16} color="#fff" strokeWidth={2.6} /> : <Plus size={16} color={ink[900]} strokeWidth={2.4} />}
                  </Tap>
                </Tap>
              );
            })}
          </Glass>

          <View className="flex-row items-center justify-between" style={{ marginTop: 26, marginBottom: 12 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Reviews</Text>
            {canReview ? (
              <Tap accessibilityRole="button" onPress={() => setWriting(true)} className="flex-row items-center gap-1.5" hitSlop={8}>
                <PenLine size={15} color={brand[700]} />
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>Write a review</Text>
              </Tap>
            ) : null}
          </View>
          <ReviewList reviews={reviews.data ?? []} empty="No reviews yet." />

          <View style={{ marginTop: 18 }}>
            <SampleNote text="Preview · a sample listing, not a live partnership. Prices are illustrative." />
          </View>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Tap
          accessibilityRole="button"
          onPress={() => {
            cart.setPartner(p.id);
            router.push(cart.tests.length ? "/labs/book" : "/labs");
          }}
          style={[glassShadow, { height: 58, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }]} scale={0.98}
        >
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: "#fff" }}>
            {cart.tests.length ? `Book home collection · ${cart.tests.length} ${cart.tests.length === 1 ? "test" : "tests"}` : "Pick tests to book"}
          </Text>
        </Tap>
      </View>

      <ReviewSheet
        open={writing}
        title={`How was ${p.name}?`}
        onClose={() => setWriting(false)}
        onSubmit={(r, body) => {
          return postReview(qc, { kind: "lab", id: p.id, rating: r, body, author: me });
        }}
      />
    </View>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Glass strong className="flex-1 rounded-lg p-3">
      {icon}
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 6 }}>{label}</Text>
      <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: ink[900], marginTop: 1 }}>{value}</Text>
    </Glass>
  );
}
