import { useRouter } from "expo-router";
import { Building2, ChevronRight, MonitorPlay, Video } from "lucide-react-native";
import { Text, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";

import { Tap } from "@/components/ui/tap";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { Portrait } from "@/components/ui/screen";
import { countdown, joinWindow, whenLabel, type Appointment } from "@/lib/booking/appointments";
import { SPECIALTIES, doctorById } from "@/lib/booking/catalog";
import { doctorFace } from "@/lib/booking/faces";
import { brand, hue, ink, lilac } from "@/theme/tokens";
import { font } from "@/theme/type";

/**
 * One appointment, as a tappable card.
 *
 * `hero` is the Home version: a gradient card with a countdown and, for a video
 * call whose room is open, a Join button right on the card — the one action
 * somebody opening the app five minutes before their call came to do.
 */
export function AppointmentCard({ appt, hero }: { appt: Appointment; hero?: boolean }) {
  const router = useRouter();
  const doctor = doctorById(appt.doctorId);
  if (!doctor) return null;

  const online = appt.mode === "online";
  const cancelled = appt.status === "cancelled";
  const open = online && joinWindow(appt) === "open" && !cancelled;
  const face = doctorFace(doctor);
  const go = () => router.push(`/appointments/${appt.id}` as never);

  const body = (
    <View className="flex-row items-center gap-3">
      <Portrait face={face} size={hero ? 58 : 52} radius={hero ? 18 : 16} />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          {online ? <MonitorPlay size={13} color={brand[600]} /> : <Building2 size={13} color={hue.orange.fg} />}
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: online ? brand[700] : "#a3530a" }}>
            {online ? "Video call" : "Clinic visit"}
            {cancelled ? " · Cancelled" : ""}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 2 }}>
          {doctor.name}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
          {whenLabel(appt)} · {SPECIALTIES[doctor.specialty].label}
        </Text>
      </View>
      {!hero ? <ChevronRight size={18} color={ink[300]} /> : null}
    </View>
  );

  if (!hero) {
    return (
      <Tap accessibilityRole="button" onPress={go} style={{ opacity: cancelled ? 0.6 : 1 }} scale={0.98}>
        <Glass strong className="rounded-xl p-3 pr-4">
          {body}
        </Glass>
      </Tap>
    );
  }

  return (
    <Tap accessibilityRole="button" accessibilityLabel={`Upcoming appointment with ${doctor.name}, ${whenLabel(appt)}`} onPress={go} scale={0.98}>
      <View className="overflow-hidden rounded-2xl p-3.5" style={glassShadow}>
        <Gradient from={online ? lilac.violet : hue.orange.bg} to={online ? lilac.mist : hue.orange.wash} glow="#ffffff" />
        <View className="mb-3 flex-row items-center justify-between">
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[700] }}>Upcoming</Text>
          <Glass className="rounded-pill px-2.5 py-1">
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: ink[900] }}>Starts {countdown(appt)}</Text>
          </Glass>
        </View>
        {body}
        {open ? (
          <Pressable
            accessibilityRole="button"
            onPress={go}
            style={({ pressed }) => ({
              marginTop: 12,
              height: 48,
              borderRadius: 999,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: brand[600],
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Video size={18} color="#fff" />
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Join video call</Text>
          </Pressable>
        ) : null}
      </View>
    </Tap>
  );
}
