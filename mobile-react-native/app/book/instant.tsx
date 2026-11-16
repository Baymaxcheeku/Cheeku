import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Stethoscope, Video } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotFigure } from "@/components/illustrations/sprout";
import { MemberChips, Note, Section } from "@/components/partner/bits";
import { Field, PatientCard, usePatient } from "@/components/partner/forms";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { EmergencyEscalation } from "@/components/safety/emergency-escalation";
import { detect } from "@/lib/safety/detect";
import type { SafetyResult } from "@/lib/safety/detect";
import { todayIso } from "@/lib/memory/clock";
import { buildContext } from "@/lib/memory/context";
import { useMemory } from "@/lib/memory/store";
import { labstack, LIVE } from "@/lib/partner/labstack";
import { PartnerError, type InstantStatus } from "@/lib/partner/types";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * TALK TO A DOCTOR NOW (LabStack instant consult).
 *
 * Who it's for, a line on what's going on, and, only if they tick it, a
 * short clinical snapshot (allergies, medicines, blood group, conditions;
 * each trimmed to 500) for the doctor who picks it up. Then the request goes
 * out to the doctors on call (createInstant) and this screen waits with
 * them (getInstantStatus every few seconds; the webhook also nudges it):
 * finding a doctor, then "Join the call", or "No one free" with a way on.
 *
 * The safety gate runs on the note first: anything that reads as an
 * emergency sends them to 112, not to a queue.
 */

export default function InstantConsult() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { who } = useLocalSearchParams<{ who?: string }>();
  const family = useFamily();
  const members = family.data?.access.selectable ?? [];
  const [memberId, setMemberId] = useState<string | null>(who ?? null);
  const member = members.find((m) => m.id === (memberId ?? family.data?.profile?.id)) ?? members[0];
  const patient = usePatient(member?.id);
  const memory = useMemory(member?.id);
  const [notes, setNotes] = useState("");
  const [share, setShare] = useState(true);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<InstantStatus | null>(null);
  const [escalation, setEscalation] = useState<SafetyResult | null>(null);

  const context = useMemo(() => {
    if (!memory.data) return {} as Record<string, string>;
    const ctx = buildContext(memory.data, todayIso());
    const meds = ctx.ledger.filter((e) => e.status !== "ended").map((e) => `${e.name}${e.strength ? ` ${e.strength}` : ""}`);
    const out: Record<string, string> = {};
    if (ctx.subject.allergies.length) out.allergies = ctx.subject.allergies.join(", ").slice(0, 500);
    if (meds.length) out.medications = meds.join(", ").slice(0, 500);
    if (ctx.subject.bloodGroup) out.bloodGroup = ctx.subject.bloodGroup;
    if (ctx.subject.conditions.length) out.briefHistory = ctx.subject.conditions.join(", ").slice(0, 500);
    return out;
  }, [memory.data]);

  // Waiting: ask every few seconds until a doctor picks it up or it lapses.
  const status = useQuery({
    queryKey: ["instant", request?.requestId],
    queryFn: () => labstack().consult.instantStatus(request!.requestId),
    enabled: Boolean(request) && request?.status === "BROADCASTING",
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "BROADCASTING" ? false : 4000),
  });
  const live = status.data ?? request;
  useEffect(() => setRequest(null), [member?.id]);

  async function start() {
    setTried(true);
    if (!notes.trim()) return setError("Add a line on what's going on.");
    const verdict = detect(notes);
    if (verdict.status === "escalate") {
      setEscalation(verdict);
      return;
    }
    if (!patient.ready) return setError("A few details are missing above.");
    setBusy(true);
    setError(null);
    try {
      const r = await labstack().consult.instant({ profileId: member!.id, patient: patient.result!.patient, speciality: null, notes: notes.trim().slice(0, 1000), context: share ? { chiefComplaint: notes.trim().slice(0, 500), ...context } : {} });
      setRequest(r);
    } catch (e) {
      setError(e instanceof PartnerError ? e.message : "That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (live?.meetingLink) await Linking.openURL(live.meetingLink);
    else setError("Preview: there's no real call room yet. In the live app this opens the video call.");
  }

  // ---------------------------------------------------------------- waiting --
  if (live) {
    const claimed = live.status === "CLAIMED";
    const over = live.status === "EXPIRED" || live.status === "CANCELED";
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Talk to a doctor now" fallback="/book/consult" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 12 }}>
          <MascotFigure size={140} moment="present" move="float" hop={claimed} />
          <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: ink[900], textAlign: "center" }}>
            {claimed ? "A doctor is ready" : over ? (live.status === "CANCELED" ? "Request cancelled" : "No doctor was free") : "Finding a doctor…"}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], textAlign: "center" }}>
            {claimed ? "Join the call. Find a quiet spot and keep the reports handy." : over ? "Book a time with a doctor instead, or try again in a few minutes." : "Usually a few minutes. Keep this screen open; I'll tell you the moment someone picks up."}
          </Text>
          {error ? <Note tone="info" text={error} /> : null}
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, gap: 10 }}>
          {claimed ? (
            <PillButton tone="brand" icon={<Video size={18} color="#fff" />} onPress={() => void join()}>
              Join the call
            </PillButton>
          ) : over ? (
            <>
              <PillButton tone="brand" onPress={() => setRequest(null)}>
                Try again
              </PillButton>
              <PillButton tone="light" onPress={() => router.replace("/book/consult")}>
                Book a time instead
              </PillButton>
            </>
          ) : (
            <PillButton
              tone="light"
              onPress={async () => {
                await labstack().consult.cancelInstant(live.requestId).catch(() => undefined);
                setRequest({ ...live, status: "CANCELED" });
              }}
            >
              Cancel the request
            </PillButton>
          )}
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------- request --
  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop />
      <ScreenHeader title="Talk to a doctor now" fallback="/book/consult" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line }}>
          <View className="h-10 w-10 items-center justify-center rounded-md" style={{ backgroundColor: brand[50] }}>
            <Stethoscope size={18} color={ink[900]} />
          </View>
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[700] }}>A general physician on a video call, usually within minutes. For anything serious, call 112.</Text>
        </View>
        <MemberChips members={members} selected={member?.id ?? null} onPick={setMemberId} />
        <View style={{ marginTop: 14 }}>
          <PatientCard p={patient} showErrors={tried} />
        </View>
        <Section title="What's going on?">
          <Field page label="In your own words" hint="The doctor reads this before the call." value={notes} onChangeText={setNotes} multiline maxLength={1000} placeholder="Fever since last night, 101, body ache" />
        </Section>
        {Object.keys(context).length ? (
          <Tap accessibilityRole="checkbox" accessibilityState={{ checked: share }} onPress={() => setShare((v) => !v)} className="mt-4 flex-row items-start gap-3 rounded-xl bg-white p-4" style={{ borderWidth: 1.5, borderColor: share ? brand[500] : surface.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Share the basics with the doctor</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 2 }}>{[context.allergies ? "allergies" : null, context.medications ? "current medicines" : null, context.bloodGroup ? "blood group" : null, context.briefHistory ? "conditions" : null].filter(Boolean).join(", ")}. Nothing else from the health file.</Text>
            </View>
            <View style={{ width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: share ? brand[600] : "#fff", borderWidth: share ? 0 : 1.5, borderColor: surface.line }}>
              {share ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
            </View>
          </Tap>
        ) : null}
        {error ? <Note tone="danger" text={error} /> : null}
        {!LIVE ? <Note tone="info" text="Preview: a pretend doctor picks up after a few seconds. No real call." /> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <PillButton tone="brand" loading={busy} onPress={() => void start()}>
          Find a doctor now
        </PillButton>
      </View>
      <EmergencyEscalation result={escalation} onClose={() => setEscalation(null)} />
    </KeyboardAvoidingView>
  );
}
