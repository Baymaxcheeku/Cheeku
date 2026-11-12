import { startOfDay } from "../days";
import { emptyDay, type DaySummary, type SourceAdapter, type Workout } from "../types";

/*
 * Sample data, for looking at the feature where no health store exists: Expo
 * Go and the web preview. Always labelled "Sample data" on screen, never
 * synced to the server, never written into the plan, never told to Cheeku.
 *
 * The numbers are made from the date alone, so the same day always shows the
 * same values and a screenshot taken twice matches.
 */

/** A steady 0..1 from a string: same input, same output. */
function unit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function demoDay(day: string, today: string): DaySummary {
  const d = emptyDay(day);
  const date = startOfDay(day);
  const weekday = date.getDay();
  const weekend = weekday === 0 || weekday === 6;
  const r = (k: string) => unit(`${day}:${k}`);

  // A realistic working week: quieter Mondays, a long walk on Sunday, a short night midweek.
  let steps = 5200 + Math.round(r("steps") * 3600) + (weekend ? 1800 : 0) - (weekday === 1 ? 900 : 0);
  if (day === today) {
    const now = new Date();
    // Today is still in progress: scale by how much of the waking day has gone.
    steps = Math.round(steps * Math.min(1, Math.max(0.12, (now.getHours() - 6) / 15)));
  }
  d.steps = steps;
  d.distanceKm = Math.round(steps * 0.00072 * 10) / 10;
  d.activeKcal = Math.round(steps * 0.045 + r("kcal") * 60);
  d.sleepMinutes = Math.round(372 + r("sleep") * 84 - (weekday === 3 ? 58 : 0) + (weekend ? 34 : 0));
  d.restingHr = Math.round(63 + r("rhr") * 5 + (weekday === 4 ? 3 : 0));
  d.hrvMs = Math.round(46 + r("hrv") * 16 - (weekday === 4 ? 6 : 0));
  d.spo2 = 96 + Math.round(r("o2") * 2);
  if (weekday === 1) d.weightKg = Math.round((78.4 - r("kg") * 0.8) * 10) / 10;
  if (weekday === 2 || weekday === 5) {
    d.systolic = 124 + Math.round(r("sys") * 8);
    d.diastolic = 80 + Math.round(r("dia") * 6);
  }

  const workouts: Workout[] = [];
  const at = (h: number, m: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).toISOString();
  if (weekday === 2 || weekday === 4) workouts.push({ type: "Walk", minutes: 32 + Math.round(r("w") * 10), kcal: 150 + Math.round(r("wk") * 40), km: 2.6, startedAt: at(7, 10), app: "Apple Watch" });
  if (weekday === 6) workouts.push({ type: "Run", minutes: 28, kcal: 290, km: 4.1, startedAt: at(6, 45), app: "Strava" });
  if (weekday === 0) workouts.push({ type: "Yoga", minutes: 40, kcal: 120, km: null, startedAt: at(8, 0), app: "Apple Watch" });
  // Nothing has happened yet on a day that has not reached that hour.
  d.workouts = day === today ? workouts.filter((w) => Date.parse(w.startedAt) < Date.now()) : workouts;
  d.sources = ["demo"];
  return d;
}

export const demo: SourceAdapter = {
  id: "demo",
  availability: async () => ({ state: "ready" }),
  connect: async () => ({ ok: true }),
  read: async (days) => {
    const today = days[days.length - 1] ?? "";
    return days.map((day) => demoDay(day, today));
  },
  disconnect: async () => {},
};
