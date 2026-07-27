import Image from "next/image";
import Link from "next/link";
import { Bell, CalendarDays, ChevronRight, FileText, HeartPulse, ShieldCheck } from "lucide-react";

import { FamilySwitcher } from "@/components/app/family-switcher";
import { HomeAskBox } from "@/components/app/home-ask-box";
import { RecordRow } from "@/components/records/chrome";
import { activeProfile, familyProfiles } from "@/lib/profiles/context";
import { formatEventDate } from "@/lib/records/grouping";
import { listProfileRecords, statsFrom } from "@/lib/records/queries";

export const dynamic = "force-dynamic";

/** Deliberately time-of-day aware, like the frame. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * B1 — the daily loop's front door.
 *
 * Everything on this screen is scoped to the active family member. That is the
 * visible half of rule 3: switching to Amma must change the greeting, the
 * counts, the insight and the recent records together, or the screen is telling
 * the user something untrue about whose health they are looking at.
 */
export default async function HomePage() {
  const [profiles, profile] = await Promise.all([familyProfiles(), activeProfile()]);

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col justify-center px-5 py-10 text-center">
        <h1 className="text-[22px] font-bold text-ink-900">Set up a profile first</h1>
        <p className="mx-auto mt-2 max-w-[280px] text-[14px] text-ink-500">
          Baymax needs someone to keep records for before it can show you anything.
        </p>
        <Link
          href="/profile"
          className="mx-auto mt-5 inline-flex h-12 items-center rounded-pill bg-brand-600 px-6 text-[15px] font-semibold text-surface"
        >
          Create a profile
        </Link>
      </main>
    );
  }

  const records = await listProfileRecords(profile.id);
  const stats = statsFrom(records);
  const needsReview = stats.borderline + stats.highRisk;
  const recent = records.slice(0, 3);
  const newest = records[0];

  // "2 new this week" in the frame counts uploads, not test dates — a report
  // from March added yesterday is still new to the user.
  const weekAgo = Date.now() - 7 * 86_400_000;
  const addedThisWeek = records.filter((r) => new Date(r.createdAt).getTime() >= weekAgo).length;

  return (
    <div className="flex flex-1 flex-col pb-4">
      <header className="flex items-start gap-3 px-5 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-[20px] leading-tight text-ink-900">{greeting()},</p>
          <h1 className="flex items-center gap-2 text-[28px] font-bold leading-tight tracking-tight text-brand-600">
            <span className="truncate">{profile.name}</span>
            <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-[14px] text-ink-500">Here&apos;s your health at a glance.</p>
        </div>
        {/* No badge — see the note in records/chrome.tsx. There is nothing to count. */}
        <button
          type="button"
          aria-label="Notifications"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-surface text-ink-500 shadow-e1"
        >
          <Bell size={19} aria-hidden />
        </button>
      </header>

      <div className="mt-4">
        <FamilySwitcher profiles={profiles} activeId={profile.id} />
      </div>

      <InsightCard
        name={profile.name}
        total={stats.total}
        needsReview={needsReview}
        topRecordId={records.find((r) => r.severity !== "normal")?.id}
        latest={
          newest
            ? {
                title: newest.title,
                date: formatEventDate(newest.eventDate),
                facility: newest.facility,
              }
            : undefined
        }
      />

      <section className="mt-5 px-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[19px] font-bold text-ink-900">Health Summary</h2>
          <Link href="/records" className="flex items-center text-[13px] font-semibold text-brand-600">
            View all
            <ChevronRight size={15} aria-hidden />
          </Link>
        </div>

        <ul className="mt-2 grid grid-cols-3 gap-2">
          <SummaryTile
            icon={FileText}
            tint="bg-brand-50 text-brand-600"
            value={stats.total}
            label="Documents"
            note={addedThisWeek > 0 ? `${addedThisWeek} new this week` : "In your records"}
            noteClass={addedThisWeek > 0 ? "text-brand-600" : undefined}
          />
          <SummaryTile
            icon={ShieldCheck}
            tint="bg-safe-bg text-safe"
            value={stats.normal}
            label="Safe for you"
            note={stats.normal > 0 ? "All clear" : "None yet"}
            noteClass={stats.normal > 0 ? "text-safe-text" : undefined}
          />
          <SummaryTile
            icon={HeartPulse}
            tint="bg-danger-bg text-danger"
            value={needsReview}
            label="Needs review"
            note={needsReview > 0 ? "Review lab result" : "Nothing flagged"}
            noteClass={needsReview > 0 ? "text-danger-text" : undefined}
          />
        </ul>
      </section>

      <HomeAskBox />

      {recent.length > 0 ? (
        <section className="mt-5 px-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold text-ink-900">Recent records</h2>
            <Link href="/records" className="text-[13px] font-semibold text-brand-600">
              See all
            </Link>
          </div>
          <ul className="mt-2 space-y-2">
            {recent.map((record) => (
              <RecordRow key={record.id} record={record} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/*
 * ONE insight, per the spec, in the frame's card: eyebrow, headline, a detail
 * row, a filled CTA, and the bell-and-calendar art bleeding off the right edge.
 *
 * The frame's *content* is an appointment reminder ("Time for your thyroid
 * checkup, 15 May, Fortis Hospital"). Scheduling does not exist in V1, and
 * inventing a due date for a medical test is a fabricated clinical prompt —
 * exactly what rule 4 forbids. So the card keeps the frame's shape and fills it
 * with what the records genuinely say.
 */
function InsightCard({
  name,
  total,
  needsReview,
  topRecordId,
  latest,
}: {
  name: string;
  total: number;
  needsReview: number;
  topRecordId?: string;
  latest?: { title: string; date: string; facility: string | null };
}) {
  const content =
    total === 0
      ? {
          eyebrow: "Get started",
          title: "Add your first record",
          body: "Upload a report and Baymax will organise it for you.",
          cta: { label: "Add a document", href: "/scan" },
        }
      : needsReview === 0
        ? {
            eyebrow: "All clear",
            title: "Everything is in range",
            body: `Every measured value across ${name}'s ${total} record${total === 1 ? "" : "s"} sits inside its printed range.`,
            cta: { label: "View records", href: "/records" },
          }
        : {
            eyebrow: "Worth a look",
            title: `${needsReview} record${needsReview === 1 ? "" : "s"} to review`,
            body: "Baymax does not interpret results — your doctor can.",
            cta: {
              label: "Open the record",
              href: topRecordId ? `/records/${topRecordId}` : "/records",
            },
          };

  return (
    <section className="relative mx-5 mt-4 overflow-hidden rounded-card bg-surface p-4 shadow-e1">
      <Image
        src="/illustrations/home-reminder.png"
        alt=""
        width={348}
        height={275}
        priority
        className="pointer-events-none absolute -right-4 bottom-0 h-[132px] w-auto object-contain"
      />

      <div className="relative pr-[38%]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
          {content.eyebrow}
        </p>
        <h2 className="mt-1 text-[20px] font-bold leading-tight text-ink-900">{content.title}</h2>

        {latest ? (
          <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-700">
            <CalendarDays size={14} className="shrink-0 text-brand-500" aria-hidden />
            {latest.date}
          </p>
        ) : null}
        {latest?.facility ? (
          <p className="mt-0.5 truncate text-[12px] text-ink-500">{latest.facility}</p>
        ) : (
          <p className="mt-1.5 text-[12px] leading-snug text-ink-500">{content.body}</p>
        )}

        <Link
          href={content.cta.href}
          className="mt-3 inline-flex h-11 items-center rounded-tile bg-brand-700 px-5 text-[14px] font-semibold text-surface"
        >
          {content.cta.label}
        </Link>
      </div>
    </section>
  );
}

function SummaryTile({
  icon: Icon,
  tint,
  value,
  label,
  note,
  noteClass,
}: {
  icon: typeof FileText;
  tint: string;
  value: number;
  label: string;
  note: string;
  noteClass?: string;
}) {
  return (
    <li className="rounded-card bg-surface p-3 shadow-e1">
      <span className={`grid h-9 w-9 place-items-center rounded-tile ${tint}`}>
        <Icon size={17} aria-hidden />
      </span>
      <p className="mt-2 text-[22px] font-bold leading-none text-ink-900">{value}</p>
      <p className="mt-1 text-[12px] font-medium text-ink-700">{label}</p>
      <p className={`mt-0.5 text-[10px] leading-tight ${noteClass ?? "text-ink-300"}`}>{note}</p>
    </li>
  );
}
