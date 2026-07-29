import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { FileChip, EmptyRecords, RecordsHeader, SeverityPill, StatsCard } from "@/components/records/chrome";
import { FilterBar } from "@/components/records/filter-bar";
import { sinceFromPeriod } from "@/lib/records/filters";
import { groupByMonth, railDate } from "@/lib/records/grouping";
import { listProfiles, listRecords, statsFrom } from "@/lib/records/queries";
import { cn } from "@/lib/cn";
import { SEVERITY_DOT, type DocType, type RecordSummary } from "@/lib/records/types";

export const dynamic = "force-dynamic";

/**
 * D3 — the same records as D1, arranged by when they happened.
 *
 * D1 answers "what do I have"; this answers "what happened when". The month
 * sections carry a count so the shape of a year is readable without scrolling
 * all of it.
 */
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (k: string) => {
    const v = params[k];
    return typeof v === "string" && v ? v : undefined;
  };

  const [records, profiles] = await Promise.all([
    listRecords({
      profileId: one("profileId"),
      docType: one("docType") as DocType | undefined,
      since: sinceFromPeriod(one("period")),
    }),
    listProfiles(),
  ]);

  const months = groupByMonth(records);
  const filtered = Boolean(one("profileId") ?? one("docType") ?? one("period"));

  return (
    <div className="stagger flex flex-1 flex-col pb-4">
      <RecordsHeader
        title="Timeline"
        subtitle="View your health records over time."
        back="/records"
      />

      <FilterBar profiles={profiles} showPeriod />

      <StatsCard stats={statsFrom(records)} />

      {months.length === 0 ? (
        <EmptyRecords filtered={filtered} />
      ) : (
        months.map((month) => (
          <section key={month.key} className="mt-5">
            <div className="flex items-center justify-between px-5">
              <h2 className="text-[16px] font-bold text-ink-900">{month.label}</h2>
              <span className="rounded-pill bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                {month.records.length} record{month.records.length === 1 ? "" : "s"}
              </span>
            </div>

            <ul className="mt-2">
              {month.records.map((record) => (
                <TimelineRow key={record.id} record={record} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

/*
 * The rail is drawn with a border on the date column rather than an absolutely
 * positioned line, so it stretches to whatever height the card next to it
 * happens to be. A fixed-height line would break the moment a facility name
 * wrapped to two lines.
 */
function TimelineRow({ record }: { record: RecordSummary }) {
  const { day, month } = railDate(record.eventDate ?? "");

  // Tight gutters on purpose: the date column and the rail are fixed costs, and
  // every point they take comes straight out of the report title, which is the
  // only part of the row anyone actually scans.

  return (
    <li className="flex gap-2 px-4">
      <div className="flex w-9 shrink-0 flex-col items-center pt-3">
        <span className="text-[15px] font-bold leading-none text-ink-900">{day}</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-ink-500">{month}</span>
      </div>

      <div className="relative flex shrink-0 flex-col items-center">
        <span
          className={cn(
            "mt-3.5 h-3 w-3 shrink-0 rounded-pill border-2 bg-surface",
            SEVERITY_DOT[record.severity],
          )}
          aria-hidden
        />
        <span className="w-px flex-1 bg-line" aria-hidden />
      </div>

      <Link
        href={`/records/${record.id}`}
        // `min-w-0` on the flex child itself, not only on the text span inside
        // it: without it a flex item's floor is its content width, so a long
        // report title pushes the severity pill off the right edge.
        className="tappable mb-2 flex min-w-0 flex-1 items-center gap-2 rounded-card bg-surface p-2.5 shadow-e1 hover:bg-brand-50/40 active:scale-[0.99] active:bg-brand-50/60"
      >
        <FileChip mimeType={record.mimeType} compact />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink-900">
            {record.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-ink-500">
            {record.profileName}
            {record.facility ? ` · ${record.facility}` : ""}
          </span>
        </span>
        <SeverityPill severity={record.severity} />
        <ChevronRight size={16} className="shrink-0 text-ink-300" aria-hidden />
      </Link>
    </li>
  );
}
