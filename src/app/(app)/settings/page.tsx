import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Globe,
  HeartPulse,
  Info,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import { AccountData } from "@/components/account/account-data";
import { PlanCard } from "@/components/billing/plan-card";
import { ProfileHeader } from "@/components/app/profile-header";
import { MascotBust } from "@/components/illustrations";
import { getEntitlement } from "@/lib/billing/quota";
import { activeProfile, familyProfiles } from "@/lib/profiles/context";
import { listProfileRecords, statsFrom } from "@/lib/records/queries";

export const dynamic = "force-dynamic";

/**
 * I1 — profile and settings.
 *
 * The two rows that matter most here are export and delete. DPDP gives people a
 * right to their data and a right to have it erased; drawing those buttons and
 * wiring them to nothing would be a promise the app is breaking. Both do the
 * real thing — see lib/account/actions.ts.
 */
export default async function SettingsPage() {
  const [profiles, profile, entitlement] = await Promise.all([
    familyProfiles(),
    activeProfile(),
    getEntitlement(),
  ]);

  if (!profile) redirect("/profile");

  const records = await listProfileRecords(profile.id);
  const stats = statsFrom(records);

  return (
    <div className="stagger flex flex-1 flex-col pb-4">
      <header className="relative overflow-hidden px-5 pt-3">
        <div className="relative pr-[34%]">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink-900">
            Profile
          </h1>
          <p className="mt-1 text-[14px] leading-snug text-ink-500">
            Manage your account and app settings.
          </p>
        </div>
        <MascotBust className="pointer-events-none absolute -right-3 -top-2 w-[128px]" />
      </header>

      <ProfileHeader
        profile={profile}
        profiles={profiles}
        recordCount={stats.total}
        tier={entitlement.tier}
      />

      <PlanCard entitlement={entitlement} />

      <nav className="mt-5 px-5">
        <ul className="overflow-hidden rounded-card bg-surface shadow-e1">
          <Row
            icon={UserCog}
            title="Personal information"
            body="Update your personal details"
            href="/profile"
          />
          <Row
            icon={HeartPulse}
            title="Health profile"
            body="Manage your health summary"
            href="/profile"
          />
          <Row
            icon={ShieldCheck}
            title="Security & privacy"
            body="How your data is protected"
            soon="The privacy centre arrives in a later phase"
          />
          <Row
            icon={Bell}
            title="Notifications"
            body="Manage alerts and reminders"
            soon="Notifications are not part of V1"
          />
          <Row
            icon={Globe}
            title="Language"
            body="English"
            soon="More languages arrive later"
          />
        </ul>

        <ul className="mt-3 overflow-hidden rounded-card bg-surface shadow-e1">
          <Row
            icon={CircleHelp}
            title="Help & support"
            body="Get help and view resources"
            soon="Support arrives with the account phase"
          />
          <Row icon={Info} title="About Baymax" body="Version 0.6 · V1 build" soon="Coming soon" />
        </ul>
      </nav>

      <AccountData />

      <p className="mx-5 mt-4 flex items-start gap-2 rounded-card bg-brand-50 px-4 py-3.5 text-[12px] leading-snug text-ink-500">
        <ShieldCheck size={16} className="mt-px shrink-0 text-brand-500" aria-hidden />
        <span>
          Baymax never sells your data and never shares it outside your family. It gives helpful
          information, not medical advice.
        </span>
      </p>
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  body,
  href,
  soon,
}: {
  icon: typeof Bell;
  title: string;
  body: string;
  href?: string;
  soon?: string;
}) {
  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink-900">{title}</span>
        <span className="block truncate text-[12px] text-ink-500">{body}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden />
    </>
  );

  return (
    <li className="border-b border-line last:border-b-0">
      {href ? (
        <Link href={href} className="tappable flex items-center gap-3 p-3 active:scale-[0.99]">
          {inner}
        </Link>
      ) : (
        <div title={soon} className="flex items-center gap-3 p-3 opacity-55">
          {inner}
        </div>
      )}
    </li>
  );
}
