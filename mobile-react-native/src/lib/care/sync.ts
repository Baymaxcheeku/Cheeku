import { supabase } from "@/lib/supabase/client";

import { planSignature, type CarePlan } from "./care";

/*
 * Writes a member's care plan to profiles.care_plan, so the family-care sweep
 * (migration 0038) can check it from the server. Only when it changed: the
 * last plan written for each member is remembered for the session, and a
 * re-render with the same plan costs nothing.
 *
 * Before 0038 is applied the column is missing: the write fails quietly and
 * nothing else changes, the same as the other optional columns.
 */

const written = new Map<string, string>();

export async function writeCarePlan(profileId: string, plan: CarePlan): Promise<void> {
  const sig = planSignature(plan);
  if (written.get(profileId) === sig) return;
  written.set(profileId, sig);
  const { error } = await supabase.from("profiles").update({ care_plan: plan }).eq("id", profileId);
  // Try again next time rather than believe a failed write.
  if (error) written.delete(profileId);
}

/** For tests and sign-out. */
export function forgetCarePlans(): void {
  written.clear();
}
