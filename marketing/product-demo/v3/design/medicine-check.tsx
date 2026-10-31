import { useRouter } from "expo-router";
import { AlertCircle, Check, CheckCircle2, MessageCircle, Pill, ShieldCheck, Sparkles, Truck } from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Reveal, RevealScroll } from "@/components/ui/reveal";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { brand, hue, ink, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * DESIGN MOCK for the product demo (marketing/product-demo/v3). Not wired to
 * data: a prescribed medicine read at salt level against ten standards and the
 * person's own history, with same-salt alternatives. Built from the app's own
 * parts so it looks like the screens around it.
 */

type Row = { ok: boolean; title: string; line: string };

const STANDARDS: Row[] = [
  { ok: true, title: "Salt matches the prescription", line: "Ferrous ascorbate + folic acid, as Dr. Kavya Rao wrote" },
  { ok: true, title: "Strength and dose", line: "100 mg + 1.5 mg, once a day. The usual dose in pregnancy" },
  { ok: true, title: "Safe at 12 weeks", line: "Recommended through every trimester" },
  { ok: true, title: "Her allergies", line: "None on file since 2022" },
  { ok: true, title: "Her conditions", line: "Hypothyroidism. Fine, with the gap below" },
  { ok: false, title: "With Thyronorm 25 mcg", line: "Keep 4 hours apart, or it absorbs less" },
  { ok: false, title: "Already on the same salt", line: "Ferrous ascorbate from Sep 2026. Stop the old one" },
  { ok: true, title: "Her reports", line: "Ferritin 12 → 16, Hb 11.8. Still low, iron is right" },
  { ok: true, title: "Food and timing", line: "After lunch. No tea or milk for an hour" },
  { ok: true, title: "Quality", line: "Licensed maker. Batch and expiry checked on delivery" },
];

const SAME_SALT = [
  { name: "Orofer XT", note: "Prescribed", price: 179, save: null },
  { name: "Ferium XT", note: "Same salts, same strength", price: 152, save: "15% less" },
  { name: "Jan Aushadhi generic", note: "Same salts, same strength", price: 38, save: "79% less" },
];

export default function MedicineCheck() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const flagged = STANDARDS.filter((s) => !s.ok).length;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Medicine check" subtitle="For Priya" fallback="/medicines" />
      <RevealScroll contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <Reveal style={[glassShadow, { marginHorizontal: 20, marginTop: 6, borderRadius: 32, overflow: "hidden", padding: 20 }]}>
          <Gradient from={hue.rose.bg} to="#ffffff" glow="#ffffff" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, height: 24, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.85)" }}>
            <Sparkles size={12} color={brand[600]} />
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: brand[700] }}>Read against 4 years of Priya&apos;s records</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Pill size={26} color={hue.rose.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.7, color: ink[900] }}>Orofer XT</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>Ferrous ascorbate 100 mg + Folic acid 1.5 mg · Tablet</Text>
            </View>
          </View>
          <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: semantic.safeBg, padding: 14, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={20} color={semantic.safeText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 17, color: semantic.safeText }}>Fits Priya</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>The right salt for her low iron, and safe now. {flagged} things to get right, below.</Text>
            </View>
          </View>
        </Reveal>

        <Reveal style={{ paddingHorizontal: 20, marginTop: 24, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>Checked on 10 standards</Text>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>8 clear · {flagged} to act on</Text>
        </Reveal>
        <Reveal style={{ marginHorizontal: 20, marginTop: 12 }}>
          <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", paddingVertical: 6, paddingHorizontal: 14 }]}>
            {STANDARDS.map((s, i) => (
              <View key={s.title} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: glass.rim }}>
                <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: s.ok ? semantic.safeBg : semantic.attentionBg, alignItems: "center", justifyContent: "center" }}>
                  {s.ok ? <Check size={15} color={semantic.safeText} strokeWidth={3} /> : <AlertCircle size={16} color={semantic.attentionText} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: s.ok ? ink[900] : semantic.attentionText }}>{s.title}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: ink[500], marginTop: 1 }}>{s.line}</Text>
                </View>
              </View>
            ))}
          </View>
        </Reveal>

        <Reveal style={{ paddingHorizontal: 20, marginTop: 26 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>Same salt, lower price</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>Per strip of 10. Ask Dr. Kavya before you switch.</Text>
        </Reveal>
        <Reveal style={{ marginHorizontal: 20, marginTop: 12, gap: 10 }}>
          {SAME_SALT.map((m) => (
            <View key={m.name} style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: m.save ? glass.rim : brand[200] }]}>
              <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: m.save ? hue.teal.bg : brand[50], alignItems: "center", justifyContent: "center" }}>
                {m.save ? <CheckCircle2 size={18} color={hue.teal.fg} /> : <Pill size={18} color={brand[600]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{m.name}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{m.note}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>₹{m.price}</Text>
                {m.save ? <Text style={{ fontFamily: font.semibold, fontSize: 12, color: hue.teal.fg, marginTop: 1 }}>{m.save}</Text> : null}
              </View>
            </View>
          ))}
        </Reveal>
      </RevealScroll>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14 }}>
        <Tap accessibilityRole="button" onPress={() => router.push("/ask")} style={[glassShadow, { width: 56, height: 56, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }]} scale={0.96}>
          <MessageCircle size={22} color={brand[600]} />
        </Tap>
        <Tap accessibilityRole="button" onPress={() => router.push({ pathname: "/services/request", params: { service: "medicines", offering: "rx" } })} style={{ flex: 1, height: 56, borderRadius: 999, backgroundColor: brand[600], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }} scale={0.98}>
          <Truck size={18} color="#fff" />
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Order with home delivery</Text>
        </Tap>
      </View>
    </View>
  );
}
