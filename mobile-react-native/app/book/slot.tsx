import { useLocalSearchParams, useRouter } from "expo-router";
import { Building2, ChevronLeft, Clock3, MapPin, MonitorPlay, Ticket } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { NoteCard } from "@/components/booking/note-card";
import { Boop } from "@/components/onboarding/motion";
import { Glass, GlassCircle, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { SPECIALTIES, addDays, dayName, doctorById, slotsFor, type Mode, type Slot } from "@/lib/booking/catalog";
import { useAppointmentList } from "@/lib/booking/appointments";
import { useBookingDraft } from "@/lib/booking/draft";
import { doctorFace } from "@/lib/booking/faces";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Book a doctor — pick a time.
 *
 * Two mechanics, because the two kinds of visit really do work differently:
 *
 *   ONLINE  — a 15-minute video slot at an exact time.
 *   CLINIC  — an OPD arrival window. You arrive inside the half hour, take a
 *             token at the desk, and are seen in turn. Promising a minute-exact
 *             clinic appointment would set an expectation the waiting room
 *             breaks, so the screen says how it works in one line.
 *
 * A seven-day date strip, then slots grouped by part of day. Taken slots are
 * shown struck through rather than hidden, so a busy day looks busy.
 *
 * Nothing is charged. In the preview, confirming records the choice on this
 * device only and shows the confirmation screen.
 */
export default function SlotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const { id, reschedule } = useLocalSearchParams<{ id: string; reschedule?: string }>();
  const appointments = useAppointmentList();
  const { mode, setMode, intake, book } = useBookingDraft();
  const doctor = doctorById(id);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null);

  if (!doctor) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-8">
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>That doctor isn&apos;t available</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const offers = (["online", "clinic"] as const).filter((k) => doctor.fee[k] !== undefined);
  const m: Mode = mode && doctor.fee[mode] !== undefined ? mode : (offers[0] ?? "online");
  const day = days[dayIndex] ?? addDays(new Date(), 0);
  const slots = slotsFor(doctor, m, day);
  const fee = doctor.fee[m] ?? 0;
  const face = doctorFace(doctor);

  function confirm() {
    if (!slot || !doctor) return;
    // Rescheduling moves the existing appointment rather than adding a second.
    if (reschedule) {
      appointments.reschedule(reschedule, day.toISOString(), slot.label);
      router.replace(`/appointments/${reschedule}` as never);
      return;
    }
    const appt = appointments.add({
      doctorId: doctor.id,
      mode: m,
      day: day.toISOString(),
      slotLabel: slot.label,
      forName: intake?.forName ?? "Me",
      concern: intake?.concern ?? "General consultation",
    });
    book({ doctorId: doctor.id, mode: m, day: day.toISOString(), slotLabel: slot.label, appointmentId: appt.id });
    router.replace("/book/confirmed");
  }

  return (
    <View className="flex-1 bg-canvas">
      {/* The doctor, as the hero: a pastel panel with the portrait, like the
          reference's detail screens. */}
      <View className="overflow-hidden" style={{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}>
        <Gradient from="#e3dcff" to="#f4f1ff" angle="vertical" glow="#ffffff" />
        <View className="flex-row items-center justify-between px-4" style={{ paddingTop: insets.top + 6 }}>
          <GlassCircle label="Go back" onPress={() => router.back()}>
            <ChevronLeft size={21} color={ink[900]} />
          </GlassCircle>
          <Glass className="rounded-pill px-3 py-1.5">
            <Text style={{ fontFamily: font.semibold, fontSize: 11.5, color: brand[700] }}>Preview</Text>
          </Glass>
        </View>
        <View className="flex-row items-end gap-4 px-5 pb-5 pt-2">
          <View className="overflow-hidden rounded-[26px]" style={[glassShadow, { width: 104, height: 116, backgroundColor: face?.background }]}>
            {face ? (
              <View className="flex-1 items-center justify-center">
                <SvgXml xml={face.svg} width={120} height={120} />
              </View>
            ) : null}
          </View>
          <View className="min-w-0 flex-1 pb-1">
            <Text style={{ fontFamily: font.semibold, fontSize: 21, letterSpacing: -0.4, color: ink[900] }}>{doctor.name}</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 13.5, color: brand[600], marginTop: 2 }}>
              {SPECIALTIES[doctor.specialty].label} · {doctor.years} yrs
            </Text>
            <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 4 }}>
              {doctor.qualifications} · Speaks {doctor.languages.join(", ")}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {offers.length > 1 ? (
          <View className="flex-row gap-2 rounded-pill p-1" style={{ backgroundColor: "rgba(241,240,254,0.9)" }}>
            {offers.map((k) => {
              const on = m === k;
              return (
                <Pressable
                  key={k}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setMode(k);
                    setSlot(null);
                  }}
                  className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-pill"
                  style={[on ? glassShadow : null, { backgroundColor: on ? "#fff" : "transparent" }]}
                >
                  {k === "online" ? <MonitorPlay size={16} color={on ? brand[600] : ink[500]} /> : <Building2 size={16} color={on ? brand[600] : ink[500]} />}
                  <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? ink[900] : ink[500] }}>
                    {k === "online" ? `Video · ₹${doctor.fee.online}` : `Clinic · ₹${doctor.fee.clinic}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {m === "clinic" ? (
          <Glass className="mt-3 gap-2 rounded-[20px] p-3.5">
            <Row icon={<MapPin size={15} color={brand[600]} />} text={`${doctor.clinic.name}, ${doctor.clinic.area} · ${doctor.clinic.km} km`} />
            <Row icon={<Clock3 size={15} color={brand[600]} />} text={`OPD ${doctor.clinic.opd}`} />
            <Row icon={<Ticket size={15} color={brand[600]} />} text="Arrive in your window, take a token at the desk, and you're seen in turn." />
          </Glass>
        ) : null}

        <Text style={{ fontFamily: font.semibold, fontSize: 18, color: ink[900], marginTop: 22 }}>Pick a day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
          {days.map((d, i) => {
            const on = i === dayIndex;
            return (
              <Pressable
                key={d.toISOString()}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={d.toDateString()}
                onPress={() => {
                  setDayIndex(i);
                  setSlot(null);
                }}
                style={[
                  on ? null : glassShadow,
                  {
                    width: 58,
                    height: 72,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: on ? ink[900] : glass.fillStrong,
                    borderWidth: on ? 0 : 1,
                    borderColor: glass.rim,
                  },
                ]}
              >
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: on ? "rgba(255,255,255,0.7)" : ink[500] }}>
                  {i === 0 ? "Today" : dayName(d)}
                </Text>
                <Text style={{ fontFamily: font.semibold, fontSize: 20, color: on ? "#fff" : ink[900], marginTop: 2 }}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={{ fontFamily: font.semibold, fontSize: 18, color: ink[900], marginTop: 8 }}>
          {m === "online" ? "Pick a video slot" : "Pick an arrival window"}
        </Text>

        <Animated.View key={`${m}-${dayIndex}`} entering={still ? undefined : FadeIn.duration(220)}>
          {(["Morning", "Afternoon", "Evening"] as const).map((part) => {
            const group = slots.filter((s) => s.part === part);
            if (group.length === 0) return null;
            return (
              <View key={part} className="mt-3">
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500], marginBottom: 8 }}>{part}</Text>
                <View className="flex-row flex-wrap items-start" style={{ gap: 8 }}>
                  {group.map((s) => {
                    const on = slot?.id === s.id;
                    return (
                      <Boop key={s.id} trigger={on ? s.id : null}>
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on, disabled: s.taken }}
                          accessibilityLabel={`${s.label}${s.taken ? ", taken" : ""}`}
                          disabled={s.taken}
                          onPress={() => setSlot(on ? null : s)}
                          style={{
                            height: 44,
                            paddingHorizontal: 14,
                            borderRadius: 14,
                            justifyContent: "center",
                            backgroundColor: on ? brand[600] : s.taken ? "transparent" : "#ffffff",
                            borderWidth: 1,
                            borderColor: on ? brand[600] : s.taken ? "rgba(15,16,48,0.08)" : "rgba(15,16,48,0.1)",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: on ? font.semibold : font.medium,
                              fontSize: 13.5,
                              color: on ? "#fff" : s.taken ? ink[300] : ink[900],
                              textDecorationLine: s.taken ? "line-through" : "none",
                            }}
                          >
                            {s.label}
                          </Text>
                        </Pressable>
                      </Boop>
                    );
                  })}
                </View>
              </View>
            );
          })}
          {slots.every((s) => s.taken) ? (
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 12 }}>
              Fully booked on this day. Try another day.
            </Text>
          ) : null}
        </Animated.View>

        {intake ? (
          <View className="mt-6">
            <Text style={{ fontFamily: font.semibold, fontSize: 18, color: ink[900], marginBottom: 10 }}>Going with your booking</Text>
            <NoteCard intake={intake} compact />
          </View>
        ) : null}
      </ScrollView>

      {/* The summary and the one action, pinned. Price on the left, like the
          reference's detail screens. */}
      <View className="flex-row items-center gap-3 px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Glass strong className="h-14 justify-center rounded-pill px-5">
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>₹{fee}</Text>
        </Glass>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !slot }}
          disabled={!slot}
          onPress={confirm}
          style={({ pressed }) => ({
            flex: 1,
            height: 56,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: slot ? brand[600] : "rgba(74,42,222,0.35)",
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text style={{ fontFamily: font.semibold, fontSize: 15.5, color: "#fff" }}>
            {slot
              ? `${reschedule ? "Move to" : "Book"} ${slot.label.split(" – ")[0]}, ${dayIndex === 0 ? "today" : dayName(day)}`
              : "Pick a time to continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-start gap-2.5">
      <View style={{ marginTop: 2 }}>{icon}</View>
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[700] }}>{text}</Text>
    </View>
  );
}
