import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  CircleHelp,
  ChevronLeft,
  Droplet,
  FileText,
  MessageCircle,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { FileChip } from "@/components/records/chrome";
import { GaugeLegend, HealthGauge } from "@/components/records/health-gauge";
import { OriginalToggle } from "@/components/records/original-toggle";
import { cn } from "@/lib/cn";
import { formatEventDate } from "@/lib/records/grouping";
import { buildInsight, flaggedEntities, formatValue } from "@/lib/records/insight";
import { selectableProfiles } from "@/lib/profiles/context";
import { getRecord, signedDocumentUrl } from "@/lib/records/queries";
import {
  FLAG_LABEL,
  FLAG_PILL,
  SEVERITY_LABEL,
  type RecordEntity,
  type Severity,
} from "@/lib/records/types";

export const dynamic = "force-dynamic";

const SEVERITY_BLURB: Record<Severity, string> = {
  normal: "All values are within the range printed on this report.",
  borderline: "Some values are outside the normal range.",
  high_risk: "Some values are well outside the normal range.",
};

const SEVERITY_TINT: Record<Severity, string> = {
  normal: "bg-safe-bg text-safe",
  borderline: "bg-caution-bg text-caution",
  high_risk: "bg-danger-bg text-danger",
};

/**
 * D2 — one document, and what was read out of it.
 *
 * The original file is always reachable from here (§ "structured / original
 * toggle"). Extraction can be wrong, and a screen that only ever shows the
 * machine's reading of a medical document, with no way back to the page the lab
 * actually printed, is asking to be trusted more than it has earned.
 */
export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getRecord(id);

  // RLS returns another user's row as "not found", so this covers both a bad id
  // and an id belonging to someone else. The caller cannot tell them apart.
  if (!record) notFound();

  /*
   * RLS scopes this to the ACCOUNT; the plan scopes it to a person.
   *
   * The family shares one user_id, so a locked member's document is a perfectly
   * valid row for this caller and the query above returns it happily. Without
   * this, a direct link — from a bookmark kept after a downgrade, or simply a
   * guessed id — would render a member's full lab report on a plan that no
   * longer covers them. `notFound` rather than an upsell: which documents exist
   * for whom is itself the thing being gated.
   */
  const allowed = await selectableProfiles();
  if (!allowed.some((p) => p.id === record.profileId)) notFound();

  const insight = buildInsight(record);
  const measured = record.entities.filter((e) => e.kind === "lab_value" || e.kind === "vital");
  const flaggedCount = flaggedEntities(measured).length;
  const originalUrl = await signedDocumentUrl(record.storagePath);

  return (
    <div className="flex flex-1 flex-col px-5 pb-4 pt-3">
      <header className="flex items-center gap-3">
        <Link
          href="/records"
          aria-label="Back to records"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-surface text-brand-600 shadow-e1"
        >
          <ChevronLeft size={20} aria-hidden />
        </Link>
        <h1 className="flex-1 text-center text-[17px] font-bold text-ink-900">Document analysis</h1>
        <Link
          href="/help"
          className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-600"
        >
          <CircleHelp size={15} aria-hidden />
          Help
        </Link>
      </header>
      <p className="mt-2 text-center text-[13px] text-ink-500">
        We&apos;ve analysed your report. Here&apos;s what we found.
      </p>

      {/* ---------------------------------------------------------- file --- */}
      <div className="mt-4 flex items-center gap-3 rounded-card bg-surface p-3 shadow-e1">
        <FileChip mimeType={record.mimeType} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink-900">
            {record.title}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-ink-500">
            {formatEventDate(record.eventDate)}
            {record.facility ? ` · ${record.facility}` : ""}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
            record.status === "filed"
              ? "bg-safe-bg text-safe-text"
              : "bg-caution-bg text-caution-text",
          )}
        >
          {record.status === "filed" ? "Processed" : "Needs review"}
        </span>
      </div>

      {/* -------------------------------------------------------- status --- */}
      <section className="mt-3 rounded-card bg-surface p-4 shadow-e1">
        <h2 className="text-[15px] font-semibold text-ink-900">Overall health status</h2>
        {/*
         * A fixed 132pt gauge column rather than letting the gauge and its
         * legend size themselves. Sized by content, the legend's three labels
         * claimed most of the card and forced the status word — the one thing
         * on this card that must be read at a glance — to wrap onto two lines.
         */}
        <div className="mt-2 flex items-stretch gap-3">
          <div className="min-w-0 flex-1 self-center">
            <p className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-pill",
                  SEVERITY_TINT[record.severity],
                )}
                aria-hidden
              >
                <span className="h-2 w-2 rounded-pill bg-current" />
              </span>
              <span className="text-[18px] font-bold leading-tight text-ink-900">
                {SEVERITY_LABEL[record.severity]}
              </span>
            </p>
            <p className="mt-1.5 text-[12px] leading-snug text-ink-500">
              {SEVERITY_BLURB[record.severity]}
            </p>
          </div>
          <div className="flex w-[132px] shrink-0 flex-col items-center justify-center border-l border-line pl-3">
            <HealthGauge severity={record.severity} />
            <GaugeLegend severity={record.severity} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- highlights --- */}
      {measured.length > 0 ? (
        <section className="mt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold text-ink-900">Key highlights</h2>
            {flaggedCount > 0 ? (
              <span className="text-[12px] font-semibold text-danger-text">
                {flaggedCount} flagged
              </span>
            ) : null}
          </div>

          <ul className="mt-2 divide-y divide-line rounded-card bg-surface shadow-e1">
            {measured.map((entity) => (
              <EntityRow key={entity.id} entity={entity} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* ------------------------------------------------------- insight --- */}
      <section className="mt-4 rounded-card bg-brand-50 p-4">
        <p className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-tile bg-surface text-brand-600">
            <Sparkles size={16} aria-hidden />
          </span>
          <span className="text-[14px] font-semibold text-brand-700">{insight.headline}</span>
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-700">{insight.body}</p>
      </section>

      {/* ------------------------------------------------------ original --- */}
      <OriginalToggle
        url={originalUrl}
        rawText={record.rawText}
        fileLabel={record.title}
        confidence={record.confidence}
      />

      {/* ------------------------------------------------------- actions --- */}
      <h2 className="mt-5 text-[15px] font-semibold text-ink-900">
        What would you like to do?
      </h2>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {/*
         * Ask Cheeku is Phase 5 and sharing is Phase 6. These are marked
         * disabled rather than linked to a 404, and each says why on hover —
         * the same call made for the social sign-in buttons in Phase 3.
         */}
        <ActionTile
          icon={MessageCircle}
          title="Ask Cheeku"
          body="Get answers about this report"
          href={`/ask?record=${record.id}`}
        />
        <ActionTile
          icon={TrendingUp}
          title="Track changes"
          body="See how your numbers move"
          soon="Trends arrive with the companion phase"
        />
        <ActionTile
          icon={Share2}
          title="Share report"
          body="Send to a doctor or family"
          soon="Sharing arrives with the account phase"
        />
      </ul>
    </div>
  );
}

/*
 * The icon per measurement is chosen from the canonical name where one is
 * known, and falls back to a neutral glyph. Guessing an icon from free text
 * would put a blood drop next to a blood pressure reading often enough to be
 * worse than no icon at all.
 */
function entityIcon(entity: RecordEntity) {
  const key = (entity.canonicalName ?? entity.name).toLowerCase();
  if (key.includes("hemoglobin") || key.includes("haemoglobin")) return Droplet;
  if (key.includes("pressure") || key.includes("pulse") || key.includes("heart")) return Activity;
  return FileText;
}

function EntityRow({ entity }: { entity: RecordEntity }) {
  const Icon = entityIcon(entity);
  const flag = entity.flag;

  return (
    <li className="flex items-center gap-3 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-canvas text-brand-500">
        <Icon size={16} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-ink-500">{entity.name}</span>
        <span className="block truncate text-[15px] font-semibold text-ink-900">
          {formatValue(entity)}
        </span>
        {entity.refRange ? (
          <span className="block truncate text-[11px] text-ink-300">Range {entity.refRange}</span>
        ) : null}
      </span>
      {flag ? (
        <span
          className={cn(
            "shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
            FLAG_PILL[flag],
          )}
        >
          {FLAG_LABEL[flag]}
        </span>
      ) : null}
    </li>
  );
}

function ActionTile({
  icon: Icon,
  title,
  body,
  href,
  soon,
}: {
  icon: typeof MessageCircle;
  title: string;
  body: string;
  href?: string;
  soon?: string;
}) {
  const inner = (
    <>
      <span className="grid h-9 w-9 place-items-center rounded-tile bg-brand-50 text-brand-600">
        <Icon size={17} aria-hidden />
      </span>
      <span className="mt-2 block text-[13px] font-semibold text-ink-900">{title}</span>
      <span className="mt-0.5 block text-[11px] leading-snug text-ink-500">{body}</span>
    </>
  );

  if (!href) {
    return (
      <li>
        <div
          title={soon}
          aria-disabled
          className="h-full rounded-card border border-line bg-surface p-3 opacity-55"
        >
          {inner}
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        className="block h-full rounded-card border border-line bg-surface p-3 transition-colors hover:bg-brand-50/40"
      >
        {inner}
      </Link>
    </li>
  );
}
