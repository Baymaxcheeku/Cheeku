"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, ChevronRight, LayoutList } from "lucide-react";

import { cn } from "@/lib/cn";
import { EmptyRecords, FileChip, RecordRow, SeverityPill } from "@/components/records/chrome";
import { groupByMonth, groupByRecency, railDate } from "@/lib/records/grouping";
import { SEVERITY_DOT, type RecordSummary } from "@/lib/records/types";

type View = "list" | "timeline";

/*
 * D1 and D3 as one screen with a segmented toggle, not two routes.
 *
 * Both were always the same records in a different arrangement — fetched the
 * same way, filtered the same way, empty in the same case. Splitting them
 * across a link meant a full navigation (and a fresh loading state) to answer
 * "what happened when" after already looking at "what do I have". Toggling in
 * place, with the two arrangements built from the one records array already on
 * the page, is instant and never shows a blank screen mid-switch.
 */
export function RecordsView({
  records,
  filtered,
  initialView = "list",
}: {
  records: readonly RecordSummary[];
  filtered: boolean;
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);

  const listGroups = groupByRecency(records);
  const monthGroups = groupByMonth(records);
  const empty = records.length === 0;

  return (
    <>
      <div className="mx-5 mt-3 flex rounded-pill bg-surface-tint p-1 shadow-e1">
        <ViewTab active={view === "list"} onClick={() => setView("list")} icon={LayoutList} label="List" />
        <ViewTab
          active={view === "timeline"}
          onClick={() => setView("timeline")}
          icon={CalendarRange}
          label="Timeline"
        />
      </div>

      {empty ? (
        <EmptyRecords filtered={filtered} />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {view === "list" ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {listGroups.map((group) => (
                <section key={group.key} className="mt-5 px-5">
                  <h2 className="text-[15px] font-semibold text-ink-900">{group.label}</h2>
                  <ul className="mt-2 space-y-2">
                    {group.records.map((record) => (
                      <RecordRow key={record.id} record={record} />
                    ))}
                  </ul>
                </section>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {monthGroups.map((month) => (
                <section key={month.key} className="mt-6">
                  <div className="flex items-center justify-between px-5">
                    <h2 className="text-[16px] font-bold text-ink-900">{month.label}</h2>
                    <span className="rounded-pill bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      {month.records.length} record{month.records.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <ul className="mt-3">
                    {month.records.map((record, i) => (
                      <TimelineRow
                        key={record.id}
                        record={record}
                        isLast={i === month.records.length - 1}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutList;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="tappable relative flex-1 rounded-pill py-2.5 text-[13px] font-semibold"
    >
      {active ? (
        <motion.span
          layoutId="records-view-pill"
          className="absolute inset-0 rounded-pill bg-brand-600 shadow-e1"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      ) : null}
      <span
        className={cn(
          "relative z-10 flex items-center justify-center gap-1.5",
          active ? "text-surface" : "text-ink-500",
        )}
      >
        <Icon size={15} aria-hidden />
        {label}
      </span>
    </button>
  );
}

/*
 * The timeline rail, redrawn: a continuous gradient line runs behind every
 * dot in a month rather than a fresh border on each row, so a month with five
 * records reads as one thread through time instead of five unrelated cards
 * that happen to be stacked. The date gets its own soft chip rather than bare
 * numerals, which is what makes the rail feel designed rather than typeset.
 */
function TimelineRow({ record, isLast }: { record: RecordSummary; isLast: boolean }) {
  const { day, month } = railDate(record.eventDate ?? "");

  return (
    <li className="flex gap-3 px-5">
      <div className="flex w-11 shrink-0 flex-col items-center pt-1">
        <span className="flex flex-col items-center rounded-tile bg-surface px-1.5 py-1 shadow-e1">
          <span className="text-[14px] font-bold leading-none text-ink-900">{day}</span>
          <span className="mt-0.5 text-[8.5px] font-bold leading-none tracking-wide text-ink-300">
            {month}
          </span>
        </span>
      </div>

      <div className="relative flex shrink-0 flex-col items-center">
        <span
          className={cn(
            "mt-1.5 h-3.5 w-3.5 shrink-0 rounded-pill border-[3px] bg-surface shadow-e1",
            SEVERITY_DOT[record.severity],
          )}
          aria-hidden
        />
        {!isLast ? (
          <span
            aria-hidden
            className="w-px flex-1 bg-gradient-to-b from-line to-line/40"
            style={{ minHeight: 20 }}
          />
        ) : null}
      </div>

      <Link
        href={`/records/${record.id}`}
        className="tappable mb-4 flex min-w-0 flex-1 items-center gap-2.5 rounded-card bg-surface p-2.5 shadow-e1 hover:bg-brand-50/40 active:scale-[0.99] active:bg-brand-50/60"
      >
        <FileChip mimeType={record.mimeType} docType={record.docType} compact />
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
