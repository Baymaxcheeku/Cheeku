import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, FastForward, FileText, MapPin, PenLine } from "lucide-react-native";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PartnerBadge, ReviewSheet, rupees, SampleNote } from "@/components/labs/parts";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { stageIndex, STAGES } from "@/lib/labs/logic";
import { advanceLabDemo, BOOKINGS_KEY, cancelLab, postReview, useCatalog, useLabBookings } from "@/lib/labs/queries";
import { useFamily, useSwitchMember } from "@/lib/profiles/family";
import { formatEventDate } from "@/lib/records/grouping";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * One lab booking, from "booked" to "report ready".
 *
 * A vertical timeline, the way a delivery app tracks a parcel, because that
 * is what this is: someone is coming to the house, then something is being
 * done with a sample, then a report arrives. Each stage has a line of plain
 * English. When the report is ready the main button opens it, in the right
 * family member's file, and the lab can be rated.
 *
 * Statuses move by themselves (sync_lab_bookings, 0027). "Skip ahead" is a
 * preview control for walking the flow in a demo; the database refuses it
 * once demo_labs is switched off.
 */
export default function LabBooking() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const qc = useQueryClient();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const bookings = useLabBookings();
  const catalog = useCatalog();
  const family = useFamily();
  const switchMember = useSwitchMember();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rating, setRating] = useState(false);
  const [stepping, setStepping] = useState(false);

  const b = bookings.data?.find((x) => x.id === id);
  const partner = catalog.data?.partners.find((p) => p.id === b?.partnerId);
  const member = family.data?.access.all.find((m) => m.id === b?.profileId);

  if (!b || !partner) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Lab booking" fallback="/labs/bookings" />
        {bookings.isSuccess ? <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[500], textAlign: "center", marginTop: 40 }}>This booking isn&apos;t here any more.</Text> : null}
      </View>
    );
  }

  const idx = stageIndex(b.status);
  const cancelled = b.status === "cancelled";
  const first = member?.isPrimary ? "you" : (member?.name.split(" ")[0] ?? "them");
  const testNames = b.tests.map((t) => catalog.data?.tests.find((x) => x.id === t)?.name ?? t);

  const bookingId = b.id;
  async function step() {
    setStepping(true);
    await advanceLabDemo(bookingId);
    await qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    setStepping(false);
  }

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop height={460} />
      <ScreenHeader title={fresh ? undefined : "Lab booking"} fallback="/labs/bookings" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }}
        refreshControl={<RefreshControl refreshing={bookings.isRefetching} onRefresh={() => void bookings.refetch()} tintColor={brand[600]} />}
        showsVerticalScrollIndicator={false}
      >
        {fresh && !cancelled ? (
          <View style={{ alignItems: "center", marginTop: 4, marginBottom: 18 }}>
            <Animated.View entering={still ? undefined : ZoomIn.springify().damping(11)} style={[glassShadow, { width: 76, height: 76, borderRadius: 38, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }]}>
              <Check size={36} color="#fff" strokeWidth={3} />
            </Animated.View>
            <Text style={{ fontFamily: font.semibold, fontSize: 26, letterSpacing: -0.7, color: ink[900], marginTop: 14 }}>Collection booked!</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14.5, color: ink[500], marginTop: 4, textAlign: "center" }}>
              I&apos;ll file the report in {member?.isPrimary ? "your" : `${first}'s`} health file the moment it&apos;s ready.
            </Text>
          </View>
        ) : null}

        {/* Who and where. */}
        <View style={[glassShadow, { borderRadius: 28, overflow: "hidden", padding: 16 }]}>
          <Gradient from={partner.color} to="#ffffff" glow="#ffffff" />
          <View className="flex-row items-center gap-3">
            <PartnerBadge partner={partner} size={50} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{partner.name}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[700], marginTop: 1 }}>For {member?.isPrimary ? "you" : member?.name} · {rupees(b.total)}</Text>
            </View>
          </View>
          <View style={{ marginTop: 14, gap: 8 }}>
            <View className="flex-row items-center gap-2">
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{formatEventDate(b.slotDate)}, {b.slotWindow}</Text>
            </View>
            <View className="flex-row items-start gap-2">
              <MapPin size={14} color={ink[500]} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>{b.address}</Text>
            </View>
          </View>
        </View>

        {/* Timeline. */}
        {cancelled ? (
          <Glass strong className="mt-4 rounded-[24px] p-4">
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>Cancelled</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: ink[500], marginTop: 2 }}>Nothing was collected and nothing is charged.</Text>
          </Glass>
        ) : (
          <Glass strong className="mt-4 rounded-[26px] p-4">
            {STAGES.map((s, i) => {
              const done = i <= idx;
              const now = i === idx;
              return (
                <View key={s.status} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ alignItems: "center", width: 26 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: done ? brand[600] : "rgba(15,16,48,0.07)", borderWidth: now ? 4 : 0, borderColor: brand[100] }}>
                      {done && !now ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                    </View>
                    {i < STAGES.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: i < idx ? brand[600] : "rgba(15,16,48,0.08)" }} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: i < STAGES.length - 1 ? 14 : 0 }}>
                    <Text style={{ fontFamily: now ? font.semibold : font.medium, fontSize: 15, color: done ? ink[900] : ink[300] }}>{s.label}</Text>
                    {now || (done && i === 0) ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{s.line}</Text> : null}
                  </View>
                </View>
              );
            })}
          </Glass>
        )}

        {/* Report / actions. */}
        {b.status === "ready" && b.resultDocumentId ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            <PillButton
              tone="brand"
              icon={<FileText size={18} color="#fff" />}
              onPress={() => {
                void switchMember(b.profileId);
                router.push(`/records/${b.resultDocumentId}`);
              }}
            >
              {`Open ${member?.isPrimary ? "your" : `${first}'s`} report`}
            </PillButton>
            <PillButton tone="light" icon={<PenLine size={17} color={ink[900]} />} onPress={() => setRating(true)}>
              {`Rate ${partner.name}`}
            </PillButton>
          </View>
        ) : null}

        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 24, marginBottom: 10 }}>Tests</Text>
        <Glass strong className="gap-2 rounded-[22px] p-4">
          {testNames.map((n) => (
            <View key={n} className="flex-row items-center gap-2">
              <Check size={14} color={brand[600]} strokeWidth={2.6} />
              <Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[900] }}>{n}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: "rgba(15,16,48,0.08)", marginVertical: 4 }} />
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
            {rupees(b.subtotal)} tests + {b.collectionFee ? rupees(b.collectionFee) : "free"} visit = <Text style={{ fontFamily: font.semibold, color: ink[900] }}>{rupees(b.total)}</Text>, paid after collection.
          </Text>
        </Glass>

        {b.status === "booked" || b.status === "assigned" ? (
          <Pressable accessibilityRole="button" onPress={() => setCancelOpen(true)} style={{ height: 48, alignItems: "center", justifyContent: "center", marginTop: 16 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: "#c00a1c" }}>Cancel this collection</Text>
          </Pressable>
        ) : null}

        {!cancelled && b.status !== "ready" ? (
          <Pressable accessibilityRole="button" disabled={stepping} onPress={() => void step()} style={{ flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "rgba(15,16,48,0.05)", marginTop: 8, opacity: stepping ? 0.5 : 1 }}>
            <FastForward size={14} color={ink[500]} />
            <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[500] }}>Preview: skip to the next step</Text>
          </Pressable>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <SampleNote />
        </View>
      </ScrollView>

      <ConfirmSheet
        open={cancelOpen}
        title="Cancel this collection?"
        body={`Nobody will come on ${formatEventDate(b.slotDate)}, and nothing is charged. You can book again any time.`}
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep it"
        destructive
        onConfirm={async () => {
          await cancelLab(b.id);
          await qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
          void qc.invalidateQueries({ queryKey: ["notifications"] });
          setCancelOpen(false);
        }}
        onClose={() => setCancelOpen(false)}
      />

      <ReviewSheet
        open={rating}
        title={`How was ${partner.name}?`}
        onClose={() => setRating(false)}
        onSubmit={(r, body) => {
          const me = family.data?.access.all.find((m) => m.isPrimary)?.name.split(" ")[0] ?? "Cheeku user";
          return postReview(qc, { kind: "lab", id: partner.id, rating: r, body, author: me });
        }}
      />
    </View>
  );
}
