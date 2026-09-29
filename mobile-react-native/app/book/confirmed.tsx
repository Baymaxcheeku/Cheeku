import { useRouter } from "expo-router";
import { Building2, CalendarCheck2, Check, ClipboardCheck, Clock3, MapPin, MessageCircleHeart, MonitorPlay, Ticket } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { MascotBust } from "@/components/illustrations/sprout";
import { BubblePop } from "@/components/onboarding/motion";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { SPECIALTIES, doctorById } from "@/lib/booking/catalog";
import { useBookingDraft } from "@/lib/booking/draft";
import { doctorFace } from "@/lib/booking/faces";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Book a doctor — done.
 *
 * A success moment worth the wait: the tick lands with a spring, Cheeku says
 * what happens next, and the booking reads like a ticket you could show at a
 * front desk.
 *
 * WHAT HAPPENS NEXT is the most useful thing on the screen, so it is a list,
 * not a paragraph: when the link or the token arrives, and that the note has
 * already gone ahead.
 *
 * PREVIEW. Nothing is really booked, and the screen says so under the title
 * rather than in small print at the bottom.
 */
export default function Confirmed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const { booking, intake, reset } = useBookingDraft();
  const doctor = doctorById(booking?.doctorId);

  const pop = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    pop.value = still ? 1 : withDelay(120, withSpring(1, { damping: 11, stiffness: 180 }));
  }, [still, pop]);
  const tick = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }], opacity: pop.value }));

  function home() {
    reset();
    router.replace("/home");
  }

  if (!booking || !doctor) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-8">
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>No booking to show</Text>
        <Pressable onPress={home} className="mt-4">
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  const online = booking.mode === "online";
  const day = new Date(booking.day);
  const dateLabel = day.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const face = doctorFace(doctor);

  const next: [React.ReactNode, string][] = online
    ? [
        [<MonitorPlay key="a" size={16} color={brand[600]} />, "A video link appears here 15 minutes before your slot."],
        [<ClipboardCheck key="b" size={16} color={brand[600]} />, `${doctor.name.split(" ").slice(0, 2).join(" ")} has your pre-consultation note.`],
        [<MessageCircleHeart key="c" size={16} color={brand[600]} />, "After the call, send me the prescription and I'll file it."],
      ]
    : [
        [<Ticket key="a" size={16} color={brand[600]} />, "Show this at the front desk to get your token."],
        [<ClipboardCheck key="b" size={16} color={brand[600]} />, `${doctor.name.split(" ").slice(0, 2).join(" ")} has your pre-consultation note.`],
        [<MessageCircleHeart key="c" size={16} color={brand[600]} />, "After the visit, snap the prescription and I'll file it."],
      ];

  return (
    <View className="flex-1 bg-canvas">
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 460 }}>
        <Gradient from="#e6defe" to="#fafafe" angle="vertical" glow="#ffffff" />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 28, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <Animated.View style={tick}>
            <View className="h-20 w-20 items-center justify-center rounded-pill" style={[glassShadow, { backgroundColor: brand[600] }]}>
              <Check size={38} color="#fff" strokeWidth={3} />
            </View>
          </Animated.View>
          <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900], marginTop: 18, textAlign: "center" }}>
            You&apos;re booked{intake?.forName && intake.forName !== "Me" ? ` for ${intake.forName}` : ""}!
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: ink[500], marginTop: 4, textAlign: "center" }}>
            Preview booking. No real appointment was made.
          </Text>
        </View>

        {/* The ticket. */}
        <Glass strong className="mt-6 overflow-hidden rounded-[28px]">
          <View className="flex-row items-center gap-3.5 p-4">
            <View className="overflow-hidden rounded-[18px]" style={{ width: 60, height: 60, backgroundColor: face?.background }}>
              {face ? <SvgXml xml={face.svg} width={64} height={64} /> : null}
            </View>
            <View className="min-w-0 flex-1">
              <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{doctor.name}</Text>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: brand[600], marginTop: 1 }}>
                {SPECIALTIES[doctor.specialty].label}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-pill px-3 py-1.5" style={{ backgroundColor: brand[50] }}>
              {online ? <MonitorPlay size={13} color={brand[700]} /> : <Building2 size={13} color={brand[700]} />}
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: brand[700] }}>{online ? "Video" : "Clinic"}</Text>
            </View>
          </View>

          {/* The tear line: two notches and a dashed rule, so it reads as a ticket. */}
          <View className="flex-row items-center">
            <View style={{ width: 14, height: 28, borderTopRightRadius: 14, borderBottomRightRadius: 14, backgroundColor: "#f3f0fe", marginLeft: -1 }} />
            <View className="mx-2 flex-1" style={{ borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(15,16,48,0.14)" }} />
            <View style={{ width: 14, height: 28, borderTopLeftRadius: 14, borderBottomLeftRadius: 14, backgroundColor: "#f3f0fe", marginRight: -1 }} />
          </View>

          <View className="gap-3 p-4">
            <Line icon={<CalendarCheck2 size={17} color={ink[700]} />} label="Date" value={dateLabel} />
            <Line icon={<Clock3 size={17} color={ink[700]} />} label={online ? "Time" : "Arrive between"} value={booking.slotLabel} />
            {online ? null : (
              <Line icon={<MapPin size={17} color={ink[700]} />} label="Clinic" value={`${doctor.clinic.name}, ${doctor.clinic.area}`} />
            )}
            <View className="mt-1 flex-row items-center justify-between rounded-[16px] px-3.5 py-3" style={{ backgroundColor: "#f6f4ff" }}>
              <Text style={{ fontFamily: font.medium, fontSize: 13.5, color: ink[700] }}>{online ? "Consultation fee" : "Pay at the clinic"}</Text>
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>₹{doctor.fee[booking.mode]}</Text>
            </View>
          </View>
        </Glass>

        <View className="mt-5 flex-row items-end gap-2.5">
          <View style={{ flexShrink: 0 }}>
            <MascotBust size={52} />
          </View>
          <BubblePop delay={0.5} from="left" style={{ flexShrink: 1, marginBottom: 6 }}>
            <Glass strong className="rounded-[18px] px-3.5 py-2.5" style={{ borderBottomLeftRadius: 6 }}>
              <Text style={{ fontFamily: font.medium, fontSize: 13.5, color: ink[900] }}>
                All set! Here&apos;s what happens next.
              </Text>
            </Glass>
          </BubblePop>
        </View>

        <View className="mt-3 gap-2">
          {next.map(([icon, text]) => (
            <Glass key={text} className="flex-row items-center gap-3 rounded-[18px] px-3.5 py-3">
              <View className="h-8 w-8 items-center justify-center rounded-pill" style={{ backgroundColor: brand[50] }}>
                {icon}
              </View>
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[700] }}>{text}</Text>
            </Glass>
          ))}
        </View>
      </ScrollView>

      <View className="gap-2 px-5 pt-2" style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          accessibilityRole="button"
          onPress={home}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: ink[900],
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text style={{ fontFamily: font.semibold, fontSize: 15.5, color: "#fff" }}>Back to home</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Line({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3">
      {icon}
      <Text style={{ width: 108, fontFamily: font.regular, fontSize: 13.5, color: ink[500] }}>{label}</Text>
      <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{value}</Text>
    </View>
  );
}
