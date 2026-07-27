import Link from "next/link";
import { Bell, ChevronRight, FileText, Flag, Search, ShieldCheck, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatEventDate } from "@/lib/records/grouping";
import {
  fileKind,
  SEVERITY_LABEL,
  SEVERITY_PILL,
  type RecordStats,
  type RecordSummary,
} from "@/lib/records/types";

/** The title block at the top of D1 and D3, with search and notifications. */
export function RecordsHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle: string;
  back?: string;
}) {
  return (
    <header className="px-5 pt-3">
      <div className="flex items-center gap-3">
        {back ? (
          <Link
            href={back}
            aria-label="Go back"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-surface text-brand-600 shadow-e1"
          >
            <ChevronRight size={20} className="rotate-180" aria-hidden />
          </Link>
        ) : null}
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink-900">{title}</h1>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Search records"
            className="grid h-10 w-10 place-items-center rounded-tile bg-surface text-brand-600 shadow-e1"
          >
            <Search size={19} aria-hidden />
          </button>
          {/*
           * The frames show a "3" badge. There is no notifications feature in
           * V1, so a hard-coded count would be a lie rendered in red — the bell
           * ships without one until something can actually fill it.
           */}
          <button
            type="button"
            aria-label="Notifications"
            className="grid h-10 w-10 place-items-center rounded-tile bg-surface text-ink-500 shadow-e1"
          >
            <Bell size={19} aria-hidden />
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-[14px] text-ink-500">{subtitle}</p>
    </header>
  );
}

const STAT_CELLS = [
  { key: "total", label: "Total records", icon: FileText, tint: "bg-brand-50 text-brand-600" },
  { key: "normal", label: "Normal", icon: ShieldCheck, tint: "bg-safe-bg text-safe" },
  {
    key: "borderline",
    label: "Needs attention",
    icon: TriangleAlert,
    tint: "bg-caution-bg text-caution",
  },
  { key: "highRisk", label: "High priority", icon: Flag, tint: "bg-danger-bg text-danger" },
] as const;

/** The four-up count card shared by D1 and D3. */
export function StatsCard({ stats }: { stats: RecordStats }) {
  return (
    <div className="mx-5 mt-4 grid grid-cols-4 rounded-card bg-surface py-3 shadow-e1">
      {STAT_CELLS.map(({ key, label, icon: Icon, tint }, i) => (
        <div
          key={key}
          className={cn(
            "flex flex-col items-center gap-1 px-1",
            i > 0 && "border-l border-line",
          )}
        >
          <span className={cn("grid h-8 w-8 place-items-center rounded-pill", tint)}>
            <Icon size={16} aria-hidden />
          </span>
          <span className="text-[22px] font-bold leading-none text-ink-900">{stats[key]}</span>
          <span className="text-center text-[10px] leading-tight text-ink-500">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** The severity pill. Health meaning only — never used for OCR confidence. */
export function SeverityPill({ severity }: { severity: RecordSummary["severity"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
        SEVERITY_PILL[severity],
      )}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

/**
 * The small PDF/JPG chip on every record row.
 *
 * `compact` is for the timeline, where the date column and rail already eat
 * ~60pt of the row before the card starts.
 */
export function FileChip({ mimeType, compact = false }: { mimeType: string; compact?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-tile border border-line bg-canvas font-bold text-ink-500",
        compact ? "h-9 w-8 text-[8px]" : "h-11 w-10 text-[9px]",
      )}
    >
      {fileKind(mimeType)}
    </span>
  );
}

/**
 * One row in the records list.
 *
 * The whole row is the link, not just the chevron: a 44px-tall target that only
 * responds at its right edge is the most common way a list like this fails on a
 * phone.
 */
export function RecordRow({ record }: { record: RecordSummary }) {
  return (
    <li>
      <Link
        href={`/records/${record.id}`}
        className="tappable flex items-center gap-3 rounded-card bg-surface p-3 shadow-e1 hover:bg-brand-50/40 active:scale-[0.99] active:bg-brand-50/60"
      >
        <FileChip mimeType={record.mimeType} />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink-900">
            {record.title}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-ink-500">
            {record.profileName} · {formatEventDate(record.eventDate)}
          </span>
          {record.facility ? (
            <span className="mt-0.5 block truncate text-[12px] text-ink-300">{record.facility}</span>
          ) : null}
        </span>

        <SeverityPill severity={record.severity} />
        <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden />
      </Link>
    </li>
  );
}

/** Shown when filters or an empty account leave nothing to list. */
export function EmptyRecords({ filtered }: { filtered: boolean }) {
  return (
    <div className="mx-5 mt-6 rounded-card border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-pill bg-brand-50">
        <FileText size={22} className="text-brand-500" aria-hidden />
      </span>
      <h2 className="mt-3 text-[16px] font-semibold text-ink-900">
        {filtered ? "Nothing matches those filters" : "No records yet"}
      </h2>
      <p className="mx-auto mt-1 max-w-[260px] text-[13px] leading-snug text-ink-500">
        {filtered
          ? "Try clearing a filter to see more of your documents."
          : "Add your first document and Baymax will organise it for you."}
      </p>
      {!filtered ? (
        <Link
          href="/scan"
          className="mt-4 inline-flex h-11 items-center rounded-pill bg-brand-600 px-5 text-[14px] font-semibold text-surface"
        >
          Add a document
        </Link>
      ) : null}
    </div>
  );
}
