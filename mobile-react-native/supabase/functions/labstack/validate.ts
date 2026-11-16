// COPY of src/lib/partner/validate.ts. Keep identical below this line (partner.test.ts checks).
/*
 * WHAT LABSTACK WILL ACCEPT, CHECKED BEFORE WE ASK.
 *
 * Every rule here is quoted from LabStack's API specs (docs/labstack-api).
 * The screens run these as the person types, and the gateway Edge Function
 * runs the same file again, so a person never meets a LabStack 400 and the
 * wording is always ours: what is wrong, and what to type instead.
 *
 * Pure: no imports from the app. The Edge Function copies this file as is.
 */

export type Check = { ok: true; value: string } | { ok: false; error: string };

const ok = (value: string): Check => ({ ok: true, value });
const no = (error: string): Check => ({ ok: false, error });

/** 10 digits, not starting with 0. "+91", spaces and dashes are taken off first. */
export function checkMobile(raw: string): Check {
  const d = raw.replace(/[\s-]/g, "").replace(/^\+?91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  if (!d) return no("Add a mobile number.");
  if (!/^\d+$/.test(d)) return no("Only digits, please.");
  if (d.length !== 10) return no("A 10-digit mobile number.");
  if (d.startsWith("0")) return no("A 10-digit mobile number, without the 0 at the start.");
  return ok(d);
}

/** Exactly 6 digits. */
export function checkPincode(raw: string): Check {
  const d = raw.replace(/\s/g, "");
  if (!d) return no("Add the pincode.");
  if (!/^\d{6}$/.test(d)) return no("A 6-digit pincode.");
  if (d.startsWith("0")) return no("Pincodes don't start with 0.");
  return ok(d);
}

/** Letters, digits and spaces; 1 to 50 after cleaning (LabStack strips the rest). */
export function checkName(raw: string): Check {
  const v = raw.normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
  if (!v) return no("Add a name.");
  if (v.length > 50) return no("Up to 50 letters.");
  return ok(v);
}

export function checkEmail(raw: string): Check {
  const v = raw.trim().toLowerCase();
  if (!v) return no("Add an email address. Reports and receipts go there.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return no("That email doesn't look right.");
  return ok(v);
}

/** YYYY-MM-DD, a real date, not in the future, age 0 to 120. */
export function checkDob(raw: string, today: Date = new Date()): Check {
  const v = raw.trim();
  if (!v) return no("Add the date of birth.");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return no("Date of birth as YYYY-MM-DD.");
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return no("That date doesn't exist.");
  if (d.getTime() > today.getTime()) return no("Date of birth can't be in the future.");
  if (ageOn(v, today) > 120) return no("Check the year.");
  return ok(v);
}

export function ageOn(dob: string, today: Date = new Date()): number {
  const [y, mo, d] = dob.split("-").map(Number) as [number, number, number];
  let a = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) a--;
  return a;
}

export type Gender = "MALE" | "FEMALE" | "OTHERS";

/** Our profile sex to LabStack's gender. Null: we have to ask (prefer not to say, or empty). */
export function genderFrom(sex: string | null | undefined): Gender | null {
  return sex === "male" ? "MALE" : sex === "female" ? "FEMALE" : sex === "other" ? "OTHERS" : null;
}

export type AddressParts = {
  unitFloorBuilding: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
};

/** The address as LabStack assembles it: "{unit}, {address}, {locality}, {city}, {state}". */
export function joinAddress(a: Pick<AddressParts, "unitFloorBuilding" | "address" | "locality" | "city" | "state">): string {
  return [a.unitFloorBuilding, a.address, a.locality, a.city, a.state].map((s) => s.trim()).filter(Boolean).join(", ");
}

export type AddressErrors = Partial<Record<keyof AddressParts | "whole", string>>;

/**
 * An address for a home service. `kind` sets the extra rule: lab home
 * collection wants the whole address 20 to 200 characters; pharmacy home
 * delivery caps the street line at 200.
 */
export function checkAddress(a: AddressParts, kind: "lab" | "pharmacy" | "visit"): AddressErrors {
  const e: AddressErrors = {};
  if (!a.address.trim()) e.address = "Add the street and area.";
  else if (kind === "pharmacy" && a.address.trim().length > 200) e.address = "Up to 200 characters.";
  if (!a.city.trim()) e.city = "Add the city.";
  if (!a.state.trim()) e.state = "Add the state.";
  const pin = checkPincode(a.pincode);
  if (!pin.ok) e.pincode = pin.error;
  if (kind === "lab" && !e.address) {
    const n = joinAddress(a).length;
    if (n < 20) e.whole = "Add a little more: flat, building or a landmark, so the collector finds you.";
    else if (n > 200) e.whole = "The full address is over 200 characters. Shorten the street or landmark.";
  }
  return e;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** pdf, jpg, jpeg or png; at most 10 MB. */
export function checkFile(fileName: string, bytes: number): Check {
  if (!/\.(pdf|jpe?g|png)$/i.test(fileName)) return no("A PDF, JPG or PNG, please.");
  if (bytes > MAX_FILE_BYTES) return no("That file is over 10 MB.");
  return ok(fileName);
}

/** Pharmacy: 1 to 100 of any one drug. */
export function checkQuantity(n: number): Check {
  if (!Number.isInteger(n) || n < 1) return no("At least 1.");
  if (n > 100) return no("At most 100 of one medicine.");
  return ok(String(n));
}

/** Pharmacy search: at least 3 characters. */
export function checkQuery(raw: string): Check {
  const v = raw.trim();
  return v.length >= 3 ? ok(v) : no("Type at least 3 letters.");
}

export function checkLength(raw: string, max: number, what: string): Check {
  return raw.trim().length <= max ? ok(raw.trim()) : no(`${what}: up to ${max} characters.`);
}

/**
 * A picture link fit to show: https only (phones block plain http), with a
 * missing scheme added ("www.x.com/a.png"). Anything else is no picture.
 */
export function imageUrl(raw: string | null | undefined): string | null {
  const u = (raw ?? "").trim();
  if (!u) return null;
  const withScheme = u.startsWith("//") ? `https:${u}` : /^[a-z]+:\/\//i.test(u) ? u.replace(/^http:\/\//i, "https://") : `https://${u}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" && url.hostname.includes(".") && /\.(png|jpe?g|webp|gif)$|\/[^.]*$/i.test(url.pathname) ? url.toString() : null;
  } catch {
    return null;
  }
}
