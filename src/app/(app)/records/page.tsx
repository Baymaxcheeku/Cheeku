import Link from "next/link";
import { CalendarRange } from "lucide-react";

import { FilterBar } from "@/components/records/filter-bar";
import { EmptyRecords, RecordRow, RecordsHeader, StatsCard } from "@/components/records/chrome";
import { sinceFromPeriod } from "@/lib/records/filters";
import { groupByRecency } from "@/lib/records/grouping";
import { listProfiles, listRecords, statsFrom } from "@/lib/records/queries";
import type { DocType } from "@/lib/records/types";

export const dynamic = "force-dynamic";

/**
 * D1 — every document the signed-in user can see, newest first.
 *
 * The stats card counts the *filtered* set, not the whole account. A card that
 * kept saying "24 records" while the list below showed three would be reporting
 * on something the reader cannot see.
 */
export default async function RecordsPage({
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
      sort: one("sort") === "oldest" ? "oldest" : "newest",
    }),
    listProfiles(),
  ]);

  const groups = groupByRecency(records);
  const filtered = Boolean(one("profileId") ?? one("docType") ?? one("period"));

  return (
    <div className="flex flex-1 flex-col pb-4">
      <RecordsHeader title="My Records" subtitle="All your health documents in one place." />

      <FilterBar profiles={profiles} showPeriod={false} />

      <StatsCard stats={statsFrom(records)} />

      <Link
        href="/timeline"
        className="mx-5 mt-3 flex items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 text-[13px] font-semibold text-brand-600 shadow-e1"
      >
        <CalendarRange size={16} aria-hidden />
        View as timeline
      </Link>

      {groups.length === 0 ? (
        <EmptyRecords filtered={filtered} />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="mt-5 px-5">
            <h2 className="text-[15px] font-semibold text-ink-900">{group.label}</h2>
            <ul className="mt-2 space-y-2">
              {group.records.map((record) => (
                <RecordRow key={record.id} record={record} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
