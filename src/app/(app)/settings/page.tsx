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
import { FamilySection } from "@/components/app/family-section";
import { LogoutButton } from "@/components/app/logout-button";
import { ProfileIdentity } from "@/components/app/profile-identity";
import { getEntitlement } from "@/lib/billing/quota";
import { castFaces } from "@/lib/profiles/avatar";
import { activeProfile, profileAccess } from "@/lib/profiles/context";
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
  const [access, profile, entitlement] = await Promise.all([
    profileAccess(),
    activeProfile(),
    getEntitlement(),
  ]);

  if (!profile) redirect("/profile");

  const records = await listProfileRecords(profile.id);
  const stats = statsFrom(records);

  return (
    <div className="stagger flex flex-1 flex-col pb-4">
      {/*
       * No page title and no mascot above the identity card.
       *
       * The old header said "Profile / Manage your account and app settings"
       * over a decorative mascot, directly above a card showing the reader's
       * face and name — two portraits stacked, and a subtitle restating what a
       * settings list self-evidently is. The tab bar already names this screen.
       * Deleting both gives the first viewport back to the person's own
       * identity, which is the thing they came here to see or change.
       */}
      <ProfileIdentity
        profile={profile}
        /* The switcher sheet may only offer what the plan can open. */
        profiles={access.selectable}
        recordCount={stats.total}
        entitlement={entitlement}
      />

      {/*
       * Family before the settings list: someone looking for "where are my
       * people" should find them before scrolling past seven preference rows.
       */}
      {/*
       * The full roster, not the selectable slice: on the family plan this is
       * the real list, and on a one-seat plan the component renders the
       * reader's own profile plus padlocked placeholders. It deliberately
       * never shows a locked member's real name or face — see its own note.
       */}
      <FamilySection
        profiles={access.all}
        activeId={profile.id}
        tier={entitlement.tier}
        lockedFaces={castFaces(4)}
      />

      {/*
       * Three named groups rather than one list of five and one of two.
       *
       * Colour-coding the rows would scan faster still, but green/amber/red
       * carry health meaning everywhere else in this app and a red icon beside
       * "Notifications" would read as a warning about the reader's health. So
       * the grouping does the work the colour is not allowed to: each label
       * answers "is what I want in here?" before any row is read.
       */}
      <Group label="Account">
        <Row
          icon={UserCog}
          title="Personal information"
          body="Name, date of birth and contact"
          href="/settings/personal"
        />
        <Row
          icon={HeartPulse}
          title="Health profile"
          body="Conditions, allergies and medicines"
          href="/settings/health"
        />
        <Row
          icon={ShieldCheck}
          title="Security & privacy"
          body="Password, privacy and permissions"
          href="/settings/security"
        />
      </Group>

      <Group label="Preferences">
        <Row
          icon={Bell}
          title="Notifications"
          body="Alerts and reminders"
          href="/settings/notifications"
        />
        <Row icon={Globe} title="Language" body="English" href="/settings/language" />
      </Group>

      <Group label="Support">
        <Row
          icon={CircleHelp}
          title="Help & support"
          body="Guides, FAQs and reporting an issue"
          href="/settings/help"
        />
        <Row icon={Info} title="About Baymax" body="Version and information" href="/settings/about" />
      </Group>

      <AccountData />

      <section className="mx-5 mt-6">
        <ul className="overflow-hidden rounded-card bg-surface shadow-e1">
          <LogoutButton />
        </ul>
      </section>

      {/*
       * Plain text in the page margin, not a tinted card. As a card it was the
       * eighth container in a row of eight and read as another thing to act on;
       * this is a footnote, and footnotes look like footnotes.
       */}
      <p className="mx-5 mt-6 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-300">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Baymax never sells your data and never shares it outside your family. It gives helpful
          information, not medical advice.
        </span>
      </p>
    </div>
  );
}

/**
 * A labelled group of rows.
 *
 * The label lives in the page margin above the card rather than inside it —
 * the platform convention for settings, and it lets the card itself be nothing
 * but rows, so scanning down the list never crosses a heading.
 */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <nav className="mt-6">
      <h2 className="px-5 text-[12px] font-bold uppercase tracking-wide text-ink-300">{label}</h2>
      <ul className="mx-5 mt-2 overflow-hidden rounded-card bg-surface shadow-e1">{children}</ul>
    </nav>
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
      <Link
        href={href}
        className="tappable flex items-center gap-3.5 px-3.5 py-3 active:bg-brand-50"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
          <Icon size={17} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold leading-tight text-ink-900">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-ink-500">{body}</span>
        </span>
        <ChevronRight size={17} className="shrink-0 text-ink-300" aria-hidden />
      </Link>
    </li>
  );
}
