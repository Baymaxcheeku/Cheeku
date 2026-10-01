import type { ResolvedClock } from "./clock";
import type { Tier } from "./types";

/*
 * THRESHOLDS ARE A FUNCTION OF THE CLOCK, NOT CONSTANTS.
 *
 * The single highest-value rule in the spec. A newborn's bilirubin of 11.0
 * can sit under the limit on day 3 and over it on day 6. Same number, opposite
 * action, and a check against one printed "normal range" gets it wrong in the
 * direction that hurts. So a limit here is keyed on the analyte AND the clock
 * (day of life, trimester, age band) AND modifiers (term or preterm).
 *
 * WHERE THE NUMBERS COME FROM. Every row names its source. Two kinds:
 *
 *   guideline  a published threshold (WHO, ATA, IADPSG, NICE, ACOG) that is
 *              widely used as written. May reassure when a value sits inside.
 *   example    taken from the reference thread the spec was built from, where
 *              a treating doctor used them. Not checked against a guideline
 *              here. These may RAISE concern but never reassure: a value under
 *              an example limit reads "ask which chart your doctor uses", not
 *              "fine". Being wrong on these rows costs a phone call, never a
 *              missed problem.
 *
 * NOTHING HERE IS SIGNED OFF BY A CLINICIAN YET. That is recorded in
 * PLAN.md under Open, next to the articles that need the same review. A
 * doctor's own limit written on a record (a discharge summary saying "repeat
 * if above 15") should beat every row in this file once ingestion reads it.
 */

export type Basis = "guideline" | "example";

export type Threshold = {
  id: string;
  analyte: string;
  unit: string;
  /** Who this row is for. All listed modifiers must be on the clock. */
  modifiers: string[];
  /** Day-of-life window, inclusive, when the row is for newborns. */
  dayOfLife?: [number, number];
  /** Age window in days, inclusive. */
  ageDays?: [number, number];
  low?: number;
  high?: number;
  /** What crossing it means. */
  outside: Tier;
  /** A second, higher line where the action becomes "go now". */
  severeHigh?: number;
  severeLow?: number;
  /** What crossing the severe line means. Go now unless the row says otherwise. */
  severeTier?: Tier;
  /**
   * The high lines are "this or more", the way guidelines and doctors say
   * them (140/90, 38°C, fasting 92). Otherwise "more than".
   */
  atLeast?: boolean;
  basis: Basis;
  source: string;
  /** Plain words for who the limit is for: "day 6, born at term". */
  forWho: string;
};

/*
 * Names labs print, folded to one key. Without this "Hb", "Haemoglobin" and
 * "hemoglobin" are three different series and no threshold ever matches.
 */
const ALIASES: Record<string, string> = {
  hb: "haemoglobin",
  hgb: "haemoglobin",
  hemoglobin: "haemoglobin",
  haemoglobin: "haemoglobin",
  bilirubin: "bilirubin_total",
  "total bilirubin": "bilirubin_total",
  "bilirubin total": "bilirubin_total",
  "serum bilirubin": "bilirubin_total",
  tsb: "bilirubin_total",
  bilirubin_total: "bilirubin_total",
  "s bilirubin total": "bilirubin_total",
  tsh: "tsh",
  "thyroid stimulating hormone": "tsh",
  fbs: "glucose_fasting",
  "fasting blood sugar": "glucose_fasting",
  "fasting glucose": "glucose_fasting",
  "fasting plasma glucose": "glucose_fasting",
  fpg: "glucose_fasting",
  glucose_fasting: "glucose_fasting",
  "blood sugar fasting": "glucose_fasting",
  hba1c: "hba1c",
  "glycated haemoglobin": "hba1c",
  "vitamin d": "vitamin_d",
  "vitamin d (25-oh)": "vitamin_d",
  "25-oh vitamin d": "vitamin_d",
  vitamin_d: "vitamin_d",
  ferritin: "ferritin",
  platelets: "platelets",
  "platelet count": "platelets",
  wbc: "wbc",
  "total wbc count": "wbc",
  bp_systolic: "bp_systolic",
  bp_diastolic: "bp_diastolic",
  systolic: "bp_systolic",
  diastolic: "bp_diastolic",
  temperature: "temperature",
  temp: "temperature",
  weight: "weight",
  "body weight": "weight",
};

/** One key per measurement, whatever the lab called it. */
export function analyteKey(name: string | null | undefined, canonical?: string | null): string {
  for (const raw of [canonical, name]) {
    if (!raw) continue;
    const k = raw.toLowerCase().replace(/[^a-z0-9_() -]/g, "").replace(/\s+/g, " ").trim();
    if (ALIASES[k]) return ALIASES[k];
    const bare = k.replace(/\(.*?\)/g, "").trim();
    if (ALIASES[bare]) return ALIASES[bare];
  }
  return (canonical ?? name ?? "").toLowerCase().trim().replace(/\s+/g, "_");
}

const WHO_HB = "WHO haemoglobin thresholds for anaemia (2024)";

export const THRESHOLDS: readonly Threshold[] = [
  // ------------------------------------------------ newborn bilirubin (example)
  // From the reference thread. A paediatrician has to replace these with the
  // chart they actually use (most use hour-specific AAP 2022 curves).
  { id: "tsb-d3-term", analyte: "bilirubin_total", unit: "mg/dL", modifiers: ["term"], dayOfLife: [3, 3], high: 12.0, outside: "contact_today", basis: "example", source: "Treating doctor's limit in the reference thread", forWho: "day 3, born at term" },
  { id: "tsb-d6-term", analyte: "bilirubin_total", unit: "mg/dL", modifiers: ["term"], dayOfLife: [6, 6], high: 10.0, outside: "contact_today", basis: "example", source: "Treating doctor's limit in the reference thread", forWho: "day 6, born at term" },
  // Any visible jaundice or a measured value in the first 24 hours is urgent
  // on every chart there is.
  { id: "tsb-d0", analyte: "bilirubin_total", unit: "mg/dL", modifiers: ["neonate"], dayOfLife: [0, 0], high: 5.0, outside: "go_now", basis: "guideline", source: "NICE CG98: jaundice in the first 24 hours", forWho: "the first day of life" },

  // ------------------------------------------------------------- pregnancy
  { id: "hb-preg-t1", analyte: "haemoglobin", unit: "g/dL", modifiers: ["pregnant", "trimester_1"], low: 11.0, severeLow: 7.0, outside: "contact_today", basis: "guideline", source: WHO_HB, forWho: "the first trimester" },
  { id: "hb-preg-t2", analyte: "haemoglobin", unit: "g/dL", modifiers: ["pregnant", "trimester_2"], low: 10.5, severeLow: 7.0, outside: "contact_today", basis: "guideline", source: WHO_HB, forWho: "the second trimester" },
  { id: "hb-preg-t3", analyte: "haemoglobin", unit: "g/dL", modifiers: ["pregnant", "trimester_3"], low: 11.0, severeLow: 7.0, outside: "contact_today", basis: "guideline", source: WHO_HB, forWho: "the third trimester" },
  { id: "tsh-preg", analyte: "tsh", unit: "µIU/mL", modifiers: ["pregnant"], low: 0.1, high: 4.0, outside: "contact_today", basis: "guideline", source: "ATA 2017 pregnancy thyroid guideline, where no local trimester range exists", forWho: "pregnancy" },
  { id: "fpg-preg", analyte: "glucose_fasting", unit: "mg/dL", modifiers: ["pregnant"], high: 92, atLeast: true, outside: "contact_today", basis: "guideline", source: "IADPSG criteria (fasting 92 mg/dL or more)", forWho: "pregnancy" },
  { id: "sbp-preg", analyte: "bp_systolic", unit: "mmHg", modifiers: ["pregnant"], high: 140, severeHigh: 160, atLeast: true, outside: "contact_today", basis: "guideline", source: "ACOG / NICE NG133 hypertension in pregnancy", forWho: "pregnancy" },
  { id: "dbp-preg", analyte: "bp_diastolic", unit: "mmHg", modifiers: ["pregnant"], high: 90, severeHigh: 110, atLeast: true, outside: "contact_today", basis: "guideline", source: "ACOG / NICE NG133 hypertension in pregnancy", forWho: "pregnancy" },
  // Outside pregnancy one high reading is a "repeat it and watch", and only a
  // severe one is a same-day call. Symptoms with it are the hard-stop layer's job.
  { id: "sbp-adult", analyte: "bp_systolic", unit: "mmHg", modifiers: ["adult"], high: 140, severeHigh: 180, atLeast: true, severeTier: "contact_today", outside: "monitor", basis: "guideline", source: "WHO 2021 hypertension guideline (140/90; 180/110 severe)", forWho: "adults" },
  { id: "dbp-adult", analyte: "bp_diastolic", unit: "mmHg", modifiers: ["adult"], high: 90, severeHigh: 110, atLeast: true, severeTier: "contact_today", outside: "monitor", basis: "guideline", source: "WHO 2021 hypertension guideline (140/90; 180/110 severe)", forWho: "adults" },
  { id: "sbp-older", analyte: "bp_systolic", unit: "mmHg", modifiers: ["older_adult"], high: 140, severeHigh: 180, atLeast: true, severeTier: "contact_today", outside: "monitor", basis: "guideline", source: "WHO 2021 hypertension guideline (140/90; 180/110 severe)", forWho: "adults over 65" },
  { id: "sbp-pp", analyte: "bp_systolic", unit: "mmHg", modifiers: ["postpartum"], high: 140, severeHigh: 160, atLeast: true, outside: "contact_today", basis: "guideline", source: "NICE NG133, postnatal", forWho: "the six weeks after birth" },

  // ------------------------------------------------------------ children
  { id: "hb-6-59m", analyte: "haemoglobin", unit: "g/dL", modifiers: [], ageDays: [183, 1825], low: 11.0, severeLow: 7.0, outside: "contact_today", basis: "guideline", source: WHO_HB, forWho: "children aged 6 months to 5 years" },
  { id: "hb-5-11y", analyte: "haemoglobin", unit: "g/dL", modifiers: [], ageDays: [1826, 4380], low: 11.5, severeLow: 8.0, outside: "contact_today", basis: "guideline", source: WHO_HB, forWho: "children aged 5 to 11" },

  // ------------------------------------------------------------ temperature
  // Any fever under 3 months old is red on the NICE traffic-light table.
  { id: "temp-u3m", analyte: "temperature", unit: "°C", modifiers: [], ageDays: [0, 90], high: 38.0, atLeast: true, outside: "go_now", basis: "guideline", source: "NICE NG143 fever in under 5s", forWho: "babies under 3 months" },
  { id: "temp-3-6m", analyte: "temperature", unit: "°C", modifiers: [], ageDays: [91, 182], high: 39.0, atLeast: true, outside: "contact_today", basis: "guideline", source: "NICE NG143 fever in under 5s", forWho: "babies 3 to 6 months" },
  { id: "temp-preg", analyte: "temperature", unit: "°C", modifiers: ["pregnant"], high: 38.0, atLeast: true, outside: "contact_today", basis: "guideline", source: "RCOG: fever in pregnancy needs assessment", forWho: "pregnancy" },
];

export type ThresholdRead = {
  threshold: Threshold;
  verdict: "within" | "over" | "under";
  /** What this read means for the tier. Example rows never return "reassure". */
  tier: Tier;
  /** "11.0 mg/dL against a limit of 10.0 for day 6, born at term: over." */
  text: string;
  /** Set when the lab's printed range says something different. */
  printedDiffers: string | null;
};

function applies(t: Threshold, clock: ResolvedClock): boolean {
  if (!t.modifiers.every((m) => clock.modifiers.includes(m))) return false;
  if (t.dayOfLife) {
    if (clock.relative?.kind !== "day_of_life") return false;
    const d = clock.relative.day;
    if (d < t.dayOfLife[0] || d > t.dayOfLife[1]) return false;
  }
  if (t.ageDays) {
    if (clock.ageDays === null) return false;
    if (clock.ageDays < t.ageDays[0] || clock.ageDays > t.ageDays[1]) return false;
  }
  return true;
}

/** The row for this analyte on this clock, most specific first. */
export function thresholdFor(analyte: string, clock: ResolvedClock): Threshold | null {
  const rows = THRESHOLDS.filter((t) => t.analyte === analyte && applies(t, clock));
  // A day window or age band is more specific than a modifier alone.
  rows.sort((a, b) => Number(Boolean(b.dayOfLife || b.ageDays)) - Number(Boolean(a.dayOfLife || a.ageDays)) || b.modifiers.length - a.modifiers.length);
  return rows[0] ?? null;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Reads a value against the limit for this person on this date. Null when no
 * clock-specific limit exists, in which case the lab's printed range is all
 * there is, and the caller says so.
 */
export function readThreshold(analyte: string, value: number, clock: ResolvedClock, printedRange: string | null = null): ThresholdRead | null {
  const t = thresholdFor(analyte, clock);
  if (!t) return null;

  const above = (line: number) => (t.atLeast ? value >= line : value > line);
  const over = t.high !== undefined && above(t.high);
  const under = t.low !== undefined && value < t.low;
  const verdict = over ? "over" : under ? "under" : "within";

  let tier: Tier;
  if (verdict === "within") tier = t.basis === "guideline" ? "reassure" : "monitor";
  else if ((t.severeHigh !== undefined && above(t.severeHigh)) || (t.severeLow !== undefined && value < t.severeLow)) tier = t.severeTier ?? "go_now";
  else tier = t.outside;

  const limit =
    verdict === "under" || (t.high === undefined && t.low !== undefined)
      ? `a lower limit of ${fmt(t.low ?? 0)}`
      : t.low !== undefined && t.high !== undefined
        ? `a range of ${fmt(t.low)} to ${fmt(t.high)}`
        : t.atLeast
          ? `${fmt(t.high ?? 0)} or more counting as high`
          : `a limit of ${fmt(t.high ?? 0)}`;
  const word = verdict === "within" ? (t.basis === "example" ? "under it, but ask which chart your doctor uses" : "within it") : verdict;

  return {
    threshold: t,
    verdict,
    tier,
    text: `${fmt(value)} ${t.unit} against ${limit} for ${t.forWho}: ${word}.`,
    printedDiffers: printedRange ? `The lab printed ${printedRange}, which is a general range, not one for ${t.forWho}.` : null,
  };
}

/** °F to °C when someone types 100.4. Anything already plausible as °C stays. */
export function toCelsius(v: number): number {
  return v > 45 ? Number((((v - 32) * 5) / 9).toFixed(1)) : v;
}
