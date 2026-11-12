import { useRouter } from "expo-router";
import { ChevronRight, Dumbbell } from "lucide-react-native";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityArt, dayLabel, timeLabel } from "@/components/fitness/parts";
import { glass, glassShadow } from "@/components/ui/glass";
import { StaggerItem } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader, SectionTitle } from "@/components/ui/screen";
import { ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { upcoming, useFitnessBookings, type FitnessBooking } from "@/lib/fitness/queries";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, lilac } from "@/theme/tokens";
import { font } from "@/theme/type";

/** Every class the family has booked: what's coming, then what's been. */
export default function FitnessBookings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bookings = useFitnessBookings();
  const family = useFamily();

  if (bookings.isPending) {
    return (
      <ScreenSkeleton title="Your classes">
        <ListSkeleton rows={4} />
      </ScreenSkeleton>
    );
  }

  const all = bookings.data ?? [];
  const next = upcoming(all);
  const nextIds = new Set(next.map((b) => b.id));
  const past = all.filter((b) => !nextIds.has(b.id));
  const nameOf = (b: FitnessBooking) => {
    const m = family.data?.access.all.find((x) => x.id === b.profileId);
    return m?.isPrimary ? "You" : (m?.name.split(" ")[0] ?? "");
  };

  const row = (b: FitnessBooking, i: number) => (
    <StaggerItem key={b.id} index={i}>
      <Tap
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/fitness/booking/[id]", params: { id: b.id } })}
        style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, opacity: b.status === "cancelled" ? 0.6 : 1 }]}
        scale={0.98}
      >
        <ActivityArt id={b.activity} size={44} radius={14} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{b.title}</Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>
            {dayLabel(b.startsAt)}, {timeLabel(b.startsAt)} · {b.studioName}
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 11, color: b.status === "cancelled" ? ink[300] : brand[600], marginTop: 2 }}>
            {nameOf(b)}{b.status === "cancelled" ? " · cancelled" : ""}
          </Text>
        </View>
        <ChevronRight size={18} color={ink[300]} />
      </Tap>
    </StaggerItem>
  );

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Your classes" fallback="/fitness" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 16 }}
        refreshControl={<RefreshControl refreshing={bookings.isRefetching} onRefresh={() => void bookings.refetch()} tintColor={brand[600]} />}
      >
        {all.length === 0 ? (
          <View style={{ alignItems: "center", gap: 12, marginTop: 40 }}>
            <View style={{ width: 72, height: 72, borderRadius: 999, backgroundColor: lilac.base, alignItems: "center", justifyContent: "center" }}>
              <Dumbbell size={30} color={ink[900]} />
            </View>
            <Text style={{ fontFamily: font.semibold, fontSize: 20, color: ink[900] }}>No classes yet</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], textAlign: "center" }}>Book one class at a time, at a gym or studio near you.</Text>
            <PillButton style={{ alignSelf: "stretch", marginTop: 8 }} onPress={() => router.replace("/fitness")}>Find a class</PillButton>
          </View>
        ) : null}
        {next.length ? (
          <View style={{ gap: 10 }}>
            <SectionTitle>Coming up</SectionTitle>
            {next.map(row)}
          </View>
        ) : null}
        {past.length ? (
          <View style={{ gap: 10 }}>
            <SectionTitle>Earlier</SectionTitle>
            {past.map((b, i) => row(b, i + next.length))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
