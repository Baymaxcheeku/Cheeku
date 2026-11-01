import { coverStatus, coverUsed, rupeesShort, shortDate, type CoverStatus, type InsuranceDetails } from "@/lib/records/details";

/*
 * A family's insurance policy (migration 0043).
 *
 * One row per policy, not per person: a family floater is entered once and
 * lists every member it covers. It can be typed in, come from an uploaded
 * policy document, or (later) from a partner feed, and the shape is the same
 * either way. Pure functions only, so the screens, the Health file and the
 * chat all read a policy the same way and the tests need no database.
 */

export type PolicyType = InsuranceDetails["policyType"];

export type Waiting = { label: string; until: string | null };

/** What a policy can say it includes. The keys are stored; the labels are shown. */
export const BENEFITS = [
  { key: "pre_post", label: "Before and after hospital stay", words: ["before hospital", "after hospital", "pre hospital", "post hospital", "pre-hospital", "post-hospital", "follow up visits"] },
  { key: "day_care", label: "Day-care procedures", words: ["day care", "daycare", "day-care", "cataract", "dialysis", "chemo"] },
  { key: "ambulance", label: "Ambulance", words: ["ambulance"] },
  { key: "maternity", label: "Maternity", words: ["maternity", "pregnan", "delivery", "c-section", "caesarean", "baby", "newborn"] },
  { key: "opd", label: "Doctor visits (OPD)", words: ["opd", "outpatient", "out-patient", "consultation", "doctor visit"] },
  { key: "checkup", label: "Yearly health check-up", words: ["check-up", "checkup", "check up", "health check"] },
  { key: "ayush", label: "AYUSH (Ayurveda, homeopathy)", words: ["ayush", "ayurved", "homeopath", "unani", "siddha"] },
  { key: "mental_health", label: "Mental health", words: ["mental", "psychiatr", "therapy", "counsell", "depression", "anxiety"] },
  { key: "restore", label: "Cover restored after a claim", words: ["restore", "restoration", "refill", "reinstat"] },
  { key: "home_care", label: "Treatment at home", words: ["home treatment", "domiciliary", "treatment at home", "home care"] },
] as const;

export type BenefitKey = (typeof BENEFITS)[number]["key"];

export const POLICY_TYPE_LABEL: Record<PolicyType, string> = {
  family_floater: "Family floater",
  individual: "Individual",
  group: "From work (group)",
  top_up: "Top-up",
};

export type Policy = {
  id: string;
  insurer: string;
  plan: string | null;
  policyNo: string;
  policyType: PolicyType;
  sumInsured: number;
  claimed: number;
  start: string | null;
  end: string | null;
  premium: { amount: number; frequency: "yearly" | "monthly" | "quarterly" } | null;
  tpa: { name: string; phone: string | null } | null;
  cashless: boolean | null;
  coPay: string | null;
  roomRent: string | null;
  waiting: Waiting[];
  benefits: BenefitKey[];
  exclusions: string[];
  notes: string | null;
  coveredProfileIds: string[];
  documentId: string | null;
  source: "manual" | "document" | "partner";
};

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const date = (v: unknown): string | null => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const BENEFIT_KEYS = new Set<string>(BENEFITS.map((b) => b.key));
const TYPES: readonly PolicyType[] = ["family_floater", "individual", "group", "top_up"];

/** A database row, read defensively: anything malformed comes back as null. */
export function readPolicy(r: Row): Policy | null {
  const id = str(r.id);
  const insurer = str(r.insurer);
  const policyNo = str(r.policy_no);
  if (!id || !insurer || !policyNo) return null;
  const amount = num(r.premium_amount);
  const freq = r.premium_frequency;
  const tpaName = str(r.tpa_name);
  return {
    id,
    insurer,
    plan: str(r.plan),
    policyNo,
    policyType: TYPES.includes(r.policy_type as PolicyType) ? (r.policy_type as PolicyType) : "individual",
    sumInsured: Math.max(0, num(r.sum_insured) ?? 0),
    claimed: Math.max(0, num(r.claimed) ?? 0),
    start: date(r.start_date),
    end: date(r.end_date),
    premium: amount !== null ? { amount, frequency: freq === "monthly" || freq === "quarterly" ? freq : "yearly" } : null,
    tpa: tpaName ? { name: tpaName, phone: str(r.tpa_phone) } : null,
    cashless: typeof r.cashless === "boolean" ? r.cashless : null,
    coPay: str(r.co_pay),
    roomRent: str(r.room_rent),
    waiting: arr(r.waiting)
      .map((w) => (w && typeof w === "object" ? { label: str((w as Row).label), until: date((w as Row).until) } : null))
      .filter((w): w is Waiting => Boolean(w?.label)) as Waiting[],
    benefits: arr(r.benefits).filter((b): b is BenefitKey => typeof b === "string" && BENEFIT_KEYS.has(b)),
    exclusions: arr(r.exclusions).map(str).filter((x): x is string => Boolean(x)),
    notes: str(r.notes),
    coveredProfileIds: arr(r.covered_profile_ids).filter((x): x is string => typeof x === "string"),
    documentId: str(r.document_id),
    source: r.source === "document" || r.source === "partner" ? r.source : "manual",
  };
}

/** What the form edits. Money is typed as text so a half-typed number is not lost. */
export type PolicyDraft = {
  insurer: string;
  plan: string;
  policyNo: string;
  policyType: PolicyType;
  sumInsured: string;
  claimed: string;
  start: string;
  end: string;
  premiumAmount: string;
  premiumFrequency: "yearly" | "monthly" | "quarterly";
  tpaName: string;
  tpaPhone: string;
  cashless: boolean | null;
  coPay: string;
  roomRent: string;
  preExistingUntil: string;
  specificUntil: string;
  benefits: BenefitKey[];
  exclusions: string;
  notes: string;
  coveredProfileIds: string[];
};

export const PRE_EXISTING = "Pre-existing conditions";
export const SPECIFIC = "Specific illnesses";

export function emptyDraft(coveredProfileIds: string[] = []): PolicyDraft {
  return {
    insurer: "",
    plan: "",
    policyNo: "",
    policyType: coveredProfileIds.length > 1 ? "family_floater" : "individual",
    sumInsured: "",
    claimed: "",
    start: "",
    end: "",
    premiumAmount: "",
    premiumFrequency: "yearly",
    tpaName: "",
    tpaPhone: "",
    cashless: null,
    coPay: "",
    roomRent: "",
    preExistingUntil: "",
    specificUntil: "",
    benefits: [],
    exclusions: "",
    notes: "",
    coveredProfileIds,
  };
}

const money = (s: string): string => s.replace(/[₹,\s]/g, "");

/**
 * Rupees from what people actually type: "500000", "5,00,000", "5 lakh",
 * "5L", "1 crore", "1.5cr". Null when it is not a number.
 */
export function parseRupees(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/₹|rs\.?|inr/g, "").trim();
  if (!s) return null;
  const m = s.match(/^([\d,]*\.?\d+)\s*(lakhs?|lacs?|l|crores?|cr|k|thousand)?$/);
  if (!m) return null;
  const n = Number(money(m[1] ?? ""));
  if (!Number.isFinite(n)) return null;
  const unit = m[2] ?? "";
  const factor = /^(lakh|lac|l)/.test(unit) ? 1e5 : /^(crore|cr)/.test(unit) ? 1e7 : /^(k|thousand)/.test(unit) ? 1e3 : 1;
  return Math.round(n * factor);
}

/** 1000000 as "10,00,000": how amounts are written in India, so an edit reads like the policy. */
export function indianNumber(n: number): string {
  const [whole, frac] = String(Math.round(n * 100) / 100).split(".");
  const w = whole ?? "0";
  const last3 = w.slice(-3);
  const rest = w.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest ? `${rest},` : ""}${last3}${frac ? `.${frac}` : ""}`;
}

export function draftFrom(p: Policy): PolicyDraft {
  const wait = (label: string) => p.waiting.find((w) => w.label === label)?.until ?? "";
  return {
    insurer: p.insurer,
    plan: p.plan ?? "",
    policyNo: p.policyNo,
    policyType: p.policyType,
    sumInsured: indianNumber(p.sumInsured),
    claimed: p.claimed ? indianNumber(p.claimed) : "",
    start: p.start ?? "",
    end: p.end ?? "",
    premiumAmount: p.premium ? indianNumber(p.premium.amount) : "",
    premiumFrequency: p.premium?.frequency ?? "yearly",
    tpaName: p.tpa?.name ?? "",
    tpaPhone: p.tpa?.phone ?? "",
    cashless: p.cashless,
    coPay: p.coPay ?? "",
    roomRent: p.roomRent ?? "",
    preExistingUntil: wait(PRE_EXISTING),
    specificUntil: wait(SPECIFIC),
    benefits: p.benefits,
    exclusions: p.exclusions.join("\n"),
    notes: p.notes ?? "",
    coveredProfileIds: p.coveredProfileIds,
  };
}

export type DraftErrors = Partial<Record<"insurer" | "policyNo" | "sumInsured" | "claimed" | "start" | "end" | "covered" | "premiumAmount" | "preExistingUntil" | "specificUntil", string>>;

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** Field by field, in words the form can show under each field. Empty means it can be saved. */
export function validateDraft(d: PolicyDraft): DraftErrors {
  const e: DraftErrors = {};
  if (!d.insurer.trim()) e.insurer = "Which company is it with?";
  else if (d.insurer.trim().length > 120) e.insurer = "That name is too long.";
  if (!d.policyNo.trim()) e.policyNo = "It's on the policy card or the first page.";
  else if (d.policyNo.trim().length > 60) e.policyNo = "That number is too long.";
  const sum = parseRupees(d.sumInsured);
  if (sum === null || sum <= 0) e.sumInsured = "The cover amount, like 5 lakh.";
  if (d.claimed.trim()) {
    const c = parseRupees(d.claimed);
    if (c === null) e.claimed = "A number, like 40,000.";
    else if (sum !== null && c > sum) e.claimed = "More than the cover itself. Check the amount.";
  }
  if (d.premiumAmount.trim() && parseRupees(d.premiumAmount) === null) e.premiumAmount = "A number, like 18,500.";
  for (const k of ["start", "end", "preExistingUntil", "specificUntil"] as const) {
    if (d[k].trim() && !isDate(d[k].trim())) e[k] = "Year first, like 2027-02-06.";
  }
  if (!e.start && !e.end && d.start && d.end && d.end < d.start) e.end = "Ends before it starts.";
  if (d.coveredProfileIds.length === 0) e.covered = "Pick at least one person it covers.";
  return e;
}

const lines = (s: string) =>
  s
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 40);

/** The row to write. Call only once `validateDraft` came back empty. */
export function rowFromDraft(d: PolicyDraft, extra: { documentId?: string | null; source?: Policy["source"] } = {}): Row {
  const premium = d.premiumAmount.trim() ? parseRupees(d.premiumAmount) : null;
  const waiting = [
    d.preExistingUntil.trim() ? { label: PRE_EXISTING, until: d.preExistingUntil.trim() } : null,
    d.specificUntil.trim() ? { label: SPECIFIC, until: d.specificUntil.trim() } : null,
  ].filter(Boolean);
  const row: Row = {
    insurer: d.insurer.trim(),
    plan: d.plan.trim() || null,
    policy_no: d.policyNo.trim(),
    policy_type: d.policyType,
    sum_insured: parseRupees(d.sumInsured) ?? 0,
    claimed: d.claimed.trim() ? (parseRupees(d.claimed) ?? 0) : 0,
    start_date: d.start.trim() || null,
    end_date: d.end.trim() || null,
    premium_amount: premium,
    premium_frequency: premium !== null ? d.premiumFrequency : null,
    tpa_name: d.tpaName.trim() || null,
    tpa_phone: d.tpaName.trim() ? d.tpaPhone.trim() || null : null,
    cashless: d.cashless,
    co_pay: d.coPay.trim() || null,
    room_rent: d.roomRent.trim() || null,
    waiting,
    benefits: [...new Set(d.benefits)],
    exclusions: lines(d.exclusions),
    notes: d.notes.trim() || null,
    covered_profile_ids: [...new Set(d.coveredProfileIds)],
  };
  if (extra.documentId !== undefined) row.document_id = extra.documentId;
  if (extra.source) row.source = extra.source;
  return row;
}

/** The record type's shape, so the existing cover maths and record page read a policy as is. */
export function asDetails(p: Policy, names: string[] = []): InsuranceDetails {
  return {
    kind: "insurance",
    insurer: p.insurer,
    plan: p.plan,
    policyNo: p.policyNo,
    policyType: p.policyType,
    start: p.start,
    end: p.end,
    sumInsured: p.sumInsured,
    claimed: p.claimed,
    premium: p.premium,
    members: names.map((name) => ({ name, relation: null })),
    tpa: p.tpa,
    cashless: p.cashless ?? false,
    coPay: p.coPay,
    roomRent: p.roomRent,
    waitingPeriods: p.waiting,
    claims: [],
  };
}

export function covers(p: Policy, profileId: string): boolean {
  return p.coveredProfileIds.includes(profileId);
}

export type PolicyState = { status: CoverStatus; daysLeft: number | null; remaining: number; usedShare: number };

export function policyState(p: Policy, now: Date = new Date()): PolicyState {
  const c = coverStatus(p, now);
  const u = coverUsed(p);
  return { status: c.status, daysLeft: c.daysLeft, remaining: u.remaining, usedShare: u.share };
}

/** One short line for a card: "₹5L cover · ₹4.6L left · till 6 Feb 2027". */
export function policyLine(p: Policy, now: Date = new Date()): string {
  const s = policyState(p, now);
  const left = p.claimed > 0 ? ` · ${rupeesShort(s.remaining)} left` : "";
  if (s.status === "expired") return `${rupeesShort(p.sumInsured)} cover · ended ${shortDate(p.end)}`;
  if (s.status === "renew_soon") return `${rupeesShort(p.sumInsured)} cover${left} · renews in ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"}`;
  if (s.status === "not_started") return `${rupeesShort(p.sumInsured)} cover · starts ${shortDate(p.start)}`;
  return `${rupeesShort(p.sumInsured)} cover${left}${p.end ? ` · till ${shortDate(p.end)}` : ""}`;
}

/** Days until a waiting period ends; null when no date, negative once it has passed. */
export function waitingLeft(w: Waiting, now: Date = new Date()): number | null {
  if (!w.until) return null;
  const end = Date.parse(`${w.until}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((end - today) / 86_400_000);
}

export function benefitLabel(key: BenefitKey): string {
  return BENEFITS.find((b) => b.key === key)?.label ?? key;
}
