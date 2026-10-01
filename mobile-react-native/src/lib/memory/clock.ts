import type { Dating, Pregnancy, Subject } from "./types";

/*
 * THE SUBJECT-RELATIVE CLOCK.
 *
 * Every record, reading and question is anchored to a date AND to a clock
 * that means something for the person it is about:
 *
 *   pregnancy   gestational age, recalculated on every turn
 *   newborn     age in DAYS, not weeks: day 3 and day 6 can turn the same
 *               bilirubin number into opposite actions
 *   everyone    plain age
 *
 * DATING. Gestational age comes from the LMP and from every scan that
 * assigned a dating. When they disagree by a week or more, the scan wins, and
 * the gap is reported rather than quietly resolved: "31 weeks by your LMP,
 * 34 by the growth scan; going by the scan." The earliest scan wins over later
 * ones, because early dating is the accurate one.
 *
 * DAY OF LIFE counts from the day of birth as day 0, so "day 3" is the third
 * full day after birth, the way a 72-hour bilirubin is read.
 */

const DAY = 86_400_000;

export function dayNumber(iso: string): number {
  return Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY);
}

export function isoOf(dayNo: number): string {
  return new Date(dayNo * DAY).toISOString().slice(0, 10);
}

export function todayIso(now: Date = new Date()): string {
  // Local calendar date, not UTC: a reading taken at 1 am in Bengaluru is today.
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return dayNumber(toIso) - dayNumber(fromIso);
}

export type Gestational = {
  kind: "gestational";
  weeks: number;
  days: number;
  totalDays: number;
  trimester: 1 | 2 | 3;
  source: Dating["source"];
  edd: string;
  /** Set when LMP and scan dating disagree by 7 days or more. */
  discrepancy: { lmpDays: number; scanDays: number; differenceDays: number; scanLabel: string | null } | null;
};

export type DayOfLife = {
  kind: "day_of_life";
  day: number;
  /** From gestational age at birth; unknown when it was never recorded. */
  term: "term" | "preterm" | "unknown";
};

export type Postpartum = { kind: "postpartum"; day: number };

export type RelativeClock = Gestational | DayOfLife | Postpartum;

export type Stage = "neonate" | "infant" | "toddler" | "child" | "teen" | "adult" | "older_adult" | "unknown";

export type ResolvedClock = {
  date: string;
  ageDays: number | null;
  ageYears: number | null;
  stage: Stage;
  relative: RelativeClock | null;
  /**
   * Facts about the clock that thresholds and rules key on: "pregnant",
   * "trimester_2", "neonate", "term", "preterm", "postpartum", "female".
   */
  modifiers: string[];
  /** "Week 31 + 2 of pregnancy", "Day 6 of life", "4 months", "36 years". */
  label: string;
};

export function stageFor(ageDays: number | null): Stage {
  if (ageDays === null) return "unknown";
  if (ageDays < 28) return "neonate";
  if (ageDays < 365) return "infant";
  if (ageDays < 3 * 365) return "toddler";
  if (ageDays < 13 * 365) return "child";
  if (ageDays < 18 * 365) return "teen";
  if (ageDays < 65 * 365) return "adult";
  return "older_adult";
}

function ageYears(dob: string, date: string): number {
  const [by, bm, bd] = dob.slice(0, 10).split("-").map(Number);
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  if (!by || !bm || !bd || !y || !m || !d) return 0;
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

function ageLabel(ageDays: number, date: string, dob: string): string {
  if (ageDays < 28) return `Day ${ageDays} of life`;
  if (ageDays < 7 * 13) return `${Math.floor(ageDays / 7)} weeks old`;
  if (ageDays < 365 * 2) {
    const months = Math.floor(ageDays / 30.44);
    return `${months} month${months === 1 ? "" : "s"} old`;
  }
  const years = ageYears(dob, date);
  return `${years} years old`;
}

/**
 * Gestational age on `date`, scan dating first. Null when the pregnancy has no
 * dating at all, or `date` falls outside it.
 */
export function gestationalAge(p: Pregnancy, date: string): Gestational | null {
  const lmpDays = p.lmp ? daysBetween(p.lmp, date) : null;
  // Earliest scan wins: first-trimester dating is the accurate one.
  const scans = p.datings.filter((d) => d.source === "scan" || d.source === "clinician").sort((a, b) => a.date.localeCompare(b.date));
  const anchor = scans[0] ?? null;
  const scanDays = anchor ? anchor.gaDays + daysBetween(anchor.date, date) : null;

  let total: number | null = null;
  let source: Dating["source"] = "lmp";
  if (scanDays !== null) {
    total = scanDays;
    source = anchor?.source ?? "scan";
  } else if (lmpDays !== null) {
    total = lmpDays;
  } else if (p.edd) {
    total = 280 - daysBetween(date, p.edd);
    source = "clinician";
  }
  if (total === null || total < 0 || total > 44 * 7) return null;

  const discrepancy =
    lmpDays !== null && scanDays !== null && Math.abs(scanDays - lmpDays) >= 7
      ? { lmpDays, scanDays, differenceDays: scanDays - lmpDays, scanLabel: anchor?.label ?? null }
      : null;

  const weeks = Math.floor(total / 7);
  return {
    kind: "gestational",
    weeks,
    days: total % 7,
    totalDays: total,
    trimester: weeks < 14 ? 1 : weeks < 28 ? 2 : 3,
    source,
    edd: isoOf(dayNumber(date) + (280 - total)),
    discrepancy,
  };
}

export function formatGa(totalDays: number): string {
  const w = Math.floor(totalDays / 7);
  const d = totalDays % 7;
  return d ? `${w}w ${d}d` : `${w}w`;
}

/**
 * The clock for one person on one date. `pregnancies` are the person's own
 * (as the one carrying), used for the gestational and postpartum clocks.
 */
export function resolveClock(subject: Pick<Subject, "dob" | "sex" | "birth">, date: string, pregnancies: readonly Pregnancy[] = []): ResolvedClock {
  const ageDays = subject.dob ? daysBetween(subject.dob, date) : null;
  const validAge = ageDays !== null && ageDays >= 0 ? ageDays : null;
  const stage = stageFor(validAge);
  const modifiers: string[] = [stage];
  if (subject.sex === "female" || subject.sex === "male") modifiers.push(subject.sex);

  let relative: RelativeClock | null = null;

  if (validAge !== null && validAge < 28) {
    const ga = subject.birth?.gaAtBirthDays ?? null;
    const term = ga === null ? "unknown" : ga >= 259 ? "term" : "preterm";
    relative = { kind: "day_of_life", day: validAge, term };
    modifiers.push(term);
  } else if (validAge !== null && validAge < 365 && subject.birth?.gaAtBirthDays != null && subject.birth.gaAtBirthDays < 259) {
    modifiers.push("preterm");
  }

  for (const p of pregnancies) {
    if (p.status === "ongoing") {
      const ga = gestationalAge(p, date);
      if (ga) {
        relative = ga;
        modifiers.push("pregnant", `trimester_${ga.trimester}`);
        break;
      }
    }
    if (p.status === "delivered" && p.deliveredOn) {
      const since = daysBetween(p.deliveredOn, date);
      if (since >= 0 && since <= 42) {
        relative = { kind: "postpartum", day: since };
        modifiers.push("postpartum");
        break;
      }
    }
  }

  return {
    date,
    ageDays: validAge,
    ageYears: subject.dob && validAge !== null ? ageYears(subject.dob, date) : null,
    stage,
    relative,
    modifiers,
    label: clockLabel(relative, validAge, date, subject.dob),
  };
}

function clockLabel(relative: RelativeClock | null, ageDays: number | null, date: string, dob: string | null): string {
  if (relative?.kind === "gestational") return `Week ${relative.weeks}${relative.days ? ` + ${relative.days}` : ""} of pregnancy`;
  if (relative?.kind === "day_of_life") return `Day ${relative.day} of life`;
  if (relative?.kind === "postpartum") return `Day ${relative.day} after birth`;
  if (ageDays !== null && dob) return ageLabel(ageDays, date, dob);
  return "Age not set";
}

/** The clock in a few words for a record or reading: "day 3", "34w", "36 yrs". */
export function clockTag(c: ResolvedClock): string {
  if (c.relative?.kind === "gestational") return formatGa(c.relative.totalDays);
  if (c.relative?.kind === "day_of_life") return `day ${c.relative.day}`;
  if (c.relative?.kind === "postpartum") return `${c.relative.day}d postpartum`;
  if (c.ageDays !== null && c.ageDays < 730) return `${Math.floor(c.ageDays / 30.44)} mo`;
  if (c.ageYears !== null) return `${c.ageYears} yrs`;
  return "";
}

/** EDD minus N weeks, LMP from EDD, and the other date sums people ask for. */
export function eddFromLmp(lmp: string): string {
  return isoOf(dayNumber(lmp) + 280);
}

export function weeksBefore(iso: string, weeks: number): string {
  return isoOf(dayNumber(iso) - weeks * 7);
}
