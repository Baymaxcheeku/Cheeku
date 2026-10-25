import { daysBetween } from "@/lib/memory/clock";
import type { LoopView } from "@/lib/memory/loops";
import type { Series } from "@/lib/memory/series";
import { hourMinute, type MedPrefs, type MedsToday, type Slot } from "@/lib/home/meds";
import type { TodayAction } from "@/lib/home/today";

/*
 * FAMILY CARE (loop-caregiver).
 *
 * Every member lives under the account holder's login, so the account holder
 * is the caregiver. Two pure pieces here:
 *
 *   carePlan()     the dose plan the phone already works out (meds.ts), cut
 *                  down to what the server needs to check it: slot times,
 *                  ledger keys, the last day each counted strip lasts, and two
 *                  switches. Written to profiles.care_plan; the sweep in
 *                  migration 0038 compares it with what was ticked and writes
 *                  parent alerts. Keys only, never a medicine's name.
 *
 *   careSummary()  one member at a glance for the Family care screen: today's
 *                  doses, the week, their latest BP and sugar, and anything
 *                  that needs the caregiver, most urgent first.
 */

export type CarePlan = {
  v: 1;
  slots: { slot: Slot; time: string; keys: string[] }[];
  refills: { key: string; last: string }[];
  remind: boolean;
  alerts: boolean;
};

/** Caregiver alerts about this member: on unless switched off on Family care. */
export function readCareAlerts(raw: unknown): boolean {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return r.alerts !== false;
}

export function carePlan(meds: MedsToday | null, prefs: MedPrefs, alerts: boolean): CarePlan {
  return {
    v: 1,
    slots: (meds?.slots ?? []).map((s) => ({ slot: s.slot, time: s.time, keys: s.doses.map((d) => d.medKey).sort() })),
    refills: (meds?.meds ?? [])
      .filter((m) => m.stock)
      .map((m) => ({ key: m.key, last: m.stock?.lastDay ?? "" }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    remind: prefs.remind,
    alerts,
  };
}

// --------------------------------------------------------------- summary --

export type CareReading = { key: "bp" | "sugar" | "weight"; label: string; value: string; unit: string; date: string; flagged: boolean };

export type CareAttention = {
  kind: "late_dose" | "refill" | "overdue" | "due_soon" | "quiet";
  text: string;
  /** Where a tap goes, when it goes anywhere. */
  route: string | null;
};

export type CareSlot = { slot: Slot; time: string; taken: number; total: number; done: boolean; late: boolean };

export type CareSummary = {
  slots: CareSlot[];
  doses: { taken: number; total: number };
  /** Doses ticked over the last seven days of tracking; null before any. */
  week: { taken: number; due: number } | null;
  readings: CareReading[];
  attention: CareAttention[];
  /** The last day any dose or step was ticked for them. */
  lastTick: string | null;
  status: "good" | "attention" | "idle";
};

const SLOT_WORD: Record<Slot, string> = { morning: "Morning", afternoon: "Afternoon", night: "Night" };

function reading(series: ReadonlyMap<string, Series>): CareReading[] {
  const out: CareReading[] = [];
  const sys = series.get("bp_systolic"), dia = series.get("bp_diastolic");
  if (sys) {
    const sameDay = dia && dia.latest.date === sys.latest.date;
    out.push({
      key: "bp",
      label: "BP",
      value: sameDay ? `${sys.latest.value}/${dia?.latest.value}` : String(sys.latest.value),
      unit: "mmHg",
      date: sys.latest.date,
      flagged: [sys.latest.flag, sameDay ? dia?.latest.flag : null].some((f) => f && f !== "normal"),
    });
  }
  const sugar = ["glucose_fasting", "hba1c", "glucose_random", "glucose_pp"].map((k) => series.get(k)).find(Boolean);
  if (sugar) {
    out.push({ key: "sugar", label: sugar.key === "hba1c" ? "HbA1c" : "Sugar", value: String(sugar.latest.value), unit: sugar.unit ?? "", date: sugar.latest.date, flagged: Boolean(sugar.latest.flag && sugar.latest.flag !== "normal") });
  }
  const weight = series.get("weight");
  if (weight && out.length < 2) out.push({ key: "weight", label: "Weight", value: String(weight.latest.value), unit: weight.unit ?? "kg", date: weight.latest.date, flagged: false });
  return out.slice(0, 2);
}

export function careSummary(args: {
  profileId: string;
  today: string;
  /** Minutes after midnight, now. */
  nowMin: number;
  meds: MedsToday | null;
  loops: readonly LoopView[];
  series: ReadonlyMap<string, Series>;
  actions: readonly TodayAction[];
}): CareSummary {
  const { profileId, today, nowMin, meds } = args;

  const slots: CareSlot[] = (meds?.slots ?? []).map((s) => {
    const t = hourMinute(s.time);
    const taken = s.doses.filter((d) => d.taken).length;
    return { slot: s.slot, time: s.time, taken, total: s.doses.length, done: s.done, late: !s.done && nowMin >= t.hour * 60 + t.minute + 90 };
  });
  const doses = { taken: slots.reduce((n, s) => n + s.taken, 0), total: slots.reduce((n, s) => n + s.total, 0) };

  const adh = (meds?.meds ?? []).map((m) => m.adherence).filter((a): a is { taken: number; due: number } => Boolean(a));
  const week = adh.length ? { taken: adh.reduce((n, a) => n + a.taken, 0), due: adh.reduce((n, a) => n + a.due, 0) } : null;

  const mine = args.actions.filter((a) => a.profileId === profileId && a.status === "done");
  const lastTick = mine.reduce<string | null>((max, a) => (max === null || a.day > max ? a.day : max), null);
  const doseTicks = mine.filter((a) => a.stepKey.startsWith("dose:"));
  const lastDose = doseTicks.reduce<string | null>((max, a) => (max === null || a.day > max ? a.day : max), null);

  const attention: CareAttention[] = [];
  for (const s of slots.filter((x) => x.late)) {
    attention.push({ kind: "late_dose", text: `${SLOT_WORD[s.slot]} doses not ticked yet`, route: "/medicines" });
  }
  // Ticked before, nothing for two days: worth a call.
  if (meds?.slots.length && lastDose && daysBetween(lastDose, today) >= 2) {
    attention.push({ kind: "quiet", text: `No doses ticked for ${daysBetween(lastDose, today)} days`, route: null });
  }
  for (const m of meds?.low ?? []) {
    const left = m.stock?.daysLeft ?? 0;
    attention.push({ kind: "refill", text: left === 0 ? "A medicine has run out" : `A medicine runs out in ${left} day${left === 1 ? "" : "s"}`, route: "/services/request?service=medicines&offering=refill" });
  }
  for (const l of args.loops) {
    if (l.type === "result_pending" || l.daysToDue === null || l.daysToDue > 7) continue;
    const late = l.daysToDue < 0;
    attention.push({
      kind: late ? "overdue" : "due_soon",
      text: late ? `${l.title}, ${Math.abs(l.daysToDue)} day${Math.abs(l.daysToDue) === 1 ? "" : "s"} overdue` : l.daysToDue === 0 ? `${l.title}, due today` : `${l.title}, due in ${l.daysToDue} day${l.daysToDue === 1 ? "" : "s"}`,
      route: l.type === "test_ordered" ? "/labs" : null,
    });
  }
  const rank: Record<CareAttention["kind"], number> = { late_dose: 0, overdue: 1, refill: 2, quiet: 3, due_soon: 4 };
  attention.sort((a, b) => rank[a.kind] - rank[b.kind]);

  const urgent = attention.some((a) => a.kind !== "due_soon");
  const status: CareSummary["status"] = urgent ? "attention" : !meds?.slots.length && !lastTick ? "idle" : "good";
  return { slots, doses, week, readings: reading(args.series), attention, lastTick, status };
}

/** "Good today", "Needs you", "Nothing tracked yet": the one-line verdict. */
export function verdict(s: CareSummary): string {
  if (s.status === "attention") return s.attention.length === 1 ? "1 thing needs you" : `${s.attention.length} things need you`;
  if (s.status === "idle") return "Nothing tracked yet";
  if (s.doses.total && s.doses.taken === s.doses.total) return "All doses ticked today";
  return "On track today";
}

/** A stable string for a plan, so the phone writes only when it changed. */
export const planSignature = (p: CarePlan) => JSON.stringify(p);
