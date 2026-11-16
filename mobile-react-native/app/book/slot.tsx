import { useLocalSearchParams, useRouter } from "expo-router";
import { Building2, ChevronLeft, Clock3, MapPin, MonitorPlay, Ticket } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { Tap } from "@/components/ui/tap";
import { NoteCard } from "@/components/booking/note-card";
import { Boop } from "@/components/onboarding/motion";
import { Glass, GlassCircle, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { SPECIALTIES, addDays, dayName, doctorById, slotsFor, type Mode, type Slot } from "@/lib/booking/catalog";
import { useAppointmentList } from "@/lib/booking/appointments";
import { useBookingDraft } from "@/lib/booking/draft";
import { lsIdOf } from "@/lib/booking/partner-doctors";
import { labstack } from "@/lib/partner/labstack";
import { PartnerError } from "@/lib/partner/types";
import { useLiveSlots } from "@/lib/partner/use-doctors";
import { doctorFace } from "@/lib/booking/faces";
import { brand, ink, lilac } from "@/theme/tokens";
import { font } from "@/theme/type";
import { goBack } from "@/lib/nav/go-back";

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
  const { mode, setMode, intake } = useBookingDraft();
  const doctor = doctorById(id);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Partner doctors: real open times from the network (hooks run before any early return).
  const partner = lsIdOf(doctor?.id) !== null;
  const modeFor: Mode = doctor && mode && doctor.fee[mode] !== undefined ? mode : doctor?.fee.online !== undefined ? "online" : "clinic";
  const live = useLiveSlots(partner ? doctor : undefined, modeFor, days[dayIndex] ?? new Date());

  if (!doctor) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-8">
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>That doctor isn&apos;t available</Text>
        <Tap onPress={() => goBack(router, "/book/doctors")} className="mt-4">
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Go back</Text>
        </Tap>
      </View>
    );
  }

  const offers = (["online", "clinic"] as const).filter((k) => doctor.fee[k] !== undefined);
  const m: Mode = mode && doctor.fee[mode] !== undefined ? mode : (offers[0] ?? "online");
  const day = days[dayIndex] ?? addDays(new Date(), 0);
  const slots = partner ? (live.data ?? []) : slotsFor(doctor, m, day);
  const fee = doctor.fee[m] ?? 0;
  const face = doctorFace(doctor);

  async function confirm() {
    if (!slot || !doctor) return;
    // Rescheduling moves the existing appointment rather than adding a second.
    if (reschedule) {
      if (partner) {
        try {
          await labstack().consult.reschedule(reschedule, slot.id);
        } catch (e) {
          setMoveError(e instanceof PartnerError ? e.message : "Couldn't move it. Try another time.");
          return;
        }
      }
      appointments.reschedule(reschedule, day.toISOString(), slot.label);
      router.replace(`/appointments/${reschedule}` as never);
      return;
    }
    // New bookings go through Confirm: who it's for, call type, tests, sharing.
    router.push({ pathname: "/book/confirm", params: { id: doctor.id, mode: m, day: day.toISOString(), slot: slot.label, ...(partner ? { start: slot.id } : {}) } } as never);
  }

  return (
    <View className="flex-1 bg-canvas">
      {/* The doctor, as the hero: a pastel panel with the portrait, like the
          reference's detail screens. */}
      <View className="overflow-hidden" style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <Gradient from={lilac.violet} to={lilac.mist} angle="vertical" glow="#ffffff" />
        <View className="flex-row items-center justify-between px-4" style={{ paddingTop: insets.top + 6 }}>
          <GlassCircle label="Go back" onPress={() => goBack(router, "/book/doctors")}>
            <ChevronLeft size={21} color={ink[900]} />
          </GlassCircle>
          {partner ? <View /> : (
            <Glass className="rounded-pill px-3 py-1.5">
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: brand[700] }}>Preview</Text>
            </Glass>
          )}
        </View>
        <View className="flex-row items-end gap-4 px-5 pb-5 pt-2">
          <View className="overflow-hidden rounded-xl" style={[glassShadow, { width: 104, height: 116, backgroundColor: face?.background }]}>
            {face ? (
              <View className="flex-1 items-center justify-center">
                <SvgXml xml={face.svg} width={120} height={120} />
              </View>
            ) : null}
          </View>
          <View className="min-w-0 flex-1 pb-1">
            <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>{doctor.name}</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: brand[600], marginTop: 2 }}>
              {SPECIALTIES[doctor.specialty].label} · {doctor.years} yrs
            </Text>
            <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 4 }}>
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
                <Tap
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
                  <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 15, color: on ? ink[900] : ink[500] }}>
                    {k === "online" ? `Video${doctor.fee.online ? ` · ₹${doctor.fee.online}` : ""}` : `Clinic${doctor.fee.clinic ? ` · ₹${doctor.fee.clinic}` : ""}`}
                  </Text>
                </Tap>
              );
            })}
          </View>
        ) : null}

        {m === "clinic" ? (
          <Glass className="mt-3 gap-2 rounded-xl p-3.5">
            <Row icon={<MapPin size={15} color={ink[900]} />} text={`${doctor.clinic.name}, ${doctor.clinic.area} · ${doctor.clinic.km} km`} />
            <Row icon={<Clock3 size={15} color={ink[900]} />} text={`OPD ${doctor.clinic.opd}`} />
            <Row icon={<Ticket size={15} color={ink[900]} />} text="Arrive in your window, take a token at the desk, and you're seen in turn." />
          </Glass>
        ) : null}

        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 22 }}>Pick a day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
          {days.map((d, i) => {
            const on = i === dayIndex;
            return (
              <Tap scale={0.98}
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
                    borderRadius: 24,
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
              </Tap>
            );
          })}
        </ScrollView>

        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 8 }}>
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
                        <Tap
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on, disabled: s.taken }}
                          accessibilityLabel={`${s.label}${s.taken ? ", taken" : ""}`}
                          disabled={s.taken}
                          onPress={() => setSlot(on ? null : s)}
                          style={{
                            height: 44,
                            paddingHorizontal: 14,
                            borderRadius: 16,
                            justifyContent: "center",
                            backgroundColor: on ? brand[600] : s.taken ? "transparent" : "#ffffff",
                            borderWidth: 1,
                            borderColor: on ? brand[600] : s.taken ? "rgba(15,16,48,0.08)" : "rgba(15,16,48,0.1)",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: on ? font.semibold : font.medium,
                              fontSize: 13,
                              color: on ? "#fff" : s.taken ? ink[300] : ink[900],
                              textDecorationLine: s.taken ? "line-through" : "none",
                            }}
                          >
                            {s.label}
                          </Text>
                        </Tap>
                      </Boop>
                    );
                  })}
                </View>
              </View>
            );
          })}
          {partner && live.isPending ? (
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 12 }}>Checking open times…</Text>
          ) : partner && live.error ? (
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 12 }}>Couldn&apos;t load times. Pick the day again to retry.</Text>
          ) : slots.every((s) => s.taken) ? (
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 12 }}>
              {slots.length ? "Fully booked on this day. Try another day." : "No open times on this day. Try another day."}
            </Text>
          ) : null}
          {moveError ? <Text style={{ fontFamily: font.medium, fontSize: 14, color: "#b42318", marginTop: 12 }}>{moveError}</Text> : null}
        </Animated.View>

        {intake ? (
          <View className="mt-6">
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginBottom: 10 }}>Going with your booking</Text>
            <NoteCard intake={intake} compact />
          </View>
        ) : null}
      </ScrollView>

      {/* The summary and the one action, pinned. Price on the left, like the
          reference's detail screens. */}
      <View className="flex-row items-center gap-3 px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Glass strong className="h-14 justify-center rounded-pill px-5">
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{fee ? `₹${fee}` : partner ? "Fee on booking" : "₹0"}</Text>
        </Glass>
        <Tap
          accessibilityRole="button"
          accessibilityState={{ disabled: !slot }}
          disabled={!slot}
          onPress={() => void confirm()}
          style={{
            flex: 1,
            height: 56,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: slot ? ink[900] : "rgba(17,17,20,0.3)",
          }}
          scale={0.98}
        >
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>
            {slot
              ? `${reschedule ? "Move to" : "Book"} ${slot.label.split(" – ")[0]}, ${dayIndex === 0 ? "today" : dayName(day)}`
              : "Pick a time to continue"}
          </Text>
        </Tap>
      </View>
    </View>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-start gap-2.5">
      <View style={{ marginTop: 2 }}>{icon}</View>
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700] }}>{text}</Text>
    </View>
  );
}
