import { addDays } from "@/lib/records/details";
import { daysBetween } from "@/lib/memory/clock";
import type { LedgerEntry } from "@/lib/memory/ledger";

import type { TodayAction } from "./today";

/*
 * MEDICINES, DOSE BY DOSE (loop-meds).
 *
 * The ledger (memory/ledger.ts) already knows what someone takes and how
 * often: "1-0-1" from a prescription, "twice a day" from their own list. This
 * turns that into today's doses, morning, afternoon and night, each one
 * ticked on its own, plus how many days of a strip are left.
 *
 * WHERE IT IS KEPT. A taken dose is a today_actions row with the step key
 * `dose:<medicine>:<slot>`, so the streak, the week and the goal streak count
 * it like any other step, and nothing new is needed in the database. The
 * person's own settings (slot times, stock, a schedule they corrected, the
 * reminder switch) live in profiles.daily_prefs.meds.
 *
 * WHAT IT NEVER DOES. Suggest a dose, a change, or that a missed dose be
 * doubled. A schedule only ever comes from a prescription or from the person.
 */

export type Slot = "morning" | "afternoon" | "night";
export const SLOTS: readonly Slot[] = ["morning", "afternoon", "night"];
export const SLOT_LABEL: Record<Slot, string> = { morning: "Morning", afternoon: "Afternoon", night: "Night" };

export type Schedule = [number, number, number];

/** How a dose is taken, short enough for a row: "After food". */
export const TIMING_SHORT: Record<LedgerEntry["timing"], string | null> = {
  before_food: "Before food",
  after_food: "After food",
  with_food: "With food",
  empty_stomach: "Empty stomach",
  bedtime: "At bedtime",
  any: null,
};

/** "1-0-1", the way it is written on an Indian prescription. Halves print as ½. */
export const scheduleText = (s: Schedule) => s.map((n) => (n === 0.5 ? "½" : String(n))).join("-");

/** "HH:MM", 24-hour. */
export type SlotTimes = Record<Slot, string>;
export const DEFAULT_TIMES: SlotTimes = { morning: "08:00", afternoon: "14:00", night: "21:00" };

export type Stock = { left: number; on: string };

/** What daily_prefs.meds holds. Read through readMedPrefs: a client wrote it. */
export type MedPrefs = {
  times: SlotTimes;
  /** Units left (tablets, ml) as counted on a day. */
  stock: Record<string, Stock>;
  /** A schedule the person set themselves, over what the record says. */
  schedules: Record<string, Schedule>;
  /** Dose reminders on this phone. On unless switched off. */
  remind: boolean;
};

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[a-z0-9_]{1,60}$/;

const asRecord = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

function readSchedule(v: unknown): Schedule | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const s = v.map((n) => (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 4 ? n : NaN));
  return s.every((n) => !Number.isNaN(n)) ? (s as Schedule) : null;
}

export function readMedPrefs(raw: unknown): MedPrefs {
  const r = asRecord(raw) ?? {};
  const t = asRecord(r.times) ?? {};
  const times = { ...DEFAULT_TIMES };
  for (const s of SLOTS) if (typeof t[s] === "string" && TIME.test(t[s] as string)) times[s] = t[s] as string;

  const stock: Record<string, Stock> = {};
  for (const [k, v] of Object.entries(asRecord(r.stock) ?? {})) {
    const s = asRecord(v);
    if (KEY.test(k) && s && typeof s.left === "number" && s.left >= 0 && s.left <= 2000 && typeof s.on === "string" && ISO.test(s.on)) stock[k] = { left: s.left, on: s.on };
  }
  const schedules: Record<string, Schedule> = {};
  for (const [k, v] of Object.entries(asRecord(r.schedules) ?? {})) {
    const s = readSchedule(v);
    if (KEY.test(k) && s) schedules[k] = s;
  }
  return { times, stock, schedules, remind: r.remind !== false };
}

/** The jsonb to save back: only what differs from the defaults, so daily_prefs stays small. */
export function writeMedPrefs(p: MedPrefs): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const times = Object.fromEntries(SLOTS.filter((s) => p.times[s] !== DEFAULT_TIMES[s]).map((s) => [s, p.times[s]]));
  if (Object.keys(times).length) out.times = times;
  if (Object.keys(p.stock).length) out.stock = p.stock;
  if (Object.keys(p.schedules).length) out.schedules = p.schedules;
  if (!p.remind) out.remind = false;
  return out;
}

export const hourMinute = (hhmm: string): { hour: number; minute: number } => {
  const m = TIME.exec(hhmm);
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : { hour: 8, minute: 0 };
};

/** today_actions.step_key allows 80 characters of [a-z0-9_:.-]. */
export function doseKey(medKey: string, slot: Slot): string {
  const room = 80 - "dose::".length - slot.length;
  return `dose:${medKey.slice(0, room)}:${slot}`;
}

export function parseDoseKey(stepKey: string): { medKey: string; slot: Slot } | null {
  const m = /^dose:([a-z0-9_]+):(morning|afternoon|night)$/.exec(stepKey);
  return m ? { medKey: m[1] as string, slot: m[2] as Slot } : null;
}

// ------------------------------------------------------------------- view --

type Entry = Pick<LedgerEntry, "key" | "name" | "status" | "schedule" | "dose" | "timing" | "asNeeded" | "unitsPerDay">;

export type StockView = {
  /** Whole days of doses left, from today. */
  daysLeft: number;
  /** The last day there is a dose for, ISO. */
  lastDay: string;
  low: boolean;
};

export type MedView = {
  key: string;
  name: string;
  dose: string | null;
  timing: Entry["timing"];
  schedule: Schedule;
  /** The person set this schedule themselves. */
  ownSchedule: boolean;
  slots: Slot[];
  unitsPerDay: number;
  stock: StockView | null;
  /** Doses taken against doses due over the last seven days of tracking; null before any. */
  adherence: { taken: number; due: number } | null;
};

export type DoseView = { medKey: string; name: string; dose: string | null; timing: Entry["timing"]; stepKey: string; taken: boolean };

export type SlotView = { slot: Slot; time: string; doses: DoseView[]; done: boolean };

export type MedsToday = {
  /** Active medicines with a known schedule, ticked dose by dose. */
  meds: MedView[];
  /** Active medicines with no schedule yet ("as directed"). */
  unscheduled: Entry[];
  slots: SlotView[];
  /** Medicines with five days or fewer left. */
  low: MedView[];
};

export const LOW_DAYS = 5;

/** How long a counted stock lasts, from the day it was counted. */
export function stockView(stock: Stock, unitsPerDay: number, today: string): StockView | null {
  if (unitsPerDay <= 0) return null;
  const total = Math.floor(stock.left / unitsPerDay + 1e-9);
  const used = Math.max(0, daysBetween(stock.on, today));
  const daysLeft = Math.max(0, total - used);
  return { daysLeft, lastDay: addDays(stock.on, Math.max(0, total - 1)), low: daysLeft <= LOW_DAYS };
}

export function medsToday(args: { profileId: string; today: string; ledger: readonly Entry[]; actions: readonly TodayAction[]; prefs: MedPrefs }): MedsToday {
  const { profileId, today, prefs } = args;
  const mine = args.actions.filter((a) => a.profileId === profileId && a.status === "done" && a.stepKey.startsWith("dose:"));
  const takenToday = new Set(mine.filter((a) => a.day === today).map((a) => a.stepKey));

  const active = args.ledger.filter((e) => e.status === "active" && !e.asNeeded);
  const meds: MedView[] = [];
  const unscheduled: Entry[] = [];
  for (const e of active) {
    const own = prefs.schedules[e.key];
    const schedule = own ?? e.schedule;
    if (!schedule || schedule[0] + schedule[1] + schedule[2] === 0) {
      unscheduled.push(e);
      continue;
    }
    const doses = schedule[0] + schedule[1] + schedule[2];
    // A schedule the person set changes the count; the record's units only hold for the record's schedule.
    const unitsPerDay = !own && e.unitsPerDay ? e.unitsPerDay : doses;
    const slots = SLOTS.filter((_, i) => (schedule[i] ?? 0) > 0);
    const stock = prefs.stock[e.key] ? stockView(prefs.stock[e.key] as Stock, unitsPerDay, today) : null;
    meds.push({ key: e.key, name: e.name, dose: e.dose, timing: e.timing, schedule, ownSchedule: Boolean(own), slots, unitsPerDay, stock, adherence: adherenceOf(e.key, slots, mine, today) });
  }

  const slots: SlotView[] = SLOTS.map((slot) => {
    const doses = meds
      .filter((m) => m.slots.includes(slot))
      .map((m) => {
        const stepKey = doseKey(m.key, slot);
        return { medKey: m.key, name: m.name, dose: m.dose, timing: m.timing, stepKey, taken: takenToday.has(stepKey) };
      });
    return { slot, time: prefs.times[slot], doses, done: doses.length > 0 && doses.every((d) => d.taken) };
  }).filter((s) => s.doses.length > 0);

  return { meds, unscheduled, slots, low: meds.filter((m) => m.stock?.low) };
}

/**
 * The seven days before today, counted from the first day anything was
 * ticked, so a person who just started is not shown a week of misses.
 */
function adherenceOf(medKey: string, slots: readonly Slot[], mine: readonly TodayAction[], today: string): MedView["adherence"] {
  const first = mine.reduce<string | null>((min, a) => (min === null || a.day < min ? a.day : min), null);
  if (!first || first >= today) return null;
  const days = Math.min(7, daysBetween(first, today));
  if (days <= 0) return null;
  const keys = new Set(slots.map((s) => doseKey(medKey, s)));
  const from = addDays(today, -days);
  const taken = mine.filter((a) => a.day >= from && a.day < today && keys.has(a.stepKey)).length;
  return { taken, due: days * slots.length };
}

/** The next slot still open today, by the clock: what a dose card leads with. */
export function nextSlot(slots: readonly SlotView[], now: { hour: number; minute: number }): SlotView | null {
  const mins = now.hour * 60 + now.minute;
  const open = slots.filter((s) => !s.done);
  // A slot stays "now" for three hours after its time, then gives way to the next.
  return open.find((s) => { const t = hourMinute(s.time); return mins < t.hour * 60 + t.minute + 180; }) ?? open[open.length - 1] ?? null;
}

/** "19 Oct", the last day there is a dose for. */
export const lastDayLabel = (s: StockView) => new Date(`${s.lastDay}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** "6 days left, lasts till 19 Oct." */
export function runsOutLine(s: StockView): string {
  if (s.daysLeft === 0) return "Ran out. Time to refill.";
  if (s.daysLeft === 1) return "Last day's doses. Refill today.";
  return `${s.daysLeft} days left, lasts till ${lastDayLabel(s)}.`;
}
