import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { SettingsHeader } from "@/components/app/settings-header";
import { ReminderScene } from "@/components/illustrations";
import { ownFamily } from "@/lib/settings/queries";
import { NotificationToggles } from "./notification-toggles";

export const dynamic = "force-dynamic";

/** Notifications — grouped toggles over `families.notification_prefs`, per the J frame. */
export default async function NotificationsPage() {
  const family = await ownFamily();
  if (!family) redirect("/settings");

  return (
    <div className="stagger flex flex-1 flex-col pb-8">
      <SettingsHeader title="Notifications" eyebrow="Stay informed, your way" icon={Bell} />

      <section className="relative mx-5 mt-4 overflow-hidden rounded-card bg-surface p-4 shadow-e1">
        <ReminderScene className="pointer-events-none absolute -right-4 -top-1 w-[104px]" />
        <div className="relative pr-[34%]">
          <h2 className="text-[18px] font-bold leading-tight text-ink-900">
            Never miss what matters to <span className="text-brand-600">your health</span>
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-500">
            Choose the updates you want to receive. You can change these anytime.
          </p>
        </div>
      </section>

      <NotificationToggles initial={family.prefs} />
    </div>
  );
}
