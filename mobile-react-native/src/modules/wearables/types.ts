/*
 * The one shape every source is turned into. Screens, insights, chat notes
 * and the database only ever see this, never a source's own format.
 */

export type SourceId = "apple_health" | "health_connect" | "google_health" | "strava" | "demo";

export type Workout = {
  /** A plain word: "Walk", "Run", "Cycle", "Yoga", "Strength", "Swim", "Workout". */
  type: string;
  minutes: number;
  kcal: number | null;
  km: number | null;
  /** ISO time it started. */
  startedAt: string;
  /** The app that recorded it, when the phone says ("Strava", "Fitbit"). */
  app: string | null;
};

/** One person, one calendar day, in their own time zone. Null means "not measured". */
export type DaySummary = {
  /** YYYY-MM-DD, local. */
  day: string;
  steps: number | null;
  distanceKm: number | null;
  activeKcal: number | null;
  /** Time asleep in the night that ended on this day. */
  sleepMinutes: number | null;
  restingHr: number | null;
  hrvMs: number | null;
  /** Blood oxygen, percent. */
  spo2: number | null;
  weightKg: number | null;
  systolic: number | null;
  diastolic: number | null;
  /** Blood sugar, mg/dL, the day's average of what the device logged. */
  glucoseMgDl: number | null;
  workouts: Workout[];
  sources: SourceId[];
};

export type MetricKey = "steps" | "sleep" | "restingHr" | "activeKcal" | "distance" | "hrv" | "spo2" | "weight" | "bp" | "glucose";

/** Why a source can or cannot be connected on this phone, right now. */
export type Availability =
  | { state: "ready" }
  /** Needs native code that Expo Go does not carry. */
  | { state: "needs_build" }
  | { state: "wrong_platform" }
  /** Android without the Health Connect app. */
  | { state: "needs_install" }
  /** Built, but switched off until keys and approval exist. */
  | { state: "off" }
  /** Not a login: the person turns something on in another app. */
  | { state: "guide" };

export type ConnectResult = { ok: true } | { ok: false; reason: "denied" | "unavailable" | "failed"; message: string };

export type SourceAdapter = {
  id: SourceId;
  availability(): Promise<Availability>;
  /** Asks the person for access. Shows the system's own permission screen. */
  connect(): Promise<ConnectResult>;
  /** Reads the given local days. A day with nothing measured is left out. */
  read(days: readonly string[]): Promise<DaySummary[]>;
  disconnect(): Promise<void>;
};

export type Connection = { source: SourceId; connectedAt: string; lastSyncAt: string | null };

export function emptyDay(day: string): DaySummary {
  return { day, steps: null, distanceKm: null, activeKcal: null, sleepMinutes: null, restingHr: null, hrvMs: null, spo2: null, weightKg: null, systolic: null, diastolic: null, glucoseMgDl: null, workouts: [], sources: [] };
}
