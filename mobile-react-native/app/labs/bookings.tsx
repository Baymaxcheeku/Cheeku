import { useRouter } from "expo-router";
import { ChevronRight, FlaskConical } from "lucide-react-native";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PartnerBadge, rupees } from "@/components/labs/parts";
import { Glass, glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, PageTitle, PillButton, ScreenHeader } from "@/components/ui/screen";
import { stageIndex, STAGES } from "@/lib/labs/logic";
import { useCatalog, useLabBookings, type LabBooking } from "@/lib/labs/queries";
import { useFamily } from "@/lib/profiles/family";
import { formatEventDate } from "@/lib/records/grouping";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Every lab booking on the account, whoever it was for: the ones still in
 * motion first, then the finished ones. Each row names the family member, so
 * the whole family's tests are in one place without anyone's results mixing
 * (the report itself opens in that member's file).
 */
export default function LabBookings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bookings = useLabBookings();
  const catalog = useCatalog();
  const family = useFamily();

  const all = bookings.data ?? [];
  const open = all.filter((b) => b.status !== "ready" && b.status !== "cancelled");
  const done = all.filter((b) => b.status === "ready" || b.status === "cancelled");

  function Row({ b }: { b: LabBooking }) {
    const p = catalog.data?.partners.find((x) => x.id === b.partnerId);
    const m = family.data?.access.all.find((x) => x.id === b.profileId);
    return (
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/labs/booking/[id]", params: { id: b.id } })} style={({ pressed }) => [glassShadow, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: pressed ? "#fff" : glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}>
        {p ? <PartnerBadge partner={p} size={46} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
            {b.status === "cancelled" ? "Cancelled" : STAGES[stageIndex(b.status)]?.label}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 2 }}>
            {[m?.isPrimary ? "You" : m?.name.split(" ")[0], formatEventDate(b.slotDate), rupees(b.total)].filter(Boolean).join(" · ")}
          </Text>
          {b.status !== "cancelled" && b.status !== "ready" ? (
            <View style={{ flexDirection: "row", gap: 3, marginTop: 8 }}>
              {STAGES.map((s, i) => (
                <View key={s.status} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= stageIndex(b.status) ? brand[600] : "rgba(74,42,222,0.14)" }} />
              ))}
            </View>
          ) : null}
        </View>
        <ChevronRight size={18} color={ink[300]} />
      </Pressable>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Lab bookings" fallback="/labs" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }} refreshControl={<RefreshControl refreshing={bookings.isRefetching} onRefresh={() => void bookings.refetch()} tintColor={brand[600]} />}>
        <PageTitle title="Your lab tests" line="The whole family's, each report filed with the right person." style={{ marginTop: 6 }} />
        {open.length ? <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[500], marginTop: 20, marginBottom: 8 }}>In progress</Text> : null}
        <View style={{ gap: 10 }}>{open.map((b) => <Row key={b.id} b={b} />)}</View>
        {done.length ? <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[500], marginTop: 20, marginBottom: 8 }}>Earlier</Text> : null}
        <View style={{ gap: 10 }}>{done.map((b) => <Row key={b.id} b={b} />)}</View>
        {bookings.isSuccess && all.length === 0 ? (
          <Glass strong className="mt-6 items-center rounded-[28px] px-6 py-8">
            <FlaskConical size={30} color={brand[600]} />
            <Text style={{ fontFamily: font.semibold, fontSize: 18, color: ink[900], marginTop: 10 }}>No lab tests yet</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], marginTop: 4, textAlign: "center" }}>
              Book a home collection and the report files itself.
            </Text>
            <PillButton onPress={() => router.replace("/labs")} style={{ marginTop: 16, alignSelf: "stretch" }}>
              Find a test
            </PillButton>
          </Glass>
        ) : null}
      </ScrollView>
    </View>
  );
}
