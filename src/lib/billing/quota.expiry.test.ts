import { describe, expect, it } from "vitest";

import { DAILY_PASS_HOURS, isUnlimited, planFor, PLAN_ORDER, seatsFor, allowsFamily } from "./plans";

/*
 * The Daily pass is the first tier whose entitlement depends on the clock, so
 * the pieces that decide it are pinned here. The expiry comparison itself lives
 * in quota.ts behind `requireUser()`, which cannot run in a unit test — what is
 * testable, and what actually broke things when wrong, is that `isUnlimited`
 * alone is NOT treated as "valid": it must be paired with an expiry check.
 */

describe("plans — the Daily pass", () => {
  it("is offered alongside the two monthly plans, most popular first", () => {
    expect(PLAN_ORDER.map((p) => p.tier)).toEqual(["family", "solo", "micro"]);
  });

  it("is priced per day, not per month", () => {
    expect(planFor("micro").period).toBe("day");
    expect(planFor("micro").priceInPaise).toBe(2_900);
  });

  it("keeps the settled monthly prices", () => {
    expect(planFor("solo").priceInPaise).toBe(9_900);
    expect(planFor("family").priceInPaise).toBe(24_900);
  });

  it("has no chat ceiling while it lasts", () => {
    expect(isUnlimited("micro")).toBe(true);
  });

  it("covers one person only — family access is the Family plan's job", () => {
    expect(seatsFor("micro")).toBe(1);
    expect(seatsFor("solo")).toBe(1);
    expect(seatsFor("family")).toBe(4);
    expect(allowsFamily("micro")).toBe(false);
    expect(allowsFamily("solo")).toBe(false);
    expect(allowsFamily("family")).toBe(true);
  });

  it("lasts a whole day", () => {
    expect(DAILY_PASS_HOURS).toBe(24);
  });
});

describe("plans — free tier", () => {
  it("has a ceiling and no family access", () => {
    expect(isUnlimited("free")).toBe(false);
    expect(allowsFamily("free")).toBe(false);
  });
});
