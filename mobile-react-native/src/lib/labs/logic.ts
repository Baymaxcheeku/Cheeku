/*
 * Lab tests: the pure rules (tested in logic.test.ts).
 *
 * Search, suggestions, pricing and the booking timeline, with no network and
 * no React, so every rule the screens lean on is pinned by a test. The
 * database does its own pricing when a booking is made (0027) and that is the
 * price charged; the numbers here are for showing before anyone commits, and
 * use the same rule (collection fee waived above a lab's threshold).
 */

export type LabPartner = {
  id: string;
  name: string;
  monogram: string;
  tagline: string;
  about: string;
  accreditation: string[];
  collectionFee: number;
  freeCollectionAbove: number | null;
  reportHours: number;
  color: string;
  isSample: boolean;
};

export type LabTest = {
  id: string;
  name: string;
  kind: "test" | "package";
  categories: string[];
  sample: string;
  fastingHours: number;
  parameters: number;
  includes: string[];
  about: string;
  keywords: string[];
  basePrice: number;
  popular: boolean;
};

export type LabOffer = { partnerId: string; testId: string; price: number; mrp: number };

export type Catalog = { partners: LabPartner[]; tests: LabTest[]; offers: LabOffer[] };

export type BookingStatus = "booked" | "assigned" | "collected" | "processing" | "ready" | "cancelled";

export const CATEGORIES: { id: string; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "general", label: "Full body" },
  { id: "diabetes", label: "Diabetes" },
  { id: "thyroid", label: "Thyroid" },
  { id: "heart", label: "Heart" },
  { id: "women", label: "Women" },
  { id: "senior", label: "Seniors" },
  { id: "vitamins", label: "Vitamins" },
  { id: "fever", label: "Fever" },
];

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Ranked search over names and the everyday words people actually type:
 * "sugar" finds HbA1c, "hair fall" finds iron, "dadi" finds the senior
 * package. Name matches outrank keyword matches; packages that contain a
 * matching test come after the test itself.
 */
export function searchTests(tests: readonly LabTest[], query: string): LabTest[] {
  const q = norm(query);
  if (!q) return [...tests];
  const words = q.split(" ");
  const scored = tests
    .map((t) => {
      const name = norm(t.name);
      const keys = t.keywords.map(norm);
      let score = 0;
      if (name.startsWith(q)) score += 100;
      else if (name.includes(q)) score += 70;
      if (keys.some((k) => k === q)) score += 60;
      else if (keys.some((k) => k.startsWith(q) || q.startsWith(k))) score += 40;
      for (const w of words) {
        if (w.length < 2) continue;
        if (name.includes(w)) score += 10;
        if (keys.some((k) => k.includes(w))) score += 6;
      }
      if (score > 0 && t.kind === "package") score -= 5;
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.t.basePrice - b.t.basePrice);
  return scored.map((x) => x.t);
}

export function inCategory(tests: readonly LabTest[], category: string): LabTest[] {
  if (category === "popular") return tests.filter((t) => t.popular);
  return tests.filter((t) => t.categories.includes(category));
}

/*
 * Suggestions for the person being viewed, from what their health profile
 * already says. A doctor usually orders these to keep an eye on a condition
 * someone has been diagnosed with; the app suggests, it never prescribes, and
 * the screen says "often checked with", not "you need".
 */
const BY_CONDITION: [RegExp, string[]][] = [
  [/diabet|sugar/i, ["diabetes-care", "hba1c"]],
  [/thyroid/i, ["thyroid"]],
  [/bp|pressure|heart|cholesterol/i, ["heart-care", "lipid"]],
  [/pcos|pcod/i, ["pcos", "women-wellness"]],
  [/anaemia|anemia/i, ["ferritin", "cbc"]],
  [/kidney/i, ["kft"]],
  [/pregnan|conceive/i, ["cbc", "thyroid"]],
];

export function suggestionsFor(conditions: readonly string[], age: number | null): string[] {
  const out: string[] = [];
  for (const c of conditions) for (const [re, ids] of BY_CONDITION) if (re.test(c)) out.push(...ids);
  if (age !== null && age >= 60) out.push("senior-care", "vitd", "b12");
  if (out.length === 0) out.push("fullbody", "vitd");
  return [...new Set(out)].slice(0, 4);
}

export type Quote = { subtotal: number; fee: number; total: number; mrp: number; missing: string[] };

/** What a set of tests costs at one lab, and which of them it doesn't do. */
export function quote(offers: readonly LabOffer[], partner: LabPartner, testIds: readonly string[]): Quote {
  let subtotal = 0;
  let mrp = 0;
  const missing: string[] = [];
  for (const id of new Set(testIds)) {
    const o = offers.find((x) => x.partnerId === partner.id && x.testId === id);
    if (!o) missing.push(id);
    else {
      subtotal += o.price;
      mrp += o.mrp;
    }
  }
  const fee = partner.freeCollectionAbove !== null && subtotal >= partner.freeCollectionAbove ? 0 : partner.collectionFee;
  return { subtotal, fee, total: subtotal + fee, mrp, missing };
}

/** Labs that do every test, cheapest first; ties go to the faster report. */
export function rankPartners(catalog: Catalog, testIds: readonly string[]): { partner: LabPartner; quote: Quote }[] {
  return catalog.partners
    .map((partner) => ({ partner, quote: quote(catalog.offers, partner, testIds) }))
    .filter((x) => x.quote.missing.length === 0)
    .sort((a, b) => a.quote.total - b.quote.total || a.partner.reportHours - b.partner.reportHours);
}

/** "From ₹540": the lowest price anyone offers for a test. */
export function fromPrice(offers: readonly LabOffer[], testId: string): number | null {
  const prices = offers.filter((o) => o.testId === testId).map((o) => o.price);
  return prices.length ? Math.min(...prices) : null;
}

/** The longest fasting any chosen test needs. */
export function fastingFor(tests: readonly LabTest[], ids: readonly string[]): number {
  return Math.max(0, ...tests.filter((t) => ids.includes(t.id)).map((t) => t.fastingHours));
}

export const WINDOWS = ["6-8 am", "8-10 am", "10-12 pm", "4-6 pm"] as const;
export type SlotWindow = (typeof WINDOWS)[number];

function startHour(w: SlotWindow): number {
  return Number(w.split("-")[0]) + (w.endsWith("pm") && !w.startsWith("10") ? 12 : 0);
}

/**
 * Windows still bookable on a day. Today's need two hours' notice so a
 * collector can actually get there; fasting tests only get morning slots,
 * because nobody fasts until 4 pm.
 */
export function windowsFor(day: Date, now: Date, fastingHours: number): SlotWindow[] {
  const sameDay = day.toDateString() === now.toDateString();
  return WINDOWS.filter((w) => {
    if (fastingHours >= 8 && w === "4-6 pm") return false;
    if (!sameDay) return true;
    return startHour(w) >= now.getHours() + 2;
  });
}

export const STAGES: { status: Exclude<BookingStatus, "cancelled">; label: string; line: string }[] = [
  { status: "booked", label: "Booked", line: "Your slot is held." },
  { status: "assigned", label: "Collector assigned", line: "Someone is on the way at your slot." },
  { status: "collected", label: "Sample collected", line: "It's heading to the lab." },
  { status: "processing", label: "In the lab", line: "Tests are running." },
  { status: "ready", label: "Report ready", line: "Filed in their health file." },
];

export function stageIndex(status: BookingStatus): number {
  return STAGES.findIndex((s) => s.status === status);
}
