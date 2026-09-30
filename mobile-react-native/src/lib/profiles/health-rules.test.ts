import { describe, expect, it } from "vitest";

import { ageFrom, conditionSuggestions, stageFor } from "./health-rules";

const NOW = new Date(2026, 8, 30);

describe("ageFrom", () => {
  it("counts whole years and respects the birthday", () => {
    expect(ageFrom("1996-03-14", NOW)).toBe(30);
    expect(ageFrom("1996-12-14", NOW)).toBe(29);
  });
  it("is null for missing, unreadable or future dates", () => {
    expect(ageFrom("", NOW)).toBeNull();
    expect(ageFrom("not a date", NOW)).toBeNull();
    expect(ageFrom("2030-01-01", NOW)).toBeNull();
  });
});

describe("stageFor and suggestions", () => {
  it("maps ages to life stages", () => {
    expect(stageFor(0)).toBe("baby");
    expect(stageFor(7)).toBe("child");
    expect(stageFor(34)).toBe("adult");
    expect(stageFor(72)).toBe("elder");
    expect(stageFor(null)).toBe("adult");
  });
  it("offers stage-appropriate chips", () => {
    expect(conditionSuggestions(0)).toContain("Jaundice at birth");
    expect(conditionSuggestions(30)).toContain("Pregnant");
    expect(conditionSuggestions(70)).toContain("Arthritis");
    expect(conditionSuggestions(70)).not.toContain("Pregnant");
  });
});
