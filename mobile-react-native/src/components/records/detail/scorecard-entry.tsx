import { useRouter } from "expo-router";
import { ChevronRight, CircleAlert, CircleCheck, CircleHelp, ShieldAlert, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Text, View } from "react-native";

import { Gradient, glassShadow } from "@/components/ui/glass";
import { Tap } from "@/components/ui/tap";
import { useScorecard, type Scorecard } from "@/lib/rx/queries";
import { brand, hue, ink, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The way into the prescription scorecard, at the top of a prescription's
 * page. It scores on open, so by the time someone reads the doctor's card the
 * verdict is already there: "Fits Priya, with 2 things to sort · 8 of 10".
 */

const TONE: Record<Scorecard["verdict"]["tone"], { icon: LucideIcon; fg: string; bg: string }> = {
  fits: { icon: CircleCheck, fg: semantic.safeText, bg: semantic.safeBg },
  sort: { icon: CircleAlert, fg: semantic.attentionText, bg: semantic.attentionBg },
  stop: { icon: ShieldAlert, fg: semantic.dangerText, bg: semantic.dangerBg },
  partial: { icon: CircleHelp, fg: hue.slate.fg, bg: hue.slate.bg },
};

export function ScorecardEntry({ documentId }: { documentId: string }) {
  const router = useRouter();
  const q = useScorecard(documentId);
  const card = q.data;
  const t = card ? TONE[card.verdict.tone] : null;
  const open = () => router.push({ pathname: "/prescription/[id]", params: { id: documentId } });

  return (
    <Tap accessibilityRole="button" accessibilityLabel={card ? `${card.verdict.title}. ${card.score.clear} of 10 checks clear. Open the prescription check` : "Check this prescription"} onPress={open} scale={0.98} style={[glassShadow, { marginTop: 12, borderRadius: 24, overflow: "hidden" }]}>
      <Gradient from={t?.bg ?? brand[50]} to="#ffffff" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
        <View style={{ width: 46, height: 46, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          {q.isPending ? <ActivityIndicator color={ink[900]} /> : t ? <t.icon size={22} color={t.fg} /> : <CircleHelp size={22} color={ink[900]} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", color: t?.fg ?? brand[700] }}>Prescription check</Text>
          <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: ink[900], marginTop: 2 }}>
            {card ? card.verdict.title : q.isPending ? "Reading every salt against the records…" : "Check it against the records"}
          </Text>
          {card ? (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500], marginTop: 2 }}>
              {card.score.clear} of 10 clear{card.score.act ? ` · ${card.score.act} to sort` : ""}{card.score.stop ? ` · ${card.score.stop} to ask first` : ""}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={18} color={ink[300]} />
      </View>
    </Tap>
  );
}
