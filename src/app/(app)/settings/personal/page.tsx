import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";

import { SettingsHeader } from "@/components/app/settings-header";
import { activeProfile } from "@/lib/profiles/context";
import { profileDetail } from "@/lib/settings/queries";
import { getUser } from "@/lib/supabase/server";
import { PersonalInfoForm } from "./personal-info-form";

export const dynamic = "force-dynamic";

/** Personal information — the identity fields on the active profile, per the H frame's first row. */
export default async function PersonalInfoPage() {
  const active = await activeProfile();
  if (!active) redirect("/settings");

  const [detail, user] = await Promise.all([profileDetail(active.id), getUser()]);
  if (!detail) redirect("/settings");

  return (
    <div className="stagger flex flex-1 flex-col pb-8">
      <SettingsHeader title="Personal information" eyebrow="Update your personal details" icon={UserCog} />
      <PersonalInfoForm
        profile={detail}
        avatar={active.avatar}
        isPrimary={active.isPrimary}
        accountEmail={active.isPrimary ? (user?.email ?? null) : null}
      />
    </div>
  );
}
