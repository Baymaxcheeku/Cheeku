// Turns Google Health daily roll-ups into Cheeku's day summaries.
//
// Kept apart from index.ts so it can be tested without Deno. Google's
// response field names are read defensively: a roll-up point carries its
// civil start date and one value object named after the data type. If a
// field is missing the day simply has no value for it.

export type Point = Record<string, unknown>;

export type Day = {
  day: string;
  steps: number | null;
  distanceKm: number | null;
  activeKcal: number | null;
  sleepMinutes: number | null;
  restingHr: number | null;
  hrvMs: number | null;
  spo2: number | null;
  weightKg: number | null;
  systolic: number | null;
  diastolic: number | null;
  glucoseMgDl: number | null;
  workouts: never[];
  sources: string[];
};

function dayOf(p: Point): string | null {
  const start = (p.civilStartTime ?? p.startTime ?? p.interval) as Record<string, unknown> | string | undefined;
  if (typeof start === "string") return /^\d{4}-\d{2}-\d{2}/.test(start) ? start.slice(0, 10) : null;
  const date = (start?.date ?? (start as Record<string, unknown> | undefined)?.start) as { year?: number; month?: number; day?: number } | undefined;
  if (!date?.year || !date.month || !date.day) return null;
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/** First finite number found under any of the given keys, one level deep. */
function pick(p: Point, keys: readonly string[]): number | null {
  for (const value of Object.values(p)) {
    if (!value || typeof value !== "object") continue;
    for (const k of keys) {
      const raw = (value as Record<string, unknown>)[k];
      const n = typeof raw === "string" ? Number(raw) : raw;
      if (typeof n === "number" && Number.isFinite(n)) return n;
    }
  }
  return null;
}

const READ: Record<string, (p: Point, d: Day) => void> = {
  steps: (p, d) => {
    const v = pick(p, ["countSum", "count", "value"]);
    if (v !== null) d.steps = Math.round(v);
  },
  distance: (p, d) => {
    const mm = pick(p, ["millimetersSum", "distanceMillimetersSum"]);
    const m = mm !== null ? mm / 1000 : pick(p, ["metersSum", "meters"]);
    if (m !== null) d.distanceKm = Math.round(m / 10) / 100;
  },
  "total-calories": (p, d) => {
    const v = pick(p, ["kcalSum", "caloriesSum", "kcal"]);
    if (v !== null) d.activeKcal = Math.round(v);
  },
  sleep: (p, d) => {
    const v = pick(p, ["minutesAsleepSum", "minutesAsleep", "durationMinutesSum"]);
    if (v !== null) d.sleepMinutes = Math.round(v);
  },
  "daily-resting-heart-rate": (p, d) => {
    const v = pick(p, ["beatsPerMinute", "beatsPerMinuteAvg", "value"]);
    if (v !== null) d.restingHr = Math.round(v);
  },
  "daily-heart-rate-variability": (p, d) => {
    const v = pick(p, ["rmssdMillisecondsAvg", "averageHeartRateVariabilityMilliseconds", "milliseconds", "value"]);
    if (v !== null) d.hrvMs = Math.round(v);
  },
  weight: (p, d) => {
    const g = pick(p, ["weightGramsAvg", "gramsAvg", "grams"]);
    const kg = g !== null ? g / 1000 : pick(p, ["kilogramsAvg", "kilograms"]);
    if (kg !== null) d.weightKg = Math.round(kg * 10) / 10;
  },
};

function blank(day: string): Day {
  return {
    day, steps: null, distanceKm: null, activeKcal: null, sleepMinutes: null, restingHr: null, hrvMs: null,
    spo2: null, weightKg: null, systolic: null, diastolic: null, glucoseMgDl: null, workouts: [], sources: ["google_health"],
  };
}

export function toDays(byType: Record<string, Point[]>, from: string, to: string): Day[] {
  const days = new Map<string, Day>();
  for (const [type, points] of Object.entries(byType)) {
    const read = READ[type];
    if (!read) continue;
    for (const p of points) {
      const day = dayOf(p);
      if (!day || day < from || day > to) continue;
      const d = days.get(day) ?? blank(day);
      read(p, d);
      days.set(day, d);
    }
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}
