import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileText,
  LifeBuoy,
  Clock3,
  Languages,
  MapPin,
  MessageCircleHeart,
  MonitorPlay,
  Navigation,
  Ticket,
  Video,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BubblePop } from "@/components/onboarding/motion";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ProblemSheet } from "@/components/partner/sheets";
import { PaymentCard } from "@/components/partner/payment-card";
import { Tap } from "@/components/ui/tap";
import { labstack, LIVE } from "@/lib/partner/labstack";
import { PartnerError } from "@/lib/partner/types";
import { Glass, Gradient } from "@/components/ui/glass";
import { Backdrop, PillButton, Portrait, ScreenHeader } from "@/components/ui/screen";
import {
  countdown,
  isUpcoming,
  joinWindow,
  startsAt,
  useAppointmentList,
  whenLabel,
} from "@/lib/booking/appointments";
import { SPECIALTIES, doctorById } from "@/lib/booking/catalog";
import { lsIdOf } from "@/lib/booking/partner-doctors";
import { doctorFace } from "@/lib/booking/faces";
import { brand, hue, ink, lilac } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * One appointment, everything needed on the day.
 *
 * The screen answers, in order, the questions somebody has on the day of an
 * appointment: when, how do I get in (join the call, or where is the clinic),
 * what do I bring or pay, and what if plans change.
 *
 * THE JOIN BUTTON IS ALWAYS VISIBLE for a video call, and says when it opens
 * rather than disappearing — nobody should have to wonder whether the link
 * will come. It goes live 15 minutes before the slot.
 *
 * PREVIEW. There is no video room behind the button yet; pressing it says so.
 * Directions open the maps app on the sample clinic's name and area.
 */
export default function AppointmentDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, loaded, cancel } = useAppointmentList();
  const appt = items.find((a) => a.id === id);
  const doctor = doctorById(appt?.doctorId);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [joinNote, setJoinNote] = useState<boolean | string>(false);
  const [joining, setJoining] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  // Live bookings: the partner's state, mainly whether it is still waiting for payment.
  const live = useQuery({
    queryKey: ["consult", id],
    queryFn: () => labstack().consult.appointment(id!),
    enabled: LIVE && Boolean(id) && Boolean(lsIdOf(appt?.doctorId)),
    refetchInterval: (q) => (q.state.data?.payment?.required && !q.state.data.payment.expired ? 10_000 : 120_000),
  });

  /** The call room, from LabStack's authenticated meeting link; opened in the browser. */
  async function join() {
    if (!id) return;
    setJoining(true);
    try {
      const m = await labstack().consult.meetingLink(id);
      if (m.link) await Linking.openURL(m.link);
      else setJoinNote(true);
    } catch (e) {
      setJoinNote(e instanceof PartnerError ? e.message : "Couldn't open the call. Try again in a moment.");
    } finally {
      setJoining(false);
    }
  }

  // Re-render every 30 s so the countdown and the join button stay honest while
  // the screen is open.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (!appt || !doctor) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Appointment" fallback="/appointments" />
        {loaded ? (
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[500], textAlign: "center", marginTop: 40 }}>
            This appointment isn&apos;t on this phone.
          </Text>
        ) : null}
      </View>
    );
  }

  const online = appt.mode === "online";
  const cancelled = appt.status === "cancelled";
  const upcoming = isUpcoming(appt);
  const win = joinWindow(appt);
  const face = doctorFace(doctor);
  const start = startsAt(appt);
  const opensAt = new Date(start.getTime() - 15 * 60 * 1000).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const fee = doctor.fee[appt.mode];

  function directions() {
    if (!doctor) return;
    const q = encodeURIComponent(`${doctor.clinic.name}, ${doctor.clinic.area}`);
    void Linking.openURL(Platform.OS === "ios" ? `maps://?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
  }

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop height={460} />
      <ScreenHeader title="Appointment" fallback="/appointments" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {live.data?.payment?.required ? (
          <View style={{ marginBottom: 14 }}>
            <PaymentCard payment={live.data.payment} what="appointment" onReturn={() => void live.refetch()} onRebook={() => router.replace("/book/doctors")} />
          </View>
        ) : null}
        {/* Who and when. */}
        <View className="overflow-hidden rounded-2xl p-4">
          <Gradient from={online ? lilac.violet : hue.orange.bg} to={online ? lilac.mist : hue.orange.wash} glow="#ffffff" />
          <View className="flex-row items-center gap-3.5">
            <Portrait face={face} size={72} radius={22} />
            <View className="min-w-0 flex-1">
              <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900] }}>{doctor.name}</Text>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: brand[600], marginTop: 1 }}>
                {SPECIALTIES[doctor.specialty].label} · {doctor.years} yrs
              </Text>
              <View className="mt-1.5 flex-row items-center gap-1.5">
                <Languages size={13} color={ink[500]} />
                <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
                  {doctor.languages.join(", ")}
                </Text>
              </View>
            </View>
          </View>

          <Glass strong className="mt-4 flex-row items-center gap-3 rounded-xl p-3.5">
            <View className="h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: online ? brand[50] : hue.orange.wash }}>
              {online ? <MonitorPlay size={20} color={ink[900]} /> : <Building2 size={20} color={hue.orange.fg} />}
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{whenLabel(appt)}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
                {cancelled
                  ? "Cancelled"
                  : upcoming
                    ? `${online ? "Video call, 15 min" : `Arrive ${appt.slotLabel}`} · starts ${countdown(appt)}`
                    : "Completed"}
              </Text>
            </View>
          </Glass>
        </View>

        {/* How to get in. */}
        {online && !cancelled ? (
          <View className="mt-4">
            <Glass strong className="rounded-xl p-4">
              <View className="flex-row items-center gap-2">
                <Video size={17} color={ink[900]} />
                <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Video call</Text>
              </View>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700], marginTop: 6 }}>
                {win === "early"
                  ? `The room opens at ${opensAt}, 15 minutes before your slot. Find a quiet spot with good network.`
                  : win === "open"
                    ? `${doctor.name.split(" ").slice(0, 2).join(" ")} can see you now. Keep your reports handy.`
                    : "This call has ended."}
              </Text>
              {win !== "closed" ? (
                <PillButton
                  tone="brand"
                  disabled={win !== "open"}
                  loading={joining}
                  onPress={() => void join()}
                  icon={<Video size={18} color="#fff" />}
                  style={{ marginTop: 14 }}
                >
                  {win === "open" ? "Join video call" : `Join opens at ${opensAt}`}
                </PillButton>
              ) : null}
            </Glass>
            {joinNote ? (
              <BubblePop style={{ marginTop: 8 }}>
                <Glass strong className="rounded-lg px-3.5 py-2.5">
                  <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
                    {joinNote === true ? "Preview: there's no real call room yet. In the live app this opens the video call." : joinNote}
                  </Text>
                </Glass>
              </BubblePop>
            ) : null}
          </View>
        ) : null}

        {!online && !cancelled ? (
          <Glass strong className="mt-4 gap-3 rounded-xl p-4">
            <Row icon={<MapPin size={17} color={hue.orange.fg} />} title={doctor.clinic.name} line={`${doctor.clinic.area} · ${doctor.clinic.km} km away`} />
            <Row icon={<Clock3 size={17} color={hue.orange.fg} />} title="OPD timings" line={doctor.clinic.opd} />
            <Row icon={<Ticket size={17} color={hue.orange.fg} />} title="At the front desk" line="Show this screen, take a token, and you're seen in turn." />
            {upcoming ? (
              <PillButton onPress={directions} icon={<Navigation size={17} color="#fff" />} style={{ marginTop: 4 }}>
                Get directions
              </PillButton>
            ) : null}
          </Glass>
        ) : null}

        {/* What goes with it. */}
        <Glass className="mt-4 gap-3 rounded-xl p-4">
          <Row icon={<ClipboardCheck size={17} color={ink[900]} />} title="Pre-consultation note shared" line={`For ${appt.forName === "Me" ? "you" : appt.forName} · ${appt.concern}`} />
          <View className="flex-row items-center justify-between rounded-lg px-3.5 py-3" style={{ backgroundColor: lilac.mist }}>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>{online ? "Consultation fee" : "Pay at the clinic"}</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{fee ? `₹${fee}` : "On the bill"}</Text>
          </View>
        </Glass>

        <PillButton
          tone="light"
          onPress={() => router.push(`/ask?q=${encodeURIComponent(`Help me prepare questions for my appointment with ${doctor.name}`)}`)}
          icon={<MessageCircleHeart size={18} color={ink[900]} />}
          style={{ marginTop: 16 }}
        >
          Prepare questions with Cheeku
        </PillButton>
        {/* After the visit: the prescription comes into the records. */}
        {!cancelled && !upcoming ? (
          <Glass strong className="mt-4 rounded-xl p-4">
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>After the visit</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700], marginTop: 4 }}>
              {LIVE ? "The doctor's e-prescription is filed in the records by itself, and I'll check the medicines. Got a paper one too? Add it." : "Add the prescription and I'll read it, check the medicines and keep it with the records."}
            </Text>
            <PillButton tone="light" onPress={() => router.push("/scan")} icon={<FileText size={17} color={ink[900]} />} style={{ marginTop: 12 }}>
              Add the prescription
            </PillButton>
          </Glass>
        ) : null}

        <Tap accessibilityRole="button" onPress={() => setProblemOpen(true)} style={{ flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 6, height: 44, marginTop: 8 }}>
          <LifeBuoy size={15} color={ink[700]} />
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[700] }}>Report a problem</Text>
        </Tap>
        {!LIVE ? (
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center", marginTop: 4 }}>
            Preview booking with a sample doctor.
          </Text>
        ) : null}
      </ScrollView>

      {upcoming && !cancelled ? (
        <View className="flex-row gap-2.5 px-5 pt-2" style={{ paddingBottom: insets.bottom + 12 }}>
          <PillButton tone="light" onPress={() => setConfirmCancel(true)} style={{ flex: 1 }}>
            Cancel
          </PillButton>
          <PillButton
            icon={<CalendarClock size={17} color="#fff" />}
            onPress={() => router.push({ pathname: "/book/slot", params: { id: doctor.id, reschedule: appt.id } })}
            style={{ flex: 1.4 }}
          >
            Reschedule
          </PillButton>
        </View>
      ) : null}

      <ProblemSheet
        open={problemOpen}
        onClose={() => setProblemOpen(false)}
        issues={["Doctor didn't join", "Call didn't work", "No prescription yet", "Charged wrongly", "Something else"]}
        onSend={async (issue, details) => {
          try {
            await labstack().consult.escalate(appt.id, issue, details);
            return null;
          } catch (e) {
            return e instanceof PartnerError ? e.message : "That didn't go through. Try again.";
          }
        }}
      />
      <ConfirmSheet
        open={confirmCancel}
        title="Cancel this appointment?"
        body={`Your ${online ? "video call" : "clinic visit"} with ${doctor.name}, ${whenLabel(appt)}, will be cancelled. You can book again any time.`}
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep it"
        destructive
        onConfirm={async () => {
          // A partner booking is cancelled with the doctor's desk first; if that fails it stays booked.
          if (lsIdOf(doctor.id) !== null) {
            try {
              await labstack().consult.cancel(appt.id, "Cancelled by the patient");
            } catch (e) {
              setConfirmCancel(false);
              setJoinNote(e instanceof PartnerError ? e.message : "Couldn't cancel it. Try again in a minute.");
              return;
            }
          }
          cancel(appt.id);
          setConfirmCancel(false);
        }}
        onClose={() => setConfirmCancel(false)}
      />
    </View>
  );
}

function Row({ icon, title, line }: { icon: React.ReactNode; title: string; line: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View style={{ marginTop: 1 }}>{icon}</View>
      <View className="flex-1">
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 1 }}>{line}</Text>
      </View>
    </View>
  );
}
