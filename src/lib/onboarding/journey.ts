import "server-only";

import { cookies } from "next/headers";

import { IS_PRODUCTION } from "@/lib/env";
import { JOURNEYS, type JourneyId } from "./journeys";

/*
 * Which life the reader said they were in, on the way through onboarding.
 *
 * A cookie, and a short-lived one, for the same reason the audience hint is
 * (see auth/audience.ts): this is a personalisation hint, not a fact about
 * anyone's health. "Expecting" here must never be read as a clinical statement
 * about the account — nothing downstream may treat it as a condition, put it in
 * a record, or feed it to the answer engine as history. It exists to choose
 * which words a screen uses, and nothing more.
 *
 * Storing it on the profile row would make it look like health data, which it
 * is not, and would outlive the moment it describes.
 */

const COOKIE = "baymax_journey";

export async function setJourney(id: JourneyId): Promise<void> {
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function readJourney(): Promise<JourneyId | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return JOURNEYS.some((j) => j.id === value) ? (value as JourneyId) : null;
}
