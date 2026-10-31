import { cn } from "@/lib/cn";
import type { Severity } from "@/lib/records/types";

/*
 * The semicircular gauge on D2.
 *
 * Geometry notes, because the first version looked subtly wrong:
 *
 *  - The arc spans a true 0°–180°, so its two ends land exactly on the
 *    horizontal through the pivot. Sweeping 2°–178° instead left the endpoints
 *    ~2px above the pivot, which read as the needle hanging below the dial.
 *  - The viewBox is sized to the drawn bounds. The old one was 72 tall for
 *    ~65px of content, and that 7px of dead space pushed the gauge visually up
 *    away from its own legend.
 *  - The needle stops short of the band and is tapered rather than a bare line,
 *    matching the frame. Drawn to the arc's own radius it pierced the colour,
 *    which reads as a rendering glitch rather than a pointer.
 *
 * It is decorative: the same status is stated in words beside it, which is what
 * a screen reader — or anyone who cannot separate the three hues — actually
 * gets.
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
/** Pivot + its cap is the lowest ink; nothing below it needs room. */
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
 */
const BANDS: readonly { from: number; to: number; stroke: string }[] = [
  { from: 5, to: 57, stroke: "var(--safe)" },
  { from: 63, to: 117, stroke: "var(--caution)" },
  { from: 123, to: 175, stroke: "var(--danger)" },
];

/*
 * Where the needle sits per severity: the middle of the matching band. The
 * gauge has no numeric scale behind it — there is no health score — so it
 * points at a band rather than implying a measured position.
 */
const NEEDLE_DEG: Record<Severity, number> = {
  normal: 31,
  borderline: 90,
  high_risk: 149,
};

export function HealthGauge({ severity }: { severity: Severity }) {
  const deg = NEEDLE_DEG[severity];
  const tip = point(deg, NEEDLE_LEN);

  // The base sits perpendicular to the needle, so the taper stays symmetrical
  // at every angle.
  const rad = (Math.PI * (180 - deg)) / 180;
  const nx = Math.cos(rad);
  const ny = -Math.sin(rad);
  const left = { x: CX - ny * NEEDLE_BASE, y: CY + nx * NEEDLE_BASE };
  const right = { x: CX + ny * NEEDLE_BASE, y: CY - nx * NEEDLE_BASE };

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-auto w-full max-w-[118px]"
      role="presentation"
      aria-hidden
    >
      {BANDS.map((band) => (
        <path
          key={band.stroke}
          d={arc(band.from, band.to)}
          stroke={band.stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
      ))}

      <polygon
        points={`${left.x.toFixed(2)},${left.y.toFixed(2)} ${tip.x.toFixed(2)},${tip.y.toFixed(2)} ${right.x.toFixed(2)},${right.y.toFixed(2)}`}
        fill="var(--ink-900)"
      />
      <circle cx={CX} cy={CY} r={5.5} fill="var(--ink-900)" />
      <circle cx={CX} cy={CY} r={2} fill="var(--surface)" />
    </svg>
  );
}

const LEGEND: readonly { severity: Severity; label: string; dot: string }[] = [
  { severity: "normal", label: "Good", dot: "bg-safe" },
  { severity: "borderline", label: "Needs attention", dot: "bg-caution" },
  { severity: "high_risk", label: "High risk", dot: "bg-danger" },
];

/*
 * Wraps rather than forcing its column wider. The legend is small print
 * explaining the bands; letting it dictate the card's column widths is what
 * pushed the status word itself onto two lines.
 */
export function GaugeLegend({ severity }: { severity: Severity }) {
  return (
    <ul className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
      {LEGEND.map((item) => (
        <li
          key={item.severity}
          className={cn(
            "flex items-center gap-1 text-[9px] leading-tight",
            item.severity === severity ? "font-semibold text-ink-900" : "text-ink-500",
          )}
        >
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-pill", item.dot)} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
