import { cn } from "@/lib/cn";
import type { Severity } from "@/lib/records/types";

/*
 * The semicircular gauge on D2.
 *
 * Three fixed arcs with a needle, drawn as SVG rather than assembled from
 * rotated divs so it scales cleanly and stays one element for a screen reader
 * to skip. It is decorative — the same status is stated in words immediately
 * beside it, which is what anyone using a screen reader or unable to
 * distinguish the colours actually gets.
 */

const R = 52;
const CX = 60;
const CY = 60;
const STROKE = 13;

/** Point on the gauge circle at `deg`, measured from the left of the arc. */
function point(deg: number) {
  const rad = (Math.PI * (180 - deg)) / 180;
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) };
}

function arc(fromDeg: number, toDeg: number) {
  const a = point(fromDeg);
  const b = point(toDeg);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/*
 * Where the needle sits per severity. The gauge has no numeric scale — there is
 * no "health score" behind it — so the needle points at the middle of the band
 * that matches the document's status rather than implying a measured position.
 */
const NEEDLE_DEG: Record<Severity, number> = {
  normal: 30,
  borderline: 90,
  high_risk: 150,
};

export function HealthGauge({ severity }: { severity: Severity }) {
  const deg = NEEDLE_DEG[severity];
  const tip = point(deg);

  return (
    <svg viewBox="0 0 120 72" className="h-[72px] w-[120px]" role="presentation" aria-hidden>
      <path d={arc(2, 58)} stroke="var(--safe)" strokeWidth={STROKE} fill="none" strokeLinecap="round" />
      <path d={arc(62, 118)} stroke="var(--caution)" strokeWidth={STROKE} fill="none" strokeLinecap="round" />
      <path d={arc(122, 178)} stroke="var(--danger)" strokeWidth={STROKE} fill="none" strokeLinecap="round" />

      <line
        x1={CX}
        y1={CY}
        x2={tip.x}
        y2={tip.y}
        stroke="var(--ink-900)"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r={5} fill="var(--ink-900)" />
    </svg>
  );
}

const LEGEND: readonly { severity: Severity; label: string; dot: string }[] = [
  { severity: "normal", label: "Good", dot: "bg-safe" },
  { severity: "borderline", label: "Needs attention", dot: "bg-caution" },
  { severity: "high_risk", label: "High risk", dot: "bg-danger" },
];

export function GaugeLegend({ severity }: { severity: Severity }) {
  return (
    <ul className="mt-2 flex items-center justify-center gap-2.5">
      {LEGEND.map((item) => (
        <li
          key={item.severity}
          className={cn(
            "flex items-center gap-1 text-[10px]",
            item.severity === severity ? "font-semibold text-ink-900" : "text-ink-500",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-pill", item.dot)} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
