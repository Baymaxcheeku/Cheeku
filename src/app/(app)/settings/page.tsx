import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Globe,
  Info,
  LifeBuoy,
  Lock,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import { ProfileHeader } from "@/components/app/profile-header";
import { activeProfile, familyProfiles } from "@/lib/profiles/context";
import { listProfileRecords, statsFrom } from "@/lib/records/queries";

export const dynamic = "force-dynamic";

/**
 * I1 — profile and settings.
 *
 * Built here in Phase 5 rather than Phase 6 because the Profile tab existed in
 * the tab bar with nothing behind it, and the family switcher belongs on it:
 * the switcher was only reachable from Home, which made "whose profile am I
 * looking at" a question you could only answer by navigating away.
 *
 * The rows below are the real V1 settings surface. Export and delete land in
 * Phase 6 with working implementations — they are the two that must never be
 * decorative, so they say so rather than pretending.
 */
export default async function SettingsPage() {
  const [profiles, profile] = await Promise.all([familyProfiles(), activeProfile()]);

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col justify-center px-5 py-10 text-center">
        <h1 className="text-[22px] font-bold text-ink-900">No profile yet</h1>
        <Link href="/profile" className="mt-4 text-[15px] font-semibold text-brand-600">
          Create one
        </Link>
      </main>
    );
  }

  const records = await listProfileRecords(profile.id);
  const stats = statsFrom(records);

  return (
    <div className="flex flex-1 flex-col pb-4">
      <header className="px-5 pt-3">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink-900">Profile</h1>
        <p className="mt-1 text-[14px] text-ink-500">Manage your family and your data.</p>
      </header>

      <ProfileHeader profile={profile} profiles={profiles} recordCount={stats.total} />

      <nav className="mt-5 px-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-300">
          Your data
        </h2>
        <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
          <Row icon={FileText} title="Your records" body={`${stats.total} documents`} href="/records" />
          <Row
            icon={ShieldCheck}
            title="Privacy and security"
            body="How your data is protected"
            soon="The privacy centre arrives with the account phase"
          />
          <Row
            icon={Lock}
            title="Export or delete everything"
            body="Take your data out, or remove it"
            soon="Export and delete are built in the account phase — they will work, not just appear"
          />
        </ul>

        <h2 className="mt-5 text-[13px] font-semibold uppercase tracking-wide text-ink-300">App</h2>
        <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
          <Row icon={UserCog} title="Edit profile" body="Name, date of birth, health details" href="/profile" />
          <Row icon={Globe} title="Language" body="English" soon="More languages arrive later" />
          <Row icon={LifeBuoy} title="Help and support" body="Get in touch" soon="Coming soon" />
          <Row icon={Info} title="About Baymax" body="Version 0.5 · V1 build" soon="Coming soon" />
        </ul>
      </nav>

      <p className="mx-5 mt-5 flex items-start gap-2 rounded-card bg-brand-50 px-3.5 py-3 text-[12px] leading-snug text-ink-500">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
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
  icon: typeof FileText;
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
        <Link href={href} className="flex items-center gap-3 p-3">
          {inner}
        </Link>
      ) : (
        <div title={soon} aria-disabled className="flex items-center gap-3 p-3 opacity-55">
          {inner}
        </div>
      )}
    </li>
  );
}
