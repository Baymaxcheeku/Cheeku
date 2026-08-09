import { kv } from "@/lib/storage";
import type { JourneyId } from "./journeys";

/*
 * Carrying the journey pick from /welcome to the profile that does not exist yet.
 *
 * The tile is tapped BEFORE sign-up, so there is no row to write it to. It goes
 * to local storage for the length of onboarding, gets written onto the profile
 * the moment one is created, and is cleared. `profiles.journey` is the durable
 * home; this is the corridor between the two screens.
 *
 * No expiry, unlike the audience hint. That one guards a routing decision that
 * would be wrong if stale; this one is handed over within minutes and deleted
 * on arrival, so a timeout would only ever lose it.
 *
 * IT IS A PERSONALISATION HINT, NOT A CLINICAL FACT — see migration 0018.
 */

const KEY = "baymax_journey";

const VALID: readonly string[] = [
  "expecting",
  "fertility",
  "caregiver",
  "new_parent",
  "optimiser",
  "other",
];

export async function rememberJourney(journey: JourneyId): Promise<void> {
  await kv.set(KEY, journey);
}

export async function pendingJourney(): Promise<JourneyId | null> {
  const raw = await kv.get(KEY);
  return raw && VALID.includes(raw) ? (raw as JourneyId) : null;
}

export async function clearPendingJourney(): Promise<void> {
  await kv.remove(KEY);
}
