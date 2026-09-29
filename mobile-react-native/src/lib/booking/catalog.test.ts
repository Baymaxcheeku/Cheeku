import { describe, expect, it } from "vitest";

import { CONCERNS, DOCTORS, SPECIALTIES, addDays, doctorsFor, slotsFor, type Doctor } from "@/lib/booking/catalog";

const first = DOCTORS[0] as Doctor;

describe("booking catalogue", () => {
  it("always offers a general physician for adult concerns", () => {
    // "Start with a GP" is the one routing advice that is safe for anything.
    // The child concern leads with a paediatrician but still offers a GP.
    for (const c of CONCERNS) expect(c.departments).toContain("gp");
  });

  it("only names departments that exist", () => {
    for (const c of CONCERNS) for (const d of c.departments) expect(SPECIALTIES[d]).toBeDefined();
  });

  it("lists only doctors who offer the chosen mode", () => {
    for (const d of doctorsFor("gp", "clinic")) expect(d.fee.clinic).toBeDefined();
    for (const d of doctorsFor("derm", "online")) expect(d.fee.online).toBeDefined();
  });

  it("gives every specialty someone to see, in at least one mode", () => {
    for (const id of Object.keys(SPECIALTIES) as (keyof typeof SPECIALTIES)[]) {
      expect(doctorsFor(id, "online").length + doctorsFor(id, "clinic").length).toBeGreaterThan(0);
    }
  });

  it("shows the same slots every time for the same doctor and day", () => {
    const doc = first;
    const day = addDays(new Date(), 2);
    expect(slotsFor(doc, "online", day)).toEqual(slotsFor(doc, "online", day));
  });

  it("marks some slots taken, so a day never looks implausibly empty", () => {
    const doc = first;
    const all = [1, 2, 3, 4, 5].flatMap((n) => slotsFor(doc, "online", addDays(new Date(), n)));
    expect(all.some((s) => s.taken)).toBe(true);
    expect(all.some((s) => !s.taken)).toBe(true);
  });

  it("uses half-hour arrival windows for clinic visits", () => {
    const slots = slotsFor(first, "clinic", addDays(new Date(), 1));
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) expect(s.label).toMatch(/ – /);
  });
});
