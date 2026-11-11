import { describe, expect, it } from "vitest";

import { toDays } from "../../../supabase/functions/wearables-google/rollup";

describe("Google Health roll-ups", () => {
  it("maps civil dates and values onto day summaries", () => {
    const out = toDays(
      {
        steps: [{ civilStartTime: { date: { year: 2026, month: 11, day: 9 } }, steps: { countSum: "8123" } }],
        distance: [{ civilStartTime: { date: { year: 2026, month: 11, day: 9 } }, distance: { millimetersSum: 6420000 } }],
        "daily-resting-heart-rate": [{ civilStartTime: "2026-11-10T00:00:00", dailyRestingHeartRate: { beatsPerMinute: 61.4 } }],
        weight: [{ civilStartTime: { date: { year: 2026, month: 11, day: 10 } }, weight: { weightGramsAvg: 72450 } }],
      },
      "2026-11-09",
      "2026-11-10",
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ day: "2026-11-09", steps: 8123, distanceKm: 6.42, sources: ["google_health"] });
    expect(out[1]).toMatchObject({ day: "2026-11-10", restingHr: 61, weightKg: 72.5 });
  });

  it("drops points outside the asked range or without a date", () => {
    const out = toDays({ steps: [{ steps: { countSum: 10 } }, { civilStartTime: "2026-01-01", steps: { countSum: 5 } }] }, "2026-11-01", "2026-11-02");
    expect(out).toEqual([]);
  });
});
