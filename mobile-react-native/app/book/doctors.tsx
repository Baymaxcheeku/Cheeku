import { useRouter } from "expo-router";
import { FaceArt } from "@/components/ui/face-art";
import { ChevronLeft, Clock3 } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { Glass, GlassCircle, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { SPECIALTIES, doctorsFor, nextFree, type Doctor, type Mode } from "@/lib/booking/catalog";
import { useBookingDraft } from "@/lib/booking/draft";
import { lsIdOf } from "@/lib/booking/partner-doctors";
import { LIVE } from "@/lib/partner/labstack";
import { useLiveDoctors } from "@/lib/partner/use-doctors";
import { doctorFace } from "@/lib/booking/faces";
import { useRatings, type Rating } from "@/lib/labs/queries";
import { brand, ink, lilac, surface } from "@/theme/tokens";
import { SkyWash } from "@/components/home/front";
import { SpecialistFallback } from "@/components/booking/specialist-fallback";
import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";
import { font } from "@/theme/type";
import { goBack } from "@/lib/nav/go-back";

/*
 * Book a doctor — the list.
 *
 * Laid out like the reference the owner picked ("Top Professionals"): a title,
 * mode chips, then one card per doctor with a face, the facts, and two actions.
 *
 * SAMPLE DATA, LABELLED. The banner under the title says these are sample
 * doctors and nothing is really booked. No star ratings or review counts are
 * shown — see `lib/booking/catalog.ts` for why.
 *
 * The note travels with the booking. The strip at the top says so, because
 * "the doctor already knows" is the whole reason to book through Cheeku.
 */
export default function Doctors() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const { specialty, mode, intake, setMode, choose } = useBookingDraft();
  const ratings = useRatings("doctor");

  const sp = SPECIALTIES[specialty ?? "gp"];
  const m: Mode = mode ?? "online";
  const live = useLiveDoctors(sp.id, m);
  const list = LIVE ? live.doctors : doctorsFor(sp.id, m);

  return (
    <View className="flex-1 bg-canvas">
      <SkyWash top={0} />

      <View className="flex-row items-center gap-3 px-4 pb-2" style={{ paddingTop: insets.top + 6 }}>
        <GlassCircle label="Go back" onPress={() => goBack(router, "/book/consult")}>
          <ChevronLeft size={21} color={ink[900]} />
        </GlassCircle>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: font.semibold, fontSize: 30, lineHeight: 35, letterSpacing: -0.9, color: ink[900], marginTop: 4 }}>{sp.plural}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], marginTop: 4 }}>{sp.line}</Text>

        <View className="mt-5 flex-row gap-2">
          {(["online", "clinic"] as const).map((k) => {
            const on = m === k;
            return (
              <Tap
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setMode(k)}
                style={{
                  flex: 1,
                  height: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderRadius: 18,
                  backgroundColor: on ? brand[600] : "#fff",
                  borderWidth: 1,
                  borderColor: on ? brand[600] : surface.line,
                }}
              >
                <Icon3D name={k === "online" ? "video" : "hospital"} size={26} />
                <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 15, color: on ? "#fff" : ink[700] }}>
                  {k === "online" ? "Online" : "Clinic visit"}
                </Text>
              </Tap>
            );
          })}
        </View>

        <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900], marginTop: 26 }}>
          {list.length} {list.length === 1 ? "doctor" : "doctors"} {m === "online" ? "online today" : "near you"}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>
          {LIVE ? "Doctors from our partner network. Times are live." : "Preview · sample doctors. Nothing is booked for real yet."}
        </Text>

        {intake ? (
          <View style={[glassCard(PILLAR_TONE.check.glass), { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, padding: 14 }]}>
            <Icon3D name="clipboard" size={34} />
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: ink[900] }}>
              Your note is ready. It goes to whichever doctor you book.
            </Text>
          </View>
        ) : null}

        {LIVE && (live.loading || live.error || live.needsPlace) ? (
          <Glass strong className="mt-4 items-center rounded-xl p-6">
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900], textAlign: "center" }}>
              {live.needsPlace ? "Where should the clinic be near?" : live.error ? "Couldn't load doctors" : "Finding doctors…"}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], textAlign: "center", marginTop: 4 }}>
              {live.needsPlace ? "Set your location on Home, or pick an online consultation." : live.error ? "Check your connection and try again." : "Checking who's free."}
            </Text>
            {live.error ? (
              <Tap accessibilityRole="button" onPress={live.retry} className="mt-3">
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Try again</Text>
              </Tap>
            ) : null}
          </Glass>
        ) : null}

        <View className="mt-4 gap-3">
          {list.map((d, i) => (
            <Animated.View key={`${m}-${d.id}`} entering={still ? undefined : FadeInDown.delay(i * 70).duration(320)}>
              <DoctorCard
                doctor={d}
                mode={m}
                face={doctorFace(d)}
                rating={ratings.data?.get(d.id)}
                onOpen={() => router.push({ pathname: "/book/doctor/[id]", params: { id: d.id } })}
                onBook={() => router.push({ pathname: "/book/slot", params: { id: d.id } })}
              />
            </Animated.View>
          ))}
          {list.length === 0 && sp.id !== "gp" && !(LIVE && (live.loading || live.error || live.needsPlace)) ? (
            <SpecialistFallback specialty={sp.id} mode={m} onGp={() => choose("gp", m)} onOtherMode={() => setMode(m === "online" ? "clinic" : "online")} />
          ) : null}
          {list.length === 0 && sp.id === "gp" && !(LIVE && (live.loading || live.error || live.needsPlace)) ? (
            <Glass strong className="items-center rounded-xl p-6">
              <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], textAlign: "center" }}>
                No {sp.plural.toLowerCase()} {m === "online" ? "online" : "with clinic slots"} right now
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], textAlign: "center", marginTop: 4 }}>
                Try {m === "online" ? "a clinic visit" : "an online consultation"} instead.
              </Text>
            </Glass>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function DoctorCard({
  doctor: d,
  mode,
  face,
  rating,
  onOpen,
  onBook,
}: {
  doctor: Doctor;
  mode: Mode;
  face?: { svg: string; background: string; photo?: string | null };
  rating?: Rating;
  /** The whole top of the card opens the profile; the button books. */
  onOpen: () => void;
  onBook: () => void;
}) {
  // Partner doctors: times come on the next screen, the fee with the booking.
  const partner = lsIdOf(d.id) !== null;
  const next = partner ? null : nextFree(d, mode);
  const fee = d.fee[mode];

  const where = mode === "clinic" ? [d.clinic.area, d.clinic.km ? `${d.clinic.km} km` : ""].filter(Boolean).join(" · ") : d.languages.slice(0, 2).join(", ");

  return (
    <View style={[glassCard("#ffffff", "#0f1030"), { borderRadius: 26, padding: 12, shadowOpacity: 0.05 }]}>
      <Tap accessibilityRole="button" accessibilityLabel={`${d.name}. Open profile and reviews`} onPress={onOpen} style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ width: 96, height: 112, borderRadius: 20, overflow: "hidden" }}>
          {face ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: face.background }}>
              <FaceArt face={face} size={112} />
            </View>
          ) : (
            <View style={{ flex: 1, backgroundColor: lilac.base }} />
          )}
          {rating ? (
            <View style={{ position: "absolute", left: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 3, height: 24, paddingHorizontal: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.94)" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: ink[900] }}>{rating.rating.toFixed(1)}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 11, color: ink[500] }}>of 5</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>
            {d.name}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 2 }}>
            {SPECIALTIES[d.specialty].label}{d.years ? ` · ${d.years} yrs` : ""}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>
            {where}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: PILLAR_TONE.move.bg, marginTop: 8 }}>
            <Clock3 size={13} color={PILLAR_TONE.move.deep} />
            <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12, color: PILLAR_TONE.move.deep }}>
              {partner ? "See open times" : next ? `Next ${next}` : "Full for 3 days"}
            </Text>
          </View>
        </View>
      </Tap>

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, paddingTop: 12, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: surface.line }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{mode === "online" ? "Video consult" : "Clinic visit"}</Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, color: ink[900] }}>{fee ? `₹${fee}` : partner ? "Fee on booking" : "Free"}</Text>
        </View>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`Book ${d.name}`}
          onPress={onBook}
          scale={0.97}
          style={{ height: 46, paddingHorizontal: 22, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: brand[600] }}
        >
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Book now</Text>
        </Tap>
      </View>
    </View>
  );
}
