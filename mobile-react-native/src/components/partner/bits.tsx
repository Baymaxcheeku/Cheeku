import { AlertTriangle, Info } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Tap } from "@/components/ui/tap";
import type { ActiveProfile } from "@/lib/profiles/context";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/** Who this order is for: one chip per family member. */
export function MemberChips({ members, selected, onPick }: { members: ActiveProfile[]; selected: string | null; onPick: (id: string) => void }) {
  if (members.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 8 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
      {members.map((m) => {
        const on = m.id === selected;
        return (
          <Tap key={m.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onPick(m.id)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 14, height: 44, borderRadius: 999, backgroundColor: on ? brand[600] : "#fff", borderWidth: on ? 0 : 1, borderColor: surface.line }}>
            <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={34} />
            <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 15, color: on ? "#fff" : ink[900] }}>{m.isPrimary ? "Me" : m.name.split(" ")[0]}</Text>
          </Tap>
        );
      })}
    </ScrollView>
  );
}

export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

const TONE = {
  info: { bg: surface.tint, fg: ink[700], Icon: Info },
  caution: { bg: semantic.cautionBg, fg: semantic.cautionText, Icon: AlertTriangle },
  danger: { bg: semantic.dangerBg, fg: semantic.dangerText, Icon: AlertTriangle },
} as const;

export function Note({ text, tone = "info" }: { text: string; tone?: keyof typeof TONE }) {
  const t = TONE[tone];
  return (
    <View accessibilityRole={tone === "info" ? undefined : "alert"} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 16, backgroundColor: t.bg, marginTop: 12 }}>
      <t.Icon size={15} color={t.fg} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: t.fg }}>{text}</Text>
    </View>
  );
}

/** One label and value line on a bill. */
export function Line({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text numberOfLines={2} style={{ flex: 1, fontFamily: strong ? font.semibold : font.regular, fontSize: 15, color: strong ? ink[900] : muted ? ink[500] : ink[700] }}>{label}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: strong ? 17 : 15, color: muted ? ink[500] : ink[900] }}>{value}</Text>
    </View>
  );
}
