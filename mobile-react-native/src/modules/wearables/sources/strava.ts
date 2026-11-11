import type { SourceAdapter } from "../types";

/*
 * Strava. Deliberately NOT a login.
 *
 * Strava's API Policy (effective 1 June 2026) forbids what this app would do
 * with the data:
 *   5.3  no use "in connection with the development, training, evaluation,
 *        or operation of any AI Application", including "ingestion into a
 *        context window". That is Cheeku reading a run before it answers.
 *   2.3  a person's Strava data may be shown only to that person. That rules
 *        out family care.
 *   6.2  nothing kept longer than seven days. That rules out the daily
 *        summaries table and every trend over a week.
 *
 * So Cheeku never calls the Strava API. Strava itself writes each activity
 * into Apple Health (iPhone) and Health Connect (Android) when the person
 * turns that on inside Strava, and Cheeku reads it from there under Apple's
 * and Google's terms, like any other workout. This entry exists so the
 * Connect screen can show Strava and walk the person through those two taps.
 *
 * If Strava's policy changes, a direct connection goes here as a normal
 * adapter and nothing else in the layer moves.
 */

export const strava: SourceAdapter = {
  id: "strava",
  availability: async () => ({ state: "guide" }),
  connect: async () => ({ ok: false, reason: "unavailable", message: "Turn on Strava's health sync inside the Strava app." }),
  read: async () => [],
  disconnect: async () => {},
};

/** The steps inside the Strava app, by phone. Checked against Strava's help pages, November 2026. */
export const STRAVA_GUIDE = {
  ios: ["Open Strava and tap You, then the settings cog.", "Tap Applications, Services, and Devices.", "Tap Health and turn on Send to Health.", "Come back here and connect Apple Health."],
  android: ["Open Strava and tap You, then the settings cog.", "Tap Link Other Services.", "Tap Health Connect and allow Strava to write exercise.", "Come back here and connect Health Connect."],
} as const;
