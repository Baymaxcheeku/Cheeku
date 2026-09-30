import { describe, expect, it } from "vitest";

import { ADULT_FACE_IDS, facePool, isChild, KID_FACE_IDS } from "./face-pool";

describe("facePool", () => {
  it("uses the date of birth first", () => {
    expect(facePool(2, "Son")).toBe(KID_FACE_IDS);
    expect(facePool(12, "Someone else")).toBe(KID_FACE_IDS);
    expect(facePool(13, "Daughter")).toBe(ADULT_FACE_IDS);
    expect(facePool(34, "Son")).toBe(ADULT_FACE_IDS);
  });

  it("falls back to the relationship when age is unknown", () => {
    expect(isChild(null, "Daughter")).toBe(true);
    expect(isChild(null, "Baby")).toBe(true);
    expect(isChild(null, "Granddaughter")).toBe(true);
    expect(isChild(null, "Mother")).toBe(false);
    expect(isChild(null, "Grandfather")).toBe(false);
    expect(isChild(null, "Spouse")).toBe(false);
  });

  it("keeps the two bands apart and valid for the database", () => {
    expect(KID_FACE_IDS).toEqual(["f40", "f41", "f42", "f43", "f44"]);
    expect(ADULT_FACE_IDS).toHaveLength(15);
    expect(ADULT_FACE_IDS.some((id) => KID_FACE_IDS.includes(id))).toBe(false);
    for (const id of [...ADULT_FACE_IDS, ...KID_FACE_IDS]) expect(id).toMatch(/^(p|f)[0-9]{1,2}$/);
  });
});
