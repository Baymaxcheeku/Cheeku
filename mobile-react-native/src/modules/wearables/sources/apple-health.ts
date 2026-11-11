import { dayKey, endOfDay, startOfDay } from "../days";
import { isBlank } from "../merge";
import { isExpoGo, OS } from "../runtime";
import { emptyDay, type Availability, type ConnectResult, type DaySummary, type SourceAdapter, type Workout } from "../types";

/*
 * Apple Health (HealthKit), iPhone only.
 *
 * READ ONLY. Cheeku asks to read and never to write, so the permission sheet
 * has one column and the app can never put a number into someone's Health.
 *
 * The library is native and is not in Expo Go, so it is required lazily and
 * only after `availability()` says the phone can run it. Nothing at the top
 * of this file may import it.
 *
 * NOT RUN ON A DEVICE from the cloud session that wrote it: checked against
 * the library's own type definitions (16.2) only. The first run on an iPhone
 * build is the real test; each read is wrapped so one failing type costs that
 * measure, not the sync.
 *
 * A PRIVACY QUIRK worth knowing: iOS never tells an app whether read access
 * was refused. A refused type simply returns no samples. So "connected" here
 * means "asked", and a day with nothing is shown as nothing.
 */

type HealthKit = typeof import("@kingstinct/react-native-healthkit");

function lib(): HealthKit {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@kingstinct/react-native-healthkit") as HealthKit;
}

const READ = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierDistanceWalkingRunning",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKQuantityTypeIdentifierOxygenSaturation",
  "HKQuantityTypeIdentifierBodyMass",
  "HKQuantityTypeIdentifierBloodPressureSystolic",
  "HKQuantityTypeIdentifierBloodPressureDiastolic",
  "HKQuantityTypeIdentifierBloodGlucose",
  "HKCategoryTypeIdentifierSleepAnalysis",
  "HKWorkoutTypeIdentifier",
] as const;

async function availability(): Promise<Availability> {
  if (OS !== "ios") return { state: "wrong_platform" };
  if (isExpoGo()) return { state: "needs_build" };
  try {
    return lib().isHealthDataAvailable() ? { state: "ready" } : { state: "wrong_platform" };
  } catch {
    return { state: "needs_build" };
  }
}

async function connect(): Promise<ConnectResult> {
  const a = await availability();
  if (a.state !== "ready") return { ok: false, reason: "unavailable", message: "Apple Health isn't available on this phone." };
  try {
    // The cast is on the list only: these are the library's own identifiers.
    const asked = await lib().requestAuthorization({ toRead: READ as unknown as Parameters<HealthKit["requestAuthorization"]>[0]["toRead"] });
    return asked ? { ok: true } : { ok: false, reason: "denied", message: "Apple Health didn't open. Try again." };
  } catch {
    return { ok: false, reason: "failed", message: "Couldn't reach Apple Health. Try again." };
  }
}

type QuantityId = Parameters<HealthKit["queryStatisticsCollectionForQuantity"]>[0];

/** One number per local day for a quantity: a sum for totals, an average for readings. */
async function daily(id: string, how: "cumulativeSum" | "discreteAverage", unit: string, from: Date, to: Date): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    const rows = await lib().queryStatisticsCollectionForQuantity(id as QuantityId, [how], from, { day: 1 }, { unit, filter: { date: { startDate: from, endDate: to } } });
    for (const r of rows) {
      const q = how === "cumulativeSum" ? r.sumQuantity : r.averageQuantity;
      if (q && Number.isFinite(q.quantity) && r.startDate) out.set(dayKey(new Date(r.startDate)), q.quantity);
    }
  } catch {
    // A type the person refused, or one this iOS version lacks: no values, not a failed sync.
  }
  return out;
}

// HKCategoryValueSleepAnalysis: 0 in bed, 1 asleep, 2 awake, 3 core, 4 deep, 5 REM.
const ASLEEP = new Set([1, 3, 4, 5]);

/** Minutes asleep per day, a night counted on the day it ended. */
async function sleep(from: Date, to: Date): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    // Start the evening before so a night that began before `from` is whole.
    const since = new Date(from.getTime() - 12 * 3600 * 1000);
    const samples = await lib().queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", { limit: -1, ascending: true, filter: { date: { startDate: since, endDate: to } } });
    // Two devices can both report the same hours; merge overlapping asleep spans per day first.
    const spans = new Map<string, [number, number][]>();
    for (const s of samples) {
      if (!ASLEEP.has(Number(s.value))) continue;
      const start = new Date(s.startDate).getTime();
      const end = new Date(s.endDate).getTime();
      if (!(end > start)) continue;
      const day = dayKey(new Date(end));
      spans.set(day, [...(spans.get(day) ?? []), [start, end]]);
    }
    for (const [day, list] of spans) {
      list.sort((a, b) => a[0] - b[0]);
      let total = 0;
      let [curStart, curEnd] = list[0] as [number, number];
      for (const [s, e] of list.slice(1)) {
        if (s <= curEnd) curEnd = Math.max(curEnd, e);
        else {
          total += curEnd - curStart;
          [curStart, curEnd] = [s, e];
        }
      }
      total += curEnd - curStart;
      out.set(day, Math.round(total / 60000));
    }
  } catch {
    // As above.
  }
  return out;
}

/** HKWorkoutActivityType raw values for the kinds worth naming; the rest are "Workout". */
const KINDS: Record<number, string> = { 13: "Cycle", 16: "Dance", 20: "Strength", 24: "Hike", 35: "Row", 37: "Run", 46: "Swim", 50: "Strength", 52: "Walk", 57: "Yoga", 63: "HIIT", 66: "Pilates" };

async function workouts(from: Date, to: Date): Promise<Map<string, Workout[]>> {
  const out = new Map<string, Workout[]>();
  try {
    const list = await lib().queryWorkoutSamples({ limit: -1, ascending: true, filter: { date: { startDate: from, endDate: to } } });
    for (const proxy of list) {
      const w = proxy.toJSON();
      const started = new Date(w.startDate);
      const seconds = w.duration?.quantity ?? 0;
      if (seconds < 120) continue;
      const day = dayKey(started);
      const km = w.totalDistance ? (w.totalDistance.unit === "km" ? w.totalDistance.quantity : w.totalDistance.quantity / 1000) : null;
      out.set(day, [
        ...(out.get(day) ?? []),
        {
          type: KINDS[Number(w.workoutActivityType)] ?? "Workout",
          minutes: Math.round(seconds / 60),
          kcal: w.totalEnergyBurned ? Math.round(w.totalEnergyBurned.quantity) : null,
          km: km !== null && Number.isFinite(km) ? Math.round(km * 10) / 10 : null,
          startedAt: started.toISOString(),
          // Strava, Fitbit and the rest arrive here as the app that wrote the workout.
          app: w.sourceRevision?.source?.name ?? null,
        },
      ]);
    }
  } catch {
    // As above.
  }
  return out;
}

async function read(days: readonly string[]): Promise<DaySummary[]> {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last || (await availability()).state !== "ready") return [];
  const from = startOfDay(first);
  const to = endOfDay(last);

  const [steps, km, kcal, rhr, hrv, spo2, kg, sys, dia, sugar, night, sessions] = await Promise.all([
    daily("HKQuantityTypeIdentifierStepCount", "cumulativeSum", "count", from, to),
    daily("HKQuantityTypeIdentifierDistanceWalkingRunning", "cumulativeSum", "km", from, to),
    daily("HKQuantityTypeIdentifierActiveEnergyBurned", "cumulativeSum", "kcal", from, to),
    daily("HKQuantityTypeIdentifierRestingHeartRate", "discreteAverage", "count/min", from, to),
    daily("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", "discreteAverage", "ms", from, to),
    daily("HKQuantityTypeIdentifierOxygenSaturation", "discreteAverage", "%", from, to),
    daily("HKQuantityTypeIdentifierBodyMass", "discreteAverage", "kg", from, to),
    daily("HKQuantityTypeIdentifierBloodPressureSystolic", "discreteAverage", "mmHg", from, to),
    daily("HKQuantityTypeIdentifierBloodPressureDiastolic", "discreteAverage", "mmHg", from, to),
    daily("HKQuantityTypeIdentifierBloodGlucose", "discreteAverage", "mg/dL", from, to),
    sleep(from, to),
    workouts(from, to),
  ]);

  const round = (v: number | undefined, dp = 0) => (v === undefined ? null : Math.round(v * 10 ** dp) / 10 ** dp);
  return days
    .map((day) => {
      const d = emptyDay(day);
      d.steps = round(steps.get(day));
      d.distanceKm = round(km.get(day), 1);
      d.activeKcal = round(kcal.get(day));
      d.restingHr = round(rhr.get(day));
      d.hrvMs = round(hrv.get(day));
      const o2 = spo2.get(day);
      // HealthKit reports oxygen as a fraction (0.97) in "%" on some versions and 97 on others.
      d.spo2 = o2 === undefined ? null : Math.round(o2 <= 1 ? o2 * 100 : o2);
      d.weightKg = round(kg.get(day), 1);
      d.systolic = round(sys.get(day));
      d.diastolic = round(dia.get(day));
      d.glucoseMgDl = round(sugar.get(day));
      d.sleepMinutes = night.get(day) ?? null;
      d.workouts = sessions.get(day) ?? [];
      d.sources = ["apple_health"];
      return d;
    })
    .filter((d) => !isBlank(d));
}

export const appleHealth: SourceAdapter = {
  id: "apple_health",
  availability,
  connect,
  read,
  // iOS has no API for an app to drop its own access; the person does it in Health, Sharing, Apps.
  disconnect: async () => {},
};
