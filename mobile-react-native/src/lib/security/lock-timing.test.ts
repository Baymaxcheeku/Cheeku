import { describe, expect, it } from "vitest";

import { parseLockDelay, shouldLock } from "./lock-timing";

describe("parseLockDelay", () => {
  it("accepts the offered delays", () => {
    expect(parseLockDelay("60")).toBe(60);
    expect(parseLockDelay("300")).toBe(300);
  });

  it("falls back to immediately for anything else", () => {
    expect(parseLockDelay(null)).toBe(0);
    expect(parseLockDelay("")).toBe(0);
    expect(parseLockDelay("86400")).toBe(0);
    expect(parseLockDelay("abc")).toBe(0);
  });
});

describe("shouldLock", () => {
  it("always locks when the delay is immediate", () => {
    expect(shouldLock(0, 0)).toBe(true);
    expect(shouldLock(10, 0)).toBe(true);
  });

  it("waits out the delay", () => {
    expect(shouldLock(59_000, 60)).toBe(false);
    expect(shouldLock(60_000, 60)).toBe(true);
    expect(shouldLock(299_999, 300)).toBe(false);
    expect(shouldLock(300_000, 300)).toBe(true);
  });

  it("locks when the clock went backwards", () => {
    expect(shouldLock(-5_000, 300)).toBe(true);
    expect(shouldLock(Number.NaN, 60)).toBe(true);
  });
});
