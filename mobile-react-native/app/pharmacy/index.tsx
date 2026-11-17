import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Minus, Plus, Search, ShieldAlert, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberChips, Note, Section } from "@/components/partner/bits";
import { Sheet } from "@/components/ui/sheet";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { todayIso } from "@/lib/memory/clock";
import { buildContext } from "@/lib/memory/context";
import { useMemory } from "@/lib/memory/store";
import { labstack, LIVE } from "@/lib/partner/labstack";
import { needsPrescription, rupees, usePharmacyCart } from "@/lib/partner/pharmacy-cart";
import { PartnerError, type Drug } from "@/lib/partner/types";
import { checkQuery } from "@/lib/partner/validate";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { SkyWash } from "@/components/home/front";
import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";

/*
 * ORDER MEDICINES, STEP 1: WHAT.
 *
 * Search by brand or salt (LabStack searchDrugs, at least 3 letters), or
 * start from what this person already takes (their medicine list). Each
 * line is one exact pack; "Same salt, cheaper" shows alternatives
 * (getAlternatives) and swaps only when the person picks one. Anything
 * marked not for sale online is shown but can't be added.
 *
 * Opened from Medicines ("Order a refill"), a prescription record ("Order
 * these"), Services and the chat. `q` pre-fills the search.
 */

export default function PharmacyCart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { q: initial, who } = useLocalSearchParams<{ q?: string; who?: string }>();
  const family = useFamily();
  const members = family.data?.access.selectable ?? [];
  const cart = usePharmacyCart();
  const member = members.find((m) => m.id === (cart.profileId ?? who ?? family.data?.profile?.id)) ?? members[0];
  useEffect(() => {
    if (member) cart.forMember(member.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.id]);

  const [query, setQuery] = useState(initial ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [altFor, setAltFor] = useState<Drug | null>(null);
  const valid = checkQuery(query);
  const results = useQuery({ queryKey: ["drug-search", query.trim().toLowerCase()], queryFn: () => labstack().pharma.search(query.trim()), enabled: valid.ok, staleTime: 5 * 60_000 });

  // What they already take: one tap to search for it.
  const memory = useMemory(member?.id);
  const taking = useMemo(() => {
    if (!memory.data) return [];
    const ctx = buildContext(memory.data, todayIso());
    return ctx.ledger.filter((e) => e.status !== "ended").slice(0, 8);
  }, [memory.data]);

  const first = member?.isPrimary ? "you" : (member?.name.split(" ")[0] ?? "them");
  const total = cart.lines.reduce((s, l) => s + (l.drug.price ?? 0) * l.quantity, 0);

  function add(d: Drug) {
    const err = cart.add(d);
    setNotice(err);
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SkyWash top={0} />
      <ScreenHeader fallback="/medicines" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: ink[900], marginTop: 2 }}>Medicines, delivered</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], marginTop: 4, marginBottom: 16 }}>Pick who it&apos;s for, then search or tap a regular.</Text>
        <MemberChips members={members} selected={member?.id ?? null} onPick={(id) => cart.forMember(id)} />

        {/* Search. */}
        <View style={[glassCard("#ffffff", "#0f1030"), { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, height: 54, paddingHorizontal: 16, borderRadius: 18, shadowOpacity: 0.05 }]}>
          <Search size={18} color={ink[500]} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Medicine or salt, like metformin" placeholderTextColor={ink[300]} autoCorrect={false} accessibilityLabel="Search medicines" style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: ink[900] }} />
        </View>
        {query.trim() && !valid.ok ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 8, marginLeft: 6 }}>{valid.error}</Text> : null}
        {notice ? <Note tone="caution" text={notice} /> : null}

        {valid.ok ? (
          <Section title={results.isPending ? "Searching…" : `${results.data?.length ?? 0} found`}>
            {results.isError ? <Note tone="danger" text={results.error instanceof PartnerError ? results.error.message : "Search didn't work. Try again."} /> : null}
            <View style={{ gap: 8 }}>
              {(results.data ?? []).map((d) => (
                <DrugRow key={d.drugMasterId} d={d} inCart={cart.lines.some((l) => l.drug.drugMasterId === d.drugMasterId)} onAdd={() => add(d)} />
              ))}
            </View>
          </Section>
        ) : taking.length ? (
          <Section title={`What ${first === "you" ? "you take" : `${first} takes`}`}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {taking.map((e) => (
                <Tap key={e.key} accessibilityRole="button" accessibilityLabel={`Find ${e.name}`} onPress={() => setQuery(e.ingredients[0]?.name ?? e.name)} style={{ height: 44, paddingLeft: 8, paddingRight: 14, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line }}>
                  <Icon3D name="blister" size={26} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{e.name}{e.strength && !e.name.toLowerCase().includes(e.strength.toLowerCase()) ? ` ${e.strength}` : ""}</Text>
                </Tap>
              ))}
            </View>
          </Section>
        ) : null}

        {/* Cart. */}
        {cart.lines.length ? (
          <Section title="In the order">
            <View style={[glassCard("#ffffff", "#0f1030"), { borderRadius: 24, paddingHorizontal: 16, shadowOpacity: 0.05 }]}>
              {cart.lines.map((l, i) => (
                <View key={l.drug.drugMasterId} style={{ paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line, gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: PILLAR_TONE.move.bg, alignItems: "center", justifyContent: "center" }}>
                      <Icon3D name="capsule" size={30} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{l.drug.name}</Text>
                      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{l.drug.pack}{l.drug.prescriptionRequired ? " · needs a prescription" : ""}</Text>
                    </View>
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{l.drug.price != null ? rupees(l.drug.price * l.quantity) : "-"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 56 }}>
                    <Stepper value={l.quantity} onChange={(n) => cart.setQty(l.drug.drugMasterId, n)} />
                    <Tap accessibilityRole="button" onPress={() => setAltFor(l.drug)} hitSlop={6}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>Same salt, cheaper?</Text>
                    </Tap>
                    <View style={{ flex: 1 }} />
                    <Tap accessibilityRole="button" accessibilityLabel={`Remove ${l.drug.name}`} onPress={() => cart.remove(l.drug.drugMasterId)} hitSlop={8}>
                      <Trash2 size={17} color={ink[500]} />
                    </Tap>
                  </View>
                </View>
              ))}
            </View>
            {needsPrescription(cart.lines) ? <Note tone="info" text="Some of these need a prescription. You'll attach it from your records before placing the order." /> : null}
          </Section>
        ) : (
          <View style={{ alignItems: "center", marginTop: 28, gap: 10 }}>
            <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: PILLAR_TONE.move.bg, alignItems: "center", justifyContent: "center" }}>
              <Icon3D name="blister" size={68} />
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], textAlign: "center", maxWidth: 260 }}>Search for a medicine, or tap one {first === "you" ? "you take" : `${first} takes`} to start.</Text>
          </View>
        )}

        {!LIVE ? <Note tone="info" text="Preview: sample medicines and prices. Nothing is ordered or charged." /> : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <PillButton tone="brand" disabled={!cart.lines.length} onPress={() => router.push("/pharmacy/delivery" as never)}>
          {cart.lines.length ? `Continue · ${cart.lines.length} item${cart.lines.length === 1 ? "" : "s"} · about ${rupees(total)}` : "Add a medicine"}
        </PillButton>
      </View>

      <AlternativesSheet drug={altFor} onClose={() => setAltFor(null)} onPick={(to) => { if (altFor) cart.swap(altFor.drugMasterId, to); setAltFor(null); }} />
    </KeyboardAvoidingView>
  );
}

function DrugRow({ d, inCart, onAdd }: { d: Drug; inCart: boolean; onAdd: () => void }) {
  return (
    <View style={[glassCard("#ffffff", "#0f1030"), { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, padding: 12, shadowOpacity: 0.05, opacity: d.notForSale ? 0.6 : 1 }]}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: PILLAR_TONE.move.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon3D name={d.prescriptionRequired ? "blister" : "capsule"} size={34} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{d.name}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{[d.pack, d.salt].filter(Boolean).join(" · ")}</Text>
        {d.notForSale ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <ShieldAlert size={13} color={semantic.cautionText} />
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: semantic.cautionText }}>Not sold online</Text>
          </View>
        ) : d.prescriptionRequired ? (
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[700], marginTop: 4 }}>Needs a prescription</Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        {d.price != null ? (
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
            {rupees(d.price)}
            {d.mrp && d.mrp > d.price ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textDecorationLine: "line-through" }}> {rupees(d.mrp)}</Text> : null}
          </Text>
        ) : null}
        <Tap accessibilityRole="button" accessibilityLabel={`Add ${d.name}`} disabled={d.notForSale} onPress={onAdd} style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", backgroundColor: inCart ? brand[50] : brand[600] }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: inCart ? brand[700] : "#fff" }}>{inCart ? "Add one more" : "Add"}</Text>
        </Tap>
      </View>
    </View>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 999, borderWidth: 1, borderColor: surface.line, height: 34 }}>
      <Tap accessibilityRole="button" accessibilityLabel="One fewer" disabled={value <= 1} onPress={() => onChange(value - 1)} style={{ width: 34, alignItems: "center", justifyContent: "center", opacity: value <= 1 ? 0.35 : 1 }}>
        <Minus size={15} color={ink[900]} />
      </Tap>
      <Text accessibilityLabel={`${value} packs`} style={{ minWidth: 22, textAlign: "center", fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{value}</Text>
      <Tap accessibilityRole="button" accessibilityLabel="One more" disabled={value >= 100} onPress={() => onChange(value + 1)} style={{ width: 34, alignItems: "center", justifyContent: "center", opacity: value >= 100 ? 0.35 : 1 }}>
        <Plus size={15} color={ink[900]} />
      </Tap>
    </View>
  );
}

/** Same salt, other packs and makers (getAlternatives). Never swapped without a tap. */
function AlternativesSheet({ drug, onClose, onPick }: { drug: Drug | null; onClose: () => void; onPick: (d: Drug) => void }) {
  const insets = useSafeAreaInsets();
  const alts = useQuery({ queryKey: ["drug-alts", drug?.drugMasterId], queryFn: () => labstack().pharma.alternatives(drug!.drugMasterId), enabled: Boolean(drug) });
  const list = (alts.data ?? []).filter((d) => !d.notForSale).sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
  return (
    <Sheet open={Boolean(drug)} onClose={onClose}>
      <View style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: surface.canvas, padding: 22, paddingBottom: insets.bottom + 16, gap: 12 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.5, color: ink[900] }}>Same salt as {drug?.name}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500] }}>Same medicine and strength, a different maker or pack. Check with your doctor or pharmacist before switching brands.</Text>
        {alts.isPending ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>Looking…</Text> : list.length ? (
          list.map((d) => (
            <Tap key={d.drugMasterId} accessibilityRole="button" onPress={() => onPick(d)} className="flex-row items-center gap-3 rounded-xl bg-white p-3.5" style={{ borderWidth: 1, borderColor: surface.line }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{d.name}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{d.pack}</Text>
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{d.price != null ? rupees(d.price) : "-"}</Text>
            </Tap>
          ))
        ) : (
          <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500] }}>No other packs of this one right now.</Text>
        )}
      </View>
    </Sheet>
  );
}
