import { describe, expect, it } from "vitest";

import { patientFor, patientReady, relationshipFor } from "./patient";
import { checkAddress, checkDob, checkEmail, checkFile, checkMobile, checkName, checkPincode, checkQuantity, genderFrom, joinAddress } from "./validate";

const TODAY = new Date(2026, 10, 16);

describe("LabStack's rules, checked before we ask", () => {
  it("mobile: 10 digits, no leading 0, +91 and spaces taken off", () => {
    expect(checkMobile("+91 98450 12345")).toEqual({ ok: true, value: "9845012345" });
    expect(checkMobile("09845012345")).toEqual({ ok: true, value: "9845012345" });
    expect(checkMobile("0845012345").ok).toBe(false);
    expect(checkMobile("98450").ok).toBe(false);
    expect(checkMobile("").ok).toBe(false);
  });
  it("pincode: 6 digits", () => {
    expect(checkPincode("560038").ok).toBe(true);
    expect(checkPincode("56003").ok).toBe(false);
    expect(checkPincode("056003").ok).toBe(false);
  });
  it("name: letters, digits, spaces, up to 50", () => {
    expect(checkName("  Arjun   Sharma! ")).toEqual({ ok: true, value: "Arjun Sharma" });
    expect(checkName("x".repeat(51)).ok).toBe(false);
  });
  it("email and date of birth", () => {
    expect(checkEmail("Arjun@Example.com")).toEqual({ ok: true, value: "arjun@example.com" });
    expect(checkEmail("arjun@").ok).toBe(false);
    expect(checkDob("1992-02-30", TODAY).ok).toBe(false);
    expect(checkDob("2030-01-01", TODAY).ok).toBe(false);
    expect(checkDob("1992-04-23", TODAY).ok).toBe(true);
  });
  it("lab address: the whole thing 20 to 200 characters, with city, state and pincode", () => {
    const a = { unitFloorBuilding: "", address: "12th Main", locality: "", city: "", state: "", pincode: "5600" };
    const e = checkAddress(a, "lab");
    expect(Object.keys(e).sort()).toEqual(["city", "pincode", "state", "whole"]);
    const good = { unitFloorBuilding: "Flat 302", address: "12th Main Road", locality: "Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038" };
    expect(checkAddress(good, "lab")).toEqual({});
    expect(joinAddress(good)).toBe("Flat 302, 12th Main Road, Indiranagar, Bengaluru, Karnataka");
  });
  it("files, quantities and gender", () => {
    expect(checkFile("rx.heic", 1000).ok).toBe(false);
    expect(checkFile("rx.pdf", 11 * 1024 * 1024).ok).toBe(false);
    expect(checkQuantity(101).ok).toBe(false);
    expect(genderFrom("prefer_not_to_say")).toBeNull();
    expect(genderFrom("female")).toBe("FEMALE");
  });
});

describe("one patient for three APIs", () => {
  const holder = { id: "p1", name: "Arjun Sharma", dob: "1992-04-23", sex: "male", relationship: null, isPrimary: true, phone: "9845012345" };
  const mother = { id: "p2", name: "Lakshmi Sharma", dob: "1962-07-01", sex: "female", relationship: "Mother", isPrimary: false, phone: null };
  const account = { email: "arjun@example.com", phone: "9845012345" };
  it("sends a family member as the account holder's dependant, with the holder's email and phone", () => {
    const r = patientFor(mother, holder, account, {}, TODAY);
    expect(patientReady(r)).toBe(true);
    expect(r.patient).toMatchObject({ uniqueId: "p2", mainUserUniqueId: "p1", relationship: "MOTHER", mobile: "9845012345", email: "arjun@example.com", gender: "FEMALE", age: 64 });
  });
  it("asks for what's missing", () => {
    const r = patientFor({ ...mother, sex: "prefer_not_to_say", dob: null }, holder, { email: null, phone: "9845012345" }, {}, TODAY);
    expect(r.missing.sort()).toEqual(["dateOfBirth", "email", "gender"]);
    expect(patientReady(patientFor({ ...mother, sex: null, dob: null }, holder, account, { gender: "FEMALE", dateOfBirth: "1962-07-01" }, TODAY))).toBe(true);
  });
  it("maps spouse and grandparent by sex", () => {
    expect(relationshipFor("Spouse", "female")).toBe("WIFE");
    expect(relationshipFor("Spouse", "male")).toBe("HUSBAND");
    expect(relationshipFor("Grandparent", "male")).toBe("GRANDFATHER");
    expect(relationshipFor("Someone else", null)).toBe("OTHER");
  });
});

describe("the server checks with the same rules", () => {
  it("supabase/functions/labstack/validate.ts is an exact copy", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const app = readFileSync(resolve(__dirname, "validate.ts"), "utf8");
    const server = readFileSync(resolve(__dirname, "../../../supabase/functions/labstack/validate.ts"), "utf8");
    expect(server.split("\n").slice(1).join("\n")).toBe(app);
  });
});

describe("the dashboard paste files", () => {
  it("match the Edge Function source (regenerate with node supabase/functions/labstack/bundle.mjs)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const { build } = (await import("../../../supabase/functions/labstack/bundle.mjs")) as { build: () => Record<string, string> };
    for (const [name, text] of Object.entries(build())) {
      expect(readFileSync(resolve(__dirname, "../../../supabase/manual", name), "utf8"), name).toBe(text);
    }
  });
});

describe("partner doctors as our doctors", async () => {
  const { asDoctor, departmentOf, partnerSpeciality } = await import("@/lib/booking/partner-doctors");
  const list = [
    { name: "General Physician", count: 12 },
    { name: "Cardiology", count: 3 },
    { name: "Psychiatry", count: 2 },
    { name: "Clinical Psychology", count: 1 },
    { name: "Dermatology", count: 0 },
  ];
  it("finds the partner's name for each department, or none", () => {
    expect(partnerSpeciality("gp", list)).toBe("General Physician");
    expect(partnerSpeciality("cardio", list)).toBe("Cardiology");
    expect(partnerSpeciality("psych", list)).toBe("Clinical Psychology");
    expect(partnerSpeciality("psychiatry", list)).toBe("Psychiatry");
    expect(partnerSpeciality("derm", list)).toBeNull(); // nobody listed
  });
  it("reads a provider's department back, GP when unclear", () => {
    expect(departmentOf(["Paediatrics"])).toBe("paeds");
    expect(departmentOf(["Psychiatry"])).toBe("psychiatry");
    expect(departmentOf(["Family Medicine"])).toBe("gp");
  });
  it("turns a provider into a bookable doctor with an ls- id and only the modes it offers", () => {
    const d = asDoctor({ lsId: 42, name: "Dr. Asha Rao", gender: "FEMALE", specialities: ["Cardiology"], languages: ["English"], years: 9, rating: 4.6, ratings: 20, types: ["ONLINE"], photo: null, place: "Indiranagar", distanceKm: 2, followUpUntil: null });
    expect(d).toMatchObject({ id: "ls-42", specialty: "cardio", fee: { online: 0 } });
    expect(d.fee.clinic).toBeUndefined();
  });
});

describe("partner pictures", async () => {
  const { imageUrl } = await import("./validate");
  it("keeps https photos and logos, fixes a missing scheme, upgrades http, drops junk", () => {
    expect(imageUrl("https://clinic.example/profile.png")).toBe("https://clinic.example/profile.png");
    expect(imageUrl("www.labs.example/logo.jpg")).toBe("https://www.labs.example/logo.jpg");
    expect(imageUrl("http://labs.example/logo.webp")).toBe("https://labs.example/logo.webp");
    expect(imageUrl("//cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(imageUrl(null)).toBeNull();
    expect(imageUrl("not a url")).toBeNull();
    expect(imageUrl("https://x.example/logo.svg")).toBeNull(); // phones can't draw remote SVG as an image
  });
});
