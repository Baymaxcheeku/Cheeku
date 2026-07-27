"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/cn";
import { DOC_TYPE_LABEL, type DocType } from "@/lib/records/types";

/*
 * Filter state lives in the URL, not in component state.
 *
 * It means a filtered list can be linked to and survives the back button from a
 * record detail — the single most common navigation on this screen. Holding it
 * in `useState` would silently reset every filter each time someone opened a
 * document and came back, which reads as the app forgetting what you asked for.
 */

export type FilterKey = "profileId" | "docType" | "since" | "sort";

const DOC_TYPES: readonly DocType[] = [
  "lab_report",
  "prescription",
  "discharge",
  "scan",
  "vaccination",
  "bill",
  "other",
];

/** The period options. `since` is stored as an ISO date, resolved on render. */
const PERIODS = [
  { value: "", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
  { value: "365", label: "Last year" },
] as const;

export function FilterBar({
  profiles,
  showPeriod = true,
  defaultProfileId,
}: {
  profiles: readonly { id: string; name: string }[];
  showPeriod?: boolean;
  /** The member selected on Home; the list is scoped to them unless widened. */
  defaultProfileId?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const docType = params.get("docType") ?? "";
  // No param means "whoever is selected on Home", so the control shows them
  // rather than claiming the list is unfiltered.
  const profileId = params.get("profileId") ?? defaultProfileId ?? "";
  const period = params.get("period") ?? "";
  const sort = params.get("sort") ?? "newest";

  /*
   * Scoping to the active member is the app's normal state, not something the
   * reader chose here, so it does not add to the badge. Only widening to
   * everyone, or narrowing to a different member, counts as a filter.
   */
  const memberIsFilter = profileId !== "" && profileId !== defaultProfileId;
  const activeCount = [docType, memberIsFilter ? profileId : "", period].filter(Boolean).length;

  function apply(next: Partial<Record<string, string>>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    // `scroll: false` — changing a filter should not throw the reader back to
    // the top of a list they were partway down.
    router.push(`?${search.toString()}`, { scroll: false });
  }

  return (
    <>
      {/* The four chips are sized to fit 393pt without scrolling, as the frame
          shows them. Overflow is still allowed rather than wrapped: a longer
          family name should push sideways, not double the bar's height and
          shove the list down. */}
      <div className="mt-4 flex gap-1 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1 rounded-tile border px-2 text-[11px] font-semibold",
            activeCount > 0
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-line bg-surface text-ink-700",
          )}
        >
          <SlidersHorizontal size={14} aria-hidden />
          Filters
          {activeCount > 0 ? (
            <span className="grid h-4.5 min-w-4.5 place-items-center rounded-pill bg-brand-600 px-1 text-[10px] font-bold text-surface">
              {activeCount}
            </span>
          ) : null}
        </span>

        <Select
          label="Document type"
          value={docType}
          onChange={(v) => apply({ docType: v })}
          options={[
            { value: "", label: "All types" },
            ...DOC_TYPES.map((t) => ({ value: t, label: DOC_TYPE_LABEL[t] })),
          ]}
        />

        {/* "all" is an explicit value, not the empty default: an absent param
            means "the member selected on Home", so widening has to be said. */}
        <Select
          label="Family member"
          value={profileId}
          onChange={(v) => apply({ profileId: v })}
          options={[
            { value: "all", label: "All members" },
            ...profiles.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />

        {showPeriod ? (
          <Select
            label="Time period"
            value={period}
            onChange={(v) => apply({ period: v })}
            options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
          />
        ) : (
          <Select
            label="Sort order"
            value={sort}
            onChange={(v) => apply({ sort: v === "newest" ? "" : v })}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
            ]}
          />
        )}
      </div>

      {activeCount > 0 ? (
        <ActiveFilters
          count={activeCount}
          summary={[
            docType ? DOC_TYPE_LABEL[docType as DocType] : null,
            memberIsFilter
              ? (profiles.find((p) => p.id === profileId)?.name ?? "All members")
              : null,
            period ? PERIODS.find((p) => p.value === period)?.label : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          onClear={() => apply({ docType: "", profileId: "", period: "" })}
        />
      ) : null}
    </>
  );
}

/*
 * A native <select> styled to match the frames' pill, rather than a custom
 * popover. On a phone this opens the OS picker — reachable by keyboard, readable
 * by a screen reader, and correct with zero JavaScript of mine. A hand-rolled
 * dropdown here would be strictly worse in every one of those ways.
 */
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  const active = value !== "" && value !== "newest";
  return (
    <span
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center rounded-tile border pl-2 pr-5 text-[11px] font-medium",
        active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-700",
      )}
    >
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent px-3 text-transparent outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink-900">
            {o.label}
          </option>
        ))}
      </select>
      {/* The visible label is a sibling: styling the option text of a native
          select is not portable, so the select itself is transparent. */}
      <span className="pointer-events-none whitespace-nowrap">
        {options.find((o) => o.value === value)?.label ?? options[0]?.label}
      </span>
      <ChevronDown size={13} className="pointer-events-none absolute right-1" aria-hidden />
    </span>
  );
}

function ActiveFilters({
  count,
  summary,
  onClear,
}: {
  count: number;
  summary: string;
  onClear: () => void;
}) {
  return (
    <div className="mx-5 mt-3 flex items-center gap-3 rounded-card bg-brand-50 px-3 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-surface text-brand-600">
        <SlidersHorizontal size={16} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-ink-900">
          Active filters ({count})
        </span>
        <span className="block truncate text-[12px] text-ink-500">{summary}</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
      >
        Clear all
      </button>
    </div>
  );
}

