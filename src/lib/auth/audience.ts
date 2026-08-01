import "server-only";

import { cookies } from "next/headers";

import { IS_PRODUCTION } from "@/lib/env";

/*
 * Which audience the reader picked on A4 ("just me" or "my family").
 *
 * Kept in a short-lived cookie rather than on the profile row, because it is a
 * routing hint for the rest of onboarding, not a fact about the account. What
 * the account can actually *do* is decided by the subscription tier — someone
 * who picks "family" and then skips the plan step is a free single-profile user
 * like any other, and nothing should later read this cookie and believe
 * otherwise.
 *
 * It expires in a day for the same reason: if it is still around a week later
 * it has stopped describing anything true.
 */

const COOKIE = "baymax_audience";

export type Audience = "me" | "family";

export async function setAudience(audience: Audience): Promise<void> {
  (await cookies()).set(COOKIE, audience, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function readAudience(): Promise<Audience | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value === "me" || value === "family" ? value : null;
}

/** Called once the plan step has been answered, either way. */
export async function clearAudience(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
