import { addDays, lastDays } from "./days";
import type { DaySummary, MetricKey } from "./types";

/*
 * What the numbers say, in plain words. Pure functions: no clock, no storage,
 * no network, so every line the person or the model reads is tested.
 *
 * THE RULE: describe, never diagnose. "Your resting heart rate has run higher
 * than your usual this week" is a fact about their own numbers. What it means
 * is for Cheeku's answer, read against the rest of their record, or for a
 * doctor. Nothing here names a condition or tells anyone to change a medicine.
 */

export type MetricMeta = {
  key: MetricKey;
  label: string;
  /** Short unit shown after the number. */
  unit: string;
  /** Which way is the healthy direction, when there is one. */
  better: "up" | "down" | null;
  /** A total for the day (steps) or a reading (heart rate). Decides how a week is summed up. */
  kind: "total" | "reading";
  pick: (d: DaySummary) => number | null;
  format: (v: number) => string;
};

export function hoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const whole = (v: number) => Math.round(v).toLocaleString("en-IN");
const oneDp = (v: number) => (Math.round(v * 10) / 10).toLocaleString("en-IN");

export const METRICS: Record<MetricKey, MetricMeta> = {
  steps: { key: "steps", label: "Steps", unit: "steps", better: "up", kind: "total", pick: (d) => d.steps, format: whole },
  sleep: { key: "sleep", label: "Sleep", unit: "", better: "up", kind: "total", pick: (d) => d.sleepMinutes, format: hoursMinutes },
  restingHr: { key: "restingHr", label: "Resting heart rate", unit: "bpm", better: "down", kind: "reading", pick: (d) => d.restingHr, format: whole },
  activeKcal: { key: "activeKcal", label: "Active energy", unit: "kcal", better: "up", kind: "total", pick: (d) => d.activeKcal, format: whole },
  distance: { key: "distance", label: "Distance", unit: "km", better: "up", kind: "total", pick: (d) => d.distanceKm, format: oneDp },
  hrv: { key: "hrv", label: "Heart rate variability", unit: "ms", better: "up", kind: "reading", pick: (d) => d.hrvMs, format: whole },
  spo2: { key: "spo2", label: "Blood oxygen", unit: "%", better: null, kind: "reading", pick: (d) => d.spo2, format: whole },
  weight: { key: "weight", label: "Weight", unit: "kg", better: null, kind: "reading", pick: (d) => d.weightKg, format: oneDp },
  bp: { key: "bp", label: "Blood pressure", unit: "mmHg", better: null, kind: "reading", pick: (d) => d.systolic, format: whole },
  glucose: { key: "glucose", label: "Blood sugar", unit: "mg/dL", better: null, kind: "reading", pick: (d) => d.glucoseMgDl, format: whole },
};

export const METRIC_ORDER: readonly MetricKey[] = ["steps", "sleep", "restingHr", "activeKcal", "distance", "hrv", "spo2", "weight", "bp", "glucose"];

export function isMetricKey(v: unknown): v is MetricKey {
  return typeof v === "string" && v in METRICS;
}

export function average(values: readonly (number | null)[]): number | null {
  const real = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return real.length ? real.reduce((a, b) => a + b, 0) / real.length : null;
}

/** One value per day for the last `n` days ending `today`, null where nothing was measured. */
export function series(days: readonly DaySummary[], key: MetricKey, today: string, n: number): { day: string; value: number | null }[] {
  const byDay = new Map(days.map((d) => [d.day, d]));
  return lastDays(n, today).map((day) => {
    const d = byDay.get(day);
    return { day, value: d ? METRICS[key].pick(d) : null };
  });
}

/** The most recent day that has this measure, looking back at most `within` days. */
export function latest(days: readonly DaySummary[], key: MetricKey, today: string, within = 7): { day: string; value: number } | null {
  const s = series(days, key, today, within);
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i];
    if (p && p.value !== null) return { day: p.day, value: p.value };
  }
  return null;
}

export type Trend = {
  /** Average of the last seven days that have a value. */
  now: number | null;
  /** Average of the seven days before those. */
  before: number | null;
  /** now minus before, when both exist. */
  delta: number | null;
  /** Days in the last seven that carry a value. */
  daysWithData: number;
};

export function trend(days: readonly DaySummary[], key: MetricKey, today: string): Trend {
  const recent = series(days, key, today, 7).map((p) => p.value);
  const earlier = series(days, key, addDays(today, -7), 7).map((p) => p.value);
  const now = average(recent);
  const before = average(earlier);
  return { now, before, delta: now !== null && before !== null ? now - before : null, daysWithData: recent.filter((v) => v !== null).length };
}

/** "up 600 on last week", "down 20m on last week", or null when there is nothing honest to say. */
export function trendLine(key: MetricKey, t: Trend): string | null {
  if (t.delta === null || t.now === null || t.daysWithData < 3) return null;
  const meta = METRICS[key];
  const size = Math.abs(t.delta);
  // Smaller than this is noise, not a change.
  const floor: Record<MetricKey, number> = { steps: 400, sleep: 15, restingHr: 2, activeKcal: 40, distance: 0.4, hrv: 4, spo2: 1, weight: 0.4, bp: 4, glucose: 6 };
  if (size < floor[key]) return "steady on last week";
  const amount = key === "sleep" ? hoursMinutes(size) : `${meta.format(size)}${meta.unit && key !== "steps" ? ` ${meta.unit}` : ""}`;
  return `${t.delta > 0 ? "up" : "down"} ${amount} on last week`;
}

export type Tone = "good" | "watch" | "plain";

export function trendTone(key: MetricKey, t: Trend): Tone {
  const line = trendLine(key, t);
  const better = METRICS[key].better;
  if (!line || line.startsWith("steady") || t.delta === null || !better) return "plain";
  return (t.delta > 0) === (better === "up") ? "good" : "watch";
}

export type SnapshotTile = {
  key: MetricKey;
  label: string;
  /** The big number, already formatted, or "–" when there is none. */
  value: string;
  unit: string;
  /** A short line under it. */
  line: string;
  tone: Tone;
  /** Seven values for the small bars, oldest first, 0..1 of the week's largest; null where missing. */
  bars: (number | null)[];
  /** 0..1 progress towards a goal, for the steps ring. */
  progress: number | null;
};

function bars(days: readonly DaySummary[], key: MetricKey, today: string): (number | null)[] {
  const s = series(days, key, today, 7).map((p) => p.value);
  const max = Math.max(1, ...s.filter((v): v is number => v !== null));
  // Readings sit in a narrow band; draw them from a floor so the shape shows.
  const min = METRICS[key].kind === "reading" ? Math.min(...s.filter((v): v is number => v !== null), max) * 0.85 : 0;
  return s.map((v) => (v === null ? null : Math.max(0.08, (v - min) / Math.max(1, max - min))));
}

export type Snapshot = {
  tiles: SnapshotTile[];
  /** One sentence worth reading first, or null on a quiet day. */
  headline: string | null;
  /** False when the last fortnight is empty. */
  hasData: boolean;
};

export function snapshot(days: readonly DaySummary[], today: string, stepsGoal: number): Snapshot {
  const hasData = days.some((d) => d.day > addDays(today, -14));
  const todayRow = days.find((d) => d.day === today);

  const stepsNow = todayRow?.steps ?? null;
  const stepsTrend = trend(days, "steps", today);
  const left = stepsNow !== null ? Math.max(0, stepsGoal - stepsNow) : null;
  const stepsTile: SnapshotTile = {
    key: "steps",
    label: "Steps today",
    value: stepsNow !== null ? METRICS.steps.format(stepsNow) : "–",
    unit: "",
    line: stepsNow === null ? "Nothing counted yet" : left === 0 ? "Goal reached" : `${METRICS.steps.format(left ?? 0)} to go`,
    tone: stepsNow !== null && left === 0 ? "good" : "plain",
    bars: bars(days, "steps", today),
    progress: stepsNow !== null && stepsGoal > 0 ? Math.min(1, stepsNow / stepsGoal) : null,
  };

  const night = latest(days, "sleep", today, 2);
  const sleepTrend = trend(days, "sleep", today);
  const sleepTile: SnapshotTile = {
    key: "sleep",
    label: "Sleep",
    value: night ? hoursMinutes(night.value) : "–",
    unit: "",
    line: night ? (night.day === today ? "Last night" : "Night before") : "No night recorded",
    tone: night && night.value < 360 ? "watch" : "plain",
    bars: bars(days, "sleep", today),
    progress: null,
  };

  const rhr = latest(days, "restingHr", today, 3);
  const rhrTrend = trend(days, "restingHr", today);
  const rhrLine = trendLine("restingHr", rhrTrend);
  const rhrTile: SnapshotTile = {
    key: "restingHr",
    label: "Resting heart",
    value: rhr ? METRICS.restingHr.format(rhr.value) : "–",
    unit: rhr ? "bpm" : "",
    line: rhr ? (rhrLine ? cap(rhrLine.replace(" on last week", "")) : "At rest") : "No reading yet",
    tone: trendTone("restingHr", rhrTrend),
    bars: bars(days, "restingHr", today),
    progress: null,
  };

  return { tiles: [stepsTile, sleepTile, rhrTile], headline: headline(stepsTrend, sleepTrend, rhrTrend), hasData };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The one thing most worth saying, picked in a fixed order so it is predictable. */
function headline(steps: Trend, sleep: Trend, rhr: Trend): string | null {
  if (rhr.delta !== null && rhr.delta >= 5 && rhr.daysWithData >= 3) return "Your resting heart rate is running higher than your usual this week.";
  if (sleep.now !== null && sleep.now < 360 && sleep.daysWithData >= 3) return `You've averaged ${hoursMinutes(sleep.now)} of sleep this week.`;
  if (sleep.delta !== null && sleep.delta <= -40 && sleep.daysWithData >= 3) return `Sleep is down ${hoursMinutes(Math.abs(sleep.delta))} a night on last week.`;
  if (steps.delta !== null && steps.delta >= 1000 && steps.daysWithData >= 3) return `You're walking ${METRICS.steps.format(steps.delta)} more steps a day than last week.`;
  if (steps.delta !== null && steps.delta <= -1500 && steps.daysWithData >= 3) return `Steps are down ${METRICS.steps.format(Math.abs(steps.delta))} a day on last week.`;
  return null;
}

/**
 * What Cheeku is told before it answers. Dated, factual, the person's own
 * numbers, and nothing when there is nothing: an empty list, not a guess.
 */
export function chatNotes(days: readonly DaySummary[], today: string): string[] {
  const recent = days.filter((d) => d.day > addDays(today, -7) && d.day <= today);
  if (!recent.length) return [];
  const out: string[] = [];

  // Two short lines, not one long one: a line over 240 characters is cut before it reaches the model.
  const line = (keys: readonly MetricKey[]): string[] => {
    const parts: string[] = [];
    for (const key of keys) {
      const t = trend(days, key, today);
      if (t.now === null || t.daysWithData < 2) continue;
      const meta = METRICS[key];
      const value = `${meta.format(t.now)}${meta.unit && key !== "steps" ? ` ${meta.unit}` : ""}`;
      const change = trendLine(key, t);
      const name = key === "steps" ? "steps a day" : key === "sleep" ? "sleep a night" : meta.label.toLowerCase();
      parts.push(key === "steps" || key === "sleep" ? `${value} ${name}${change ? ` (${change})` : ""}` : `${name} ${value}${change ? ` (${change})` : ""}`);
    }
    return parts;
  };
  const activity = line(["steps", "activeKcal"]);
  if (activity.length) out.push(`From their watch or phone, 7-day average: ${activity.join("; ")}.`);
  const recovery = line(["sleep", "restingHr", "hrv"]);
  if (recovery.length) out.push(`From their watch or phone, 7-day average: ${recovery.join("; ")}.`);

  const todayRow = days.find((d) => d.day === today);
  if (todayRow && (todayRow.steps !== null || todayRow.sleepMinutes !== null)) {
    const bits = [todayRow.steps !== null ? `${METRICS.steps.format(todayRow.steps)} steps so far` : null, todayRow.sleepMinutes !== null ? `${hoursMinutes(todayRow.sleepMinutes)} of sleep last night` : null].filter(Boolean);
    out.push(`Today (${today}): ${bits.join(", ")}.`);
  }

  const readings: string[] = [];
  for (const key of ["weight", "spo2", "glucose"] as const) {
    const l = latest(days, key, today, 14);
    if (l) readings.push(`${METRICS[key].label.toLowerCase()} ${METRICS[key].format(l.value)} ${METRICS[key].unit} on ${l.day}`);
  }
  const bp = [...days].reverse().find((d) => d.systolic !== null && d.diastolic !== null && d.day > addDays(today, -14));
  if (bp) readings.push(`blood pressure ${bp.systolic}/${bp.diastolic} mmHg on ${bp.day}`);
  if (readings.length) out.push(`Latest device readings: ${readings.join("; ")}. These are from a consumer device, not a lab.`);

  const sessions = recent.flatMap((d) => d.workouts);
  if (sessions.length) {
    const minutes = sessions.reduce((a, w) => a + w.minutes, 0);
    const kinds = [...new Set(sessions.map((w) => w.type.toLowerCase()))].slice(0, 4).join(", ");
    out.push(`Workouts in the last 7 days: ${sessions.length} (${kinds}), ${Math.round(minutes)} minutes in all.`);
  }
  return out;
}

/** A plain sentence for a metric's own page. */
export function explain(key: MetricKey): string {
  const lines: Record<MetricKey, string> = {
    steps: "Every step your phone or watch counted in the day.",
    sleep: "Time asleep in the night that ended that morning. Time lying awake is not counted.",
    restingHr: "Your heart rate when you are still and relaxed. It tends to fall as you get fitter, and rise with poor sleep, illness or stress.",
    activeKcal: "Energy you burned by moving, on top of what your body uses at rest.",
    distance: "How far you walked or ran in the day.",
    hrv: "The small variation between heartbeats. Your own trend matters more than the number.",
    spo2: "How much oxygen your blood is carrying, as your watch estimates it. A watch reading is a guide, not a medical test.",
    weight: "Readings from a connected scale or ones you logged in your health app.",
    bp: "Readings from a connected cuff or ones you logged in your health app.",
    glucose: "Readings from a connected meter or sensor, averaged for the day.",
  };
  return lines[key];
}
