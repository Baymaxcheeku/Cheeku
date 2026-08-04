import type { RecordSummary } from "./types";

/*
 * D1 groups by recency ("Today", "This week"), D3 groups by calendar month.
 * Both are pure functions of a date and a "now", so both are tested rather than
 * eyeballed — an off-by-one in a bucket boundary is invisible on screen until
 * the one day a year it is wrong.
 *
 * Everything works in local calendar days. A record uploaded at 23:50 should
 * say "Today" to the person who uploaded it, not shift to "Yesterday" because
 * the comparison happened in UTC.
 */

export type RecencyBucket = "today" | "yesterday" | "this_week" | "this_month" | "earlier";

export const RECENCY_LABEL: Record<RecencyBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
  earlier: "Earlier",
};

/** Midnight local time, so comparisons are between calendar days. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY);
}

export function recencyBucket(date: Date, now: Date): RecencyBucket {
  const delta = daysBetween(now, date);

  // A future-dated record — a scheduled test, or a typo — belongs at the top
  // with today's rather than in "Earlier", where nobody would look for it.
  if (delta <= 0) return "today";
  if (delta === 1) return "yesterday";
  if (delta < 7) return "this_week";

  const sameMonth = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  return sameMonth ? "this_month" : "earlier";
}

const BUCKET_ORDER: readonly RecencyBucket[] = [
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "earlier",
];

export type RecordGroup<K extends string> = { key: K; label: string; records: RecordSummary[] };

/**
 * D1's grouping. Records with no date sort to "Earlier" — they are real
 * documents and dropping them because a field is empty would lose data the user
 * can see in the list count.
 */
export function groupByRecency(
  records: readonly RecordSummary[],
  now: Date = new Date(),
): RecordGroup<RecencyBucket>[] {
  const buckets = new Map<RecencyBucket, RecordSummary[]>();

  for (const record of records) {
    const bucket = record.eventDate
      ? recencyBucket(new Date(`${record.eventDate}T00:00:00`), now)
      : "earlier";
    const list = buckets.get(bucket);
    if (list) list.push(record);
    else buckets.set(bucket, [record]);
  }

  return BUCKET_ORDER.filter((k) => buckets.has(k)).map((key) => ({
    key,
    label: RECENCY_LABEL[key],
    records: buckets.get(key) ?? [],
  }));
}

/**
 * D3's grouping: one section per calendar month, newest first, labelled
 * "May 2025". Undated records are omitted here rather than bucketed, because a
 * timeline is a claim about *when* — a row with no position on it is noise.
 */
export function groupByMonth(records: readonly RecordSummary[]): RecordGroup<string>[] {
  const buckets = new Map<string, RecordSummary[]>();

  for (const record of records) {
    if (!record.eventDate) continue;
    const key = record.eventDate.slice(0, 7); // YYYY-MM sorts lexicographically
    const list = buckets.get(key);
    if (list) list.push(record);
    else buckets.set(key, [record]);
  }

  return [...buckets.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({
      key,
      label: monthLabel(key),
      records: buckets.get(key) ?? [],
    }));
}

function monthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** "15 May 2025" — the frames' date format throughout. */
export function formatEventDate(iso: string | null): string {
  if (!iso) return "No date";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The timeline rail's day/month stack: "15" over "MAY". */
export function railDate(iso: string): { day: string; month: string } {
  const date = new Date(`${iso}T00:00:00`);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
  };
}
