import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => ({ kv: { get: async () => null, set: async () => undefined, remove: async () => undefined } }));

const { DEFAULT_OFFLINE, parseOfflinePrefs, withinWindow } = await import("./prefs");

const DAY = 24 * 60 * 60 * 1000;

describe("parseOfflinePrefs", () => {
  it("defaults when nothing is stored or the value is broken", () => {
    expect(parseOfflinePrefs(null)).toEqual(DEFAULT_OFFLINE);
    expect(parseOfflinePrefs("not json")).toEqual(DEFAULT_OFFLINE);
  });

  it("keeps a valid choice and repairs an invalid window", () => {
    expect(parseOfflinePrefs('{"enabled":false,"days":3}')).toEqual({ enabled: false, days: 3 });
    expect(parseOfflinePrefs('{"enabled":true,"days":30}')).toEqual({ enabled: true, days: DEFAULT_OFFLINE.days });
  });
});

describe("withinWindow", () => {
  const now = 1_800_000_000_000;

  it("keeps a snapshot inside the window", () => {
    expect(withinWindow(now - 2 * DAY, { enabled: true, days: 3 }, now)).toBe(true);
  });

  it("drops one outside the window", () => {
    expect(withinWindow(now - 2 * DAY, { enabled: true, days: 1 }, now)).toBe(false);
  });

  it("drops everything when offline reading is off", () => {
    expect(withinWindow(now, { enabled: false, days: 7 }, now)).toBe(false);
  });

  it("drops a snapshot from the future", () => {
    expect(withinWindow(now + DAY, { enabled: true, days: 7 }, now)).toBe(false);
  });
});
