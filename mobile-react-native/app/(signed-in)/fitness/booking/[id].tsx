import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarDays, Clock, MapPin, Navigation, RotateCcw } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityArt, artFor, dayLabel, Meta, openDirections, ReasonPill, SuccessTick, timeLabel } from "@/components/fitness/parts";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { Enter } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { DetailSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { rupees } from "@/lib/fitness/catalog";
import { canCancel, cancelFitness, FITNESS_BOOKINGS_KEY, useFitnessBookings } from "@/lib/fitness/queries";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * One booked class, as a ticket: the check-in code the desk asks for, when
 * and where, directions, and cancel (up to an hour before). Opened straight
 * after booking with the success tick, and from the inbox and reminders.
 */

const STATUS: Record<string, string> = {
  booked: "Booked",
  checked_in: "Checked in",
  attended: "Done",
  cancelled: "Cancelled",
  missed: "Missed",
};

export default function FitnessBooking() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const bookings = useFitnessBookings();
  const family = useFamily();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const b = bookings.data?.find((x) => x.id === id);
  const member = family.data?.access.all.find((m) => m.id === b?.profileId);

  if (!b && bookings.isPending) {
    return (
      <ScreenSkeleton title="Your class">
        <DetailSkeleton hero={220} />
      </ScreenSkeleton>
    );
  }
  if (!b) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Your class" fallback="/fitness/bookings" />
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[500], textAlign: "center", marginTop: 40 }}>This booking isn&apos;t here any more.</Text>
      </View>
    );
  }

  const booked = b.status === "booked";
  const past = Date.parse(b.startsAt) + b.durationMin * 60_000 < Date.now();
  const forWho = member?.isPrimary ? "you" : (member?.name.split(" ")[0] ?? "them");
  const art = artFor(b.activity);
  const booking = b;

  async function cancel() {
    const ok = await cancelFitness(booking);
    if (!ok) {
      setError("That couldn't be cancelled. It may be less than an hour to the class.");
      return;
    }
    await qc.invalidateQueries({ queryKey: FITNESS_BOOKINGS_KEY });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop height={460} />
      <ScreenHeader title={fresh ? undefined : "Your class"} fallback="/fitness/bookings" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30, gap: 16 }}
        refreshControl={<RefreshControl refreshing={bookings.isRefetching} onRefresh={() => void bookings.refetch()} tintColor={brand[600]} />}
        showsVerticalScrollIndicator={false}
      >
        {fresh && booked ? (
          <View style={{ alignItems: "center" }}>
            <SuccessTick size={76} />
            <Enter>
              <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.7, color: ink[900], textAlign: "center" }}>You&apos;re booked!</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], marginTop: 4, textAlign: "center" }}>
                I&apos;ll remind {forWho === "you" ? "you" : forWho} an hour before. It&apos;s in {forWho === "you" ? "your" : `${forWho}'s`} memory too.
              </Text>
            </Enter>
          </View>
        ) : null}

        {/* The ticket. */}
        <View style={[glassShadow, { borderRadius: 32, overflow: "hidden", backgroundColor: "#fff" }]}>
          <View style={{ padding: 18 }}>
            <Gradient from={art.bg} to="#ffffff" glow="#ffffff" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <ActivityArt id={b.activity} size={56} radius={18} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase", color: booked ? brand[600] : ink[500] }}>{STATUS[b.status] ?? b.status}{past && booked ? " · ended" : ""}</Text>
                <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900] }}>{b.title}</Text>
                <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[700] }}>For {forWho === "you" ? "you" : member?.name} · {b.studioName}</Text>
              </View>
            </View>
            {b.reason ? (
              <View style={{ marginTop: 12 }}>
                <ReasonPill text={b.reason} />
              </View>
            ) : null}
          </View>

          {/* Perforation. */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 12, height: 24, borderTopRightRadius: 12, borderBottomRightRadius: 12, backgroundColor: surface.canvas, marginLeft: -1 }} />
            <View style={{ flex: 1, height: 1, borderStyle: "dashed", borderWidth: 1, borderColor: surface.line }} />
            <View style={{ width: 12, height: 24, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, backgroundColor: surface.canvas, marginRight: -1 }} />
          </View>

          <View style={{ padding: 18, gap: 12 }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>Show this code at the desk</Text>
              <Text accessibilityLabel={`Check-in code ${b.checkinCode.split("").join(" ")}`} style={{ fontFamily: font.semibold, fontSize: 34, letterSpacing: 6, color: booked ? ink[900] : ink[300], textDecorationLine: b.status === "cancelled" ? "line-through" : "none" }}>
                {b.checkinCode}
              </Text>
            </View>
            <View style={{ gap: 10, borderRadius: 16, backgroundColor: surface.tint, padding: 14 }}>
              <Meta icon={CalendarDays} text={`${dayLabel(b.startsAt)}, ${timeLabel(b.startsAt)}`} />
              <Meta icon={Clock} text={`${b.durationMin} minutes · arrive 10 minutes early`} />
              <Meta icon={MapPin} text={b.area && b.area !== "Sample" ? `${b.studioName}, ${b.area}` : b.studioName} />
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], textAlign: "center" }}>
              {rupees(b.price)} for one class{b.provider === "preview" ? " · preview, not charged" : ""}
            </Text>
          </View>
        </View>

        {b.lat !== null && b.lng !== null && booked ? (
          <PillButton tone="light" icon={<Navigation size={17} color={ink[900]} />} onPress={() => openDirections(b.lat as number, b.lng as number, b.studioName)}>
            Directions
          </PillButton>
        ) : null}
        {!booked || past ? (
          <PillButton icon={<RotateCcw size={17} color="#fff" />} onPress={() => router.push({ pathname: "/fitness/studio/[id]", params: { id: b.studioId } })}>
            Book again
          </PillButton>
        ) : null}

        {error ? <Text style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, textAlign: "center" }}>{error}</Text> : null}

        {canCancel(b) ? (
          <Tap accessibilityRole="button" onPress={() => setCancelOpen(true)} style={{ height: 48, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: semantic.dangerText }}>Cancel this class</Text>
          </Tap>
        ) : booked && !past ? (
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center" }}>Less than an hour to go, so it can&apos;t be cancelled now.</Text>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        open={cancelOpen}
        title="Cancel this class?"
        body={`${b.title}, ${dayLabel(b.startsAt)} at ${timeLabel(b.startsAt)}. The seat goes back to the studio.`}
        confirmLabel="Cancel class"
        destructive
        onConfirm={cancel}
        onClose={() => setCancelOpen(false)}
      />
    </View>
  );
}
