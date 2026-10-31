import { describe, expect, it } from "vitest";

import type { Place } from "./geo";
import { addressFrom, distanceKm, freshness, placeLine, shouldGeocode, shouldSave } from "./rules";

const at = (lat: number, lng: number, over: Partial<Place> = {}): Place => ({ lat, lng, label: "Indiranagar, Bengaluru", locality: "Indiranagar", city: "Bengaluru", district: null, state: "Karnataka", pincode: "560038", countryCode: "IN", formatted: "12th Main Rd, Indiranagar, Bengaluru 560038", provider: "ola", ...over });

describe("when a fix is worth a lookup or a save", () => {
  const home = at(12.9719, 77.6412);

  it("looks the address up again only after 250 m, or when there is none", () => {
    expect(shouldGeocode(null, 12.97, 77.64)).toBe(true);
    expect(shouldGeocode(home, 12.9725, 77.6415)).toBe(false);
    expect(shouldGeocode(home, 12.9755, 77.6412)).toBe(true);
    expect(shouldGeocode({ ...home, provider: "none" }, 12.9719, 77.6412)).toBe(true);
  });

  it("saves on a real move, a new pincode, or every 30 minutes", () => {
    const t = 1_000_000_000;
    expect(shouldSave(null, 0, home, t)).toBe(true);
    expect(shouldSave(home, t, at(12.972, 77.6413), t + 60_000)).toBe(false);
    expect(shouldSave(home, t, at(12.98, 77.6412), t + 60_000)).toBe(true);
    expect(shouldSave({ ...home, pincode: null }, t, home, t + 60_000)).toBe(true);
    expect(shouldSave(home, t, home, t + 31 * 60_000)).toBe(true);
  });

  it("measures distance the same way the server does", () => {
    expect(distanceKm({ lat: 12.9756, lng: 77.6066 }, { lat: 12.9784, lng: 77.6408 })).toBeCloseTo(3.7, 1);
  });
});

describe("words for a place", () => {
  it("adds the pincode to an address only when it is missing", () => {
    expect(addressFrom(at(1, 1))).toBe("12th Main Rd, Indiranagar, Bengaluru 560038");
    expect(addressFrom(at(1, 1, { formatted: null }))).toBe("Indiranagar, Bengaluru, 560038");
    expect(addressFrom(null)).toBe("");
  });

  it("reads freshness like a person would", () => {
    const now = Date.parse("2026-10-25T12:00:00Z");
    expect(freshness(now - 20_000, now)).toBe("Just now");
    expect(freshness(now - 12 * 60_000, now)).toBe("12 min ago");
    expect(freshness(now - 3 * 3_600_000, now)).toBe("3 h ago");
    expect(freshness("2026-10-24T12:00:00Z", now)).toBe("1 day ago");
  });

  it("shows a place with its pincode, or says it is not set", () => {
    expect(placeLine(at(1, 1))).toBe("Indiranagar, Bengaluru · 560038");
    expect(placeLine(null)).toBe("Not set");
  });
});
