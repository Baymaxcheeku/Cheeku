import { addDays, dosesPerDay, readDetails, sameMedicine, type Medicine, type MedTiming, type PackInfo, type RegulatoryClass } from "@/lib/records/details";
import type { DocType } from "@/lib/records/types";

import type { ResolvedClock } from "./clock";
import type { Tier } from "./types";

/*
 * THE MEDICATION LEDGER.
 *
 * Running state, not a list of prescriptions. Every product the person is
 * taking, from every source (prescriptions, discharge summaries, pharmacy
 * bills, a photographed box, their own list), merged, with three checks that
 * nobody prescribing any single one of them can run:
 *
 *   1. INGREDIENT STACKING. Three products that each carry vitamin D add up,
 *      and for a baby under six months the total can pass the upper limit.
 *      De-duplicated on the active ingredient, not the brand.
 *   2. REGULATORY CLASS. A drug licence, an FSSAI food licence and a cosmetic
 *      licence say very different things about how much the label can be
 *      trusted. Surfaced, not hidden.
 *   3. AGE AND ROUTE. A mild steroid cream is fine on a toddler's arm and a
 *      question on a 12-day-old's broken skin under a nappy.
 *
 * None of this says "stop" or "take less". It says what adds up, and that it
 * is worth checking with whoever prescribed it before carrying on with all of
 * them. Cheeku never changes a dose.
 */

export type Ingredient = { key: string; name: string; amount: number | null; unit: string | null };

export type LedgerEntry = {
  key: string;
  name: string;
  strength: string | null;
  ingredients: Ingredient[];
  regulatoryClass: RegulatoryClass;
  route: PackInfo["route"];
  form: Medicine["form"] | null;
  prescribedBy: string | null;
  start: string | null;
  end: string | null;
  status: "active" | "ended" | "unknown";
  expiry: string | null;
  batch: string | null;
  excipients: string[];
  /** How much of each ingredient a day, where the label and schedule allow. */
  perDay: Record<string, number>;
  /** Doses morning, afternoon, night (1-0-1 is [1, 0, 1]); null when not known. */
  schedule: [number, number, number] | null;
  /** "1 tablet", "5 ml". */
  dose: string | null;
  timing: MedTiming;
  asNeeded: boolean;
  /** Tablets, capsules or ml a day, for refill dates; null when not known. */
  unitsPerDay: number | null;
  sources: { documentId: string | null; date: string | null; kind: "prescription" | "discharge" | "pack" | "list" | "declared" }[];
};

export type LedgerFlag = {
  kind: "stacking" | "upper_limit" | "regulatory" | "age_route" | "expired";
  tier: Tier;
  title: string;
  text: string;
  entries: string[];
};

// ------------------------------------------------------------ ingredients --

/*
 * Brand and generic names to what is actually in them. A short, honest list
 * of what Indian families most often hold more than one of; anything not here
 * is read from the box's printed composition or the name itself.
 */
const KNOWN: { match: RegExp; ingredients: { key: string; name: string; amount?: number; unit?: string }[] }[] = [
  { match: /\b(dolo|crocin|calpol|p-?650|paracetamol|acetaminophen|pacimol|sumo\s*l)\b/i, ingredients: [{ key: "paracetamol", name: "Paracetamol" }] },
  { match: /\bcombiflam\b/i, ingredients: [{ key: "ibuprofen", name: "Ibuprofen" }, { key: "paracetamol", name: "Paracetamol" }] },
  { match: /\b(brufen|ibugesic|ibuprofen)\b/i, ingredients: [{ key: "ibuprofen", name: "Ibuprofen" }] },
  { match: /\b(ecosprin|disprin|aspirin)\b/i, ingredients: [{ key: "aspirin", name: "Aspirin" }] },
  { match: /\b(vitamin\s*d3?|cholecalciferol|uprise|d-?rise|calcirol|tayo|arachitol|dbaby|d3\s*drops)\b/i, ingredients: [{ key: "vitamin_d", name: "Vitamin D3", unit: "IU" }] },
  { match: /\bshelcal\b/i, ingredients: [{ key: "calcium", name: "Calcium" }, { key: "vitamin_d", name: "Vitamin D3", amount: 250, unit: "IU" }] },
  { match: /\b(ccm|calcimax)\b/i, ingredients: [{ key: "calcium", name: "Calcium" }, { key: "vitamin_d", name: "Vitamin D3", amount: 200, unit: "IU" }] },
  { match: /\b(thyronorm|eltroxin|thyrox|levothyroxine)\b/i, ingredients: [{ key: "levothyroxine", name: "Levothyroxine" }] },
  { match: /\b(ferrous|livogen|orofer|autrin|iron)\b/i, ingredients: [{ key: "iron", name: "Iron" }] },
  { match: /\b(folvite|folic)\b/i, ingredients: [{ key: "folic_acid", name: "Folic acid" }] },
  { match: /\b(cetirizine|cetzine|zyrtec|okacet)\b/i, ingredients: [{ key: "cetirizine", name: "Cetirizine" }] },
  { match: /\bmontair\s*lc\b/i, ingredients: [{ key: "montelukast", name: "Montelukast" }, { key: "levocetirizine", name: "Levocetirizine" }] },
  { match: /\b(levocetirizine|levocet|xyzal)\b/i, ingredients: [{ key: "levocetirizine", name: "Levocetirizine" }] },
  { match: /\b(atorva|atorvastatin|lipitor)\b/i, ingredients: [{ key: "atorvastatin", name: "Atorvastatin" }] },
  { match: /\b(metformin|glycomet)\b/i, ingredients: [{ key: "metformin", name: "Metformin" }] },
  { match: /\b(pan\s*40|pantoprazole|pantocid)\b/i, ingredients: [{ key: "pantoprazole", name: "Pantoprazole" }] },
  { match: /\b(hydrocortisone|betamethasone|betnovate|clobetasol|mometasone|desonide|fluticasone\s*cream|halobetasol)\b/i, ingredients: [{ key: "topical_steroid", name: "Topical steroid" }] },
  { match: /\bcodeine\b/i, ingredients: [{ key: "codeine", name: "Codeine" }] },
  { match: /\bbenzocaine\b/i, ingredients: [{ key: "benzocaine", name: "Benzocaine" }] },
];

/**
 * A schedule from how people write frequency: "1-0-1", "OD", "BD", "TDS",
 * "twice a day", "at night". Null when it says nothing usable.
 */
export function parseFrequency(text: string | null | undefined): [number, number, number] | null {
  const t = (text ?? "").toLowerCase().trim();
  if (!t) return null;
  // Weekly and monthly doses are not a daily schedule; better none than every day.
  if (/\b(week|weekly|month|monthly|alternate|sos|as needed)\b/.test(t)) return null;
  const pattern = t.match(/\b(\d)\s*-\s*(\d)\s*-\s*(\d)\b/);
  if (pattern) {
    const s: [number, number, number] = [Number(pattern[1]), Number(pattern[2]), Number(pattern[3])];
    return s[0] + s[1] + s[2] > 0 ? s : null;
  }
  if (/\b(tds|tid|thrice|three times)\b/.test(t)) return [1, 1, 1];
  if (/\b(bd|bid|twice|two times)\b/.test(t)) return [1, 0, 1];
  if (/\b(hs|bedtime|at night|night|nightly)\b/.test(t)) return [0, 0, 1];
  if (/\b(od|qd|once|daily|every day|morning|1x)\b/.test(t)) return [1, 0, 0];
  return null;
}

const keyOf = (name: string) =>
  name.toLowerCase().replace(/vitamin\s*d3?|cholecalciferol/, "vitamin_d").replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "");

/** The volume a liquid's strength is stated for: "/ml" is 1, "per 5 ml" is 5. */
export function basisMl(text: string | null): number | null {
  const m = text?.match(/(?:\/|\bper)\s*(\d+(?:\.\d+)?)?\s*ml\b/i);
  return m ? Number(m[1] ?? 1) : null;
}

/** "60,000 IU", "400 IU/ml", "500 mg", "10 mg/5 ml". */
export function parseStrength(text: string | null): { amount: number; unit: string; perMl: number | null } | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(iu|mg|mcg|µg|g)\b/i);
  if (!m) return null;
  return { amount: Number(m[1]), unit: (m[2] ?? "").toUpperCase() === "IU" ? "IU" : (m[2] ?? "").toLowerCase(), perMl: basisMl(text) };
}

export function ingredientsOf(name: string, strength: string | null, pack: PackInfo | null): Ingredient[] {
  if (pack?.composition.length) {
    return pack.composition.map((c) => ({ key: keyOf(c.name), name: c.name, amount: c.amount, unit: c.unit }));
  }
  const known = KNOWN.find((k) => k.match.test(name));
  const parsed = parseStrength(strength ?? name);
  if (known) {
    return known.ingredients.map((i, idx) => ({
      key: i.key,
      name: i.name,
      // A single-ingredient product's printed strength is that ingredient's.
      amount: i.amount ?? (known.ingredients.length === 1 && idx === 0 && parsed ? parsed.amount : null),
      unit: i.unit ?? (known.ingredients.length === 1 && parsed ? parsed.unit : null),
    }));
  }
  const bare = name.replace(/\d.*$/, "").trim() || name;
  return [{ key: keyOf(bare), name: bare, amount: parsed?.amount ?? null, unit: parsed?.unit ?? null }];
}

/** Units of the product per day: tablets, ml, sachets. Weekly is divided by 7. */
function unitsPerDay(m: Pick<Medicine, "schedule" | "dose" | "note" | "asNeeded">, perMl: number | null): number | null {
  if (m.asNeeded) return null;
  let n = dosesPerDay(m);
  if (n === 0) return null;
  if (/once a week|weekly|every week/i.test(m.note ?? "")) n = n / 7;
  const dose = m.dose ?? "";
  const ml = dose.match(/(\d+(?:\.\d+)?)\s*ml/i);
  const count = dose.match(/^(\d+(?:\.\d+)?)/);
  if (perMl && ml) return n * (Number(ml[1]) / perMl);
  if (/drop/i.test(dose) && perMl) return n * ((count ? Number(count[1]) : 1) * 0.05) / perMl;
  return n * (count ? Number(count[1]) : 1);
}

// ---------------------------------------------------------------- building --

type DocRow = { id: string; doc_type: string; event_date: string | null; details: unknown; doctor?: string | null };
type Declared = { name?: unknown; dose?: unknown; frequency?: unknown };

/** The ledger for one person on one date. */
export function buildLedger(documents: readonly DocRow[], declared: unknown, today: string): LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  const upsert = (m: Medicine & { expiry?: string | null; pack?: PackInfo | null }, src: LedgerEntry["sources"][number], prescribedBy: string | null, start: string | null) => {
    const showStrength = m.strength && /^\d/.test(m.strength.trim()) && !m.name.toLowerCase().includes(m.strength.toLowerCase());
    const display = showStrength ? `${m.name} ${m.strength}` : m.name;
    const end = start && m.durationDays ? addDays(start, m.durationDays - 1) : null;
    const status: LedgerEntry["status"] = end ? (end >= today ? "active" : "ended") : src.kind === "declared" || src.kind === "pack" || src.kind === "list" ? "active" : "unknown";
    const existing = entries.find((e) => sameMedicine(e.name, display) || sameMedicine(e.name, m.name));
    const parsed = parseStrength(m.strength ?? m.name);
    const ingredients = ingredientsOf(m.name, m.strength, m.pack ?? null);
    const units = unitsPerDay(m, basisMl(m.strength) ?? parsed?.perMl ?? null);
    const schedule = dosesPerDay(m) > 0 ? m.schedule : parseFrequency(m.note);
    const perDay: Record<string, number> = {};
    for (const i of ingredients) if (i.amount !== null && units !== null) perDay[i.key] = Math.round(i.amount * units * 10) / 10;

    if (existing) {
      existing.sources.push(src);
      // The newest course decides status and dates; the box adds what it knows.
      if ((start ?? "") >= (existing.start ?? "")) {
        existing.start = start ?? existing.start;
        existing.end = end;
        existing.status = status;
        if (Object.keys(perDay).length) existing.perDay = perDay;
        if (schedule) {
          existing.schedule = schedule;
          existing.dose = m.dose ?? existing.dose;
          existing.timing = m.timing;
          existing.asNeeded = m.asNeeded;
          existing.unitsPerDay = units ?? existing.unitsPerDay;
        }
      }
      if (m.pack) {
        existing.ingredients = ingredients;
        existing.regulatoryClass = m.pack.regulatoryClass;
        existing.route = m.pack.route ?? existing.route;
        existing.batch = m.pack.batch ?? existing.batch;
        existing.excipients = m.pack.excipients;
      }
      existing.expiry = m.expiry ?? existing.expiry;
      existing.prescribedBy = prescribedBy ?? existing.prescribedBy;
      return;
    }
    entries.push({
      key: keyOf(display),
      name: display,
      strength: m.strength,
      ingredients,
      regulatoryClass: m.pack?.regulatoryClass ?? "unknown",
      route: m.pack?.route ?? (m.form === "cream" ? "topical" : m.form === "inhaler" ? "inhaled" : m.form === "injection" ? "injection" : m.form ? "oral" : null),
      form: m.form,
      prescribedBy,
      start,
      end,
      status,
      expiry: m.expiry ?? null,
      batch: m.pack?.batch ?? null,
      excipients: m.pack?.excipients ?? [],
      perDay,
      schedule,
      dose: m.dose,
      timing: m.timing,
      asNeeded: m.asNeeded,
      unitsPerDay: units ?? (schedule ? schedule[0] + schedule[1] + schedule[2] : null),
      sources: [src],
    });
  };

  const sorted = [...documents].sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  for (const doc of sorted) {
    const d = readDetails(doc.doc_type as DocType, { details: doc.details });
    if (!d) continue;
    if (d.kind === "prescription") for (const m of d.medicines) upsert(m, { documentId: doc.id, date: doc.event_date, kind: "prescription" }, d.doctor.name, doc.event_date);
    if (d.kind === "discharge") for (const m of d.medicines) upsert(m, { documentId: doc.id, date: doc.event_date, kind: "discharge" }, d.consultant, d.dischargedOn ?? doc.event_date);
    if (d.kind === "medication")
      for (const m of d.medicines) upsert(m, { documentId: doc.id, date: doc.event_date, kind: d.source === "label" ? "pack" : "list" }, d.prescribedBy, d.startedOn ?? doc.event_date);
  }

  if (Array.isArray(declared)) {
    for (const raw of declared as Declared[]) {
      const name = typeof raw?.name === "string" ? raw.name.trim() : "";
      if (!name || entries.some((e) => sameMedicine(e.name, name))) continue;
      upsert(
        { name, strength: null, form: "other", dose: typeof raw.dose === "string" ? raw.dose : null, schedule: [0, 0, 0], timing: "any", durationDays: null, asNeeded: false, note: typeof raw.frequency === "string" ? raw.frequency : null },
        { documentId: null, date: null, kind: "declared" },
        null,
        null,
      );
    }
  }

  return entries;
}

// ------------------------------------------------------------------- checks --

/*
 * Tolerable upper intake for vitamin D (IOM 2011), by age in days. The one
 * cumulative limit encoded so far, because it is the one that fired in the
 * reference thread and it is a published number.
 */
const VITAMIN_D_UL: [number, number][] = [
  [182, 1000],
  [365, 1500],
  [3 * 365, 2500],
  [8 * 365, 3000],
  [Infinity, 4000],
];

export function vitaminDLimit(ageDays: number | null): number {
  if (ageDays === null) return 4000;
  return (VITAMIN_D_UL.find(([upTo]) => ageDays <= upTo) ?? [0, 4000])[1];
}

const AGE_ROUTE: { ingredient: string; when: (c: ResolvedClock, e: LedgerEntry) => boolean; tier: Tier; title: string; text: (e: LedgerEntry) => string }[] = [
  {
    ingredient: "topical_steroid",
    when: (c) => c.stage === "neonate" || c.stage === "infant",
    tier: "monitor",
    title: "A steroid cream on a young baby",
    text: (e) => `${e.name} is a steroid cream. They are used on babies, but on a very young baby, on broken skin, or under a nappy much more of it is absorbed. Worth checking with the doctor exactly where it goes and for how many days.`,
  },
  {
    ingredient: "aspirin",
    when: (c) => c.ageYears !== null && c.ageYears < 16,
    tier: "contact_today",
    title: "Aspirin under 16",
    text: (e) => `${e.name} contains aspirin, which is generally avoided under 16 unless a specialist chose it on purpose. Please check with the prescriber before the next dose.`,
  },
  {
    ingredient: "codeine",
    when: (c) => c.ageYears !== null && c.ageYears < 12,
    tier: "contact_today",
    title: "Codeine under 12",
    text: (e) => `${e.name} contains codeine, which regulators advise against under 12. Please check with the prescriber before the next dose.`,
  },
  {
    ingredient: "benzocaine",
    when: (c) => c.ageYears !== null && c.ageYears < 2,
    tier: "monitor",
    title: "A numbing gel under 2",
    text: (e) => `${e.name} contains benzocaine, which is advised against for teething under 2. Worth asking the doctor about an alternative.`,
  },
];

const fmtN = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export function ledgerFlags(entries: readonly LedgerEntry[], clock: ResolvedClock): LedgerFlag[] {
  const flags: LedgerFlag[] = [];
  const active = entries.filter((e) => e.status !== "ended");

  // 1. Stacking, by ingredient, across products.
  const byIngredient = new Map<string, LedgerEntry[]>();
  for (const e of active) for (const i of e.ingredients) byIngredient.set(i.key, [...(byIngredient.get(i.key) ?? []), e]);
  for (const [key, list] of byIngredient) {
    if (list.length < 2) continue;
    const name = list[0]?.ingredients.find((i) => i.key === key)?.name ?? key;
    const total = list.reduce((s, e) => s + (e.perDay[key] ?? 0), 0);
    const known = list.every((e) => e.perDay[key] !== undefined);
    if (key === "vitamin_d" && known) {
      const ul = vitaminDLimit(clock.ageDays);
      if (total > ul) {
        flags.push({
          kind: "upper_limit",
          tier: "contact_today",
          title: `Vitamin D adds up to ${fmtN(total)} IU a day`,
          text: `${list.map((e) => `${e.name} (${fmtN(e.perDay[key] ?? 0)} IU)`).join(", ")} all carry vitamin D. Together that is ${fmtN(total)} IU a day, above the ${fmtN(ul)} IU upper limit usually used at this age. Each was probably fine on its own; worth asking the doctor which ones to keep before carrying on with all of them.`,
          entries: list.map((e) => e.key),
        });
        continue;
      }
    }
    flags.push({
      kind: "stacking",
      tier: key === "paracetamol" || key === "ibuprofen" ? "contact_today" : "monitor",
      title: `${list.length} products contain ${name.toLowerCase()}`,
      text: `${list.map((e) => e.name).join(" and ")} both contain ${name.toLowerCase()}. Taken together the amounts add up, which is easy to miss when they come from different prescriptions. Worth checking with the doctor or pharmacist that both are meant to be taken together.`,
      entries: list.map((e) => e.key),
    });
  }

  // 2. Regulatory class, for anything sold as a supplement or cosmetic.
  for (const e of active) {
    if (e.regulatoryClass === "nutraceutical" || e.regulatoryClass === "cosmetic") {
      flags.push({
        kind: "regulatory",
        tier: "reassure",
        title: e.regulatoryClass === "nutraceutical" ? `${e.name} is sold as a food supplement` : `${e.name} is sold as a cosmetic`,
        text:
          e.regulatoryClass === "nutraceutical"
            ? `The box carries an FSSAI food licence, not a drug licence. Supplement labels are not checked the way medicine labels are, so the amounts printed on it are the maker's claim.`
            : `The box carries a cosmetic licence. It is not tested or labelled the way a medicine is.`,
        entries: [e.key],
      });
    }
  }

  // 3. Age and route.
  for (const e of active) {
    for (const rule of AGE_ROUTE) {
      if (e.ingredients.some((i) => i.key === rule.ingredient) && rule.when(clock, e)) {
        flags.push({ kind: "age_route", tier: rule.tier, title: rule.title, text: rule.text(e), entries: [e.key] });
      }
    }
  }

  // 4. Out of date on the shelf.
  for (const e of active) {
    if (e.expiry && e.expiry < clock.date) {
      flags.push({ kind: "expired", tier: "monitor", title: `${e.name} has expired`, text: `The box says it expired on ${e.expiry}. Worth replacing before the next dose.`, entries: [e.key] });
    }
  }

  return flags;
}
