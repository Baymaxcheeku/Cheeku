import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase/client";

import { GOOGLE_HEALTH_ENABLED } from "../config";
import type { Availability, ConnectResult, DaySummary, SourceAdapter } from "../types";

/*
 * Google Health API: Fitbit and Pixel Watch, straight from Google's cloud.
 * It replaced the Fitbit Web API, which was switched off on 2 November 2026.
 *
 * Mostly for someone with a Fitbit and an iPhone. On Android the Fitbit and
 * Pixel Watch apps already write into Health Connect, which is simpler and
 * needs no account linking.
 *
 * THE APP HOLDS NO KEY AND NO TOKEN. The `wearables-google` Edge Function
 * owns the client secret, does the code exchange, keeps the refresh token in
 * a table the app cannot read, and returns only finished daily summaries.
 *
 * OFF BY DEFAULT (config.ts). Every Google Health scope is "restricted", so
 * real users can connect only after Google's privacy and security review of
 * the Cloud project; before that it works for up to 100 named test accounts.
 */

const FUNCTION = "wearables-google";
/** Where Google's consent screen sends the person back to; the function redirects here. */
const RETURN_TO = "cheekuai://wearables/connect";

async function call<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION, { body });
    if (error) return null;
    return data as T;
  } catch {
    return null;
  }
}

async function availability(): Promise<Availability> {
  return GOOGLE_HEALTH_ENABLED ? { state: "ready" } : { state: "off" };
}

async function connect(): Promise<ConnectResult> {
  if (!GOOGLE_HEALTH_ENABLED) return { ok: false, reason: "unavailable", message: "This connection isn't switched on yet." };
  const started = await call<{ url?: string }>({ action: "start", returnTo: RETURN_TO });
  if (!started?.url) return { ok: false, reason: "failed", message: "Couldn't start the Google sign-in. Try again in a moment." };
  try {
    const result = await WebBrowser.openAuthSessionAsync(started.url, RETURN_TO);
    if (result.type !== "success") return { ok: false, reason: "denied", message: "Sign-in was closed before it finished." };
    return /[?&]google=ok/.test(result.url) ? { ok: true } : { ok: false, reason: "denied", message: "Google didn't give access. You can try again." };
  } catch {
    return { ok: false, reason: "failed", message: "Couldn't open the Google sign-in." };
  }
}

async function read(days: readonly string[]): Promise<DaySummary[]> {
  const first = days[0];
  const last = days[days.length - 1];
  if (!GOOGLE_HEALTH_ENABLED || !first || !last) return [];
  const out = await call<{ days?: DaySummary[] }>({ action: "days", from: first, to: last, offsetMinutes: -new Date().getTimezoneOffset() });
  return (out?.days ?? []).map((d) => ({ ...d, sources: ["google_health"] }));
}

export const googleHealth: SourceAdapter = {
  id: "google_health",
  availability,
  connect,
  read,
  disconnect: async () => {
    await call({ action: "disconnect" });
  },
};
