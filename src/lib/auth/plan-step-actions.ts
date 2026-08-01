"use server";

import { clearAudience } from "./audience";

/**
 * Marks the onboarding plan step as answered, whichever way it went.
 *
 * Clearing the cookie is what stops `/plan` reappearing: the page redirects to
 * Home when there is no "family" audience to act on, so a reader who skipped
 * does not get asked again every time they revisit the URL.
 */
export async function dismissPlanStep(): Promise<void> {
  await clearAudience();
}
