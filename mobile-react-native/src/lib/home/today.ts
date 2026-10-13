import { daysBetween, dayNumber, isoOf } from "@/lib/memory/clock";
import type { LoopView } from "@/lib/memory/loops";
import type { Series } from "@/lib/memory/series";

import { AREA_LABEL, NUDGES, nudgeByKey, type Area, type Nudge, type Pillar } from "./content";
import type { DueItem } from "./rules";

/*
 * TODAY, BUILT FROM WHAT CHEEKU KNOWS.
 *
 * Pure functions: the step for today, what is due across the family, the
 * alert worth raising about someone else, and the streak. No React, no
 * network, so every rule here is tested in today.test.ts.
 *
 * THE STEP, IN ORDER OF WHAT MATTERS MOST:
 *   1. something of theirs that is overdue or due within a week
 *   2. a habit aimed at a reading that came back high or low
 *   3. a habit aimed at a condition on their profile
 *   4. a medicine habit, if they take any
 *   5. a general longevity habit, rotating daily
 * A step done or put off today drops out and the next one moves up.
 */

export type StepStatus = "open" | "done" | "later";

export type Step = {
  key: string;
  kind: "due" | "nudge";
  pillar: Pillar;
  area: Area;
  chip: string;
  title: string;
  why: string;
  minutes?: number;
  cta?: { label: string; route: string };
  status: StepStatus;
};

export type TodayAction = { profileId: string; day: string; stepKey: string; status: "done" | "later" };

/** The slice of the memory context Today reads. */
export type TodayInput = {
  loops: readonly LoopView[];
  series: ReadonlyMap<string, Series>;
  ledger: readonly { name: string; status: string; ingredients?: readonly { key: string }[] }[];
  conditions: readonly string[];
  /** The clock's stage: babies get no habit steps, children and pregnancy a gentler set. */
  lifeStage: string;
  pregnant: boolean;
};

// ------------------------------------------------------------- matching --

const MARKERS: { area: Area; key: RegExp; when: "high" | "low" | "any" }[] = [
  { area: "sugar", key: /hba1c|glucose|sugar|\bfbs\b|\bppbs\b/, when: "high" },
  { area: "bp", key: /bp_systolic|bp_diastolic|blood_pressure/, when: "high" },
  { area: "kidney", key: /creatinine|urea|uric/, when: "high" },
  { area: "kidney", key: /egfr/, when: "low" },
  { area: "lipids", key: /ldl|cholesterol|triglyceride|vldl/, when: "high" },
  { area: "lipids", key: /\bhdl/, when: "low" },
  { area: "liver", key: /sgpt|sgot|\balt\b|\bast\b|ggt|alkaline_phosphatase/, when: "high" },
  { area: "iron", key: /haemoglobin|hemoglobin|ferritin|\biron\b/, when: "low" },
  { area: "vitamin_d", key: /vitamin_d|25.?oh/, when: "low" },
  { area: "b12", key: /b12|cobalamin/, when: "low" },
  { area: "thyroid", key: /\btsh\b|^tsh|t3|t4/, when: "any" },
];

const CONDITIONS: { area: Area; match: RegExp }[] = [
  { area: "sugar", match: /diabet|sugar|prediabet|insulin resist/i },
  { area: "bp", match: /hypertens|blood pressure|\bbp\b/i },
  { area: "kidney", match: /kidney|renal|\bckd\b/i },
  { area: "lipids", match: /cholesterol|lipid|heart|cardiac/i },
  { area: "liver", match: /liver|hepat/i },
  { area: "thyroid", match: /thyroid/i },
  { area: "iron", match: /anaemi|anemi/i },
  { area: "weight", match: /obes|overweight|pcos|pcod/i },
];

const AREA_ORDER: Area[] = ["sugar", "bp", "kidney", "lipids", "liver", "iron", "vitamin_d", "b12", "thyroid", "weight"];

const THYROID_MED = /levothyrox|thyroxine|thyronorm|eltroxin|thyrox/i;

/** Steps that are fine for a child, a teenager or during pregnancy. */
const GENTLE = new Set(["one_fruit", "walk_outside", "same_bedtime", "sleep_wind_down", "protein_each_meal", "five_slow_breaths", "call_someone", "morning_sun", "stand_hourly", "lemon_with_dal", "b12_dairy", "med_anchor", "med_stock"]);

const flagOf = (s: Series) => (s.latest.flag ?? "").toLowerCase();

/** Areas a reading points at, most important first. */
export function areasFromReadings(series: ReadonlyMap<string, Series>): Area[] {
  const hit = new Set<Area>();
  for (const s of series.values()) {
    const f = flagOf(s);
    if (!f || f === "normal") continue;
    const id = `${s.key} ${s.name}`.toLowerCase().replace(/\s+/g, "_");
    for (const m of MARKERS) {
      if (!m.key.test(id)) continue;
      if (m.when === "any" || f.includes(m.when) || (m.when === "high" && f === "critical")) hit.add(m.area);
    }
  }
  return AREA_ORDER.filter((a) => hit.has(a));
}

export function areasFromConditions(conditions: readonly string[]): Area[] {
  const hit = new Set<Area>();
  for (const c of conditions) for (const m of CONDITIONS) if (m.match.test(c)) hit.add(m.area);
  return AREA_ORDER.filter((a) => hit.has(a));
}

// ------------------------------------------------------------- the steps --

/** Stable per person and day, different across people and days. */
function seed(profileId: string, today: string): number {
  let h = 0;
  for (const ch of profileId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h + dayNumber(today)) >>> 0;
}

function rotate<T>(list: readonly T[], n: number): T[] {
  if (!list.length) return [];
  const k = n % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "item";

function dueStep(l: LoopView): Step | null {
  if (l.type === "result_pending") return null;
  if (l.daysToDue === null || l.daysToDue > 7) return null;
  const when = l.overdue ? `It was due ${Math.abs(l.daysToDue)} day${Math.abs(l.daysToDue) === 1 ? "" : "s"} ago.` : l.daysToDue === 0 ? "It's due today." : `It's due in ${l.daysToDue} day${l.daysToDue === 1 ? "" : "s"}.`;
  const test = l.type === "test_ordered";
  return {
    key: `due:${slug(l.key)}`,
    kind: "due",
    pillar: "check",
    area: "general",
    chip: l.overdue ? "Overdue" : "Due soon",
    title: test ? `Book your ${l.title.toLowerCase().startsWith("your ") ? l.title.slice(5) : l.title}` : l.title,
    why: `${when} ${l.detail ?? (test ? "Home collection takes ten minutes and the result comes back into Cheeku." : "Cheeku can help you plan it.")}`.trim(),
    cta: test ? { label: "Book home collection", route: "/labs" } : { label: "Plan it with Cheeku", route: `/ask?q=${encodeURIComponent(`Help me plan: ${l.title}`)}` },
    status: "open",
  };
}

function nudgeStep(n: Nudge, area: Area): Step {
  return { key: n.key, kind: "nudge", pillar: n.pillar, area, chip: AREA_LABEL[area], title: n.title, why: n.why, minutes: n.minutes, status: "open" };
}

/**
 * Every step on offer today for one member, in priority order, with today's
 * done and later marks applied. The first open one is Today's step.
 */
export function buildSteps(input: TodayInput, profileId: string, today: string, log: readonly TodayAction[] = []): Step[] {
  const marks = new Map(log.filter((a) => a.profileId === profileId && a.day === today).map((a) => [a.stepKey, a.status] as const));
  const out: Step[] = [];
  const seen = new Set<string>();
  const push = (s: Step | null) => {
    if (!s || seen.has(s.key)) return;
    seen.add(s.key);
    out.push({ ...s, status: marks.get(s.key) ?? "open" });
  };

  // Babies: checkups and tests only, no habits.
  const baby = ["neonate", "infant", "toddler"].includes(input.lifeStage);
  const gentle = input.pregnant || ["child", "teen"].includes(input.lifeStage);

  for (const l of input.loops) push(dueStep(l));
  if (baby) return out;

  const n = seed(profileId, today);
  const onThyroidMed = input.ledger.some((e) => e.status === "active" && THYROID_MED.test(e.name));
  const areas = gentle ? [] : [...new Set([...areasFromReadings(input.series), ...areasFromConditions(input.conditions)])];
  const kidney = areas.includes("kidney");
  const allowed = (x: Nudge) => (!gentle || GENTLE.has(x.key)) && !(kidney && x.key === "water_before_meals") && (x.area !== "thyroid" || onThyroidMed);

  for (const area of areas) {
    const pool = NUDGES.filter((x) => x.area === area && allowed(x));
    for (const x of rotate(pool, n).slice(0, 2)) push(nudgeStep(x, area));
  }

  if (input.ledger.some((e) => e.status === "active")) {
    const pool = NUDGES.filter((x) => x.area === "medicines" && allowed(x));
    for (const x of rotate(pool, n).slice(0, 1)) push(nudgeStep(x, "medicines"));
    if (onThyroidMed) {
      const t = nudgeByKey("thyroid_same_time");
      if (t) push(nudgeStep(t, "thyroid"));
    }
  }

  const general = NUDGES.filter((x) => x.area === "general" && allowed(x));
  for (const x of rotate(general, n).slice(0, 4)) push(nudgeStep(x, "general"));

  // Whatever was logged today but no longer offered (the data moved on) still
  // counts as done, so the card does not offer it again.
  return out;
}

/** Today's step: the first one not done or put off, else null (all done). */
export function currentStep(steps: readonly Step[]): Step | null {
  return steps.find((s) => s.status === "open") ?? null;
}

// --------------------------------------------------------------- streaks --

export type Streak = { count: number; todayDone: boolean; best: number };

/**
 * Days in a row with at least one step done. A streak that ended yesterday is
 * still alive today: missing today only counts once today is over.
 */
export function streakOf(doneDays: Iterable<string>, today: string): Streak {
  const days = new Set([...doneDays].map((d) => d.slice(0, 10)));
  const t = dayNumber(today);
  const todayDone = days.has(today);
  let count = 0;
  for (let d = todayDone ? t : t - 1; days.has(isoOf(d)); d--) count++;

  let best = 0;
  let run = 0;
  const sorted = [...days].map(dayNumber).sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === (sorted[i - 1] as number) + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { count, todayDone, best: Math.max(best, count) };
}

export type WeekDay = { iso: string; letter: string; done: boolean; today: boolean; future: boolean };

/** Monday to Sunday of the week containing `today`. */
export function weekOf(doneDays: Iterable<string>, today: string): WeekDay[] {
  const days = new Set([...doneDays].map((d) => d.slice(0, 10)));
  const t = dayNumber(today);
  // 1970-01-01 was a Thursday, so day 0 is index 3 in a Monday-first week.
  const monday = t - ((t + 3) % 7);
  return Array.from({ length: 7 }, (_, i) => {
    const iso = isoOf(monday + i);
    return { iso, letter: "MTWTFSS"[i] as string, done: days.has(iso), today: monday + i === t, future: monday + i > t };
  });
}

/** Pillars trained this week, from the steps done in it. */
export function pillarsThisWeek(log: readonly TodayAction[], today: string): Set<Pillar> {
  const week = new Set(weekOf([], today).map((d) => d.iso));
  const out = new Set<Pillar>();
  for (const a of log) {
    if (a.status !== "done" || !week.has(a.day)) continue;
    if (a.stepKey.startsWith("due:")) out.add("check");
    else {
      const n = nudgeByKey(a.stepKey);
      if (n) out.add(n.pillar);
    }
  }
  return out;
}

// ------------------------------------------------------------ due items --

export type DueRow = DueItem & { daysToDue: number; overdue: boolean; when: string; who: string; mine: boolean };

export function whenLabel(daysToDue: number): string {
  if (daysToDue === 0) return "Today";
  if (daysToDue === 1) return "Tomorrow";
  if (daysToDue === -1) return "Overdue by a day";
  const n = Math.abs(daysToDue);
  return daysToDue > 0 ? `In ${n} days` : `Overdue by ${n} days`;
}

/**
 * The family's dated items from the server, plus the active member's loops
 * from memory (which include ones derived from records and never stored),
 * one row per thing, soonest first.
 */
export function dueRows(args: {
  server: readonly DueItem[];
  loops: readonly LoopView[];
  activeId: string;
  names: ReadonlyMap<string, string>;
  today: string;
  horizon?: number;
}): DueRow[] {
  const { server, loops, activeId, names, today, horizon = 14 } = args;
  const fromMemory: DueItem[] = loops
    .filter((l) => l.dueBy && l.type !== "result_pending")
    .map((l) => ({ id: `m:${l.key}`, source: "memory", type: l.type, profileId: activeId, title: l.title, detail: l.detail, dueBy: l.dueBy as string }));

  const seen = new Set<string>();
  const out: DueRow[] = [];
  for (const d of [...server, ...fromMemory]) {
    const id = `${d.profileId}|${d.title.trim().toLowerCase()}`;
    if (seen.has(id)) continue;
    // A member outside the plan's seats is not shown (their name is not known here).
    const who = names.get(d.profileId);
    if (!who) continue;
    const daysToDue = daysBetween(today, d.dueBy);
    if (daysToDue > horizon) continue;
    seen.add(id);
    out.push({ ...d, daysToDue, overdue: daysToDue < 0, when: whenLabel(daysToDue), who, mine: d.profileId === activeId });
  }
  return out.sort((a, b) => a.daysToDue - b.daysToDue);
}

/** Someone else's item worth raising on your Today: overdue, or due within two days. */
export function familyAlerts(rows: readonly DueRow[]): DueRow[] {
  return rows.filter((r) => !r.mine && r.daysToDue <= 2).slice(0, 2);
}

export function routeFor(row: Pick<DueRow, "type" | "title" | "source">): string {
  if (row.source === "lab") return "/labs";
  if (row.type === "test_ordered") return "/labs";
  return `/ask?q=${encodeURIComponent(`Help me plan: ${row.title}`)}`;
}
