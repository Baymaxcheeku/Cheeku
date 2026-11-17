import { describe, expect, it } from "vitest";

import { familyMode, joinNames, planChange } from "./family-plan";

const FAMILY = [{ name: "Athar" }, { name: "Amma" }, { name: "Ananya" }];

describe("familyMode", () => {
  it("maps every tier to one of three experiences", () => {
    expect(familyMode("family")).toBe("family");
    expect(familyMode("solo")).toBe("solo");
    expect(familyMode("micro")).toBe("solo");
    expect(familyMode("free")).toBe("free");
  });
});

describe("planChange", () => {
  it("names who is paused when Family drops to Solo", () => {
    const c = planChange(FAMILY, "family", "solo");
    expect(c.keep).toEqual(["Athar"]);
    expect(c.pause).toEqual(["Amma", "Ananya"]);
    expect(c.unpause).toEqual([]);
  });

  it("names who comes back when Solo goes to Family", () => {
    const c = planChange(FAMILY, "solo", "family");
    expect(c.unpause).toEqual(["Amma", "Ananya"]);
    expect(c.pause).toEqual([]);
    expect(c.seatsAfter).toBe(4);
  });

  it("pauses nobody when there is nobody else", () => {
    expect(planChange([{ name: "Athar" }], "family", "free").pause).toEqual([]);
  });

  it("says what free means for chats", () => {
    expect(planChange(FAMILY, "solo", "free").chatLine).toMatch(/1000 chats a day/);
  });
});

describe("joinNames", () => {
  it("reads like a sentence", () => {
    expect(joinNames(["Amma"])).toBe("Amma");
    expect(joinNames(["Amma", "Ananya"])).toBe("Amma and Ananya");
    expect(joinNames(["Amma", "Ananya", "Papa"])).toBe("Amma, Ananya and Papa");
  });
});
