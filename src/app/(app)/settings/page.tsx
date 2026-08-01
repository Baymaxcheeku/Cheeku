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
import { FamilySection } from "@/components/app/family-section";
import { LogoutButton } from "@/components/app/logout-button";
import { ProfileHeader } from "@/components/app/profile-header";
import { MascotBust } from "@/components/illustrations";
import { getEntitlement } from "@/lib/billing/quota";
import { castFaces } from "@/lib/profiles/avatar";
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

      {/*
       * The Family block sits directly under the plan, because on free and solo
       * it IS a plan pitch — and because someone looking for "where are my
       * people" should find it before the settings list, not after it.
       */}
      <FamilySection
        profiles={profiles}
        activeId={profile.id}
        tier={entitlement.tier}
        lockedFaces={castFaces(4)}
      />

      <PlanCard entitlement={entitlement} />

      <nav className="mt-5 px-5">
        <ul className="overflow-hidden rounded-card bg-surface shadow-e1">
          <Row
            icon={UserCog}
            title="Personal information"
            body="Update your personal details"
            href="/settings/personal"
          />
          <Row
            icon={HeartPulse}
            title="Health profile"
            body="Manage your health summary"
            href="/settings/health"
          />
          <Row
            icon={ShieldCheck}
            title="Security & privacy"
            body="Manage privacy, data and permissions"
            href="/settings/security"
          />
          <Row
            icon={Bell}
            title="Notifications"
            body="Manage alerts and reminders"
            href="/settings/notifications"
          />
          <Row
            icon={Globe}
            title="Language"
            body="English"
            href="/settings/language"
          />
        </ul>

        <ul className="mt-3 overflow-hidden rounded-card bg-surface shadow-e1">
          <Row
            icon={CircleHelp}
            title="Help & support"
            body="Get help and view resources"
            href="/settings/help"
          />
          <Row
            icon={Info}
            title="About Baymax"
            body="App version and information"
            href="/settings/about"
          />
        </ul>
      </nav>

      <AccountData />

      <section className="mx-5 mt-4">
        <ul className="overflow-hidden rounded-card bg-surface shadow-e1">
          <LogoutButton />
        </ul>
      </section>

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
}: {
  icon: typeof Bell;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <li className="border-b border-line last:border-b-0">
      <Link href={href} className="tappable flex items-center gap-3 p-3 active:scale-[0.99]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
          <Icon size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink-900">{title}</span>
          <span className="block truncate text-[12px] text-ink-500">{body}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden />
      </Link>
    </li>
  );
}
