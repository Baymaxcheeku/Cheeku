import { redirect } from "next/navigation";

import { readAudience } from "@/lib/auth/audience";
import { getEntitlement } from "@/lib/billing/quota";
import { PlanStep } from "./plan-step";

export const dynamic = "force-dynamic";

/**
 * The last step of onboarding, and only for people who said "it's for my
 * family" on A4.
 *
 * Family access is genuinely gated on the Family plan, so someone who picked it
 * would otherwise finish onboarding, land on Home, and find they cannot add
 * anyone — a dead end they were walked into. This asks at the point the choice
 * was made.
 *
 * It is skippable on purpose. "Choose family" is not consent to be charged, and
 * an onboarding flow that cannot be completed without paying is a wall, not a
 * funnel. Skipping starts them on free with their own profile, which is exactly
 * what the "it's for me" path gives.
 *
 * Anyone who chose "just me" — or who already has a plan — never sees this.
 */
export default async function PlanPage() {
  const [audience, entitlement] = await Promise.all([readAudience(), getEntitlement()]);

  if (audience !== "family" || entitlement.tier !== "free") redirect("/home");

  return <PlanStep />;
}
