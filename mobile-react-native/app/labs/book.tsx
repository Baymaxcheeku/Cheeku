import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Building2, FileText, Home as HomeIcon, Hourglass } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PartnerBadge, rupees, SampleNote } from "@/components/labs/parts";
import { Avatar } from "@/components/ui/avatar";
import { Glass, glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { AddressForm, Field, PatientCard, useAddress, usePatient } from "@/components/partner/forms";
import { fastingFor, quote } from "@/lib/labs/logic";
import { BOOKINGS_KEY, useCatalog, useLabCart } from "@/lib/labs/queries";
import { clock, istIso, labstack, LIVE } from "@/lib/partner/labstack";
import { PartnerError, type LabService } from "@/lib/partner/types";
import { checkAddress, checkPincode } from "@/lib/partner/validate";
import { recordBooking, threadKey } from "@/lib/memory/store";
import { useFamily } from "@/lib/profiles/family";
import { brand, hue, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/*
 * Book the collection (LabStack Labs: getSlots, then placeOrder).
 *
 *   for        whose sample: the member being viewed, changeable here, and
 *              the patient details LabStack needs (PatientCard)
 *   how        home collection, or a visit to the lab (orderType)
 *   when       the next seven days, then a time the lab actually has
 *              (getSlots); fasting tests show mornings only
 *   where      the address in parts, checked as LabStack checks it
 *              (20 to 200 characters in all), remembered per member
 *   note       optional, for the collector ("veins are thin")
 *   bill       each test, the visit fee (or "free" above the lab's line), total
 *
 * The total shown is computed the same way the database computes it, and the
 * database's number is the one booked (create_lab_booking, 0027).
 *
 * Once booked, it is filed in that person's chat thread as a "Booked" card,
 * whether it started in the chat ("book test again") or the marketplace, so
 * the memory knows a result is on its way.
 */

function dayLabel(d: Date, i: number) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function BookLab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const catalog = useCatalog();
  const family = useFamily();
  const cart = useLabCart();

  const members = family.data?.access.selectable ?? [];
  const [memberId, setMemberId] = useState<string | null>(null);
  const who = members.find((m) => m.id === (memberId ?? family.data?.profile?.id)) ?? members[0];

  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)), [now]);
  const fasting = catalog.data ? fastingFor(catalog.data.tests, cart.tests) : 0;
  const [dayIdx, setDayIdx] = useState(0);
  const [service, setService] = useState<LabService>("HOME_SAMPLE");
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [tried, setTried] = useState(false);

  const patient = usePatient(who?.id);
  const address = useAddress(who?.id);
  const pin = checkPincode(address.value.pincode);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partner = catalog.data?.partners.find((p) => p.id === cart.partnerId);
  const day = iso(days[dayIdx] as Date);
  // The times this lab actually has, for this place and day (LabStack getSlots).
  const slots = useQuery({
    queryKey: ["lab-slots", day, service, pin.ok ? pin.value : null, address.value.latitude, cart.tests.join(","), fasting],
    queryFn: () => labstack().labs.slots({ date: day, service, pincode: pin.ok ? pin.value : undefined, latitude: address.value.latitude, longitude: address.value.longitude, tests: cart.tests, fastingHours: fasting }),
    enabled: Boolean(partner) && (pin.ok || address.value.latitude != null),
    staleTime: 60_000,
  });
  // Preview labs are our partners by name; live, the lab LabStack lists first for this place.
  const labSlots = (slots.data ?? []).find((s) => s.labName === partner?.name) ?? slots.data?.[0] ?? null;
  const times = labSlots?.times ?? [];
  const chosen = time && times.includes(time) ? time : null;
  useEffect(() => setTime(null), [day, service]);
  if (!catalog.data || !partner || cart.tests.length === 0) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Book collection" fallback="/labs" />
        <Glass strong className="mx-5 mt-6 items-center rounded-xl p-6">
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Pick tests and a lab first</Text>
          <PillButton onPress={() => router.replace("/labs")} style={{ marginTop: 14, alignSelf: "stretch" }}>
            Find a test
          </PillButton>
        </Glass>
      </View>
    );
  }

  const q = quote(catalog.data.offers, partner, cart.tests);
  const first = who?.name.split(" ")[0] ?? "them";

  async function confirm() {
    if (!who || !partner) return;
    setTried(true);
    const home = service === "HOME_SAMPLE";
    const addrErrors = home ? checkAddress(address.value, "lab") : pin.ok ? {} : { pincode: pin.error };
    if (!patient.ready || Object.keys(addrErrors).length) {
      setError(!patient.ready ? "A few details are missing above." : "Check the address above.");
      return;
    }
    if (!chosen || !labSlots) {
      setError("Pick a time.");
      return;
    }
    setBusy(true);
    setError(null);
    let bookingId: string;
    try {
      ({ bookingId } = await labstack().labs.place({
        profileId: who.id,
        tests: cart.tests,
        orderType: service,
        lsLabId: LIVE ? labSlots.lsLabId : null,
        partnerId: partner.id,
        appointment: istIso(day, chosen),
        patient: patient.result!.patient,
        address: address.value,
        notes: notes.trim(),
        prescriptionDocumentId: cart.prescriptionId,
      }));
    } catch (e) {
      setBusy(false);
      setError(e instanceof PartnerError ? e.message : "That didn't book. Check your connection and try again.");
      return;
    }
    setBusy(false);
    void address.remember();
    const res = { id: bookingId };
    const names = (catalog.data?.tests ?? []).filter((t) => cart.tests.includes(t.id)).map((t) => t.name);
    const when = `${dayLabel(days[dayIdx] as Date, dayIdx)} · ${clock(chosen)}`;
    const whoFirst = who.name.split(" ")[0] ?? who.name;
    void recordBooking(
      who.id,
      { kind: "lab", title: names.join(" + ") || "Lab tests", when, where: `${partner.name} · ${home ? "home collection" : "lab visit"}`, route: `/labs/booking/${res.id}` },
      `Booked ${names.join(", ") || "the tests"} for ${whoFirst}: ${when}, ${home ? `home collection by ${partner.name}` : `at ${partner.name}`}. I'll file the result here when it's ready and put it next to the last one.`,
    ).then(() => qc.invalidateQueries({ queryKey: threadKey(who.id) }));
    cart.clear();
    void qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    router.replace({ pathname: "/labs/booking/[id]", params: { id: res.id, fresh: "1" } });
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop />
      <ScreenHeader title="Book collection" fallback="/labs/choose" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* For whom. */}
        <Section title="Whose sample?">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {members.map((m) => {
              const on = m.id === who?.id;
              return (
                <Tap key={m.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setMemberId(m.id)} style={[on ? null : glassShadow, { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 14, height: 46, borderRadius: 999, backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim }]}>
                  <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={36} />
                  <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 15, color: on ? "#fff" : ink[900] }}>{m.isPrimary ? "Me" : m.name.split(" ")[0]}</Text>
                </Tap>
              );
            })}
          </ScrollView>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 8 }}>The report is filed in {who?.isPrimary ? "your" : `${first}'s`} health file.</Text>
        </Section>

        {/* Who: the details the lab needs, asked only where missing. */}
        <View style={{ marginTop: 14 }}>
          <PatientCard p={patient} showErrors={tried} />
        </View>

        {/* How. */}
        <Section title="Home or lab?">
          <View style={{ flexDirection: "row", gap: 8 }}>
            {([["HOME_SAMPLE", "Home collection", HomeIcon], ["CENTER_VISIT", "Visit the lab", Building2]] as const).map(([v, label, Icon]) => {
              const on = service === v;
              return (
                <Tap key={v} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setService(v)} style={{ flex: 1, height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}>
                  <Icon size={17} color={on ? "#fff" : ink[900]} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: on ? "#fff" : ink[900] }}>{label}</Text>
                </Tap>
              );
            })}
          </View>
        </Section>

        {/* Where (before when: the times depend on the place). */}
        {service === "HOME_SAMPLE" ? (
          <View style={{ marginTop: 22 }}>
            <AddressForm a={address} kind="lab" showErrors={tried} title="Where should the collector come?" />
          </View>
        ) : (
          <Section title="Near which pincode?">
            <Field page label="Pincode" value={address.value.pincode} onChangeText={(t) => address.set({ pincode: t.replace(/\D/g, "").slice(0, 6), latitude: null, longitude: null })} keyboardType="number-pad" maxLength={6} error={tried && !pin.ok ? pin.error : undefined} />
          </Section>
        )}

        {/* When: the lab's own times. */}
        <Section title="When?">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {days.map((d, i) => {
              const on = i === dayIdx;
              return (
                <Tap scale={0.98} key={i} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setDayIdx(i)} style={[on ? null : glassShadow, { width: 64, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim }]}>
                  <Text style={{ fontFamily: font.medium, fontSize: 12, color: on ? "rgba(255,255,255,0.75)" : ink[500] }}>{dayLabel(d, i)}</Text>
                  <Text style={{ fontFamily: font.semibold, fontSize: 20, color: on ? "#fff" : ink[900], marginTop: 2 }}>{d.getDate()}</Text>
                </Tap>
              );
            })}
          </ScrollView>
          {!pin.ok && address.value.latitude == null ? (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 12 }}>Add the pincode above to see the times the lab has.</Text>
          ) : slots.isPending ? (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 12 }}>Checking the lab&apos;s times…</Text>
          ) : slots.isError ? (
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 12 }}>{slots.error instanceof PartnerError ? slots.error.message : "Couldn't load times. Pull down to try again."}</Text>
          ) : times.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {times.map((t) => {
                const on = t === chosen;
                return (
                  <Tap key={t} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setTime(t)} style={{ width: "31.8%", height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: on ? brand[50] : "#fff", borderWidth: 1.5, borderColor: on ? brand[500] : surface.line }}>
                    <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? brand[700] : ink[700] }}>{clock(t)}</Text>
                  </Tap>
                );
              })}
            </View>
          ) : (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 12 }}>No times left on this day{service === "HOME_SAMPLE" ? " for home collection here" : " near this pincode"}. Try the next day.</Text>
          )}
          {fasting ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 10 }}>
              <Hourglass size={14} color={ink[900]} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, color: ink[700] }}>Needs a {fasting}-hour fast, so mornings only. Water is fine. I&apos;ll remind you the night before.</Text>
            </View>
          ) : null}
          {service === "CENTER_VISIT" && labSlots?.distanceKm != null ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 8 }}>{`${partner.name} is about ${labSlots.distanceKm.toFixed(1)} km away. The address comes with the confirmation.`}</Text> : null}
        </Section>

        <Section title="Anything for the collector?">
          <Field page label="Note" hint="Optional. For example: veins are hard to find, or call before coming up." value={notes} onChangeText={setNotes} maxLength={300} multiline placeholder="Optional" />
        </Section>

        {cart.prescriptionId ? (
          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, backgroundColor: hue.orange.wash }}>
            <FileText size={16} color={hue.orange.fg} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, color: ink[700] }}>Prescription attached. The lab calls to confirm the tests before the visit.</Text>
          </View>
        ) : null}

        {/* Bill. */}
        <Section title="Your bill">
          <Glass strong className="rounded-xl p-4">
            <View className="flex-row items-center gap-3">
              <PartnerBadge partner={partner} size={40} />
              <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{partner.name}</Text>
            </View>
            <View style={{ marginTop: 12, gap: 8 }}>
              {cart.tests.map((id) => {
                const t = catalog.data.tests.find((x) => x.id === id);
                const o = catalog.data.offers.find((x) => x.partnerId === partner.id && x.testId === id);
                return <Line key={id} label={t?.name ?? id} value={o ? rupees(o.price) : "-"} />;
              })}
              {service === "HOME_SAMPLE" ? <Line label="Home collection" value={q.fee ? rupees(q.fee) : "Free"} /> : null}
              <View style={{ height: 1, backgroundColor: "rgba(15,16,48,0.08)", marginVertical: 2 }} />
              <Line label={service === "HOME_SAMPLE" ? "To pay after collection" : "To pay at the lab"} value={rupees(service === "HOME_SAMPLE" ? q.total : q.total - q.fee)} strong />
            </View>
          </Glass>
        </Section>

        {error ? <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 12 }}>{error}</Text> : null}
        <View style={{ marginTop: 14 }}>
          <SampleNote />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <PillButton tone="brand" loading={busy} disabled={!who} onPress={() => void confirm()}>
          {chosen ? `Confirm ${clock(chosen)} for ${who?.isPrimary ? "me" : first}` : "Pick a time"}
        </PillButton>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: strong ? font.semibold : font.regular, fontSize: 15, color: strong ? ink[900] : ink[700] }}>{label}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: strong ? 17 : 15, color: ink[900] }}>{value}</Text>
    </View>
  );
}
