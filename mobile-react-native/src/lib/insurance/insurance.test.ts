import { describe, expect, it } from "vitest";

import { coverReply, coverSummary, coverTopic, isCoverQuestion } from "./explain";
import { asDetails, draftFrom, indianNumber, emptyDraft, parseRupees, PRE_EXISTING, policyLine, readPolicy, rowFromDraft, validateDraft, type Policy } from "./policy";

const NOW = new Date("2026-11-01T10:00:00Z");

function row(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "p1",
    insurer: "Niva Bupa",
    plan: "ReAssure 2.0",
    policy_no: "NB-123",
    policy_type: "family_floater",
    sum_insured: 1_500_000,
    claimed: 0,
    start_date: "2026-02-07",
    end_date: "2027-02-06",
    premium_amount: 24_000,
    premium_frequency: "yearly",
    tpa_name: null,
    tpa_phone: null,
    cashless: true,
    co_pay: null,
    room_rent: "Single private room",
    waiting: [{ label: PRE_EXISTING, until: "2028-02-07" }],
    benefits: ["maternity", "day_care", "not-a-benefit"],
    exclusions: ["Cosmetic surgery", "Dental unless from an accident"],
    notes: null,
    covered_profile_ids: ["a", "b"],
    document_id: null,
    source: "manual",
    ...over,
  };
}

const policy = (over: Record<string, unknown> = {}) => readPolicy(row(over)) as Policy;

describe("parseRupees", () => {
  it("reads the ways people type cover", () => {
    expect(parseRupees("500000")).toBe(500_000);
    expect(parseRupees("5,00,000")).toBe(500_000);
    expect(parseRupees("5 lakh")).toBe(500_000);
    expect(parseRupees("5L")).toBe(500_000);
    expect(parseRupees("1.5 cr")).toBe(15_000_000);
    expect(parseRupees("₹ 18,500")).toBe(18_500);
    expect(parseRupees("25k")).toBe(25_000);
  });
  it("refuses what is not a number", () => {
    expect(parseRupees("")).toBeNull();
    expect(parseRupees("five lakh")).toBeNull();
    expect(parseRupees("5 lakh 2")).toBeNull();
  });
});

describe("indianNumber", () => {
  it("groups the Indian way", () => {
    expect(indianNumber(1_000_000)).toBe("10,00,000");
    expect(indianNumber(85_000)).toBe("85,000");
    expect(indianNumber(999)).toBe("999");
    expect(indianNumber(15_000_000)).toBe("1,50,00,000");
  });
});

describe("readPolicy", () => {
  it("reads a row and drops what it doesn't know", () => {
    const p = policy();
    expect(p.benefits).toEqual(["maternity", "day_care"]);
    expect(p.waiting).toEqual([{ label: PRE_EXISTING, until: "2028-02-07" }]);
    expect(p.premium).toEqual({ amount: 24_000, frequency: "yearly" });
  });
  it("refuses a row without the essentials", () => {
    expect(readPolicy(row({ insurer: "" }))).toBeNull();
    expect(readPolicy(row({ policy_no: null }))).toBeNull();
  });
  it("defaults an unknown type to individual", () => {
    expect(policy({ policy_type: "weird" }).policyType).toBe("individual");
  });
});

describe("the form", () => {
  it("asks for the four essentials and someone to cover", () => {
    const e = validateDraft(emptyDraft());
    expect(Object.keys(e).sort()).toEqual(["covered", "insurer", "policyNo", "sumInsured"]);
  });
  it("catches dates the wrong way round and claims over the cover", () => {
    const d = { ...emptyDraft(["a"]), insurer: "X", policyNo: "1", sumInsured: "5 lakh", claimed: "6 lakh", start: "2027-01-01", end: "2026-01-01" };
    const e = validateDraft(d);
    expect(e.end).toBeDefined();
    expect(e.claimed).toBeDefined();
  });
  it("round-trips a policy through the form unchanged", () => {
    const p = policy();
    const back = readPolicy({ ...rowFromDraft(draftFrom(p)), id: "p1", document_id: null, source: "manual" });
    expect(back).toEqual(p);
  });
  it("defaults to a floater when several people are picked", () => {
    expect(emptyDraft(["a", "b"]).policyType).toBe("family_floater");
    expect(emptyDraft(["a"]).policyType).toBe("individual");
  });
  it("writes the TPA phone only with a TPA name", () => {
    const d = { ...emptyDraft(["a"]), insurer: "X", policyNo: "1", sumInsured: "5L", tpaPhone: "1800" };
    expect(rowFromDraft(d).tpa_phone).toBeNull();
  });
});

describe("cover in plain words", () => {
  it("one line for a card", () => {
    expect(policyLine(policy(), NOW)).toBe("₹15 lakh cover · till 6 Feb 2027");
    expect(policyLine(policy({ claimed: 200_000 }), NOW)).toBe("₹15 lakh cover · ₹13 lakh left · till 6 Feb 2027");
    expect(policyLine(policy({ end_date: "2026-11-20" }), NOW)).toContain("renews in 19 days");
    expect(policyLine(policy({ end_date: "2026-10-01" }), NOW)).toContain("ended");
  });
  it("summarises who, what and when without inventing", () => {
    const s = coverSummary(policy({ cashless: null }), ["Athar", "Nisha"], NOW);
    expect(s[0]).toContain("Covers Athar and Nisha");
    expect(s.join(" ")).not.toMatch(/cashless/i);
    expect(s.join(" ")).toContain("covered from 7 Feb 2028");
  });
  it("feeds the record page's shape", () => {
    expect(asDetails(policy(), ["Athar"]).members).toEqual([{ name: "Athar", relation: null }]);
  });
});

describe("chat", () => {
  it("knows an insurance question from a health one", () => {
    expect(isCoverQuestion("is my cataract surgery covered by insurance?")).toBe(true);
    expect(isCoverQuestion("what's the room rent limit")).toBe(true);
    expect(isCoverQuestion("my head hurts since morning")).toBe(false);
    expect(isCoverQuestion("should I cover the wound with a bandage?")).toBe(false);
    expect(isCoverQuestion("is the knee surgery covered?")).toBe(true);
    expect(isCoverQuestion("what's my privacy setting")).toBe(false);
  });
  it("finds the topic", () => {
    expect(coverTopic("is room rent capped?")).toBe("room_rent");
    expect(coverTopic("is the delivery covered?")).toBe("maternity");
    expect(coverTopic("how do I file a claim")).toBe("claim");
    expect(coverTopic("cataract operation")).toBe("day_care");
    expect(coverTopic("tell me about my policy")).toBe("general");
  });
  it("answers from the policy and says when it is silent", () => {
    const p = policy();
    expect(coverReply("is maternity covered?", "Nisha", [p], NOW).paragraphs[0]).toContain("listed as included");
    const silent = coverReply("is OPD covered?", "Nisha", [p], NOW).paragraphs[0];
    expect(silent).toContain("don't say");
    expect(silent).toContain("Niva Bupa can confirm");
    expect(coverReply("is cosmetic surgery covered?", "Nisha", [p], NOW).paragraphs[0]).toContain("in the exclusions you saved");
    expect(coverReply("is a knee replacement covered?", "Nisha", [p], NOW).paragraphs[0]).toContain("don't say");
    expect(coverReply("tell me about my policy", "Nisha", [p], NOW).paragraphs[0]).toContain("Active till");
  });
  it("answers a hospital stay from the saved terms, not with silence", () => {
    expect(coverTopic("Does my insurance cover hospital stays?")).toBe("hospital");
    expect(coverTopic("is it covered if I'm admitted?")).toBe("hospital");
    expect(coverTopic("are bills after hospital covered?")).toBe("pre_post");
    const r = coverReply("Does my insurance cover hospital stays?", "Nisha", [policy()], NOW).paragraphs;
    expect(r[0]).toMatch(/^Yes\. A stay in hospital is what this policy is for/);
    expect(r[1]).toMatch(/^What shapes the bill: /);
    expect(r.join(" ")).not.toContain("don't say");
  });
  it("reads a named condition as the pre-existing wait", () => {
    expect(coverTopic("is my diabetes covered?")).toBe("condition");
    expect(coverTopic("is my migraine covered?", ["Migraine"])).toBe("condition");
    const r = coverReply("is my diabetes covered?", "Nisha", [policy()], NOW).paragraphs;
    expect(r[0]).toContain("pre-existing condition");
  });
  it("points at adding a policy when there is none", () => {
    const r = coverReply("am I covered for surgery?", "Imaad", [], NOW);
    expect(r.paragraphs[0]).toContain("Imaad");
    expect(r.paragraphs[1]).toContain("Profile, Insurance");
  });
  it("says so when every policy has ended", () => {
    const r = coverReply("how much cover is left", "Nisha", [policy({ end_date: "2026-01-01" })], NOW);
    expect(r.paragraphs.join(" ")).toContain("has ended");
  });
  it("always closes with whose word counts", () => {
    expect(coverReply("claim?", "N", [policy()], NOW).paragraphs.at(-1)).toContain("policy wording");
  });
});
