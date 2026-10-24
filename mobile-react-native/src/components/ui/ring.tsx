import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { brand } from "@/theme/tokens";
import { font } from "@/theme/type";

/**
 * The day's progress as a ring (UI audit batch 4): a count in the middle and
 * an arc that closes as the day does. A ring reads as "how much of today",
 * where the old bar read as a form being filled in.
 */
export function ProgressRing({ done, total, size = 64, stroke = 7 }: { done: number; total: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <View accessibilityLabel={`${done} of ${total} done`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.7)" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={brand[600]} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - pct)} />
      </Svg>
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[900] }}>
        {done}
        <Text style={{ fontFamily: font.medium, fontSize: 11, color: brand[700] }}>/{total}</Text>
      </Text>
    </View>
  );
}
