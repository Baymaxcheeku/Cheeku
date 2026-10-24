import { describe, expect, it } from "vitest";

import { joinAnd, softLower } from "./words";

describe("softLower", () => {
  it("lowers plain words and keeps names that carry their own capitals", () => {
    expect(softLower("Fasting glucose")).toBe("fasting glucose");
    expect(softLower("HbA1c")).toBe("HbA1c");
    expect(softLower("LDL cholesterol")).toBe("LDL cholesterol");
    expect(softLower("Vitamin D")).toBe("vitamin D");
    expect(softLower("Vitamin B12")).toBe("vitamin B12");
  });
});

describe("joinAnd", () => {
  it("reads like a sentence", () => {
    expect(joinAnd([])).toBe("");
    expect(joinAnd(["a"])).toBe("a");
    expect(joinAnd(["a", "b"])).toBe("a and b");
    expect(joinAnd(["a", "b", "c"])).toBe("a, b and c");
  });
});
