import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import type { Tone } from "../insights";

/*
 * The few shapes the wearables screens are drawn from. Neutral like the rest
 * of the app: ink for the number, grey for everything around it, violet only
 * for progress, and the health colours only where a number is worth a look.
 */

export function toneColor(tone: Tone): string {
  return tone === "good" ? semantic.safeText : tone === "watch" ? semantic.attentionText : ink[500];
}

/** A progress ring. `progress` 0..1; null draws the empty track. */
export function Ring({ size, stroke, progress, children }: { size: number; stroke: number; progress: number | null; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress ?? 0));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={surface.line} strokeWidth={stroke} fill="none" />
        {p > 0 ? <Circle cx={size / 2} cy={size / 2} r={r} stroke={p >= 1 ? semantic.safe : brand[600]} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} /> : null}
      </Svg>
      {children}
    </View>
  );
}

/** Small bars, oldest first. A missing day is a short grey stub so the week still reads as seven. */
export function Bars({ values, height = 28, width, highlightLast = true, color = ink[900] }: { values: readonly (number | null)[]; height?: number; width?: number; highlightLast?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height, width }}>
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: v === null ? 3 : Math.max(3, Math.round(height * v)),
              borderRadius: 2,
              backgroundColor: v === null ? surface.line : highlightLast && !last ? "#c4c4cc" : color,
            }}
          />
        );
      })}
    </View>
  );
}

export function SampleTag() {
  return (
    <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 999, justifyContent: "center", backgroundColor: semantic.cautionBg }}>
      <Text style={{ fontFamily: font.medium, fontSize: 11, color: semantic.cautionText }}>Sample data</Text>
    </View>
  );
}

/** "5 min ago", "2 h ago", "yesterday". */
export function ago(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "not yet";
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return hours < 48 ? "yesterday" : `${Math.round(hours / 24)} days ago`;
}
