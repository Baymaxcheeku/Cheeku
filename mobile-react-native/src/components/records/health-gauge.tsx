import { Text, View } from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";

import { SEVERITY_LABEL, type Severity } from "@/lib/records/types";
import { ink, semantic, surface } from "@/theme/tokens";

/*
 * The semicircular gauge on D2.
 *
 * Geometry notes carried over from web, because the first version looked
 * subtly wrong:
 *
 *  - The arc spans a true 0°–180°, so its two ends land exactly on the
 *    horizontal through the pivot. Sweeping 2°–178° instead left the endpoints
 *    ~2px above the pivot, which read as the needle hanging below the dial.
 *  - The viewBox is sized to the drawn bounds. A taller box put dead space
 *    under the dial and pushed it visually away from its own legend.
 *  - The needle stops short of the band and is tapered rather than a bare
 *    line. Drawn to the arc's own radius it pierced the colour, which reads as
 *    a rendering glitch rather than a pointer.
 *
 * It is DECORATIVE. The same status is stated in words beside it, which is what
 * a screen reader — or anyone who cannot separate the three hues — actually
 * gets. The colours here are the semantic three, and this is a legitimate use:
 * the gauge is reporting health severity, which is the only thing they mean.
 */

const CX = 60;
const CY = 58;
const R = 46;
const STROKE = 12;

/** Tip stops inside the band's inner edge. */
const NEEDLE_LEN = R - STROKE / 2 - 7;
/** Half-width of the needle where it meets the pivot. */
const NEEDLE_BASE = 3.4;

const VIEW_W = 120;
/** Pivot plus its cap is the lowest ink; nothing below it needs room. */
const VIEW_H = CY + 8;

function point(deg: number, r: number) {
  const rad = (Math.PI * (180 - deg)) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

function arc(fromDeg: number, toDeg: number) {
  const a = point(fromDeg, R);
  const b = point(toDeg, R);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/*
 * The three bands, inset a few degrees from 0/180 so the round caps do not
 * spill below the baseline, with a gap between each.
 *
 * PORT NOTE: web used `var(--safe)` etc. react-native-svg takes no CSS
 * variables, so these are the token values.
 */
const BANDS: readonly { from: number; to: number; stroke: string }[] = [
  { from: 5, to: 57, stroke: semantic.safe },
  { from: 63, to: 117, stroke: semantic.caution },
  { from: 123, to: 175, stroke: semantic.danger },
];

/*
 * Where the needle sits per severity: the middle of the matching band. The
 * gauge has no numeric scale behind it — THERE IS NO HEALTH SCORE — so it
 * points at a band rather than implying a measured position.
 */
const NEEDLE_DEG: Record<Severity, number> = {
  normal: 31,
  borderline: 90,
  high_risk: 149,
};

export function HealthGauge({ severity, width = 118 }: { severity: Severity; width?: number }) {
  const deg = NEEDLE_DEG[severity];
  const tip = point(deg, NEEDLE_LEN);

  // The base sits perpendicular to the needle, so the taper stays symmetrical
  // at every angle.
  const rad = (Math.PI * (180 - deg)) / 180;
  const nx = Math.cos(rad);
  const ny = -Math.sin(rad);
  const left = { x: CX - ny * NEEDLE_BASE, y: CY + nx * NEEDLE_BASE };
  const right = { x: CX + ny * NEEDLE_BASE, y: CY - nx * NEEDLE_BASE };

  /*
   * `aria-hidden`, not the platform-specific pair.
   *
   * `accessibilityElementsHidden` (iOS) and `importantForAccessibility`
   * (Android) are not implemented by react-native-web, so both were forwarded
   * to the DOM as invalid attributes and React logged an error for each on
   * every render. `aria-hidden` is the cross-platform prop: RN maps it to the
   * right one per platform, and on web it is already the correct attribute.
   */
  return (
    <View aria-hidden>
    <Svg
      width={width}
      height={(width * VIEW_H) / VIEW_W}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
    >
      {BANDS.map((band) => (
        <Path
          key={band.stroke}
          d={arc(band.from, band.to)}
          stroke={band.stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
      ))}

      <Polygon
        points={`${left.x.toFixed(2)},${left.y.toFixed(2)} ${tip.x.toFixed(2)},${tip.y.toFixed(2)} ${right.x.toFixed(2)},${right.y.toFixed(2)}`}
        fill={ink[900]}
      />
      <Circle cx={CX} cy={CY} r={5.5} fill={ink[900]} />
      <Circle cx={CX} cy={CY} r={2} fill={surface.base} />
    </Svg>
    </View>
  );
}

const LEGEND: readonly { severity: Severity; label: string; dot: string }[] = [
  { severity: "normal", label: SEVERITY_LABEL.normal, dot: semantic.safe },
  { severity: "borderline", label: SEVERITY_LABEL.borderline, dot: semantic.caution },
  { severity: "high_risk", label: SEVERITY_LABEL.high_risk, dot: semantic.attention },
];

/*
 * Wraps rather than forcing its column wider. The legend is small print
 * explaining the bands; letting it dictate the card's column widths is what
 * pushed the status word itself onto two lines.
 */
export function GaugeLegend({ severity }: { severity: Severity }) {
  return (
    <View className="mt-1.5 flex-row flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
      {LEGEND.map((item) => {
        const on = item.severity === severity;
        return (
          <View key={item.severity} className="flex-row items-center gap-1">
            <View
              className="h-1.5 w-1.5 rounded-pill"
              style={{ backgroundColor: item.dot }}
            />
            <Text
              className="text-[9px] leading-tight"
              style={{ color: on ? ink[900] : ink[500], fontWeight: on ? "600" : "400" }}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
