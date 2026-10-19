import { daysBetween, dayNumber, isoOf } from "@/lib/memory/clock";
import type { LoopView } from "@/lib/memory/loops";
import type { Series } from "@/lib/memory/series";

import { taskByKey } from "./catalog";
import type { Area, Pillar } from "./content";
import type { DueItem } from "./rules";

/*
 * TODAY, AROUND THE PLAN.
 *
 * Pure functions: which areas a person's readings and conditions point at,
 * the streak and the week, and what is due across the family. The plan
 * itself (which tasks, in which order) is plan.ts.
 */

export type TodayAction = { profileId: string; day: string; stepKey: string; status: "done" | "later" };

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

/**
 * Why an area is in someone's plan, in their words: "Your HbA1c is high
 * (6.1%)" or "For your hypertension". Readings win over conditions.
 */
export function areaReasons(series: ReadonlyMap<string, Series>, conditions: readonly string[]): Map<Area, string> {
  const out = new Map<Area, string>();
  for (const s of series.values()) {
    const f = flagOf(s);
    if (!f || f === "normal") continue;
    const id = `${s.key} ${s.name}`.toLowerCase().replace(/\s+/g, "_");
    for (const m of MARKERS) {
      if (out.has(m.area) || !m.key.test(id)) continue;
      if (m.when === "any" || f.includes(m.when) || (m.when === "high" && f === "critical")) {
        const value = `${s.latest.value}${s.unit ? (s.unit === "%" ? "%" : ` ${s.unit}`) : ""}`;
        out.set(m.area, `Your ${s.name} is ${f === "critical" ? "high" : f} (${value})`);
      }
    }
  }
  for (const c of conditions) {
    for (const m of CONDITIONS) if (!out.has(m.area) && m.match.test(c)) out.set(m.area, `For your ${c.trim().toLowerCase()}`);
  }
  return out;
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "item";

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
      const t = taskByKey(a.stepKey);
      if (t) out.add(t.pillar);
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
