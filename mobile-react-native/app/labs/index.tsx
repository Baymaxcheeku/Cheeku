import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Check, ChevronRight, ClipboardList, FileText, Plus, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LocationChip } from "@/components/location/location-chip";
import { Tap } from "@/components/ui/tap";
import { Sheet } from "@/components/ui/sheet";
import { CartBar, rupees, SampleNote, TestArt } from "@/components/labs/parts";
import { AskRow } from "@/components/home/today";
import { Glass, GlassCircle, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { CATEGORIES, fromPrice, inCategory, searchTests, stageIndex, STAGES, suggestionsFor, type LabTest } from "@/lib/labs/logic";
import { useCatalog, useLabBookings, useLabCart } from "@/lib/labs/queries";
import { useFamily } from "@/lib/profiles/family";
import { ageFrom, loadMemberHealth } from "@/lib/profiles/health";
import { formatEventDate } from "@/lib/records/grouping";
import { listProfileRecords } from "@/lib/records/queries";
import { brand, hue, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { SkyWash } from "@/components/home/front";
import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { CardListSkeleton } from "@/components/ui/skeleton";

/*
 * Lab tests at home: find a test, pick a lab, book a collection, get the
 * report filed. This is the front door.
 *
 *   header      back · your lab bookings
 *   headline    editorial, like Home
 *   search      live, understands "sugar", "hair fall", "dadi"
 *   tracking    an open booking, if there is one, with its stage
 *   prescription  "Got a doctor's slip?" attach it, the lab confirms tests
 *   suggested   for the person being viewed, from their health profile
 *   categories  chips, then packages as big cards and tests as rows
 *   cart bar    sticky, once anything is added: count, from-price, Choose lab
 *
 * Everything is for the member being viewed (the headline names them), and
 * the booking screen confirms it again before anything is booked.
 */
const CAT_3D: Partial<Record<string, Icon3DName>> = {
  popular: "star",
  general: "clipboard",
  diabetes: "glucose",
  thyroid: "test-tube",
  heart: "heart",
  women: "lotus",
  senior: "family",
  vitamins: "capsule",
  fever: "syringe",
};

export default function Labs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const catalog = useCatalog();
  const bookings = useLabBookings();
  const family = useFamily();
  const cart = useLabCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("popular");
  const [rxOpen, setRxOpen] = useState(false);

  const member = family.data?.profile;
  const first = member?.name.split(" ")[0] ?? "you";
  const health = useQuery({ queryKey: ["member-health", member?.id], queryFn: () => loadMemberHealth(member?.id as string), enabled: Boolean(member?.id) });

  const tests = useMemo(() => catalog.data?.tests ?? [], [catalog.data]);
  const offers = catalog.data?.offers ?? [];
  const byId = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests]);

  const results = query.trim() ? searchTests(tests, query) : inCategory(tests, category);
  const packages = results.filter((t) => t.kind === "package");
  const singles = results.filter((t) => t.kind === "test");
  const suggested = suggestionsFor(health.data?.conditions ?? [], ageFrom(member?.dob)).map((id) => byId.get(id)).filter((t): t is LabTest => Boolean(t));

  const cartFrom = cart.tests.reduce((sum, id) => sum + (fromPrice(offers, id) ?? 0), 0);
  const active = (bookings.data ?? []).find((b) => b.status !== "ready" && b.status !== "cancelled");

  return (
    <View className="flex-1 bg-canvas">
      <SkyWash top={0} />
      <ScreenHeader
        title="Lab tests at home"
        right={
          <GlassCircle label="Your lab bookings" onPress={() => router.push("/labs/bookings")}>
            <ClipboardList size={19} color={ink[900]} />
          </GlassCircle>
        }
      />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + (cart.tests.length ? 110 : 30) }} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: ink[900], marginTop: 6 }}>
          Tests at home
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], marginTop: 4 }}>
          Results land in {member?.isPrimary === false ? `${first}'s` : "your"} file on their own.
        </Text>
        <View style={{ marginTop: 12 }}>
          <LocationChip profileId={member?.id} prefix="Collecting near" />
        </View>

        {/* Search. */}
        <View style={[glassCard("#ffffff", "#0f1030"), { marginTop: 18, height: 54, borderRadius: 18, shadowOpacity: 0.05, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 }]}>
          <Search size={19} color={ink[500]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder='Try "sugar", "thyroid", "full body"'
            placeholderTextColor={ink[300]}
            returnKeyType="search"
            style={{ flex: 1, height: 50, fontFamily: font.regular, fontSize: 15, color: ink[900] }}
          />
          {query ? (
            <Tap accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}>
              <X size={18} color={ink[500]} />
            </Tap>
          ) : null}
        </View>

        {!query ? (
          <>
            {active ? (
              <Tap accessibilityRole="button" onPress={() => router.push({ pathname: "/labs/booking/[id]", params: { id: active.id } })} style={[glassCard(PILLAR_TONE.check.glass), { marginTop: 16, borderRadius: 24, padding: 16 }]} scale={0.98}>
                <View className="flex-row items-center gap-3">
                  <Icon3D name="calendar-check" size={30} />
                  <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, color: PILLAR_TONE.check.deep }}>Your lab booking</Text>
                  <ChevronRight size={17} color={ink[500]} />
                </View>
                <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 4 }}>{STAGES[stageIndex(active.status)]?.label}</Text>
                <View style={{ flexDirection: "row", gap: 4, marginTop: 10 }}>
                  {STAGES.map((s, i) => (
                    <View key={s.status} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= stageIndex(active.status) ? PILLAR_TONE.check.accent : PILLAR_TONE.check.track }} />
                  ))}
                </View>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 8 }}>
                  {formatEventDate(active.slotDate)}, {active.slotWindow}
                </Text>
              </Tap>
            ) : null}

            {/* From a prescription. */}
            <Tap accessibilityRole="button" onPress={() => setRxOpen(true)} style={[glassCard("#ffffff", "#0f1030"), { marginTop: 16, borderRadius: 24, padding: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowOpacity: 0.05 }]} scale={0.98}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: PILLAR_TONE.eat.bg, alignItems: "center", justifyContent: "center" }}>
                <Icon3D name="report" size={38} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{cart.prescriptionId ? "Prescription attached" : "Got a doctor's slip?"}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>
                  {cart.prescriptionId ? "The lab reads it and confirms your tests on a call." : "Attach the prescription. The lab confirms exactly what the doctor asked for."}
                </Text>
              </View>
              {cart.prescriptionId ? <Check size={20} color={PILLAR_TONE.move.deep} /> : <ChevronRight size={18} color={ink[500]} />}
            </Tap>

            {/* Not sure what to book: Cheeku answers from what's due and the areas to watch. */}
            <View style={{ marginTop: 12 }}>
              <AskRow title="Not sure which tests?" sub={`Cheeku checks what's due for ${member?.isPrimary === false ? first : "you"}`} q="Which tests should I do this year?" />
            </View>

            {/* Suggested. */}
            {suggested.length ? (
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>Often checked for {member?.isPrimary === false ? first : "you"}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>
                  {health.data?.conditions.length ? `Because ${member?.isPrimary === false ? `${first}'s` : "your"} health profile mentions ${health.data.conditions.slice(0, 2).join(" and ")}.` : "Good starting points. Your doctor knows best."}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                  {suggested.map((t) => (
                    <MiniCard key={t.id} test={t} from={fromPrice(offers, t.id)} added={cart.tests.includes(t.id)} onOpen={() => router.push({ pathname: "/labs/test/[id]", params: { id: t.id } })} onToggle={() => cart.toggle(t.id)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Categories. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 24 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {CATEGORIES.map((c) => {
                const on = c.id === category;
                return (
                  <Tap key={c.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setCategory(c.id)} style={{ height: 44, paddingLeft: CAT_3D[c.id] ? 8 : 16, paddingRight: 16, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? brand[600] : "#fff", borderWidth: 1, borderColor: on ? brand[600] : surface.line }}>
                    {CAT_3D[c.id] ? <Icon3D name={CAT_3D[c.id]!} size={26} /> : null}
                    <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 15, color: on ? "#fff" : ink[700] }}>{c.label}</Text>
                  </Tap>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500], marginTop: 14 }}>
            {results.length ? `${results.length} ${results.length === 1 ? "match" : "matches"}` : "Nothing matches that. Try the test's common name, like sugar or thyroid."}
          </Text>
        )}

        {catalog.isPending ? <CardListSkeleton count={4} /> : null}

        {/* Packages as cards. */}
        {packages.length ? (
          <View style={{ marginTop: 16, gap: 12 }}>
            {packages.map((t, i) => (
              <Animated.View key={t.id} entering={still ? undefined : FadeInDown.delay(i * 40).duration(260)}>
                <PackageCard test={t} from={fromPrice(offers, t.id)} added={cart.tests.includes(t.id)} onOpen={() => router.push({ pathname: "/labs/test/[id]", params: { id: t.id } })} onToggle={() => cart.toggle(t.id)} />
              </Animated.View>
            ))}
          </View>
        ) : null}

        {/* Tests as rows. */}
        {singles.length ? (
          <View style={[glassCard("#ffffff", "#0f1030"), { marginTop: 16, borderRadius: 24, overflow: "hidden", shadowOpacity: 0.05 }]}>
            {singles.map((t, i) => (
              <TestRow key={t.id} test={t} first={i === 0} from={fromPrice(offers, t.id)} added={cart.tests.includes(t.id)} onOpen={() => router.push({ pathname: "/labs/test/[id]", params: { id: t.id } })} onToggle={() => cart.toggle(t.id)} />
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 18 }}>
          <SampleNote />
        </View>
      </ScrollView>

      {cart.tests.length ? <CartBar count={cart.tests.length} from={cartFrom} label="Choose lab" bottom={insets.bottom} onPress={() => router.push("/labs/choose")} /> : null}

      <PrescriptionSheet open={rxOpen} profileId={member?.id} name={first} onClose={() => setRxOpen(false)} />
    </View>
  );
}

function AddButton({ added, onPress, dark }: { added: boolean; onPress: () => void; dark?: boolean }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={added ? "Remove from cart" : "Add to cart"}
      onPress={onPress}
      hitSlop={6}
      style={{ width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: added ? PILLAR_TONE.move.accent : dark ? brand[600] : brand[50], borderWidth: 0 }} scale={0.95}
    >
      {added ? <Check size={18} color="#fff" strokeWidth={2.6} /> : <Plus size={18} color={dark ? "#fff" : brand[600]} strokeWidth={2.4} />}
    </Tap>
  );
}

function PackageCard({ test, from, added, onOpen, onToggle }: { test: LabTest; from: number | null; added: boolean; onOpen: () => void; onToggle: () => void }) {
  return (
    <View style={[glassCard("#ffffff", "#0f1030"), { borderRadius: 24, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, shadowOpacity: 0.05 }]}>
      <Tap accessibilityRole="button" accessibilityLabel={`${test.name}. Open details`} onPress={onOpen} scale={0.98} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <TestArt test={test} size={84} radius={22} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 17, lineHeight: 21, color: ink[900] }}>{test.name}</Text>
        <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 2 }}>{test.parameters} checks · {test.includes.length} tests{test.fastingHours ? ` · ${test.fastingHours}h fast` : ""}</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 6 }}>{from !== null ? `from ${rupees(from)}` : ""}</Text>
      </View>
      </Tap>
      <AddButton added={added} onPress={onToggle} dark />
    </View>
  );
}

function TestRow({ test, first, from, added, onOpen, onToggle }: { test: LabTest; first: boolean; from: number | null; added: boolean; onOpen: () => void; onToggle: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 12, borderTopWidth: first ? 0 : 1, borderTopColor: "rgba(15,16,48,0.06)" }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${test.name}. Open details`} onPress={onOpen} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingRight: 0, backgroundColor: pressed ? "rgba(74,42,222,0.05)" : "transparent" })}>
      <TestArt test={test} size={46} radius={14} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 19, color: ink[900] }}>{test.name}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
          {test.sample}{test.fastingHours ? ` · ${test.fastingHours}h fast` : " · no fasting"}
        </Text>
      </View>
      {from !== null ? <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{rupees(from)}</Text> : null}
      </Pressable>
      <AddButton added={added} onPress={onToggle} />
    </View>
  );
}

function MiniCard({ test, from, added, onOpen, onToggle }: { test: LabTest; from: number | null; added: boolean; onOpen: () => void; onToggle: () => void }) {
  return (
    <View style={[glassCard("#ffffff", "#0f1030"), { width: 170, borderRadius: 24, padding: 12, shadowOpacity: 0.05 }]}>
      <View style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}>
        <AddButton added={added} onPress={onToggle} />
      </View>
      <Tap accessibilityRole="button" accessibilityLabel={`${test.name}. Open details`} onPress={onOpen} scale={0.98}>
      <TestArt test={test} size={56} radius={18} />
      <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 19, color: ink[900], marginTop: 10, minHeight: 38 }}>{test.name}</Text>
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700], marginTop: 4 }}>{from !== null ? `from ${rupees(from)}` : ""}</Text>
      </Tap>
    </View>
  );
}

/** Pick one of the viewed member's prescriptions, or snap a new one. */
function PrescriptionSheet({ open, profileId, name, onClose }: { open: boolean; profileId?: string; name: string; onClose: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useLabCart();
  const records = useQuery({ queryKey: ["records", profileId], queryFn: () => listProfileRecords(profileId as string), enabled: open && Boolean(profileId) });
  const rx = (records.data ?? []).filter((r) => r.docType === "prescription").slice(0, 6);
  return (
    <Sheet open={open} onClose={onClose} label="Close">
      <View style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: surface.canvas, padding: 22, paddingBottom: insets.bottom + 16 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.5, color: ink[900] }}>Book from a prescription</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[500], marginTop: 4 }}>
          Pick the slip, add any tests you can see on it, and the lab will call to confirm the rest.
        </Text>
        <View style={{ marginTop: 14, gap: 8 }}>
          {rx.map((r) => {
            const on = cart.prescriptionId === r.id;
            return (
              <Tap key={r.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { cart.setPrescription(on ? null : r.id); onClose(); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: on ? brand[50] : "#fff", borderWidth: 1.5, borderColor: on ? brand[500] : "rgba(15,16,48,0.08)" }}>
                <Icon3D name="report" size={26} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{r.title}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{[formatEventDate(r.eventDate), r.doctor].filter(Boolean).join(" · ")}</Text>
                </View>
                {on ? <Check size={18} color={ink[900]} /> : null}
              </Tap>
            );
          })}
          {records.isSuccess && rx.length === 0 ? (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>No prescriptions in {name}&apos;s file yet.</Text>
          ) : null}
          <Tap accessibilityRole="button" onPress={() => { onClose(); router.push("/scan?source=photo"); }} style={{ height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: brand[300], marginTop: 4 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>Snap a new prescription</Text>
          </Tap>
        </View>
      </View>
    </Sheet>
  );
}
