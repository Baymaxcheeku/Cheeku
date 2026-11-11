import { describe, expect, it } from "vitest";

import { readReport } from "./report";

const row = {
  summary: "Your HbA1c has come down but is still above the lab's range.",
  generated_at: "2026-11-07T06:00:00Z",
  report: {
    summary: "Your HbA1c has come down but is still above the lab's range.",
    medicines: [
      { name: "Glycomet", salts: ["metformin"], purpose: "Commonly used to lower blood sugar.", howToTake: "1-0-1 for 30 days", tips: ["Take it after food, as written."], watch: [], unverified: false },
      { name: "Dolo", salts: ["paracetamol"], purpose: null, tips: [], watch: [] },
    ],
    longevity: [{ title: "Move after meals", why: "Your HbA1c is above the range.", action: "A ten minute walk after dinner." }, { title: "No why", action: "x" }],
    lifestyle: "not a list",
    discuss: ["Whether your treatment needs a review.", 42, ""],
    questions: ["What HbA1c should I aim for?"],
    unverified: true,
  },
};

describe("the health report", () => {
  it("keeps what is complete and drops what is not", () => {
    const r = readReport(row);
    expect(r?.summary).toMatch(/^Your HbA1c/);
    expect(r?.medicines.map((m) => m.name)).toEqual(["Glycomet"]); // nothing to explain about Dolo
    expect(r?.longevity).toHaveLength(1);
    expect(r?.lifestyle).toEqual([]);
    expect(r?.discuss).toEqual(["Whether your treatment needs a review."]);
    expect(r?.unverified).toBe(true);
    expect(r?.hasMore).toBe(true);
    expect(r?.note).toMatch(/not a diagnosis/);
  });

  it("falls back to the column summary, and is null without any", () => {
    expect(readReport({ summary: "Short.", report: {} })?.hasMore).toBe(false);
    expect(readReport({ summary: "", report: { summary: "  " } })).toBeNull();
    expect(readReport(null)).toBeNull();
  });
});
