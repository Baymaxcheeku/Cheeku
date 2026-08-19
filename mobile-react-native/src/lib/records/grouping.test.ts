import { describe, expect, it } from "vitest";

import { groupByMonth, groupByRecency, railDate, recencyBucket } from "./grouping";
import { severityFromFlags, type RecordSummary } from "./types";

/*
 * Bucket boundaries are the kind of thing that looks right every day except
 * one. These pin the edges: midnight, the 7-day cut, and the month rollover.
 */

const NOW = new Date(2025, 4, 15, 14, 30); // 15 May 2025, local
const d = (y: number, m: number, day: number, h = 0) => new Date(y, m - 1, day, h);

describe("recencyBucket", () => {
  it("calls the same calendar day 'today' regardless of time", () => {
    expect(recencyBucket(d(2025, 5, 15, 0), NOW)).toBe("today");
    expect(recencyBucket(d(2025, 5, 15, 23), NOW)).toBe("today");
  });

  it("treats a future date as today rather than burying it in 'earlier'", () => {
    expect(recencyBucket(d(2025, 6, 1), NOW)).toBe("today");
  });

  it("separates yesterday from the rest of the week", () => {
    expect(recencyBucket(d(2025, 5, 14), NOW)).toBe("yesterday");
    expect(recencyBucket(d(2025, 5, 13), NOW)).toBe("this_week");
  });

  it("ends 'this week' at the 7-day boundary", () => {
    expect(recencyBucket(d(2025, 5, 9), NOW)).toBe("this_week"); // 6 days
    expect(recencyBucket(d(2025, 5, 8), NOW)).toBe("this_month"); // 7 days
  });

  it("rolls into 'earlier' across a month boundary, not a 30-day window", () => {
    expect(recencyBucket(d(2025, 5, 1), NOW)).toBe("this_month");
    expect(recencyBucket(d(2025, 4, 30), NOW)).toBe("earlier");
  });

  it("does not call the same month in a different year 'this month'", () => {
    expect(recencyBucket(d(2024, 5, 10), NOW)).toBe("earlier");
  });
});

function rec(id: string, eventDate: string | null): RecordSummary {
  return {
    id,
    profileId: "p1",
    profileName: "Ananya Sharma",
    profileAvatarSeed: null,
    title: "Blood Test Report",
    docType: "lab_report",
    status: "filed",
    mimeType: "application/pdf",
    eventDate,
    facility: "Fortis",
    doctor: null,
    confidence: 0.92,
    severity: "normal",
    createdAt: "2025-05-15T09:30:00Z",
  };
}

describe("groupByRecency", () => {
  it("emits only non-empty buckets, in fixed order", () => {
    const groups = groupByRecency(
      [rec("a", "2025-05-15"), rec("b", "2025-04-02"), rec("c", "2025-05-14")],
      NOW,
    );
    expect(groups.map((g) => g.key)).toEqual(["today", "yesterday", "earlier"]);
  });

  it("keeps undated records rather than dropping them", () => {
    const groups = groupByRecency([rec("a", null)], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.records.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("groupByMonth", () => {
  it("orders months newest first and labels them", () => {
    const groups = groupByMonth([
      rec("a", "2025-04-10"),
      rec("b", "2025-05-15"),
      rec("c", "2025-05-02"),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["2025-05", "2025-04"]);
    expect(groups[0]?.label).toBe("May 2025");
    expect(groups[0]?.records).toHaveLength(2);
  });

  it("omits undated records — a timeline row needs a position", () => {
    expect(groupByMonth([rec("a", null)])).toEqual([]);
  });

  it("sorts across a year boundary by date, not by month number", () => {
    const groups = groupByMonth([rec("a", "2024-12-31"), rec("b", "2025-01-01")]);
    expect(groups.map((g) => g.key)).toEqual(["2025-01", "2024-12"]);
  });
});

describe("railDate", () => {
  it("zero-pads the day and upper-cases the month", () => {
    expect(railDate("2025-05-08")).toEqual({ day: "08", month: "MAY" });
  });
});

describe("severityFromFlags", () => {
  it("lets a single out-of-range value drive the whole document", () => {
    expect(severityFromFlags(["normal", "normal", "high"])).toBe("high_risk");
    expect(severityFromFlags(["normal", "low"])).toBe("high_risk");
  });

  it("ranks caution below high/low", () => {
    expect(severityFromFlags(["normal", "caution"])).toBe("borderline");
  });

  it("is normal only when everything is", () => {
    expect(severityFromFlags(["normal", "normal"])).toBe("normal");
    expect(severityFromFlags([])).toBe("normal");
  });
});
