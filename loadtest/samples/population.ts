import type { MemoryBundle } from "../../mobile-react-native/src/lib/memory/context";

/*
 * A SYNTHETIC HOUSEHOLD POPULATION, SEEDED.
 *
 * Same seed, same families, every run, so a failure found at 3 am can be
 * replayed at 10. Each family is shaped like the ones the app actually holds:
 * an account holder, often a spouse, children (some babies, a few newborns),
 * parents, sometimes a grandparent, never more than six members (the
 * database's own cap, migration 0001).
 *
 * THE CANARY. Every profile gets a code like `CNRY-3fa91c`, written into the
 * facility of each of its records. Records travel into the model's digest, so
 * the canary travels with them. If a request or a reply ever carries a canary
 * that is not its own profile's, one person's memory reached another's
 * context: the one failure this whole system exists to prevent. The check is
 * a string match, so it runs on millions of payloads for free.
 *
 * Edge cases are planted on purpose, at rates high enough to show up in a
 * few thousand turns: two members with the same first name (a grandson named
 * after his grandfather), two children of the same sex, exactly one baby.
 */

export type Rng = () => number;

/** mulberry32: small, fast, and identical on every machine. */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
const between = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo);
const hex = (r: Rng, n: number) => Array.from({ length: n }, () => Math.floor(r() * 16).toString(16)).join("");

/** A v4-shaped uuid from the seeded stream, so staging rows can use it as a primary key. */
export function uuid(r: Rng): string {
  const h = hex(r, 32).split("");
  h[12] = "4";
  h[16] = ((parseInt(h[16] as string, 16) & 0x3) | 0x8).toString(16);
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

const FEMALE = ["Nisha", "Riya", "Ananya", "Kiara", "Priya", "Asha", "Meera", "Sana", "Kavya", "Diya", "Ishita", "Lakshmi", "Fatima", "Pooja", "Neha", "Aditi", "Zoya", "Tara", "Gauri", "Shreya"];
const MALE = ["Arjun", "Imaad", "Rohan", "Kabir", "Aarav", "Vikram", "Rahul", "Farhan", "Siddharth", "Dev", "Karan", "Ayaan", "Rajesh", "Suresh", "Vihaan", "Nikhil", "Omar", "Manish", "Harsh", "Yash"];
const SURNAMES = ["Sharma", "Iyer", "Khan", "Reddy", "Patel", "Das", "Nair", "Gupta", "Singh", "Menon", "Shaikh", "Rao", "Bose", "Joshi", "Kulkarni"];
const LABS = ["Neo Diagnostics", "Apex Path Labs", "City Care Labs", "Sunrise Diagnostics", "Metro Health Lab"];
const DOCTORS = ["Dr. Roy", "Dr. Menon", "Dr. Kapoor", "Dr. Fernandes", "Dr. Siddiqui"];
const BLOOD = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-"];

/** Analytes with the keys the series and thresholds use, and a plausible spread. */
const ANALYTES = [
  { key: "hba1c", name: "HbA1c", unit: "%", range: "4.0-5.6", lo: 4.6, hi: 8.4, adult: true },
  { key: "glucose_fasting", name: "Fasting Blood Sugar", unit: "mg/dL", range: "70-100", lo: 78, hi: 160, adult: true },
  { key: "tsh", name: "TSH", unit: "mIU/L", range: "0.4-4.0", lo: 0.6, hi: 7.5, adult: false },
  { key: "vitamin_d", name: "Vitamin D (25-OH)", unit: "ng/mL", range: "30-100", lo: 9, hi: 48, adult: false },
  { key: "haemoglobin", name: "Haemoglobin", unit: "g/dL", range: "12.0-15.5", lo: 9.2, hi: 15.8, adult: false },
  { key: "ldl", name: "LDL Cholesterol", unit: "mg/dL", range: "0-100", lo: 70, hi: 190, adult: true },
  { key: "creatinine", name: "Creatinine", unit: "mg/dL", range: "0.6-1.2", lo: 0.5, hi: 1.6, adult: true },
] as const;

export type Member = {
  id: string;
  name: string;
  firstName: string;
  sex: "female" | "male";
  dob: string;
  ageYears: number;
  relationship: string | null;
  isPrimary: boolean;
  bloodGroup: string;
  canary: string;
  /** Lab tests on file, by catalogue key: what "book it again" can mean. */
  tested: string[];
};

export type Account = {
  id: string;
  email: string;
  plan: "free" | "family";
  members: Member[];
  bundles: Record<string, MemoryBundle>;
  history: Record<string, { role: "user" | "assistant"; content: string }[]>;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (today: string, days: number) => iso(new Date(Date.parse(today) - days * 86_400_000));

function dobFor(r: Rng, today: string, ageYears: number): string {
  return daysAgo(today, Math.round(ageYears * 365.25 + between(r, 0, 300)));
}

const HISTORY = [
  "Can you explain my last report in simple words?",
  "Thanks, that helps. What should I ask the doctor?",
  "Is there anything still pending from the last visit?",
  "Okay, I will book the follow-up next week.",
  "What did the doctor change last time?",
  "Remind me what the last sugar test said.",
];

function member(r: Rng, today: string, used: Set<string>, opts: { sex: "female" | "male"; age: number; relationship: string | null; primary?: boolean; firstName?: string; surname: string }): Member {
  const firstName = opts.firstName ?? pick(r, opts.sex === "female" ? FEMALE : MALE);
  let canary = `CNRY-${hex(r, 6)}`;
  while (used.has(canary)) canary = `CNRY-${hex(r, 6)}`;
  used.add(canary);
  return {
    id: uuid(r),
    name: `${firstName} ${opts.surname}`,
    firstName,
    sex: opts.sex,
    dob: dobFor(r, today, opts.age),
    ageYears: opts.age,
    relationship: opts.relationship,
    isPrimary: Boolean(opts.primary),
    bloodGroup: pick(r, BLOOD),
    canary,
    tested: [],
  };
}

function bundleFor(r: Rng, m: Member, today: string, mother: Member | null): MemoryBundle {
  const documents: Record<string, unknown>[] = [];
  const entities: Record<string, unknown>[] = [];
  // Babies get fewer records; adults get up to eight. Everyone gets one, so
  // every profile carries its canary into a digest.
  const count = m.ageYears < 1 ? 1 : 1 + Math.floor(r() * (m.ageYears < 18 ? 3 : 8));
  for (let i = 0; i < count; i += 1) {
    const id = uuid(r);
    const date = daysAgo(today, Math.floor(between(r, 5, 700)));
    const facility = `${pick(r, LABS)} ${m.canary}`;
    if (i > 0 && r() < 0.3 && m.ageYears >= 18) {
      documents.push({
        id,
        doc_type: "prescription",
        event_date: date,
        title: "Prescription",
        facility,
        doctor: pick(r, DOCTORS),
        details: {
          doctor: { name: pick(r, DOCTORS), phone: null, clinic: facility },
          medicines: [{ name: pick(r, ["Metformin 500", "Telmisartan 40", "Vitamin D3 60K", "Thyroxine 50", "Atorvastatin 10"]), strength: null, dose: "1 tablet", schedule: "1-0-0", form: "tablet" }],
          tests: [],
          followUp: daysAgo(today, -Math.floor(between(r, 10, 90))),
        },
      });
      continue;
    }
    documents.push({ id, doc_type: "lab_report", event_date: date, title: "Lab report", facility, doctor: null, details: { sections: [] } });
    const panel = ANALYTES.filter((a) => (m.ageYears >= 18 || !a.adult) && r() < 0.55);
    for (const a of panel.length ? panel : [ANALYTES[4]]) {
      const value = Number(between(r, a.lo, a.hi).toFixed(a.unit === "%" || a.hi < 20 ? 1 : 0));
      const [lo, hi] = a.range.split("-").map(Number) as [number, number];
      entities.push({
        id: uuid(r),
        document_id: id,
        kind: "lab_value",
        name: a.name,
        canonical_name: a.key,
        value,
        value_text: null,
        unit: a.unit,
        ref_range: a.range,
        flag: value > hi ? "high" : value < lo ? "low" : "normal",
        event_date: date,
      });
      if (!m.tested.includes(a.key)) m.tested.push(a.key);
    }
  }
  return {
    profile: {
      id: m.id,
      name: m.name,
      relationship: m.relationship,
      is_primary: m.isPrimary,
      dob: m.dob,
      sex: m.sex,
      blood_group: m.bloodGroup,
      conditions: m.ageYears > 45 && r() < 0.4 ? [pick(r, ["Type 2 diabetes", "Hypertension", "Hypothyroidism"])] : [],
      allergies: r() < 0.1 ? ["Penicillin"] : [],
      medications: [],
    },
    // Name and blood group only: what memory_bundle (0030) lets cross over.
    relations: mother ? [{ related_profile_id: mother.id, type: "mother", name: mother.firstName, blood_group: mother.bloodGroup }] : [],
    pregnancies: [],
    documents,
    entities,
    facts: [],
    loops: [],
    stats: { records: documents.length, messages: 0, conversations: 0, first_message_at: null },
  };
}

/** One family, at most six members. */
export function makeAccount(r: Rng, index: number, today: string, canaries: Set<string>): Account {
  const surname = pick(r, SURNAMES);
  const primarySex = r() < 0.55 ? "female" : "male";
  const primaryAge = Math.floor(between(r, 24, 52));
  const members: Member[] = [member(r, today, canaries, { sex: primarySex, age: primaryAge, relationship: null, primary: true, surname })];
  const other = primarySex === "female" ? "male" : "female";

  if (r() < 0.75) members.push(member(r, today, canaries, { sex: other, age: primaryAge + Math.floor(between(r, -4, 5)), relationship: "Spouse", surname }));

  // Children. Young parents are likelier to have a baby; a few are newborns.
  const kids = r() < 0.7 ? 1 + Math.floor(r() * 3) : 0;
  for (let k = 0; k < kids && members.length < 6; k += 1) {
    const sex = r() < 0.5 ? "female" : "male";
    const baby = k === 0 && primaryAge < 36 && r() < 0.35;
    const age = baby ? (r() < 0.25 ? between(r, 0.02, 0.15) : between(r, 0.2, 2.8)) : between(r, 3, Math.max(4, primaryAge - 22));
    members.push(member(r, today, canaries, { sex, age: Number(age.toFixed(2)), relationship: sex === "female" ? "Daughter" : "Son", surname }));
  }

  // Parents of the account holder, and sometimes a grandparent.
  if (members.length < 6 && r() < 0.4) members.push(member(r, today, canaries, { sex: "female", age: primaryAge + Math.floor(between(r, 22, 32)), relationship: "Mother", surname }));
  if (members.length < 6 && r() < 0.3) members.push(member(r, today, canaries, { sex: "male", age: primaryAge + Math.floor(between(r, 24, 35)), relationship: "Father", surname }));
  if (members.length < 6 && r() < 0.12) {
    const sex = r() < 0.5 ? "female" : "male";
    members.push(member(r, today, canaries, { sex, age: primaryAge + Math.floor(between(r, 45, 55)), relationship: "Grandparent", surname }));
  }

  // A grandson named after his grandfather: two members, one first name.
  const elder = members.find((m) => m.relationship === "Father" || (m.relationship === "Grandparent" && m.sex === "male"));
  const boy = members.find((m) => m.relationship === "Son");
  if (elder && boy && r() < 0.35) {
    boy.firstName = elder.firstName;
    boy.name = `${elder.firstName} ${surname}`;
  }

  const mother = members.find((m) => m.isPrimary && m.sex === "female") ?? members.find((m) => m.relationship === "Spouse" && m.sex === "female") ?? null;
  const bundles: Account["bundles"] = {};
  const history: Account["history"] = {};
  for (const m of members) {
    const isChild = m.relationship === "Son" || m.relationship === "Daughter";
    bundles[m.id] = bundleFor(r, m, today, isChild ? mother : null);
    const turns = Math.floor(r() * 13);
    history[m.id] = Array.from({ length: turns }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: i % 2 === 0 ? pick(r, HISTORY) : `Here is what ${m.firstName}'s records say, in short: the last results were mostly in range, with one value worth raising with the doctor at the next visit.` }));
  }

  // Free covers one seat, so a family of several is on Family, except the few
  // who downgraded and now have members paused (0013 keeps them, locked).
  const plan = members.length === 1 ? (r() < 0.8 ? "free" : "family") : r() < 0.9 ? "family" : "free";
  return { id: uuid(r), email: `loadtest+${String(index).padStart(6, "0")}@cheeku.test`, plan, members, bundles, history };
}

export function makePopulation(seed: number, accounts: number, today: string): Account[] {
  const r = rng(seed);
  const canaries = new Set<string>();
  return Array.from({ length: accounts }, (_, i) => makeAccount(r, i, today, canaries));
}
