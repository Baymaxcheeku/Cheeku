import { useRouter } from "expo-router";
import { ArrowRight, CalendarClock, ChevronRight, Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LocationChip } from "@/components/location/location-chip";
import { Tap } from "@/components/ui/tap";
import { MascotFigure } from "@/components/illustrations/sprout";
import { Grid2, SPECIALTY_ICON } from "@/components/services/parts";
import { Brand } from "@/components/ui/brand";
import { Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { DOCTORS, SPECIALTIES, type Specialty, type SpecialtyGroup } from "@/lib/booking/catalog";
import { brand, hue, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * DOCTORS: ONE SEGMENT, EVERY SPECIALTY.
 *
 * Gynaecologists, dieticians, psychologists, psychiatrists, dentists and the
 * rest all live here and all run through the same pre-consultation flow, so
 * the doctor always gets the note and the person's memory comes along.
 *
 * Not sure who to see? The top card starts the flow without a specialty; the
 * person picks the area and the flow names the department, always offering a
 * general physician first. It never picks a specialty from symptoms (no triage).
 */

const GROUPS: { id: SpecialtyGroup; title: string; line: string }[] = [
  { id: "everyday", title: "Everyday", line: "Where most visits start" },
  { id: "mind", title: "Mind", line: "Private, online or in person" },
  { id: "specialist", title: "Specialists", line: "For a known condition or a referral" },
];

const TINT: Record<SpecialtyGroup, { from: string; fg: string }> = {
  everyday: { from: lilac.base, fg: brand[600] },
  mind: { from: lilac.base, fg: brand[600] },
  specialist: { from: hue.blue.bg, fg: hue.blue.fg },
};

export default function DoctorsHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const all = Object.values(SPECIALTIES);
  const q = query.trim().toLowerCase();
  const found = q ? all.filter((s) => `${s.label} ${s.plural} ${s.line}`.toLowerCase().includes(q)) : null;
  const book = (s?: Specialty) => router.push(s ? { pathname: "/book/consult", params: { specialty: s.id } } : "/book/consult");

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Doctors" subtitle="Every specialty, online or at a clinic" fallback="/services" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LocationChip prefix="Clinics near" />
        <Tap accessibilityRole="button" onPress={() => book()} style={[glassShadow, { borderRadius: 32, overflow: "hidden", marginTop: 6, borderWidth: 1, borderColor: lilac.violet }]} scale={0.98}>
          {/*
           * Clean white, not dark violet: the mascot is lilac, and on a
           * violet card it disappeared. On white it is the most colourful
           * thing on the card, with a faint lilac halo to sit on.
           */}
          <Gradient from="#ffffff" to={surface.tint} glow="#ffffff" />
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingLeft: 18, paddingRight: 8, gap: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 20, lineHeight: 24, letterSpacing: -0.3, color: ink[900] }}>Not sure who to see?</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 5 }}>
                Tell <Brand /> what&apos;s going on. You pick the area, it names the right department and writes the doctor a note.
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 12, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: brand[600] }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>Start pre-consultation</Text>
                <ArrowRight size={15} color="#fff" />
              </View>
            </View>
            <View style={{ width: 104, height: 112, alignItems: "center", justifyContent: "flex-end" }}>
              <View style={{ position: "absolute", bottom: 6, width: 92, height: 92, borderRadius: 999, backgroundColor: lilac.base }} />
              <MascotFigure size={100} moment="think" hop />
            </View>
          </View>
        </Tap>

        <View style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 10, height: 50, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim }]}>
          <Search size={18} color={ink[500]} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search a specialty" placeholderTextColor={ink[300]} accessibilityLabel="Search specialties" style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: ink[900], paddingVertical: 0 }} />
          {query ? (
            <Tap accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}>
              <X size={17} color={ink[500]} />
            </Tap>
          ) : null}
        </View>

        {found ? (
          <Grid2>
            {found.map((s) => (
              <SpecialtyTile key={s.id} s={s} onPress={() => book(s)} />
            ))}
          </Grid2>
        ) : (
          GROUPS.map((g) => (
            <View key={g.id} style={{ gap: 10, marginTop: 10 }}>
              <View>
                <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>{g.title}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>{g.line}</Text>
              </View>
              <Grid2 gap={10}>
                {all.filter((s) => s.group === g.id).map((s) => (
                  <SpecialtyTile key={s.id} s={s} onPress={() => book(s)} />
                ))}
              </Grid2>
            </View>
          ))
        )}

        <Pressable accessibilityRole="button" onPress={() => router.push("/appointments" as never)} style={({ pressed }) => [glassShadow, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: pressed ? brand[50] : "#fff", marginTop: 8 }]}>
          <CalendarClock size={19} color={brand[600]} />
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Your appointments</Text>
          <ChevronRight size={18} color={ink[300]} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SpecialtyTile({ s, onPress }: { s: Specialty; onPress: () => void }) {
  const Icon = SPECIALTY_ICON[s.id];
  const tint = TINT[s.group];
  const count = DOCTORS.filter((d) => d.specialty === s.id).length;
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${s.label}. ${s.line}`} onPress={onPress} style={[glassShadow, { flex: 1, minHeight: 128, borderRadius: 24, padding: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, overflow: "hidden" }]}>
      <Gradient from={tint.from} to="#ffffff" angle="vertical" />
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <Icon size={20} color={tint.fg} strokeWidth={1.8} />
      </View>
      <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 10 }}>{s.label}</Text>
      <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[500], marginTop: 2 }}>{s.line}</Text>
      {count ? <Text style={{ fontFamily: font.medium, fontSize: 11, color: tint.fg, marginTop: 6 }}>{count} available</Text> : null}
    </Tap>
  );
}
