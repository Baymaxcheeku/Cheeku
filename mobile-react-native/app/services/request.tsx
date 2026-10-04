import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Building2, Home as HomeIcon, MonitorPlay, type LucideIcon } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CautionNote } from "@/components/safety/caution-note";
import { EmergencyEscalation } from "@/components/safety/emergency-escalation";
import { Avatar } from "@/components/ui/avatar";
import { glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { recordBooking, threadKey } from "@/lib/memory/store";
import { useFamily } from "@/lib/profiles/family";
import { shouldCaution } from "@/lib/safety/caution";
import { detect, type SafetyResult } from "@/lib/safety/detect";
import { MODE_LABEL, serviceById, type VisitMode } from "@/lib/services/catalog";
import { marketplace } from "@/lib/services/provider";
import { useServiceRequests, whenText } from "@/lib/services/requests";
import { kv } from "@/lib/storage";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * BOOK ONE THING FROM A SERVICE: who, how, when, where, and a note.
 *
 * Everything goes through `marketplace()` (lib/services/provider.ts), so this
 * screen won't change when the partner API replaces the preview provider.
 *
 * The note is the person's own words and runs through the same safety check
 * as the chat: anything that reads as an emergency stops the booking and
 * opens the emergency screen. Nobody describing chest pain should be offered
 * a physio slot on Thursday.
 *
 * Once requested, it's filed in that person's chat thread as a "Booked" card.
 */

const ADDRESS_KEY = "cheeku.serviceAddress";
const MODE_ICON: Record<VisitMode, LucideIcon> = { home: HomeIcon, centre: Building2, online: MonitorPlay };

function dayLabel(d: Date, i: number) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

export default function ServiceRequestScreen() {
  const { service: serviceId, offering: offeringId } = useLocalSearchParams<{ service: string; offering: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const family = useFamily();
  const requests = useServiceRequests();
  const provider = marketplace();

  const service = serviceById(serviceId);
  const offering = service?.offerings.find((o) => o.id === offeringId);

  const members = family.data?.access.selectable ?? [];
  const [memberId, setMemberId] = useState<string | null>(null);
  const who = members.find((m) => m.id === (memberId ?? family.data?.profile?.id)) ?? members[0];

  const [mode, setMode] = useState<VisitMode>(offering?.modes[0] ?? "home");
  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)), [now]);
  const [dayIdx, setDayIdx] = useState(0);
  const windows = useQuery({
    queryKey: ["service-windows", serviceId, offeringId, mode, dayIdx],
    queryFn: () => provider.availability({ serviceId: serviceId ?? "", offeringId: offeringId ?? "", mode, date: days[dayIdx] as Date, now }),
  });
  const [win, setWin] = useState<string | null>(null);
  const chosen = win && windows.data?.includes(win) ? win : (windows.data?.[0] ?? null);

  // Skip to the first day that still has a slot.
  useEffect(() => {
    if (dayIdx === 0 && windows.data && windows.data.length === 0) setDayIdx(1);
  }, [dayIdx, windows.data]);

  const saved = useQuery({ queryKey: ["service-address"], queryFn: () => kv.get(ADDRESS_KEY) });
  const [address, setAddress] = useState("");
  const [drop, setDrop] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (saved.data && !address) setAddress(saved.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.data]);

  const [caution, setCaution] = useState<SafetyResult | null>(null);
  const [escalation, setEscalation] = useState<SafetyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!service || !offering) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Book" fallback="/services" />
        <Text style={{ marginTop: 40, textAlign: "center", fontFamily: font.regular, fontSize: 15, color: ink[500] }}>Pick something to book first.</Text>
      </View>
    );
  }

  const transport = service.id === "ambulance";
  const needsAddress = mode === "home";

  async function confirm() {
    if (!service || !offering || !who || !chosen) return;
    setError(null);
    const verdict = detect(note);
    if (verdict.status === "escalate") {
      setEscalation(verdict);
      return;
    }
    setCaution(shouldCaution(verdict) ? verdict : null);
    if (needsAddress && address.trim().length < 8) {
      setError(transport ? "Add the full pick-up address, with a landmark." : "Add the full address, with a landmark if it helps.");
      return;
    }
    if (transport && drop.trim().length < 4) {
      setError("Add where they're going: the hospital or the home address.");
      return;
    }
    setBusy(true);
    const first = who.name.split(" ")[0] ?? who.name;
    const fullNote = [transport ? `Drop at: ${drop.trim()}` : "", note.trim()].filter(Boolean).join("\n");
    const input = {
      serviceId: service.id,
      offeringId: offering.id,
      mode,
      date: (days[dayIdx] as Date).toISOString(),
      window: chosen,
      address: needsAddress ? address.trim() : null,
      note: fullNote,
      forName: first,
      ageBand: null,
    };
    const res = await provider.book(input);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    if (needsAddress) void kv.set(ADDRESS_KEY, address.trim());
    const req = requests.add({
      ...input,
      title: offering.title,
      profileId: who.id,
      reference: res.reference,
      provider: res.provider,
      status: res.status,
    });
    const when = whenText(req);
    const where = mode === "online" ? "Online" : mode === "home" ? (transport ? "Pick-up from home" : "At home") : "At a centre near you";
    void recordBooking(
      who.id,
      { kind: "service", title: `${offering.title} · ${service.title}`, when, where, route: `/services/booking/${req.id}`, note: fullNote ? fullNote.split("\n") : undefined },
      `Requested ${offering.title.toLowerCase()} for ${first}: ${when}, ${where.toLowerCase()}. Reference ${res.reference}. I'll keep it in ${first}'s memory.`,
    ).then(() => qc.invalidateQueries({ queryKey: threadKey(who.id) }));
    router.replace({ pathname: "/services/booking/[id]", params: { id: req.id, fresh: "1" } });
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop />
      <ScreenHeader title={offering.title} subtitle={service.title} fallback={`/services/${service.id}`} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Section title="Who is it for?">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {members.map((m) => {
              const on = m.id === who?.id;
              return (
                <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setMemberId(m.id)} style={[on ? null : glassShadow, { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 14, height: 46, borderRadius: 999, backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim }]}>
                  <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={36} />
                  <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? "#fff" : ink[900] }}>{m.isPrimary ? "Me" : m.name.split(" ")[0]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Section>

        {offering.modes.length > 1 ? (
          <Section title="How?">
            <View style={{ flexDirection: "row", gap: 8 }}>
              {offering.modes.map((m) => {
                const on = m === mode;
                const Icon = MODE_ICON[m];
                return (
                  <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setMode(m)} style={[on ? null : glassShadow, { flex: 1, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim }]}>
                    <Icon size={18} color={on ? "#fff" : brand[600]} />
                    <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: on ? "#fff" : ink[900] }}>{MODE_LABEL[m]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>
        ) : null}

        <Section title="When?">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {days.map((d, i) => {
              const on = i === dayIdx;
              return (
                <Pressable key={i} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setDayIdx(i)} style={[on ? null : glassShadow, { width: 74, height: 70, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim }]}>
                  <Text style={{ fontFamily: font.medium, fontSize: 12, color: on ? "rgba(255,255,255,0.75)" : ink[500] }}>{dayLabel(d, i)}</Text>
                  <Text style={{ fontFamily: font.semibold, fontSize: 18, color: on ? "#fff" : ink[900], marginTop: 2 }}>{d.getDate()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {(windows.data ?? []).map((w) => {
              const on = w === chosen;
              return (
                <Pressable key={w} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setWin(w)} style={{ height: 42, paddingHorizontal: 16, borderRadius: 999, justifyContent: "center", backgroundColor: on ? brand[600] : "#fff", borderWidth: 1, borderColor: on ? brand[600] : surface.line }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: on ? "#fff" : ink[900] }}>{w}</Text>
                </Pressable>
              );
            })}
            {windows.data && windows.data.length === 0 ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], paddingVertical: 10 }}>Nothing left today. Pick another day.</Text> : null}
          </ScrollView>
        </Section>

        {needsAddress ? (
          <Section title={transport ? "Pick-up address" : "Address"}>
            <Field value={address} onChangeText={setAddress} placeholder="House, street, area, landmark" multiline />
          </Section>
        ) : null}
        {transport ? (
          <Section title="Going to">
            <Field value={drop} onChangeText={setDrop} placeholder="Hospital name, or the home address" />
          </Section>
        ) : null}

        <Section title="Anything they should know?">
          <Field value={note} onChangeText={setNote} placeholder={transport ? "Stretcher or wheelchair, oxygen, floor and lift" : "In your own words. Optional."} multiline />
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 6 }}>Only this note goes to the provider. Records stay with you unless you share them.</Text>
        </Section>

        {caution ? (
          <View style={{ marginTop: 14 }}>
            <CautionNote result={caution} />
          </View>
        ) : null}
        {error ? <Text accessibilityRole="alert" style={{ marginTop: 14, fontFamily: font.medium, fontSize: 13, color: "#c00a1c" }}>{error}</Text> : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 10, borderTopWidth: 1, borderTopColor: surface.line, backgroundColor: "rgba(250,250,254,0.96)" }}>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], textAlign: "center", marginBottom: 8 }}>
          {provider.preview ? "Preview: nothing is charged. " : ""}The provider confirms the price before the visit.
        </Text>
        <PillButton tone="brand" loading={busy} disabled={!chosen || !who} onPress={() => void confirm()}>
          {chosen ? `Request for ${dayLabel(days[dayIdx] as Date, dayIdx).toLowerCase() === "today" ? "today" : dayLabel(days[dayIdx] as Date, dayIdx)}, ${chosen}` : "Pick a time"}
        </PillButton>
      </View>

      <EmergencyEscalation result={escalation} onClose={() => setEscalation(null)} />
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginBottom: 10 }}>{title}</Text>
      {children}
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={ink[300]}
      {...props}
      style={[glassShadow, { minHeight: props.multiline ? 86 : 50, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, fontFamily: font.regular, fontSize: 15, color: ink[900], textAlignVertical: props.multiline ? "top" : "center" }]}
    />
  );
}
