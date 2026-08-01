import { redirect } from "next/navigation";
import { HeartPulse } from "lucide-react";

import { SettingsHeader } from "@/components/app/settings-header";
import { activeProfile } from "@/lib/profiles/context";
import { profileDetail } from "@/lib/settings/queries";
import { HealthProfileForm } from "./health-profile-form";

export const dynamic = "force-dynamic";

/**
 * Health profile — the medical snapshot on the active profile.
 *
 * This reuses the exact fields A5 collects at onboarding (height, weight,
 * blood group, conditions) plus medications, which A5 never asked for. Fixing
 * the onboarding bug where those first three were silently dropped is done
 * here too: `updateHealthProfile` writes to the same columns this page reads.
 */
export default async function HealthProfilePage() {
  const active = await activeProfile();
  if (!active) redirect("/settings");

  const detail = await profileDetail(active.id);
  if (!detail) redirect("/settings");

  return (
    <div className="stagger flex flex-1 flex-col pb-8">
      <SettingsHeader title="Health profile" eyebrow="Manage your health summary" icon={HeartPulse} />
      <HealthProfileForm profile={detail} />
    </div>
  );
}
