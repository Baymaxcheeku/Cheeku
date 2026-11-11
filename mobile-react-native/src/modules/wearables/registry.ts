import { Activity, Bike, HeartPulse, Sparkles, Watch, type LucideIcon } from "lucide-react-native";

import { appleHealth } from "./sources/apple-health";
import { demo } from "./sources/demo";
import { googleHealth } from "./sources/google-health";
import { healthConnect } from "./sources/health-connect";
import { strava } from "./sources/strava";
import type { SourceAdapter, SourceId } from "./types";

/*
 * Every source the layer knows. To add one: write an adapter that returns
 * `DaySummary` rows, give it a row here, and it appears on the Connect screen
 * and joins the merge. Nothing else changes.
 */

export type SourceInfo = {
  id: SourceId;
  name: string;
  /** One line under the name. */
  line: string;
  /** What it brings, for the detail sheet. */
  brings: string[];
  icon: LucideIcon;
  adapter: SourceAdapter;
};

export const SOURCES: readonly SourceInfo[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    line: "iPhone and Apple Watch, and any app that shares with Health",
    brings: ["Steps, distance and active energy", "Sleep", "Resting heart rate, heart rate variability and blood oxygen", "Weight, blood pressure and blood sugar, if you log them", "Workouts, including ones from Strava"],
    icon: HeartPulse,
    adapter: appleHealth,
  },
  {
    id: "health_connect",
    name: "Health Connect",
    line: "Android phones, with Fitbit, Pixel Watch, Samsung and more",
    brings: ["Steps, distance and active energy", "Sleep", "Resting heart rate, heart rate variability and blood oxygen", "Weight, blood pressure and blood sugar, if you log them", "Workouts, including ones from Strava"],
    icon: Activity,
    adapter: healthConnect,
  },
  {
    id: "google_health",
    name: "Fitbit and Pixel Watch",
    line: "Through your Google account",
    brings: ["Steps, distance and active energy", "Sleep", "Resting heart rate and heart rate variability", "Weight, if you log it in Fitbit"],
    icon: Watch,
    adapter: googleHealth,
  },
  {
    id: "strava",
    name: "Strava",
    line: "Runs, rides and walks, through your phone's health app",
    brings: ["Every activity you record in Strava", "Time, distance and energy for each one"],
    icon: Bike,
    adapter: strava,
  },
];

export const DEMO_SOURCE: SourceInfo = {
  id: "demo",
  name: "Sample data",
  line: "See how it looks before connecting anything",
  brings: ["A made-up month of steps, sleep and heart rate", "Nothing is saved or shared"],
  icon: Sparkles,
  adapter: demo,
};

export function sourceInfo(id: SourceId): SourceInfo | undefined {
  return id === "demo" ? DEMO_SOURCE : SOURCES.find((s) => s.id === id);
}
