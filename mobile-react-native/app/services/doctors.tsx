import { useRouter } from "expo-router";
import { ArrowRight, CalendarClock, ChevronRight, Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import { Grid2, SPECIALTY_ICON } from "@/components/services/parts";
import { Brand } from "@/components/ui/brand";
import { Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { DOCTORS, SPECIALTIES, type Specialty, type SpecialtyGroup } from "@/lib/booking/catalog";
import { brand, ink } from "@/theme/tokens";
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
  everyday: { from: "#ece6ff", fg: brand[600] },
  mind: { from: "#e9e4ff", fg: "#5b3fd4" },
  specialist: { from: "#dcecff", fg: "#1a6fc2" },
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
        <Pressable accessibilityRole="button" onPress={() => book()} style={({ pressed }) => [glassShadow, { borderRadius: 28, overflow: "hidden", marginTop: 6, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
          <Gradient from="#1b1a3f" to="#3b2bc9" glow="#5b4ef0" />
          <View style={{ flexDirection: "row", alignItems: "center", padding: 18, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 19, lineHeight: 24, color: "#fff" }}>Not sure who to see?</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.8)", marginTop: 5 }}>
                Tell <Brand onDark /> what&apos;s going on. You pick the area, it names the right department and writes the doctor a note.
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: "#fff" }}>Start pre-consultation</Text>
                <ArrowRight size={15} color="#fff" />
              </View>
            </View>
            <MascotBust size={74} mood="happy" pose="wave" motion="wave" interactive={false} />
          </View>
        </Pressable>

        <View style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 10, height: 50, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim }]}>
          <Search size={18} color={ink[500]} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search a specialty" placeholderTextColor={ink[300]} accessibilityLabel="Search specialties" style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: ink[900], paddingVertical: 0 }} />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}>
              <X size={17} color={ink[500]} />
            </Pressable>
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
                <Text style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, color: ink[900] }}>{g.title}</Text>
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

        <Pressable accessibilityRole="button" onPress={() => router.push("/appointments" as never)} style={({ pressed }) => [glassShadow, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 22, backgroundColor: pressed ? brand[50] : "#fff", marginTop: 8 }]}>
          <CalendarClock size={19} color={brand[600]} />
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: ink[900] }}>Your appointments</Text>
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
    <Pressable accessibilityRole="button" accessibilityLabel={`${s.label}. ${s.line}`} onPress={onPress} style={({ pressed }) => [glassShadow, { flex: 1, minHeight: 128, borderRadius: 24, padding: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, overflow: "hidden", transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <Gradient from={tint.from} to="#ffffff" angle="vertical" />
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <Icon size={20} color={tint.fg} strokeWidth={1.8} />
      </View>
      <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[900], marginTop: 10 }}>{s.label}</Text>
      <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[500], marginTop: 2 }}>{s.line}</Text>
      {count ? <Text style={{ fontFamily: font.medium, fontSize: 11, color: tint.fg, marginTop: 6 }}>{count} available</Text> : null}
    </Pressable>
  );
}
