import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FaceArt } from "@/components/ui/face-art";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, PenLine } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { ReviewList, ReviewSheet, SampleNote } from "@/components/labs/parts";
import { ScreenHeader } from "@/components/ui/screen";
import { isUpcoming, useAppointmentList } from "@/lib/booking/appointments";
import { doctorById, nextFree, SPECIALTIES, type Mode } from "@/lib/booking/catalog";
import { useBookingDraft } from "@/lib/booking/draft";
import { doctorFace } from "@/lib/booking/faces";
import { fetchReviews, postReview, useRatings } from "@/lib/labs/queries";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, surface } from "@/theme/tokens";
import { SkyWash } from "@/components/ui/sky-wash";
import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
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

  const live = d.live;
  const partner = d.id.startsWith("ls-");
  const stars = rating ?? (live?.ratings ? { rating: live.rating ?? 0, reviews: live.ratings } : undefined);
  const feeLabel = (m: Mode) => (d.fee[m] ? `₹${d.fee[m]}` : partner ? "Fee at booking" : "Free");
  const clinicPlace = live?.address ?? ([d.clinic.name, d.clinic.area].filter((x, i, a) => x && a.indexOf(x) === i).join(", ") || null);

  // Only what is known. An empty profile field is left out, never shown as "0 years".
  const facts: { art: Icon3DName; label: string; value: string }[] = [];
  if (d.years > 0) facts.push({ art: "trophy", label: "Experience", value: `${d.years} ${d.years === 1 ? "year" : "years"}` });
  if (d.languages.length) facts.push({ art: "message", label: "Speaks", value: d.languages.join(", ") });
  if (d.qualifications) facts.push({ art: "report", label: "Qualifications", value: d.qualifications });
  if (live?.followUpDays) facts.push({ art: "calendar-check", label: "Follow-up", value: `Free for ${live.followUpDays} days` });
  const durations = live ? Object.values(live.durationMin).filter(Boolean) : [];
  if (durations.length) facts.push({ art: "clock", label: "Consultation", value: `${Math.min(...durations)} min` });

  const about = [
    `${d.name} is a ${sp.label.toLowerCase()}${d.years > 0 ? ` with ${d.years} years of practice` : ""}.`,
    offered.length ? `Sees patients ${offered.map((m) => (m === "online" ? "on video" : `at a clinic${clinicPlace ? ` in ${d.clinic.area || clinicPlace}` : ""}`)).join(" and ")}${d.languages.length ? `, in ${d.languages.join(", ")}` : ""}.` : "",
    `Your pre-consultation note and the reports you choose to share reach ${firstName} before you do.`,
  ].filter(Boolean).join(" ");

  return (
    <View className="flex-1 bg-canvas">
      <SkyWash top={0} />
      <ScreenHeader fallback="/book/doctors" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        {/* Who. */}
        <View style={[glassCard("#ffffff", "#0f1030"), { borderRadius: 28, padding: 14, flexDirection: "row", gap: 14, shadowOpacity: 0.05 }]}>
          <View style={{ width: 104, height: 120, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: face.background }}>
            <FaceArt face={face} size={118} />
          </View>
          <View style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 22, lineHeight: 27, letterSpacing: -0.5, color: ink[900] }}>{d.name}</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 14, color: brand[600], marginTop: 2 }}>{sp.label}</Text>
            {live?.subSpecialities.length ? (
              <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>{live.subSpecialities.join(" · ")}</Text>
            ) : null}
            <View style={{ flex: 1 }} />
            {stars ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: PILLAR_TONE.eat.bg, marginTop: 8 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: PILLAR_TONE.eat.deep }}>{stars.rating.toFixed(1)} of 5</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: PILLAR_TONE.eat.deep }}>· {stars.reviews} {stars.reviews === 1 ? "rating" : "ratings"}</Text>
              </View>
            ) : (
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 8 }}>New on Cheeku · no ratings yet</Text>
            )}
          </View>
        </View>

        {/* Ways to meet: price, next free time and length, straight from the partner. */}
        <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900], marginTop: 26 }}>How to meet</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          {offered.map((m) => {
            const on = m === mode;
            const next = nextFree(d, m);
            const tone = m === "online" ? PILLAR_TONE.sleep : PILLAR_TONE.eat;
            return (
              <Tap scale={0.98} key={m} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setMode(m)}
                style={[on ? glassCard(tone.glass) : glassCard("#ffffff", "#0f1030"), { flex: 1, padding: 14, borderRadius: 24, borderWidth: 2, borderColor: on ? brand[600] : "transparent", shadowOpacity: 0.05 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Icon3D name={m === "online" ? "video" : "hospital"} size={34} />
                  {on ? <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}><Check size={13} color="#fff" strokeWidth={3} /></View> : null}
                </View>
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500], marginTop: 10 }}>{m === "online" ? "Video call" : "Clinic visit"}</Text>
                <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900], marginTop: 2 }}>{feeLabel(m)}</Text>
                <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12, color: next ? PILLAR_TONE.move.deep : ink[500], marginTop: 4 }}>{next ? `Next ${next}` : partner ? "See open times" : "Fully booked"}</Text>
              </Tap>
            );
          })}
        </View>

        {facts.length ? (
          <View style={[glassCard("#ffffff", "#0f1030"), { borderRadius: 24, marginTop: 14, overflow: "hidden", shadowOpacity: 0.05 }]}>
            {facts.map((f, i) => (
              <View key={f.label} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
                  <Icon3D name={f.art} size={28} />
                </View>
                <Text style={{ width: 104, fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{f.label}</Text>
                <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: ink[900] }}>{f.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {live?.tags.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {live.tags.map((t) => (
              <View key={`${t.category}-${t.name}`} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line }}>
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>{t.name}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900], marginTop: 26, marginBottom: 8 }}>About {firstName}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[700] }}>{about}</Text>

        {d.fee.clinic !== undefined && clinicPlace ? (
          <View style={[glassCard("#ffffff", "#0f1030"), { marginTop: 16, borderRadius: 24, padding: 14, flexDirection: "row", gap: 12, alignItems: "center", shadowOpacity: 0.05 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: PILLAR_TONE.eat.bg, alignItems: "center", justifyContent: "center" }}>
              <Icon3D name="pin" size={30} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{d.clinic.name && d.clinic.name !== "Clinic" ? d.clinic.name : "Clinic"}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 1 }}>
                {[live?.address ?? (d.clinic.area && d.clinic.area !== d.clinic.name ? d.clinic.area : null), d.clinic.km > 0 ? `${d.clinic.km} km away` : "", d.clinic.opd ? `OPD ${d.clinic.opd}` : ""].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="flex-row items-center justify-between" style={{ marginTop: 26, marginBottom: 12 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>What patients say</Text>
          {canReview ? (
            <Tap accessibilityRole="button" onPress={() => setWriting(true)} className="flex-row items-center gap-1.5" hitSlop={8}>
              <PenLine size={15} color={brand[700]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>Write a review</Text>
            </Tap>
          ) : null}
        </View>
        {reviews.isPending ? <LinesSkeleton lines={3} /> : <ReviewList reviews={reviews.data ?? []} empty={stars && !rating ? `Rated ${stars.rating.toFixed(1)} by ${stars.reviews} patients on the partner network. No written reviews on Cheeku yet.` : "No reviews yet."} />}

        <View style={{ marginTop: 18 }}>
          <SampleNote text="Preview · a sample doctor. Nothing is booked for real yet." />
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12, flexDirection: "row", gap: 10 }}>
        <View style={[glassCard("#ffffff", "#0f1030"), { height: 58, paddingHorizontal: 20, borderRadius: 999, justifyContent: "center" }]}>
          <Text style={{ fontFamily: font.regular, fontSize: 11, color: ink[500] }}>{mode === "online" ? "Video call" : "Clinic visit"}</Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>{feeLabel(mode)}</Text>
        </View>
        <Tap accessibilityRole="button" onPress={book} style={{ flex: 1, height: 58, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }} scale={0.98}>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: "#fff" }}>{mode === "online" ? "Pick a video slot" : "Pick a visit time"}</Text>
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
