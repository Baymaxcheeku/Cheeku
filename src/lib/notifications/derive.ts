import type { RecordSummary } from "@/lib/records/types";
import { formatEventDate } from "@/lib/records/grouping";

export type HomeNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  time: string;
};

/*
 * Notifications are derived from records that already exist and are already
 * flagged — never invented. A due-date reminder or "time for your checkup"
 * push is exactly the fabricated clinical prompt rule 4 forbids, so the only
 * source here is "a record needs a look", stated plainly.
 */
export function deriveNotifications(records: readonly RecordSummary[]): HomeNotification[] {
  return records
    .filter((record) => record.severity !== "normal")
    .slice(0, 8)
    .map((record) => ({
      id: record.id,
      title: record.title,
      body:
        record.severity === "high_risk"
          ? "Flagged as high priority, worth a look"
          : "Outside the printed range, worth a look",
      href: `/records/${record.id}`,
      time: formatEventDate(record.eventDate),
    }));
}
