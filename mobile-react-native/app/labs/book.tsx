import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FileText, Hourglass, MapPin } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PartnerBadge, rupees, SampleNote } from "@/components/labs/parts";
import { Avatar } from "@/components/ui/avatar";
import { Glass, glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { fastingFor, quote, windowsFor, type SlotWindow } from "@/lib/labs/logic";
import { BOOKINGS_KEY, bookLab, useCatalog, useLabCart } from "@/lib/labs/queries";
import { recordBooking, threadKey } from "@/lib/memory/store";
import { useFamily } from "@/lib/profiles/family";
import { kv } from "@/lib/storage";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Book the home collection.
 *
 *   for        whose sample: the member being viewed, changeable here
 *   when       the next seven days, then a two-hour window; today needs two
 *              hours' notice, and fasting tests only get morning windows
 *   where      the address, remembered on this phone for next time
 *   bill       each test, the visit fee (or "free" above the lab's line), total
 *
 * The total shown is computed the same way the database computes it, and the
 * database's number is the one booked (create_lab_booking, 0027).
 *
 * Once booked, it is filed in that person's chat thread as a "Booked" card,
 * whether it started in the chat ("book test again") or the marketplace, so
 * the memory knows a result is on its way.
 */

const ADDRESS_KEY = "cheeku.labAddress";

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
  const firstOpen = days.findIndex((d) => windowsFor(d, now, fasting).length > 0);
  const [dayIdx, setDayIdx] = useState(Math.max(0, firstOpen));
  const windows = windowsFor(days[dayIdx] as Date, now, fasting);
  const [win, setWin] = useState<SlotWindow | null>(null);
  const chosenWindow = win && windows.includes(win) ? win : (windows[0] ?? null);

  const saved = useQuery({ queryKey: ["lab-address"], queryFn: () => kv.get(ADDRESS_KEY) });
  const [address, setAddress] = useState("");
  useEffect(() => {
    if (saved.data && !address) setAddress(saved.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.data]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partner = catalog.data?.partners.find((p) => p.id === cart.partnerId);
  if (!catalog.data || !partner || cart.tests.length === 0) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Book collection" fallback="/labs" />
        <Glass strong className="mx-5 mt-6 items-center rounded-[26px] p-6">
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
    if (!who || !chosenWindow || !partner) return;
    if (address.trim().length < 8) {
      setError("Add the full address, with a landmark if it helps the collector.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await bookLab({
      profileId: who.id,
      partnerId: partner.id,
      tests: cart.tests,
      date: iso(days[dayIdx] as Date),
      window: chosenWindow,
      address: address.trim(),
      prescriptionId: cart.prescriptionId,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    void kv.set(ADDRESS_KEY, address.trim());
    const names = (catalog.data?.tests ?? []).filter((t) => cart.tests.includes(t.id)).map((t) => t.name);
    const when = `${dayLabel(days[dayIdx] as Date, dayIdx)} · ${chosenWindow}`;
    const whoFirst = who.name.split(" ")[0] ?? who.name;
    void recordBooking(
      who.id,
      { kind: "lab", title: names.join(" + ") || "Lab tests", when, where: `${partner.name} · home collection`, route: `/labs/booking/${res.id}` },
      `Booked ${names.join(", ") || "the tests"} for ${whoFirst}: ${when}, home collection by ${partner.name}. I'll file the result here when it's ready and put it next to the last one.`,
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
                <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setMemberId(m.id)} style={[on ? null : glassShadow, { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 14, height: 46, borderRadius: 999, backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim }]}>
                  <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={36} />
                  <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? "#fff" : ink[900] }}>{m.isPrimary ? "Me" : m.name.split(" ")[0]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 8 }}>The report is filed in {who?.isPrimary ? "your" : `${first}'s`} health file.</Text>
        </Section>

        {/* When. */}
        <Section title="When?">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {days.map((d, i) => {
              const on = i === dayIdx;
              const open = windowsFor(d, now, fasting).length > 0;
              return (
                <Pressable key={i} disabled={!open} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: !open }} onPress={() => setDayIdx(i)} style={[on ? null : glassShadow, { width: 64, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: on ? ink[900] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: glass.rim, opacity: open ? 1 : 0.4 }]}>
                  <Text style={{ fontFamily: font.medium, fontSize: 12, color: on ? "rgba(255,255,255,0.75)" : ink[500] }}>{dayLabel(d, i)}</Text>
                  <Text style={{ fontFamily: font.semibold, fontSize: 20, color: on ? "#fff" : ink[900], marginTop: 2 }}>{d.getDate()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {windows.map((w) => {
              const on = w === chosenWindow;
              return (
                <Pressable key={w} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setWin(w)} style={{ flex: 1, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: on ? brand[50] : glass.fillStrong, borderWidth: 1.5, borderColor: on ? brand[500] : surface.line }}>
                  <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 13.5, color: on ? brand[700] : ink[700] }}>{w}</Text>
                </Pressable>
              );
            })}
          </View>
          {fasting ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 10 }}>
              <Hourglass size={14} color={brand[600]} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12.5, color: ink[700] }}>Needs a {fasting}-hour fast, so only morning windows. Water is fine. I&apos;ll remind you the night before.</Text>
            </View>
          ) : null}
        </Section>

        {/* Where. */}
        <Section title="Where?">
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1.5, borderColor: surface.line }}>
            <MapPin size={17} color={brand[600]} style={{ marginTop: 2 }} />
            <TextInput value={address} onChangeText={setAddress} placeholder="Flat, building, street, area, pincode" placeholderTextColor={ink[300]} multiline maxLength={300} style={{ flex: 1, minHeight: 60, fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[900], textAlignVertical: "top" }} />
          </View>
        </Section>

        {cart.prescriptionId ? (
          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, backgroundColor: "#fff1e8" }}>
            <FileText size={16} color="#c2650b" />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, color: ink[700] }}>Prescription attached. The lab calls to confirm the tests before the visit.</Text>
          </View>
        ) : null}

        {/* Bill. */}
        <Section title="Your bill">
          <Glass strong className="rounded-[24px] p-4">
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
              <Line label="Home collection" value={q.fee ? rupees(q.fee) : "Free"} />
              <View style={{ height: 1, backgroundColor: "rgba(15,16,48,0.08)", marginVertical: 2 }} />
              <Line label="To pay after collection" value={rupees(q.total)} strong />
            </View>
          </Glass>
        </Section>

        {error ? <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: "#c00a1c", marginTop: 12 }}>{error}</Text> : null}
        <View style={{ marginTop: 14 }}>
          <SampleNote />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <PillButton tone="brand" loading={busy} disabled={!chosenWindow || !who} onPress={() => void confirm()}>
          {`Confirm for ${who?.isPrimary ? "me" : first} · ${rupees(q.total)}`}
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
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: strong ? font.semibold : font.regular, fontSize: strong ? 15.5 : 14, color: strong ? ink[900] : ink[700] }}>{label}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: strong ? 17 : 14, color: ink[900] }}>{value}</Text>
    </View>
  );
}
