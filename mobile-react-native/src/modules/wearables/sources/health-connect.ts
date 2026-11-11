import { dayKey, endOfDay, startOfDay } from "../days";
import { isBlank } from "../merge";
import { isExpoGo, OS } from "../runtime";
import { emptyDay, type Availability, type ConnectResult, type DaySummary, type SourceAdapter, type Workout } from "../types";

/*
 * Health Connect, Android only. The phone's shared health store: Fitbit,
 * Pixel Watch, Samsung Health, Strava and the phone's own step counter all
 * write into it, so one connection covers most Android watches.
 *
 * READ ONLY, like Apple Health. The library is native and absent from Expo
 * Go, so it is required lazily and only after `availability()` allows it.
 *
 * NOT RUN ON A DEVICE from the cloud session that wrote it: checked against
 * the library's type definitions (4.1) only. Each read is wrapped so a record
 * type the person refused costs that measure, not the sync.
 *
 * Health Connect lets an app read 30 days back from the day access was first
 * granted, which is why a sync asks for a fortnight and not a year.
 */

type HealthConnect = typeof import("react-native-health-connect");

function lib(): HealthConnect {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react-native-health-connect") as HealthConnect;
}

const RECORDS = ["Steps", "Distance", "ActiveCaloriesBurned", "SleepSession", "RestingHeartRate", "HeartRateVariabilityRmssd", "OxygenSaturation", "Weight", "BloodPressure", "BloodGlucose", "ExerciseSession"] as const;

// SdkAvailabilityStatus in the library: 1 unavailable, 2 needs the provider app updated or installed, 3 ready.
const SDK_READY = 3;
const SDK_NEEDS_PROVIDER = 2;

let started = false;
async function start(): Promise<boolean> {
  if (started) return true;
  started = await lib().initialize();
  return started;
}

async function availability(): Promise<Availability> {
  if (OS !== "android") return { state: "wrong_platform" };
  if (isExpoGo()) return { state: "needs_build" };
  try {
    const status = await lib().getSdkStatus();
    if (status === SDK_READY) return { state: "ready" };
    return status === SDK_NEEDS_PROVIDER ? { state: "needs_install" } : { state: "wrong_platform" };
  } catch {
    return { state: "needs_build" };
  }
}

async function connect(): Promise<ConnectResult> {
  const a = await availability();
  if (a.state === "needs_install") return { ok: false, reason: "unavailable", message: "Install or update Health Connect from the Play Store, then try again." };
  if (a.state !== "ready") return { ok: false, reason: "unavailable", message: "Health Connect isn't available on this phone." };
  try {
    if (!(await start())) return { ok: false, reason: "failed", message: "Couldn't open Health Connect. Try again." };
    const granted = await lib().requestPermission(RECORDS.map((recordType) => ({ accessType: "read" as const, recordType })));
    return granted.length ? { ok: true } : { ok: false, reason: "denied", message: "No access was given. You can allow it in Health Connect, under App permissions." };
  } catch {
    return { ok: false, reason: "failed", message: "Couldn't reach Health Connect. Try again." };
  }
}

type Range = { operator: "between"; startTime: string; endTime: string };

function range(day: string): Range {
  return { operator: "between", startTime: startOfDay(day).toISOString(), endTime: endOfDay(day).toISOString() };
}

/** Runs a read and gives null when the type was refused or is missing on this phone. */
async function tryRead<T>(job: () => Promise<T>): Promise<T | null> {
  try {
    return await job();
  } catch {
    return null;
  }
}

// ExerciseType values in the library for the kinds worth naming.
const KINDS: Record<number, string> = { 8: "Cycle", 16: "Dance", 36: "HIIT", 37: "Hike", 48: "Pilates", 56: "Run", 70: "Strength", 74: "Swim", 79: "Walk", 83: "Yoga" };

/** Package names people recognise, for "recorded by". */
const APPS: Record<string, string> = { "com.strava": "Strava", "com.fitbit.FitbitMobile": "Fitbit", "com.google.android.apps.fitness": "Google Fit", "com.sec.android.app.shealth": "Samsung Health", "com.garmin.android.apps.connectmobile": "Garmin" };

async function oneDay(day: string): Promise<DaySummary> {
  const hc = lib();
  const t = range(day);
  const d = emptyDay(day);

  const [steps, dist, kcal, rhr, kg, bp, hrv, o2, sugar, sleep, sessions] = await Promise.all([
    tryRead(() => hc.aggregateRecord({ recordType: "Steps", timeRangeFilter: t })),
    tryRead(() => hc.aggregateRecord({ recordType: "Distance", timeRangeFilter: t })),
    tryRead(() => hc.aggregateRecord({ recordType: "ActiveCaloriesBurned", timeRangeFilter: t })),
    tryRead(() => hc.aggregateRecord({ recordType: "RestingHeartRate", timeRangeFilter: t })),
    tryRead(() => hc.aggregateRecord({ recordType: "Weight", timeRangeFilter: t })),
    tryRead(() => hc.aggregateRecord({ recordType: "BloodPressure", timeRangeFilter: t })),
    tryRead(() => hc.readRecords("HeartRateVariabilityRmssd", { timeRangeFilter: t })),
    tryRead(() => hc.readRecords("OxygenSaturation", { timeRangeFilter: t })),
    tryRead(() => hc.readRecords("BloodGlucose", { timeRangeFilter: t })),
    // A night is counted on the day it ended, so look from the evening before.
    tryRead(() => hc.readRecords("SleepSession", { timeRangeFilter: { operator: "between", startTime: new Date(startOfDay(day).getTime() - 12 * 3600 * 1000).toISOString(), endTime: endOfDay(day).toISOString() } })),
    tryRead(() => hc.readRecords("ExerciseSession", { timeRangeFilter: t })),
  ]);

  const pos = (v: number | undefined | null) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  const avg = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

  d.steps = pos(steps?.COUNT_TOTAL) === null ? null : Math.round(steps?.COUNT_TOTAL ?? 0);
  const km = pos(dist?.DISTANCE?.inKilometers);
  d.distanceKm = km === null ? null : Math.round(km * 10) / 10;
  const active = pos(kcal?.ACTIVE_CALORIES_TOTAL?.inKilocalories);
  d.activeKcal = active === null ? null : Math.round(active);
  const rest = pos(rhr?.BPM_AVG);
  d.restingHr = rest === null ? null : Math.round(rest);
  const weight = pos(kg?.WEIGHT_AVG?.inKilograms);
  d.weightKg = weight === null ? null : Math.round(weight * 10) / 10;
  const sys = pos(bp?.SYSTOLIC_AVG?.inMillimetersOfMercury);
  const dia = pos(bp?.DIASTOLIC_AVG?.inMillimetersOfMercury);
  d.systolic = sys === null || dia === null ? null : Math.round(sys);
  d.diastolic = sys === null || dia === null ? null : Math.round(dia);

  const hrvAvg = avg((hrv?.records ?? []).map((r) => r.heartRateVariabilityMillis).filter((v) => v > 0));
  d.hrvMs = hrvAvg === null ? null : Math.round(hrvAvg);
  const o2Avg = avg((o2?.records ?? []).map((r) => r.percentage).filter((v) => v > 0));
  d.spo2 = o2Avg === null ? null : Math.round(o2Avg);
  const sugarAvg = avg((sugar?.records ?? []).map((r) => r.level?.inMilligramsPerDeciliter ?? 0).filter((v) => v > 0));
  d.glucoseMgDl = sugarAvg === null ? null : Math.round(sugarAvg);

  // The night that ended today: sessions whose end falls on this day, the longest stretch winning over naps double-counted.
  const nights = (sleep?.records ?? []).filter((s) => dayKey(new Date(s.endTime)) === day).map((s) => (Date.parse(s.endTime) - Date.parse(s.startTime)) / 60000);
  d.sleepMinutes = nights.length ? Math.round(Math.max(...nights)) : null;

  const list: Workout[] = [];
  for (const s of sessions?.records ?? []) {
    const minutes = (Date.parse(s.endTime) - Date.parse(s.startTime)) / 60000;
    if (!(minutes >= 2)) continue;
    const origin = s.metadata?.dataOrigin ?? null;
    list.push({ type: KINDS[s.exerciseType] ?? "Workout", minutes: Math.round(minutes), kcal: null, km: null, startedAt: new Date(s.startTime).toISOString(), app: origin ? (APPS[origin] ?? null) : null });
  }
  d.workouts = list;
  d.sources = ["health_connect"];
  return d;
}

async function read(days: readonly string[]): Promise<DaySummary[]> {
  if (!days.length || (await availability()).state !== "ready") return [];
  if (!(await tryRead(start))) return [];
  const out: DaySummary[] = [];
  // One day at a time, in order: Health Connect rate-limits a burst of reads.
  for (const day of days) {
    const d = await tryRead(() => oneDay(day));
    if (d && !isBlank(d)) out.push(d);
  }
  return out;
}

export const healthConnect: SourceAdapter = {
  id: "health_connect",
  availability,
  connect,
  read,
  disconnect: async () => {
    await tryRead(async () => {
      if (await start()) await lib().revokeAllPermissions();
    });
  },
};

/** Opens Health Connect's own settings, for "manage what Cheeku can read". */
export function openHealthConnectSettings(): void {
  try {
    lib().openHealthConnectSettings();
  } catch {
    // Not on this phone.
  }
}

