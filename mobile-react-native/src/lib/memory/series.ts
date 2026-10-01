import { shortDate } from "@/lib/records/details";

import { daysBetween } from "./clock";
import { analyteKey } from "./thresholds";

/*
 * TREND OVER SNAPSHOT.
 *
 * No single reading is read alone. A blood pressure of 99/64 means little as a
 * number; as a 33-point drop from a 132 baseline it raises a different
 * question (a new medicine? not drinking enough?). A newborn going from 3.5 to
 * 3.3 kg is read against "most babies turn the corner by day 4 or 5", not
 * against a table.
 *
 * So every numeric store carries previous, delta, direction and rate, and the
 * baseline it is being compared with, and the reasoning quotes the delta.
 */

export type SeriesPoint = {
  date: string;
  value: number;
  /** Where it came from: a record, or something said in the chat. */
  source: "record" | "chat" | "device";
  documentId: string | null;
  factId: string | null;
  refRange: string | null;
  flag: string | null;
};

export type Series = {
  key: string;
  name: string;
  unit: string | null;
  points: SeriesPoint[];
  latest: SeriesPoint;
  previous: SeriesPoint | null;
  delta: number | null;
  direction: "up" | "down" | "same" | null;
  /** Change per day between the last two readings. */
  ratePerDay: number | null;
  /** The mean of up to three readings before the latest. */
  baseline: number | null;
  fromBaseline: number | null;
  /** Percent change from the first reading, for weight in particular. */
  pctFromFirst: number | null;
};

const round = (n: number, dp = 2) => Number(n.toFixed(dp));

export function buildSeries(key: string, name: string, unit: string | null, raw: readonly SeriesPoint[]): Series | null {
  // One reading per date and source; a chat reading never overrides a record's
  // on the same day (see contradictions in corrections.ts).
  const points = [...raw].filter((p) => Number.isFinite(p.value) && p.date).sort((a, b) => a.date.localeCompare(b.date) || rankSource(a) - rankSource(b));
  const latest = points[points.length - 1];
  if (!latest) return null;
  const previous = points.length > 1 ? (points[points.length - 2] ?? null) : null;
  const delta = previous ? round(latest.value - previous.value) : null;
  const span = previous ? daysBetween(previous.date, latest.date) : 0;
  const before = points.slice(Math.max(0, points.length - 4), points.length - 1);
  const baseline = before.length ? round(before.reduce((s, p) => s + p.value, 0) / before.length, 1) : null;
  const first = points[0];
  return {
    key,
    name,
    unit,
    points,
    latest,
    previous,
    delta,
    direction: delta === null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "same",
    ratePerDay: delta !== null && span > 0 ? round(delta / span, 3) : null,
    baseline,
    fromBaseline: baseline !== null ? round(latest.value - baseline, 1) : null,
    pctFromFirst: first && first !== latest && first.value ? round(((latest.value - first.value) / first.value) * 100, 1) : null,
  };
}

const rankSource = (p: SeriesPoint) => (p.source === "record" ? 1 : 0);

type EntityRow = Record<string, unknown>;
type FactRow = { id: string; key: string; label: string; value: number | null; unit: string | null; observedOn: string; source: "chat" | "device" | "record"; supersededBy: string | null };

/**
 * Every measurement as a series: lab values and vitals from records, and the
 * readings people typed into the chat. Superseded chat facts are left out; the
 * correction that replaced them is in.
 */
export function seriesFrom(entities: readonly EntityRow[], facts: readonly FactRow[] = []): Map<string, Series> {
  const groups = new Map<string, { name: string; unit: string | null; points: SeriesPoint[] }>();
  const add = (key: string, name: string, unit: string | null, p: SeriesPoint) => {
    const g = groups.get(key) ?? { name, unit, points: [] };
    g.points.push(p);
    groups.set(key, g);
  };

  for (const e of entities) {
    if (e.kind !== "lab_value" && e.kind !== "vital") continue;
    const value = typeof e.value === "number" ? e.value : typeof e.value === "string" ? Number(e.value) : NaN;
    const date = typeof e.event_date === "string" ? e.event_date.slice(0, 10) : null;
    if (!Number.isFinite(value) || !date) continue;
    const name = String(e.name ?? "");
    const key = analyteKey(name, (e.canonical_name as string | null) ?? null);
    add(key, name, (e.unit as string | null) ?? null, {
      date,
      value,
      source: "record",
      documentId: (e.document_id as string | null) ?? null,
      factId: null,
      refRange: (e.ref_range as string | null) ?? null,
      flag: (e.flag as string | null) ?? null,
    });
  }

  for (const f of facts) {
    if (f.supersededBy || f.value === null) continue;
    add(f.key, f.label, f.unit, { date: f.observedOn.slice(0, 10), value: f.value, source: f.source, documentId: null, factId: f.id, refRange: null, flag: null });
  }

  const out = new Map<string, Series>();
  for (const [key, g] of groups) {
    const s = buildSeries(key, g.name, g.unit, g.points);
    if (s) out.set(key, s);
  }
  return out;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(round(n, 1)));

/** "3.5 to 3.3 kg, down 0.2 (5.7%) in 3 days". The delta, said out loud. */
export function describeChange(s: Series): string | null {
  if (!s.previous || s.delta === null) return null;
  const unit = s.unit ? ` ${s.unit}` : "";
  if (s.direction === "same") return `${fmt(s.latest.value)}${unit}, unchanged since ${shortDate(s.previous.date).replace(/ \d{4}$/, "")}`;
  const days = daysBetween(s.previous.date, s.latest.date);
  const pct = s.previous.value ? Math.abs(round((s.delta / s.previous.value) * 100, 1)) : null;
  const when = days > 0 ? ` in ${days} day${days === 1 ? "" : "s"}` : "";
  return `${fmt(s.previous.value)} to ${fmt(s.latest.value)}${unit}, ${s.direction} ${fmt(Math.abs(s.delta))}${pct !== null && s.key === "weight" ? ` (${pct}%)` : ""}${when}`;
}

/*
 * When a change matters more than the number. Per measurement, because a
 * 20-point drop in systolic pressure and a 0.2 kg drop in a newborn are both
 * worth a question and nothing else is on the same scale.
 */
export type NotableChange = { key: string; text: string; kind: "drop" | "rise" | "weight_loss" | "not_regained" };

export function notableChanges(all: Map<string, Series>, stage: string, ageDays: number | null): NotableChange[] {
  const out: NotableChange[] = [];
  const sbp = all.get("bp_systolic");
  if (sbp && sbp.fromBaseline !== null && sbp.baseline !== null && Math.abs(sbp.fromBaseline) >= 20) {
    out.push({
      key: "bp_systolic",
      kind: sbp.fromBaseline < 0 ? "drop" : "rise",
      text: `Top blood pressure number is ${fmt(sbp.latest.value)}, a ${fmt(Math.abs(sbp.fromBaseline))}-point ${sbp.fromBaseline < 0 ? "drop" : "rise"} from the usual ${fmt(sbp.baseline)}.`,
    });
  }
  const w = all.get("weight");
  if (w && (stage === "neonate" || stage === "infant") && w.pctFromFirst !== null && w.points[0]) {
    const lost = -w.pctFromFirst;
    if (lost >= 10) {
      out.push({ key: "weight", kind: "weight_loss", text: `Weight is down ${fmt(lost)}% from ${fmt(w.points[0].value)} kg. More than 10% in the first days is the point most paediatricians want to know about.` });
    } else if (lost > 0 && ageDays !== null && ageDays >= 14) {
      out.push({ key: "weight", kind: "not_regained", text: `Still ${fmt(lost)}% under the first weight at two weeks. Most babies are back to it by now.` });
    }
  }
  return out;
}
