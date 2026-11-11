import { emptyDay, type DaySummary, type SourceId, type Workout } from "./types";

/*
 * Several sources can describe the same day: the phone counts steps, the
 * watch counts them too, and Google's cloud has a third copy. Adding them up
 * would double a walk.
 *
 * So one number per measure per day, chosen like this:
 *   - totals that only grow (steps, distance, active energy): the LARGEST.
 *     A source that saw less of the day is behind, not different.
 *   - a night's sleep: the largest too, for the same reason.
 *   - a reading (resting heart rate, HRV, oxygen, weight, pressure, sugar):
 *     the first source in priority order that has one. The phone's own health
 *     store comes first because it already reconciles the person's devices.
 */

const PRIORITY: readonly SourceId[] = ["apple_health", "health_connect", "google_health", "strava", "demo"];

function rank(source: SourceId): number {
  const i = PRIORITY.indexOf(source);
  return i < 0 ? PRIORITY.length : i;
}

function largest(values: readonly (number | null)[]): number | null {
  const real = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return real.length ? Math.max(...real) : null;
}

function first(values: readonly (number | null)[]): number | null {
  return values.find((v): v is number => v !== null && Number.isFinite(v)) ?? null;
}

/** Two entries are the same workout when they start within ten minutes and are the same kind. */
function sameWorkout(a: Workout, b: Workout): boolean {
  return a.type === b.type && Math.abs(Date.parse(a.startedAt) - Date.parse(b.startedAt)) < 10 * 60 * 1000;
}

export function mergeDays(lists: readonly (readonly DaySummary[])[]): DaySummary[] {
  const byDay = new Map<string, DaySummary[]>();
  for (const list of lists) {
    for (const d of list) byDay.set(d.day, [...(byDay.get(d.day) ?? []), d]);
  }

  const out: DaySummary[] = [];
  for (const [day, copies] of byDay) {
    const ordered = [...copies].sort((a, b) => rank(a.sources[0] ?? "demo") - rank(b.sources[0] ?? "demo"));
    const merged = emptyDay(day);
    merged.steps = largest(ordered.map((c) => c.steps));
    merged.distanceKm = largest(ordered.map((c) => c.distanceKm));
    merged.activeKcal = largest(ordered.map((c) => c.activeKcal));
    merged.sleepMinutes = largest(ordered.map((c) => c.sleepMinutes));
    merged.restingHr = first(ordered.map((c) => c.restingHr));
    merged.hrvMs = first(ordered.map((c) => c.hrvMs));
    merged.spo2 = first(ordered.map((c) => c.spo2));
    merged.weightKg = first(ordered.map((c) => c.weightKg));
    const pressure = ordered.find((c) => c.systolic !== null && c.diastolic !== null);
    merged.systolic = pressure?.systolic ?? null;
    merged.diastolic = pressure?.diastolic ?? null;
    merged.glucoseMgDl = first(ordered.map((c) => c.glucoseMgDl));
    for (const c of ordered) {
      for (const w of c.workouts) if (!merged.workouts.some((m) => sameWorkout(m, w))) merged.workouts.push(w);
      for (const s of c.sources) if (!merged.sources.includes(s)) merged.sources.push(s);
    }
    merged.workouts.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    out.push(merged);
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** True when a day carries no measurement at all. */
export function isBlank(d: DaySummary): boolean {
  return d.steps === null && d.sleepMinutes === null && d.restingHr === null && d.activeKcal === null && d.distanceKm === null && d.hrvMs === null && d.spo2 === null && d.weightKg === null && d.systolic === null && d.glucoseMgDl === null && d.workouts.length === 0;
}
