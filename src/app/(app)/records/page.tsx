import { FilterBar } from "@/components/records/filter-bar";
import { RecordsHeader, StatsCard } from "@/components/records/chrome";
import { RecordsView } from "@/components/records/records-view";
import { sinceFromPeriod } from "@/lib/records/filters";
import { activeProfile, selectableProfiles } from "@/lib/profiles/context";
import { listRecords, statsFrom } from "@/lib/records/queries";
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

  /*
   * The list follows the family member selected on Home unless the reader
   * explicitly widens it to "All members". Defaulting to everyone would mean
   * switching to Amma on Home and still seeing Athar's reports here — the
   * exact cross-member bleed rule 3 exists to prevent.
   */
  const requested = one("profileId");
  const [active, allowed] = await Promise.all([activeProfile(), selectableProfiles()]);

  /*
   * The member filter is a URL parameter, so it is caller-supplied and gets the
   * same treatment as the switcher cookie.
   *
   * Two ways past the plan existed here. `?profileId=<locked id>` scoped the
   * list straight to a member the plan cannot open — RLS permits it, because
   * the family shares one account, so nothing below this line would have
   * objected. And `?profileId=all` dropped the scope entirely, which on a Solo
   * plan means every member's reports in one list under one heading. Both now
   * fall back to the active profile rather than erroring: a hand-edited or
   * stale link should quietly show the reader their own records.
   */
  const canSeeEveryone = allowed.length > 1;
  const requestedIsAllowed = requested === "all"
    ? canSeeEveryone
    : allowed.some((p) => p.id === requested);
  const effective = requestedIsAllowed ? requested : undefined;
  const scopeId = effective === "all" ? undefined : (effective ?? active?.id);

  const records = await listRecords({
    profileId: scopeId,
    docType: one("docType") as DocType | undefined,
    since: sinceFromPeriod(one("period")),
    sort: one("sort") === "oldest" ? "oldest" : "newest",
  });

  const filtered = Boolean(effective ?? one("docType") ?? one("period"));
  const initialView = one("view") === "timeline" ? "timeline" : "list";

  return (
    <div className="stagger flex flex-1 flex-col pb-4">
      <RecordsHeader title="My Records" subtitle="All your health documents in one place." />

      <FilterBar
        profiles={allowed}
        defaultProfileId={active?.id}
        allowAllMembers={canSeeEveryone}
      />

      <StatsCard stats={statsFrom(records)} />

      {/* Keyed on the server-resolved view: a soft navigation (e.g. the
          /timeline redirect) changes this prop without unmounting the page,
          and a plain `useState(initialView)` would then keep showing
          whichever tab was already selected instead of honouring the link
          that was just followed. */}
      <RecordsView key={initialView} records={records} filtered={filtered} initialView={initialView} />
    </div>
  );
}
