import { ClipboardList } from "lucide-react-native";
import { Text, View } from "react-native";

import { Gradient, glassShadow } from "@/components/ui/glass";
import type { Intake } from "@/lib/booking/draft";
import { brand, ink } from "@/theme/tokens";
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
    <View className="overflow-hidden rounded-[24px]" style={glassShadow}>
      <Gradient from="#ffffff" to="#f3f0ff" angle="vertical" />
      <View className="p-4">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-[10px]" style={{ backgroundColor: brand[50] }}>
            <ClipboardList size={16} color={brand[600]} />
          </View>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Pre-consultation note</Text>
        </View>
        <View className="mt-3 gap-2.5">
          {shown.map(([k, v]) => (
            <View key={k} className="flex-row gap-3">
              <Text style={{ width: 118, fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{k}</Text>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13.5, color: ink[900] }}>{v}</Text>
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

