"use server";

import { setJourney } from "./journey";
import { JOURNEYS, type JourneyId } from "./journeys";

/**
 * Records the journey chosen on the welcome carousel.
 *
 * Validated against the known list rather than written through: this is a
 * public endpoint taking a string that ends up in a cookie the rest of
 * onboarding reads, and an unchecked value would let anyone put arbitrary text
 * where a screen expects one of six ids.
 */
export async function chooseJourney(id: string): Promise<{ ok: boolean }> {
  if (!JOURNEYS.some((j) => j.id === id)) return { ok: false };
  await setJourney(id as JourneyId);
  return { ok: true };
}
