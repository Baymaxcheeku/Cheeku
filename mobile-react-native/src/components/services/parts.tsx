import {
  Activity,
  Ambulance,
  ArrowRight,
  Baby,
  Bone,
  ChevronRight,
  Dumbbell,
  Ear,
  Eye,
  FlaskConical,
  HeartHandshake,
  HeartPulse,
  Lock,
  MessagesSquare,
  Pill,
  Salad,
  ShieldCheck,
  Smile,
  Stethoscope,
  Waves,
  Zap,
} from "lucide-react-native";
import { Text, View } from "react-native";

import { Tap } from "@/components/ui/tap";
import { MascotFigure } from "@/components/illustrations/sprout";
import { Brand } from "@/components/ui/brand";
import { NerveIcon, WellbeingIcon, type AppIcon } from "@/components/ui/icons";
import { Gradient, glass, glassShadow } from "@/components/ui/glass";
import type { SpecialtyId } from "@/lib/booking/catalog";
import type { Service } from "@/lib/services/catalog";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE PIECES OF "BOOK SERVICES".
 *
 * The layout borrows what works from the reference the owner shared: a dark
 * prompt card on top ("Give me a 7-day diet plan" there; "tell Cheeku what you
 * need" here), then big two-up tiles with a title, one line, a round dark
 * arrow, and art sitting in the bottom corner. What it leaves out: stock 3D
 * renders. The art here is built from the app's own shapes and icons, so it
 * stays crisp, themable, and light.
 *
 * Grids are built row by row (no flexWrap): wrapped rows stretched tiles to
 * the full screen height on iOS once, and that's written up in PROGRESS.md.
 *
 * Colour: pastel tints per service, never green, amber or red (PLAN.md rule 3).
 */

export const SERVICE_ICON: Record<string, AppIcon> = {
  Stethoscope,
  FlaskConical,
  Pill,
  ShieldCheck,
  WellbeingIcon,
  Smile,
  Eye,
  Activity,
  HeartHandshake,
  Ambulance,
  Dumbbell,
};

export const SPECIALTY_ICON: Record<SpecialtyId, AppIcon> = {
  gp: Stethoscope,
  paeds: Baby,
  gynae: HeartHandshake,
  derm: Waves,
  ent: Ear,
  dental: Smile,
  eye: Eye,
  psych: MessagesSquare,
  psychiatry: WellbeingIcon,
  diet: Salad,
  cardio: HeartPulse,
  endo: Zap,
  gastro: Activity,
  ortho: Bone,
  neuro: NerveIcon,
};

/** Lays children out two to a row, by hand. */
export function Grid2({ children, gap = 12 }: { children: React.ReactNode[]; gap?: number }) {
  const rows: React.ReactNode[][] = [];
  children.forEach((c, i) => {
    if (i % 2 === 0) rows.push([c]);
    else rows[rows.length - 1]?.push(c);
  });
  return (
    <View style={{ gap }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", gap }}>
          {r[0]}
          {r[1] ?? <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

/** Layered art: a soft disc, a tilted white card, the icon on top, a small accent. */
export function ServiceArt({ icon: Icon, fg, size = 92 }: { icon: AppIcon; fg: string; size?: number }) {
  const card = size * 0.62;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: "absolute", right: 0, bottom: 0, width: size * 0.86, height: size * 0.86, borderRadius: size, backgroundColor: fg, opacity: 0.1 }} />
      <View style={{ position: "absolute", right: size * 0.1, bottom: size * 0.12, width: card, height: card, borderRadius: card * 0.3, backgroundColor: "#fff", transform: [{ rotate: "-8deg" }], shadowColor: ink[900], shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4, alignItems: "center", justifyContent: "center" }}>
        <Icon size={card * 0.5} color={fg} strokeWidth={1.7} />
      </View>
      <View style={{ position: "absolute", right: size * 0.04, top: size * 0.14, width: size * 0.16, height: size * 0.16, borderRadius: size, backgroundColor: fg, opacity: 0.35 }} />
      <View style={{ position: "absolute", left: size * 0.12, bottom: size * 0.06, width: size * 0.1, height: size * 0.1, borderRadius: size, backgroundColor: fg, opacity: 0.22 }} />
    </View>
  );
}

export function StatusPill({ status }: { status: Service["status"] }) {
  if (status === "locked") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 999, backgroundColor: "rgba(15,16,48,0.08)" }}>
        <Lock size={9} color={ink[700]} />
        <Text style={{ fontFamily: font.semibold, fontSize: 11, color: ink[700] }}>Locked</Text>
      </View>
    );
  }
  if (status === "soon") {
    return (
      <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 999, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.8)" }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 11, color: ink[500] }}>Soon</Text>
      </View>
    );
  }
  return null;
}

/** The big two-up tile: title, line, arrow, art in the corner. */
export function ServiceTile({ service: s, onPress, tall = true }: { service: Service; onPress: () => void; tall?: boolean }) {
  const Icon = SERVICE_ICON[s.icon] ?? Stethoscope;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${s.title}. ${s.line}${s.status === "live" ? "" : s.status === "soon" ? ". Coming soon" : ". Locked"}`}
      onPress={onPress}
      style={{ flex: 1, minHeight: tall ? 148 : 136, borderRadius: 24, backgroundColor: "#fff" }}
    >
      <View style={{ padding: 16, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
            <Icon size={20} color={ink[900]} strokeWidth={1.8} />
          </View>
          {s.status !== "live" ? <StatusPill status={s.status} /> : <ChevronRight size={18} color={ink[300]} />}
        </View>
        <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 17, lineHeight: 21, letterSpacing: -0.3, color: ink[900] }}>{s.title}</Text>
        <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 4, maxWidth: "92%" }}>{s.line}</Text>
      </View>
    </Tap>
  );
}

/** A small card for the "more care" row. */
export function CompactTile({ service: s, onPress }: { service: Service; onPress: () => void }) {
  const Icon = SERVICE_ICON[s.icon] ?? Stethoscope;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${s.title}. ${s.line}`}
      onPress={onPress}
      style={[glassShadow, { width: 136, height: 132, borderRadius: 24, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, padding: 12 }]}
    >
      <Gradient from={s.tint.from} to="#ffffff" angle="vertical" />
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <Icon size={20} color={s.tint.fg} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{s.title}</Text>
        <StatusPill status={s.status} />
      </View>
      <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 15, color: ink[500], marginTop: 2 }}>{s.line}</Text>
    </Tap>
  );
}

/** The dark prompt card on top: book anything in a sentence, through Cheeku. */
export function AskToBook({ onPress, line }: { onPress: () => void; line?: string }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel="Tell Cheeku what you need"
      onPress={onPress}
      style={[glassShadow, { borderRadius: 32, overflow: "hidden", minHeight: 124 }]} scale={0.98}
    >
      <Gradient from={ink[900]} to={ink[900]} />
      <View style={{ flexDirection: "row", alignItems: "center", padding: 18 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.4, color: "#fff" }}>
            Just tell <Brand onDark size={21} /> what you need
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.78)", marginTop: 6 }}>
            {line ?? "“Book HbA1c again” or “a dentist on Saturday”. It books, and files it."}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>Start a chat</Text>
            <ArrowRight size={15} color="#fff" />
          </View>
        </View>
      </View>
    </Tap>
  );
}
