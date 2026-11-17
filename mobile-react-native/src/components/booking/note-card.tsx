import { Text, View } from "react-native";

import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";
import type { Intake } from "@/lib/booking/draft";
import { ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/** The pre-consultation note, as the doctor will see it. */
export function NoteCard({ intake, compact }: { intake: Intake; compact?: boolean }) {
  const rows: [string, string][] = [
    ["For", intake.forName],
    ["About", intake.concern],
    ["In their words", intake.details || "Not shared"],
    ["Since", intake.since],
    ["Affecting the day", intake.impact],
    ["Tried so far", intake.tried],
    ["Reports", intake.shareRecords ? "Recent reports shared" : "Not shared"],
  ];
  const shown = compact ? rows.filter(([k]) => k === "About" || k === "Since" || k === "Reports") : rows;

  return (
    <View style={[glassCard("#ffffff", "#0f1030"), { borderRadius: 24, shadowOpacity: 0.05 }]}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: PILLAR_TONE.check.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon3D name="clipboard" size={34} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>Pre-consultation note</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>What the doctor reads before saying hello</Text>
          </View>
        </View>
        <View style={{ marginTop: 14 }}>
          {shown.map(([k, v], i) => (
            <View key={k} style={{ flexDirection: "row", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
              <Text style={{ width: 112, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500] }}>{k}</Text>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: ink[900] }}>{v}</Text>
            </View>
          ))}
        </View>
        {!compact ? (
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 12 }}>
            Your own words, not a diagnosis. Only the doctor you book sees this.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

