import { useRouter } from "expo-router";
import { Building2, ChevronLeft, ClipboardCheck, Clock3, GraduationCap, Languages, MapPin, MonitorPlay } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SvgXml } from "react-native-svg";
import { Glass, GlassCircle, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { SPECIALTIES, doctorsFor, nextFree, type Doctor, type Mode } from "@/lib/booking/catalog";
import { useBookingDraft } from "@/lib/booking/draft";
import { doctorFace } from "@/lib/booking/faces";
import { RatingLine } from "@/components/labs/parts";
import { useRatings, type Rating } from "@/lib/labs/queries";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

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
  const { specialty, mode, intake, setMode } = useBookingDraft();
  const ratings = useRatings("doctor");

  const sp = SPECIALTIES[specialty ?? "gp"];
  const m: Mode = mode ?? "online";
  const list = doctorsFor(sp.id, m);

  return (
    <View className="flex-1 bg-canvas">
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 380 }}>
        <Gradient from="#ebe6ff" to="#fafafe" angle="vertical" />
      </View>

      <View className="flex-row items-center gap-3 px-4 pb-2" style={{ paddingTop: insets.top + 6 }}>
        <GlassCircle label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/book/consult"))}>
          <ChevronLeft size={21} color={ink[900]} />
        </GlassCircle>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>
          {sp.plural}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View className="mt-3 flex-row gap-2">
          {(["online", "clinic"] as const).map((k) => {
            const on = m === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setMode(k)}
                style={[
                  on ? null : glassShadow,
                  {
                    height: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    backgroundColor: on ? ink[900] : glass.fillStrong,
                    borderWidth: on ? 0 : 1,
                    borderColor: glass.rim,
                  },
                ]}
              >
                {k === "online" ? (
                  <MonitorPlay size={16} color={on ? "#fff" : ink[700]} strokeWidth={1.8} />
                ) : (
                  <Building2 size={16} color={on ? "#fff" : ink[700]} strokeWidth={1.8} />
                )}
                <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? "#fff" : ink[700] }}>
                  {k === "online" ? "Online" : "Clinic visit"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: ink[900], marginTop: 20 }}>
          {list.length} {list.length === 1 ? "doctor" : "doctors"} {m === "online" ? "online today" : "near you"}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 3 }}>
          Preview · sample doctors. Nothing is booked for real yet.
        </Text>

        {intake ? (
          <Glass className="mt-4 flex-row items-center gap-2.5 rounded-[18px] px-3.5 py-3">
            <ClipboardCheck size={18} color={brand[600]} strokeWidth={1.8} />
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
              Your pre-consultation note goes to whichever doctor you book.
            </Text>
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
          {list.length === 0 ? (
            <Glass strong className="items-center rounded-[24px] p-6">
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900], textAlign: "center" }}>
                No {sp.plural.toLowerCase()} {m === "online" ? "online" : "with clinic slots"} right now
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: ink[500], textAlign: "center", marginTop: 4 }}>
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
  face?: { svg: string; background: string };
  rating?: Rating;
  /** The whole top of the card opens the profile; the button books. */
  onOpen: () => void;
  onBook: () => void;
}) {
  const next = nextFree(d, mode);
  const fee = d.fee[mode];

  return (
    <Glass strong className="overflow-hidden rounded-[28px] p-3">
      <Pressable accessibilityRole="button" accessibilityLabel={`${d.name}. Open profile and reviews`} onPress={onOpen} className="flex-row gap-3.5">
        <View className="overflow-hidden rounded-[22px]" style={{ width: 92, height: 104 }}>
          {/* The illustrated face as a portrait tile, full bleed. */}
          {face ? (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: face.background }}>
              <SvgXml xml={face.svg} width={108} height={108} />
            </View>
          ) : (
            <Gradient from="#ece6ff" to="#dcd3ff" />
          )}
        </View>
        <View className="min-w-0 flex-1 py-0.5">
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 16.5, letterSpacing: -0.2, color: ink[900] }}>
            {d.name}
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: brand[600], marginTop: 1 }}>
            {SPECIALTIES[d.specialty].label}
          </Text>
          <View style={{ marginTop: 5 }}>
            <RatingLine rating={rating} />
          </View>
          <Fact icon={<GraduationCap size={13} color={ink[500]} />} text={`${d.years} yrs · ${d.qualifications}`} />
          <Fact icon={<Languages size={13} color={ink[500]} />} text={d.languages.join(", ")} />
          {mode === "clinic" ? (
            <Fact icon={<MapPin size={13} color={ink[500]} />} text={`${d.clinic.name}, ${d.clinic.area} · ${d.clinic.km} km`} />
          ) : null}
        </View>
      </Pressable>

      <View className="mt-3 flex-row items-center gap-2 rounded-[18px] px-3 py-2.5" style={{ backgroundColor: "rgba(241,240,254,0.8)" }}>
        <Clock3 size={14} color={brand[600]} />
        <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
          {next ? `Next: ${next}` : "No slots in the next 3 days"}
        </Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>₹{fee}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose a time with ${d.name}`}
        onPress={onBook}
        style={({ pressed }) => ({
          marginTop: 10,
          height: 48,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: ink[900],
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>
          {mode === "online" ? "Choose a video slot" : "Choose a visit time"}
        </Text>
      </Pressable>
    </Glass>
  );
}

function Fact({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="mt-1.5 flex-row items-center gap-1.5">
      {icon}
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.regular, fontSize: 12.5, color: ink[500] }}>
        {text}
      </Text>
    </View>
  );
}
