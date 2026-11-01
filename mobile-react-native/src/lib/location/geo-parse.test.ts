import { describe, expect, it } from "vitest";

import { labelFor, parseOlaReverse, parseOlaSearch, parseOsmReverse, parseOsmSearch, reverseKey, searchKey } from "../../../supabase/functions/geo/parse";

// Shapes as the providers answer them (trimmed). Ola follows Google's
// geocoding shape; Nominatim is format=jsonv2 with addressdetails=1.

const OLA_REVERSE = {
  status: "ok",
  results: [
    {
      formatted_address: "100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka, 560038, India",
      address_components: [
        { long_name: "100 Feet Rd", short_name: "100 Feet Rd", types: ["route"] },
        { long_name: "Indiranagar", short_name: "Indiranagar", types: ["sublocality", "sublocality_level_1"] },
        { long_name: "Bengaluru", short_name: "Bengaluru", types: ["locality"] },
        { long_name: "Bangalore Urban", short_name: "Bangalore Urban", types: ["administrative_area_level_2"] },
        { long_name: "Karnataka", short_name: "KA", types: ["administrative_area_level_1"] },
        { long_name: "560038", short_name: "560038", types: ["postal_code"] },
        { long_name: "India", short_name: "IN", types: ["country"] },
      ],
      geometry: { location: { lat: 12.9716, lng: 77.6408 } },
    },
  ],
};

const OSM_REVERSE = {
  lat: "12.9716",
  lon: "77.6408",
  display_name: "Indiranagar, Bengaluru, Bangalore Urban, Karnataka, 560038, India",
  address: { suburb: "Indiranagar", city: "Bengaluru", state_district: "Bangalore Urban", state: "Karnataka", postcode: "560038", country: "India", country_code: "in" },
};

describe("reverse geocoding answers", () => {
  it("reads Ola's components into a place with a pincode", () => {
    const p = parseOlaReverse(OLA_REVERSE, 12.9716, 77.6408);
    expect(p).toMatchObject({ label: "Indiranagar, Bengaluru", locality: "Indiranagar", city: "Bengaluru", district: "Bangalore Urban", state: "Karnataka", pincode: "560038", countryCode: "IN", provider: "ola" });
  });

  it("reads OpenStreetMap's address the same way", () => {
    expect(parseOsmReverse(OSM_REVERSE, 12.9716, 77.6408)).toMatchObject({ label: "Indiranagar, Bengaluru", pincode: "560038", countryCode: "IN", provider: "osm" });
  });

  it("falls back from a suburb to a town, and drops a bad pincode", () => {
    const p = parseOsmReverse({ display_name: "Kasauli, Solan, Himachal Pradesh", address: { town: "Kasauli", state_district: "Solan", state: "Himachal Pradesh", postcode: "17 32", country_code: "in" } }, 30.9, 76.96);
    expect(p).toMatchObject({ label: "Kasauli", city: "Kasauli", pincode: null });
  });

  it("returns nothing for an empty or error answer", () => {
    expect(parseOlaReverse({ status: "ok", results: [] }, 1, 1)).toBeNull();
    expect(parseOsmReverse({ error: "Unable to geocode" }, 1, 1)).toBeNull();
  });
});

describe("place search answers", () => {
  it("keeps Ola predictions that carry coordinates", () => {
    const places = parseOlaSearch({
      predictions: [
        { description: "Koramangala, Bengaluru, Karnataka, India", structured_formatting: { main_text: "Koramangala", secondary_text: "Bengaluru, Karnataka, India" }, terms: [{ value: "Koramangala" }, { value: "Bengaluru" }, { value: "Karnataka" }, { value: "India" }], geometry: { location: { lat: 12.9352, lng: 77.6245 } } },
        { description: "No point here", structured_formatting: { main_text: "Nowhere" } },
      ],
    });
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({ label: "Koramangala, Bengaluru", state: "Karnataka", lat: 12.9352 });
  });

  it("reads OpenStreetMap search results", () => {
    const places = parseOsmSearch([{ lat: "26.8467", lon: "80.9462", name: "Lucknow", display_name: "Lucknow, Uttar Pradesh, India", address: { city: "Lucknow", state: "Uttar Pradesh", country_code: "in" } }]);
    expect(places[0]).toMatchObject({ label: "Lucknow", city: "Lucknow", locality: null, lng: 80.9462 });
  });

  it("never returns a label longer than a chip can hold", () => {
    expect(labelFor({ locality: "A".repeat(70), city: "B".repeat(70), district: null, state: null, formatted: null }).length).toBeLessThanOrEqual(80);
    expect(labelFor({ locality: null, city: null, district: null, state: null, formatted: null })).toBe("Near you");
  });
});

describe("cache keys", () => {
  it("shares a reverse answer across a ~110 m cell, and a search across a rough area", () => {
    expect(reverseKey(12.97161, 77.64081)).toBe(reverseKey(12.97199, 77.64119));
    expect(searchKey("  Koramangala!! ", { lat: 12.97, lng: 77.64 })).toBe("s:koramangala|13.0,77.6");
  });
});
