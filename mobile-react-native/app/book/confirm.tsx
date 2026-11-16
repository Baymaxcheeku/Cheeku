import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, FileText, FlaskConical, MonitorPlay, Phone } from "lucide-react-native";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Line, Note, Section } from "@/components/partner/bits";
import { Field, PatientCard, usePatient } from "@/components/partner/forms";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { useAppointmentList } from "@/lib/booking/appointments";
import { SPECIALTIES, doctorById, type Mode } from "@/lib/booking/catalog";
import { useBookingDraft } from "@/lib/booking/draft";
import { lsIdOf } from "@/lib/booking/partner-doctors";
import { todayIso } from "@/lib/memory/clock";
import { buildContext } from "@/lib/memory/context";
import { recordBooking, threadKey, useMemory } from "@/lib/memory/store";
import { labstack, LIVE } from "@/lib/partner/labstack";
import { PartnerError } from "@/lib/partner/types";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * BOOK A DOCTOR, LAST STEP: CHECK AND CONFIRM (LabStack bookAppointment).
 *
 *   who      the patient details the doctor's desk needs (PatientCard)
 *   how      video or audio only, for an online visit (meetingType)
 *   tests    the tests Cheeku knows are due, sent to the doctor as
 *            suggestions (storeSuggestedTestIds); the doctor decides
 *   reports  share recent reports with the doctor, only if ticked
 *            (uploadDocument, PRIOR_PRESCRIPTION / OTHER)
 *   coupon   optional (couponCode)
 *
 * Nothing about the person's records goes to the doctor unless "Share" is
 * on. The pre-consultation note from the interview goes as `notes`.
 */

/** "7:00 pm – 7:30 pm" or "6:30 pm" on a day, as an IST ISO time. */
function startIso(dayIso: string, label: string): string {
  const d = new Date(dayIso);
  const m = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(label);
  let h = m ? Number(m[1]) % 12 : 10;
  if (m && m[3]!.toLowerCase() === "pm") h += 12;
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${ymd}T${String(h).padStart(2, "0")}:${m ? m[2] : "00"}:00+05:30`;
}

export default function ConfirmConsult() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id, mode, day, slot, ls, start } = useLocalSearchParams<{ id: string; mode: Mode; day: string; slot: string; ls?: string; start?: string }>();
  const doctor = doctorById(id);
  const { intake, book } = useBookingDraft();
  const appointments = useAppointmentList();
  const family = useFamily();

  // Who: the member picked in the interview ("Me" is the account holder).
  const all = family.data?.access.selectable ?? [];
  const forName = intake?.forName ?? "Me";
  const member = forName === "Me" ? all.find((p) => p.isPrimary) : all.find((p) => p.name.split(" ")[0]?.toLowerCase() === forName.split(" ")[0]?.toLowerCase());
  const patient = usePatient(member?.id);

  const [meeting, setMeeting] = useState<"VIDEO" | "AUDIO_ONLY">("VIDEO");
  const [coupon, setCoupon] = useState("");
  const [sendTests, setSendTests] = useState(true);
  const [share, setShare] = useState(Boolean(intake?.shareRecords));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tests already on this person's list: Cheeku suggests them; the doctor decides.
  const memory = useMemory(member?.id);
  const { dueTests, reports } = useMemo(() => {
    if (!memory.data) return { dueTests: [] as string[], reports: [] as { id: string; title: string }[] };
    const ctx = buildContext(memory.data, todayIso());
    const due = ctx.loops.filter((l) => /test|result|repeat|hba1c|lipid|thyroid|vitamin/i.test(`${l.type} ${l.title}`)).map((l) => l.title.replace(/^(repeat|recheck)\s+/i, "").replace(/\s+(results?|test|due)$/i, "").trim());
    const docs = [...ctx.documents]
      .filter((d) => d.doc_type === "lab_report" || d.doc_type === "prescription" || d.doc_type === "discharge")
      .sort((a, b) => String(b.event_date ?? "").localeCompare(String(a.event_date ?? "")))
      .slice(0, 3)
      .map((d) => ({ id: String(d.id), title: String(d.title ?? "Report") }));
    const seen = new Set<string>();
    const unique = due.filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
    return { dueTests: unique.slice(0, 4), reports: docs };
  }, [memory.data]);

  if (!doctor || !day || !slot) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Confirm" fallback="/book/doctors" />
        <Note tone="danger" text="Pick a doctor and a time first." />
      </View>
    );
  }
  const online = mode === "online";
  const fee = doctor.fee[mode] ?? 0;
  const when = `${new Date(day).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${slot}`;

  async function confirm() {
    if (!doctor) return;
    setTried(true);
    if (!patient.ready) return setError("A few details are missing above.");
    setBusy(true);
    setError(null);
    let appointmentId: string;
    try {
      const note = intake ? [`About: ${intake.concern}`, intake.details ? `In their words: ${intake.details}` : "", `Since: ${intake.since}`, `Getting in the way: ${intake.impact}`, `Tried: ${intake.tried}`].filter(Boolean).join("\n") : "";
      if (LIVE) {
        const lsId = lsIdOf(doctor.id) ?? (ls ? Number(ls) : null);
        if (!lsId) throw new PartnerError("This doctor isn't on the live network. Pick one from the list again.", "invalid");
        ({ appointmentId } = await labstack().consult.book({
          profileId: member!.id,
          lsProviderId: lsId,
          appointmentType: online ? "ONLINE" : "CENTER_VISIT",
          appointment: start ?? startIso(day, slot),
          meetingType: meeting,
          patient: patient.result!.patient,
          address: null,
          notes: note,
          couponCode: coupon.trim(),
          suggestedTestIds: sendTests ? dueTests : [],
          shareDocumentIds: share ? reports.map((r) => r.id) : [],
        }));
        // Kept on the phone too, under the partner booking's id, so Appointments, reminders and Join work as before.
        appointments.add({ id: appointmentId, doctorId: doctor.id, mode, day, slotLabel: slot, forName, concern: intake?.concern ?? "General consultation", profileId: member?.id });
      } else {
        appointmentId = appointments.add({ doctorId: doctor.id, mode, day, slotLabel: slot, forName, concern: intake?.concern ?? "General consultation", profileId: member?.id }).id;
      }
    } catch (e) {
      setBusy(false);
      return setError(e instanceof PartnerError ? e.message : "That didn't book. Check your connection and try again.");
    }
    setBusy(false);
    book({ doctorId: doctor.id, mode, day, slotLabel: slot, appointmentId });
    if (member) {
      const where = online ? (meeting === "VIDEO" ? "Video call" : "Audio call") : `${doctor.clinic.name}, ${doctor.clinic.area}`;
      const noteLines = intake ? [`About: ${intake.concern}`, intake.details ? `In their words: ${intake.details}` : "", `Since: ${intake.since}`].filter(Boolean) : undefined;
      void recordBooking(
        member.id,
        { kind: "doctor", title: `${doctor.name}, ${SPECIALTIES[doctor.specialty].label.toLowerCase()}`, when, where, route: `/appointments/${appointmentId}`, note: noteLines },
        `Booked ${doctor.name} for ${forName === "Me" ? "you" : forName}: ${when}, ${online ? "on a call" : `at ${doctor.clinic.name}`}. The doctor gets the pre-consultation note${sendTests && dueTests.length ? " and the tests that are due" : ""} before you meet.`,
      ).then(() => qc.invalidateQueries({ queryKey: threadKey(member.id) }));
    }
    router.replace("/book/confirmed");
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop />
      <ScreenHeader title="Confirm" fallback="/book/doctors" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line, gap: 4 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{doctor.name}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{SPECIALTIES[doctor.specialty].label} · {online ? "Online" : `${doctor.clinic.name}, ${doctor.clinic.area}`}</Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 6 }}>{when}</Text>
        </View>

        <View style={{ marginTop: 14 }}>
          <PatientCard p={patient} showErrors={tried} />
        </View>

        {online ? (
          <Section title="How do you want to talk?">
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([["VIDEO", "Video", MonitorPlay], ["AUDIO_ONLY", "Audio only", Phone]] as const).map(([v, label, Icon]) => {
                const on = meeting === v;
                return (
                  <Tap key={v} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setMeeting(v)} style={{ flex: 1, height: 50, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}>
                    <Icon size={17} color={on ? "#fff" : ink[900]} />
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: on ? "#fff" : ink[900] }}>{label}</Text>
                  </Tap>
                );
              })}
            </View>
          </Section>
        ) : null}

        {dueTests.length ? (
          <Section title="Tests that are due">
            <Toggle on={sendTests} onPress={() => setSendTests((v) => !v)} icon={FlaskConical} title={`Suggest ${dueTests.length > 1 ? `${dueTests.slice(0, -1).join(", ")} and ${dueTests[dueTests.length - 1]}` : dueTests[0]} to the doctor`} line="From Cheeku's list of what's due. The doctor decides what to order." />
          </Section>
        ) : null}

        {reports.length ? (
          <Section title="Share reports">
            <Toggle on={share} onPress={() => setShare((v) => !v)} icon={FileText} title={`Share ${reports.length} recent ${reports.length === 1 ? "record" : "records"} with the doctor`} line={reports.map((r) => r.title).join(", ")} />
            {!share ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 6 }}>Off: nothing from the health file goes to the doctor.</Text> : null}
          </Section>
        ) : null}

        <Section title="Coupon">
          <Field page label="Coupon code" hint="Optional" value={coupon} onChangeText={setCoupon} autoCapitalize="characters" maxLength={30} placeholder="Optional" />
        </Section>

        <Section title="Fee">
          <View className="rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line }}>
            <Line label={online ? "Online consultation" : "Clinic consultation"} value={fee ? `₹${fee}` : "Shown with the booking"} strong />
          </View>
        </Section>

        {error ? <Note tone="danger" text={error} /> : null}
        {!LIVE ? <Note tone="info" text="Preview: sample doctors. Nothing is booked with anyone or charged." /> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <PillButton tone="brand" loading={busy} onPress={() => void confirm()}>
          {`Confirm ${slot.split(" – ")[0]}`}
        </PillButton>
      </View>
    </KeyboardAvoidingView>
  );
}

function Toggle({ on, onPress, icon: Icon, title, line }: { on: boolean; onPress: () => void; icon: typeof Check; title: string; line: string }) {
  return (
    <Tap accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress} className="flex-row items-start gap-3 rounded-xl bg-white p-4" style={{ borderWidth: 1.5, borderColor: on ? brand[500] : surface.line }}>
      <View className="h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: brand[50] }}>
        <Icon size={17} color={ink[900]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{title}</Text>
        <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 2 }}>{line}</Text>
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: on ? brand[600] : "#fff", borderWidth: on ? 0 : 1.5, borderColor: surface.line }}>
        {on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
      </View>
    </Tap>
  );
}
