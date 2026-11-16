import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FaceArt } from "@/components/ui/face-art";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Building2, Clock3, GraduationCap, Languages, MapPin, MonitorPlay, PenLine, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { ReviewList, ReviewSheet, SampleNote, Stars } from "@/components/labs/parts";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { ScreenHeader } from "@/components/ui/screen";
import { isUpcoming, useAppointmentList } from "@/lib/booking/appointments";
import { doctorById, nextFree, SPECIALTIES, type Mode } from "@/lib/booking/catalog";
import { useBookingDraft } from "@/lib/booking/draft";
import { doctorFace } from "@/lib/booking/faces";
import { fetchReviews, postReview, useRatings } from "@/lib/labs/queries";
import { useFamily } from "@/lib/profiles/family";
import { brand, hue, ink, lilac } from "@/theme/tokens";
import { font } from "@/theme/type";
import { LinesSkeleton } from "@/components/ui/skeleton";

/*
 * A doctor's profile, in the reference's detail layout:
 *
 *   hero        their portrait on a tall pastel panel
 *   name        specialty, rating with stars and count
 *   modes       Video / Clinic tiers, like the reference's pricing chips,
 *               each with its own fee and next free time
 *   facts       experience, languages, qualifications
 *   clinic      where, how far, OPD hours
 *   about       a plain paragraph built from the facts, never invented claims
 *   reviews     newest first; "Write a review" once you've seen them
 *   sticky      the fee and Book
 *
 * Reviews can only be written after a past appointment with this doctor
 * booked through Cheeku, and the database keeps one per person.
 */
export default function DoctorProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = doctorById(id);
  const draft = useBookingDraft();
  const ratings = useRatings("doctor");
  const reviews = useQuery({ queryKey: ["reviews", "doctor", id], queryFn: () => fetchReviews("doctor", id), enabled: Boolean(id) });
  const appts = useAppointmentList();
  const family = useFamily();
  const [writing, setWriting] = useState(false);

  const offered = d ? (["online", "clinic"] as Mode[]).filter((m) => d.fee[m] !== undefined) : [];
  const [mode, setMode] = useState<Mode>(draft.mode && offered.includes(draft.mode) ? draft.mode : (offered[0] ?? "online"));

  if (!d) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Doctor" />
      </View>
    );
  }

  const face = doctorFace(d);
  const rating = ratings.data?.get(d.id);
  const sp = SPECIALTIES[d.specialty];
  const firstName = d.name.replace(/^Dr\.?\s*/, "").split(" ")[0];
  const canReview = appts.items.some((a) => a.doctorId === d.id && a.status === "booked" && !isUpcoming(a));

  function book() {
    if (!d) return;
    draft.setMode(mode);
    router.push({ pathname: "/book/slot", params: { id: d.id } });
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: insets.top + 300, marginHorizontal: 10, marginTop: 6, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "flex-end" }}>
          <Gradient from={lilac.base} to="#ffffff" angle="vertical" glow="#ffffff" />
          {/* Lifted above the gradient: on web an absolutely placed layer
              paints over plain siblings (the stacking bug in PROGRESS.md). */}
          <View style={[glassShadow, { zIndex: 1, width: 210, height: 210, borderRadius: 32, overflow: "hidden", marginBottom: 24, borderWidth: 5, borderColor: "#fff", backgroundColor: face.background }]}>
            <FaceArt face={face} size={210} />
          </View>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
            <ScreenHeader fallback="/book/doctors" />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View className="flex-row items-start justify-between gap-3">
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.7, color: ink[900] }}>{d.name}</Text>
              <Text style={{ fontFamily: font.medium, fontSize: 15, color: brand[600], marginTop: 2 }}>{sp.label}</Text>
            </View>
            {rating ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 20, color: ink[900] }}>{rating.rating.toFixed(1)}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 2 }}>out of 5 · {rating.reviews} reviews</Text>
              </View>
            ) : null}
          </View>

          {/* Modes, like the reference's tier chips. */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            {offered.map((m) => {
              const on = m === mode;
              const next = nextFree(d, m);
              return (
                <Tap scale={0.98} key={m} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setMode(m)} style={[on ? null : glassShadow, { flex: 1, padding: 14, borderRadius: 24, backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim }]}>
                  <View className="flex-row items-center gap-1.5">
                    {m === "online" ? <MonitorPlay size={15} color={on ? "#fff" : brand[600]} /> : <Building2 size={15} color={on ? "#fff" : hue.orange.fg} />}
                    <Text style={{ fontFamily: font.medium, fontSize: 13, color: on ? "rgba(255,255,255,0.8)" : ink[500] }}>{m === "online" ? "Video call" : "Clinic visit"}</Text>
                  </View>
                  <Text style={{ fontFamily: font.semibold, fontSize: 20, color: on ? "#fff" : ink[900], marginTop: 6 }}>{d.fee[m] ? `₹${d.fee[m]}` : "On booking"}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: on ? "rgba(255,255,255,0.7)" : ink[500], marginTop: 2 }}>{next ? `Next ${next}` : "Fully booked"}</Text>
                </Tap>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Fact icon={<GraduationCap size={16} color={ink[900]} />} label="Experience" value={`${d.years} years`} />
            <Fact icon={<Languages size={16} color={ink[900]} />} label="Speaks" value={d.languages.slice(0, 2).join(", ") + (d.languages.length > 2 ? ` +${d.languages.length - 2}` : "")} />
            <Fact icon={<ShieldCheck size={16} color={ink[900]} />} label="Degree" value={d.qualifications.split(",")[0] ?? ""} />
          </View>

          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 26, marginBottom: 8 }}>About {firstName}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[700] }}>
            {d.name} is a {sp.label.toLowerCase()} with {d.years} years of practice ({d.qualifications}). Consults in {d.languages.join(", ")}
            {d.fee.online !== undefined ? ", on video" : ""}
            {d.fee.clinic !== undefined ? `${d.fee.online !== undefined ? " and" : ","} at ${d.clinic.name}` : ""}. Your pre-consultation note and the reports you choose to share reach {firstName} before you do.
          </Text>

          {d.fee.clinic !== undefined ? (
            <Glass strong className="mt-4 gap-2 rounded-xl p-4">
              <View className="flex-row items-center gap-2">
                <MapPin size={16} color={hue.orange.fg} />
                <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{d.clinic.name}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{d.clinic.km} km</Text>
              </View>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[700] }}>{d.clinic.area}</Text>
              <View className="flex-row items-center gap-2">
                <Clock3 size={14} color={ink[500]} />
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>OPD {d.clinic.opd}</Text>
              </View>
            </Glass>
          ) : null}

          <View className="flex-row items-center justify-between" style={{ marginTop: 26, marginBottom: 12 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>What patients say</Text>
            {canReview ? (
              <Tap accessibilityRole="button" onPress={() => setWriting(true)} className="flex-row items-center gap-1.5" hitSlop={8}>
                <PenLine size={15} color={brand[700]} />
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>Write a review</Text>
              </Tap>
            ) : null}
          </View>
          {reviews.isPending ? <LinesSkeleton lines={3} /> : <ReviewList reviews={reviews.data ?? []} empty="No reviews yet." />}

          <View style={{ marginTop: 18 }}>
            <SampleNote text="Preview · a sample doctor. Nothing is booked for real yet." />
          </View>
        </View>
      </ScrollView>

      {/* Sticky, as in the reference: price, then Book. */}
      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12, flexDirection: "row", gap: 10 }}>
        <View style={[glassShadow, { height: 58, paddingHorizontal: 22, borderRadius: 999, backgroundColor: "#fff", justifyContent: "center" }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{d.fee[mode] ? `₹${d.fee[mode]}` : "Fee on booking"}</Text>
        </View>
        <Tap accessibilityRole="button" onPress={book} style={[glassShadow, { flex: 1, height: 58, borderRadius: 999, backgroundColor: ink[900], alignItems: "center", justifyContent: "center" }]} scale={0.98}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: "#fff" }}>{mode === "online" ? "Book a video slot" : "Book a clinic visit"}</Text>
        </Tap>
      </View>

      <ReviewSheet
        open={writing}
        title={`How was your visit with ${firstName}?`}
        onClose={() => setWriting(false)}
        onSubmit={(r, body) => {
          const me = family.data?.access.all.find((m) => m.isPrimary)?.name.split(" ")[0] ?? "Cheeku user";
          return postReview(qc, { kind: "doctor", id: d.id, rating: r, body, author: me });
        }}
      />
    </View>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Glass strong className="flex-1 rounded-lg p-3">
      {icon}
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 6 }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900], marginTop: 1 }}>{value}</Text>
    </Glass>
  );
}
