import { describe, expect, it } from "vitest";

import { SPECIALTIES } from "@/lib/booking/catalog";

import { onShelf, routeFor, searchServices, serviceById, SERVICES } from "./catalog";
import { newReference, windowsFor } from "./provider";

describe("services catalogue", () => {
  it("puts fitness fourth on the core shelf, and keeps insurance for later", () => {
    expect(onShelf("core").map((s) => s.id)).toEqual(["doctors", "labs", "medicines", "fitness"]);
    expect(serviceById("insurance")).toMatchObject({ shelf: "soon", status: "soon" });
    const fitness = serviceById("fitness");
    expect(fitness && routeFor(fitness)).toBe("/fitness");
  });

  it("keeps doctors as one segment: no specialty has its own tile", () => {
    const ids = SERVICES.map((s) => s.id as string);
    for (const sp of ["gynae", "diet", "psych", "psychiatry"]) expect(ids).not.toContain(sp);
  });

  it("every 'see a specialist' offering points at a real specialty", () => {
    for (const s of SERVICES) for (const o of s.offerings) if (o.specialty) expect(Object.keys(SPECIALTIES)).toContain(o.specialty);
  });

  it("an emergency is a call, never a form", () => {
    const amb = serviceById("ambulance");
    expect(amb?.offerings.find((o) => o.id === "emergency")?.call).toBe("108");
    expect(amb?.urgent?.[0]?.call).toBe("108");
    expect(serviceById("mental")?.urgent?.[0]?.call).toBe("14416");
  });

  it("routes to the existing flows for doctors and labs, the service page for the rest", () => {
    const route = (id: string) => {
      const s = serviceById(id);
      return s ? routeFor(s) : null;
    };
    expect(route("doctors")).toBe("/services/doctors");
    expect(route("labs")).toBe("/labs");
    expect(route("physio")).toBe("/services/physio");
  });

  it("finds services by what people type", () => {
    expect(searchServices("nurse")[0]?.id).toBe("homecare");
    expect(searchServices("therapy")[0]?.id).toBe("mental");
    expect(searchServices("braces")[0]?.id).toBe("dental");
    expect(searchServices("glasses")[0]?.id).toBe("eye");
    expect(searchServices("")).toHaveLength(SERVICES.length);
  });
});

describe("provider windows", () => {
  const day = new Date(2026, 9, 6);
  it("offers every window on a later day", () => {
    expect(windowsFor("home", day, new Date(2026, 9, 5, 21))).toHaveLength(5);
  });
  it("needs three hours' notice for a visit and one for online, today", () => {
    expect(windowsFor("home", day, new Date(2026, 9, 6, 9, 30))).toEqual(["4-6 pm", "6-8 pm"]);
    expect(windowsFor("online", day, new Date(2026, 9, 6, 16))).toEqual(["5:30 pm", "7:00 pm", "8:30 pm"]);
  });
  it("makes short readable references", () => {
    expect(newReference(0.123456)).toMatch(/^CHK-[A-Z2-9]{6}$/);
  });
});
