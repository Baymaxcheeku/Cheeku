import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BellRing, Check, ChevronRight, FileHeart, Lock, Phone, ShieldCheck, Stethoscope, type LucideIcon } from "lucide-react-native";
import { Linking, Text, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { SERVICE_ICON, ServiceArt } from "@/components/services/parts";
import { Brand } from "@/components/ui/brand";
import { Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Reveal, RevealScroll } from "@/components/ui/reveal";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { fetchWaitlist } from "@/lib/notifications/queries";
import { useJoinWaitlist } from "@/lib/notifications/waitlist";
import { MODE_LABEL, serviceById, type Offering } from "@/lib/services/catalog";
import { marketplace } from "@/lib/services/provider";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * One service: what it is, what you can book inside it, how it works, and
 * what Cheeku adds (your note goes with you, the visit is filed in memory).
 *
 * SAFETY FIRST, ON THE PAGES THAT NEED IT. Ambulance opens with "Is this an
 * emergency? Call 108" above everything, and its emergency offering is a call
 * button, never a form. Mental health opens with the Tele-MANAS line (14416,
 * free, all day and night). These are health meaning, so they're the one
 * place red is used on these pages (PLAN.md rule 3).
 */
export default function ServicePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = serviceById(id);

  if (!s) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Service" fallback="/services" />
        <Text style={{ marginTop: 40, textAlign: "center", fontFamily: font.regular, fontSize: 15, color: ink[500] }}>That service isn&apos;t here any more.</Text>
      </View>
    );
  }

  const Icon = SERVICE_ICON[s.icon] ?? Stethoscope;
  const live = s.status === "live";

  function choose(o: Offering) {
    if (o.call) {
      void Linking.openURL(`tel:${o.call}`).catch(() => undefined);
      return;
    }
    if (o.specialty) {
      router.push({ pathname: "/book/consult", params: { specialty: o.specialty } });
      return;
    }
    if (o.route) {
      router.push(o.route as never);
      return;
    }
    router.push({ pathname: "/services/request", params: { service: s?.id ?? "", offering: o.id } });
  }

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title={s.title} fallback="/services" />
      <RevealScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {s.urgent?.map((u) => (
          <Reveal key={u.call} style={{ marginHorizontal: 20, marginTop: 6, marginBottom: 6 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${u.title} ${u.label}`} onPress={() => void Linking.openURL(`tel:${u.call}`).catch(() => undefined)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: semantic.dangerBg, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ width: 42, height: 42, borderRadius: 999, backgroundColor: semantic.dangerStrong, alignItems: "center", justifyContent: "center" }}>
                <Phone size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: semantic.dangerText }}>{u.title}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[700], marginTop: 1 }}>{u.text}</Text>
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: semantic.dangerText }}>{u.label}</Text>
            </Pressable>
          </Reveal>
        ))}

        <Reveal style={[glassShadow, { marginHorizontal: 20, marginTop: 6, borderRadius: 32, overflow: "hidden", padding: 20 }]}>
          <Gradient from={s.tint.from} to="#ffffff" glow="#ffffff" />
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, height: 24, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.85)" }}>
                {live ? <ShieldCheck size={12} color={s.tint.fg} /> : <Lock size={11} color={ink[700]} />}
                <Text style={{ fontFamily: font.semibold, fontSize: 11, color: live ? s.tint.fg : ink[700] }}>
                  {live ? (marketplace().preview ? "Partner network · preview" : "Partner network") : s.status === "locked" ? "Locked" : "Coming soon"}
                </Text>
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, color: ink[900], marginTop: 10 }}>{s.title}</Text>
            </View>
            <ServiceArt icon={Icon} fg={s.tint.fg} size={96} />
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700], marginTop: 8 }}>{s.promise}</Text>
        </Reveal>

        {live && s.offerings.length ? (
          <>
            <Reveal style={{ paddingHorizontal: 20, marginTop: 26 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>What would you like to book?</Text>
            </Reveal>
            <Reveal style={{ marginHorizontal: 20, marginTop: 12, gap: 10 }}>
              {s.offerings.map((o) => (
                <Pressable key={o.id} accessibilityRole="button" onPress={() => choose(o)} style={({ pressed }) => [glassShadow, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: pressed ? brand[50] : "#fff", borderWidth: 1, borderColor: o.call ? semantic.dangerBg : glass.rim }]}>
                  <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: o.call ? semantic.dangerBg : s.tint.from, alignItems: "center", justifyContent: "center" }}>
                    {o.call ? <Phone size={18} color={semantic.dangerText} /> : o.specialty ? <Stethoscope size={18} color={s.tint.fg} /> : <Icon size={18} color={s.tint.fg} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: o.call ? semantic.dangerText : ink[900] }}>{o.title}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 1 }}>{o.line}</Text>
                    {!o.call ? <Text style={{ fontFamily: font.medium, fontSize: 12, color: s.tint.fg, marginTop: 4 }}>{o.modes.map((m) => MODE_LABEL[m]).join(" · ")}{o.specialty ? " · with a pre-consultation note" : ""}</Text> : null}
                  </View>
                  <ChevronRight size={18} color={ink[300]} />
                </Pressable>
              ))}
            </Reveal>
          </>
        ) : null}

        {!live ? <Reveal style={{ marginHorizontal: 20, marginTop: 18 }}><Waitlist id={s.id} /></Reveal> : null}

        {s.steps.length ? (
          <>
            <Reveal style={{ paddingHorizontal: 20, marginTop: 28 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>How it works</Text>
            </Reveal>
            <Reveal style={{ marginHorizontal: 20, marginTop: 12 }}>
              <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", padding: 16, gap: 14 }]}>
                {s.steps.map((step, i) => (
                  <View key={step} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: ink[900] }}>{step}</Text>
                  </View>
                ))}
              </View>
            </Reveal>
          </>
        ) : null}

        <Reveal style={{ marginHorizontal: 20, marginTop: 18, gap: 10 }}>
          <Assurance icon={FileHeart} text="Filed in their memory, so the next answer knows about it" />
          <Assurance icon={ShieldCheck} text="Records are only shared when you say so, never as part of booking" />
        </Reveal>
        <Reveal style={{ alignItems: "center", marginTop: 16, paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: ink[500], textAlign: "center" }}>
            Booked through <Brand />&apos;s partner network. The provider confirms the final price and timing before the visit.
          </Text>
        </Reveal>
      </RevealScroll>
    </View>
  );
}

function Assurance({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: surface.line }}>
      <Icon size={16} color={ink[900]} />
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>{text}</Text>
    </View>
  );
}

function Waitlist({ id }: { id: string }) {
  const list = useQuery({ queryKey: ["waitlist"], queryFn: fetchWaitlist });
  const on = Boolean(list.data?.includes(id));
  const joinWaitlist = useJoinWaitlist();
  function join() {
    void joinWaitlist(id);
  }
  return (
    <Tap accessibilityRole="button" disabled={on} onPress={join} style={{ height: 54, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: on ? "#fff" : brand[600], borderWidth: on ? 1.5 : 0, borderColor: brand[200] }} scale={0.98}>
      {on ? <Check size={18} color={brand[700]} strokeWidth={3} /> : <BellRing size={18} color="#fff" />}
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: on ? brand[700] : "#fff" }}>{on ? "You're on the list" : "Tell me when it's open"}</Text>
    </Tap>
  );
}
