import Link from "next/link";
import { CalendarDays, ChevronRight, FileText, HeartPulse, ShieldCheck } from "lucide-react";

import { FamilySwitcher } from "@/components/app/family-switcher";
import { HomeAskBox } from "@/components/app/home-ask-box";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { RecordRow } from "@/components/records/chrome";
import { cn } from "@/lib/cn";
import { getEntitlement } from "@/lib/billing/quota";
import { deriveNotifications } from "@/lib/notifications/derive";
import { activeProfile, profileAccess } from "@/lib/profiles/context";
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
  const [access, profile, entitlement] = await Promise.all([
    profileAccess(),
    activeProfile(),
    getEntitlement(),
  ]);

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col justify-center px-5 py-10 text-center">
        <h1 className="text-[22px] font-bold text-ink-900">Set up a profile first</h1>
        <p className="mx-auto mt-2 max-w-[280px] text-[14px] text-ink-500">
          Cheeku needs someone to keep records for before it can show you anything.
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

  return (
    <div className="stagger flex flex-1 flex-col pb-4">
      <header className="flex items-start gap-3 px-5 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-[20px] leading-tight text-ink-900">{greeting()},</p>
          <h1 className="flex items-center gap-2 text-[28px] font-bold leading-tight tracking-tight text-brand-600">
            <span className="truncate">{profile.name}</span>
            <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-[14px] text-ink-500">
            Clarity and calm, for every health question.
          </p>
        </div>
        <NotificationsBell notifications={deriveNotifications(records)} />
      </header>

      <section className="mt-5">
        <h2 className="px-5 text-[12px] font-bold uppercase tracking-wide text-ink-300">Family</h2>
        <div className="mt-1.5">
          {/* Only what the plan can open, plus a count of what it cannot —
              the switcher draws padlocks for the rest rather than faces it
              would refuse to switch to. */}
          <FamilySwitcher
            profiles={access.selectable}
            activeId={profile.id}
            tier={entitlement.tier}
            lockedCount={access.lockedCount}
          />
        </div>
      </section>

      <InsightCard
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

      {/*
       * Ask Cheeku moved above Health Summary and given the mascot's own
       * breathing room: for the anxious or pregnant user this card is the
       * reason they opened the app, not a footnote below a stats row.
       */}
      <HomeAskBox />

      {/*
       * One section, not two. The old layout said "2 records to review"
       * three times on one screen — the insight card above, an alert banner
       * here, and a "To review" tile right beside it — which trains the eye
       * to skim past the second and third repeat of anything. This keeps the
       * count exactly once, as a tile among its peers, and lets the record
       * list that follows do the explaining. One header, one "View all":
       * the stats and the records they describe are one story, not two.
       */}
      <section className="mt-5 px-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold text-ink-900">Health Summary</h2>
          <Link
            href="/records"
            className="tappable flex items-center text-[13px] font-semibold text-brand-600 active:opacity-60"
          >
            View all
            <ChevronRight size={15} aria-hidden />
          </Link>
        </div>

        <ul className="mt-2.5 grid grid-cols-3 gap-2">
          <SummaryTile
            icon={FileText}
            tint="bg-brand-50 text-brand-600"
            value={stats.total}
            label="Documents"
          />
          <SummaryTile
            icon={ShieldCheck}
            tint="bg-safe-bg text-safe"
            value={stats.normal}
            label="In range"
          />
          <SummaryTile
            icon={HeartPulse}
            tint="bg-danger-bg text-danger"
            value={needsReview}
            label="To review"
            alert={needsReview > 0}
          />
        </ul>

        {recent.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-card bg-surface shadow-e1">
            <p className="px-3.5 pt-3 text-[11px] font-bold uppercase tracking-wide text-ink-300">
              Recent
            </p>
            <ul className="mt-1 divide-y divide-line">
              {recent.map((record) => (
                <RecordRow key={record.id} record={record} variant="flush" />
              ))}
            </ul>
          </div>
        ) : null}
      </section>
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
  total,
  needsReview,
  topRecordId,
  latest,
}: {
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
          meta: "Upload a report and Cheeku will organise it for you.",
          href: "/scan",
          icon: FileText,
          tint: "bg-brand-50 text-brand-600",
        }
      : needsReview === 0
        ? {
            eyebrow: "All clear",
            title: "Everything is in range",
            meta: `${total} record${total === 1 ? "" : "s"} reviewed`,
            href: "/records",
            icon: ShieldCheck,
            tint: "bg-safe-bg text-safe",
          }
        : {
            eyebrow: "Worth a look",
            title: `${needsReview} record${needsReview === 1 ? "" : "s"} to review`,
            meta: latest ? `${latest.date}${latest.facility ? ` · ${latest.facility}` : ""}` : undefined,
            href: topRecordId ? `/records/${topRecordId}` : "/records",
            icon: HeartPulse,
            tint: "bg-danger-bg text-danger",
          };

  /*
   * A single tappable row rather than a card with its own headline, body and
   * button: this is a pointer to something else on the app, not a
   * destination in itself, and the earlier full-height version competed with
   * Ask Cheeku for the first thing someone's eye landed on.
   */
  return (
    <Link
      href={content.href}
      className="tappable mx-5 mt-3 flex items-center gap-3 rounded-tile bg-surface px-3.5 py-3 shadow-e1 active:scale-[0.99]"
    >
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-pill", content.tint)}>
        <content.icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-300">
            {content.eyebrow}
          </span>
        </span>
        <span className="block truncate text-[14px] font-bold leading-tight text-ink-900">
          {content.title}
        </span>
        {content.meta ? (
          <span className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-ink-500">
            <CalendarDays size={11} className="shrink-0" aria-hidden />
            {content.meta}
          </span>
        ) : null}
      </span>
      <ChevronRight size={17} className="shrink-0 text-ink-300" aria-hidden />
    </Link>
  );
}

/*
 * Card-shaped rather than a pill: once the flagged row above is the thing
 * carrying urgency, these two or three tiles are purely routine counts and
 * read better with room to breathe than squeezed into a chip.
 */
function SummaryTile({
  icon: Icon,
  tint,
  value,
  label,
  alert = false,
}: {
  icon: typeof FileText;
  tint: string;
  value: number;
  label: string;
  /** The one tile allowed to carry urgency — a ring, not a repeated banner. */
  alert?: boolean;
}) {
  return (
    <li>
      <Link
        href="/records"
        className={cn(
          "tappable flex min-w-0 flex-col items-start gap-2 rounded-card bg-surface p-3 shadow-e1 active:scale-[0.98]",
          alert && "ring-1 ring-danger/25",
        )}
      >
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-tile", tint)}>
          <Icon size={16} aria-hidden />
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block text-[19px] font-bold leading-none",
              alert ? "text-danger-text" : "text-ink-900",
            )}
          >
            {value}
          </span>
          <span className="mt-1 block truncate text-[11px] leading-tight text-ink-500">{label}</span>
        </span>
      </Link>
    </li>
  );
}
