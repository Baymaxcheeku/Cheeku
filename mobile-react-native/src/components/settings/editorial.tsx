import { ChevronDown, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Text, View, type ImageSourcePropType } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { brandify } from "@/components/ui/brand";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { Spin } from "@/components/ui/reveal";
import { brand, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";
import { IconArt } from "@/components/ui/icon-art";

/*
 * The type ramp and the question list shared by the long settings pages
 * (About, Your plan, Help). One set, so the pages read as one family: a small
 * violet eyebrow, a tight headline, a calm body, and questions that open in
 * place.
 */

export function Eyebrow({ children, color = ink[500] }: { children: string; color?: string }) {
  return <Text style={{ fontFamily: font.medium, fontSize: 12, color }}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: ink[900], marginTop: 6 }}>{brandify(children)}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[700], marginTop: 8 }}>{brandify(children)}</Text>;
}

export type QA = { q: string; a: string };

/** A white card of questions, each opening in place. */
export function Questions({ items }: { items: readonly QA[] }) {
  return (
    <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", overflow: "hidden" }]}>
      {items.map((f, i) => (
        <Question key={f.q} q={f.q} a={f.a} first={i === 0} />
      ))}
    </View>
  );
}

export function Question({ q, a, first }: { q: string; a: string; first: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: surface.line }}>
      <Tap scale={0.98} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: ink[900] }}>{brandify(q)}</Text>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevronDown size={18} color={ink[500]} />
        </View>
      </Tap>
      {open ? <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700], paddingHorizontal: 16, paddingBottom: 16, marginTop: -4 }}>{brandify(a)}</Text> : null}
    </View>
  );
}

/**
 * The person a settings page is editing, said loudly at the top: their face in
 * a slowly turning ring, their name, and whose file this is. Personal and
 * Health both follow the member switch, so the hero is the guard against
 * editing Amma's details while believing they are yours.
 */
export function PersonHero({
  eyebrow,
  name,
  sub,
  avatar,
  children,
}: {
  eyebrow: string;
  name: string;
  sub: string;
  avatar: { svg: string; photo?: string | null; image?: ImageSourcePropType | null; background?: string };
  children?: React.ReactNode;
}) {
  return (
    <View style={[glassShadow, { marginHorizontal: 20, marginTop: 4, borderRadius: 32, overflow: "hidden", padding: 20 }]}>
      <Gradient from={lilac.violet} to="#ffffff" glow="#ffffff" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ width: 92, height: 92, alignItems: "center", justifyContent: "center" }}>
          <Spin seconds={30} style={{ position: "absolute", width: 92, height: 92 }}>
            <View style={{ flex: 1, borderRadius: 999, borderWidth: 1.5, borderStyle: "dashed", borderColor: brand[300] }} />
          </Spin>
          <View style={{ borderRadius: 999, borderWidth: 3, borderColor: "#fff" }}>
            <Avatar svg={avatar.svg} photo={avatar.photo} image={avatar.image} background={avatar.background} size={72} />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.7, color: ink[900], marginTop: 4 }}>{name}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>{sub}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

/** A small "why we ask" line: icon, bold lead, plain reason. */
export function Reason({ icon: Icon, lead, text }: { icon: LucideIcon; lead: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
        <IconArt icon={Icon} size={28} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{lead}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700], marginTop: 2 }}>{brandify(text)}</Text>
      </View>
    </View>
  );
}
