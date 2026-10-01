import { Text, View } from "react-native";
import Svg, { Circle, Polyline, Rect } from "react-native-svg";

import { parseRange } from "@/lib/records/details";
import type { EntityFlag } from "@/lib/records/types";
import { brand, ink, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Small pieces for the health file page.
 */

export const FLAG_DOT: Record<EntityFlag, string> = {
  normal: semantic.safe,
  high: semantic.danger,
  low: semantic.danger,
  caution: semantic.caution,
};

/**
 * A value's history as a tiny line, with the lab's normal band shaded when
 * the range can be read. The last point is drawn in the flag's colour. Only
 * position against the printed range: no target line, no trend verdict.
 */
export function Sparkline({ values, refRange, flag, width = 76, height = 30 }: { values: number[]; refRange: string | null; flag: EntityFlag | null; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const range = parseRange(refRange);
  const lo = Math.min(...values, range?.low ?? Infinity);
  const hi = Math.max(...values, range?.high ?? -Infinity);
  const span = hi - lo || 1;
  const pad = 4;
  const y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values[values.length - 1] as number;
  const band = range && range.low !== null && range.high !== null ? { top: y(range.high), bottom: y(range.low) } : null;

  return (
    <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {band ? <Rect x={0} y={band.top} width={width} height={Math.max(2, band.bottom - band.top)} rx={4} fill="rgba(35,175,95,0.12)" /> : null}
      <Polyline points={pts} fill="none" stroke={brand[400]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(values.length - 1)} cy={y(last)} r={3.5} fill={flag ? FLAG_DOT[flag] : brand[600]} stroke="#fff" strokeWidth={1.5} />
    </Svg>
  );
}

export function SectionHead({ title, right, note }: { title: string; right?: React.ReactNode; note?: string }) {
  return (
    <View style={{ marginTop: 26, marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, color: ink[900] }}>
          {title}
        </Text>
        {right}
      </View>
      {note ? <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: ink[500], marginTop: 2 }}>{note}</Text> : null}
    </View>
  );
}
