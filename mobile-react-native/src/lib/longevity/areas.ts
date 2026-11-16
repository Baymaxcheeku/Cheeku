import type { LoopView } from "@/lib/memory/loops";
import type { Series } from "@/lib/memory/series";

/*
 * THE LONGEVITY ENGINE, AS AREAS, NOT A SCORE.
 *
 * Decided with the owner on 11 Nov 2026: no single number, no "health age".
 * Each person gets up to six areas, each marked on track, watch or act, and a
 * plain line saying why. The chat reads them, the daily plan leans on the
 * ones marked act, and Home can show them.
 *
 * WHERE A MARK COMES FROM. Signals, each from one source and one date:
 *
 *   report    a lab value on a record (HbA1c, fasting sugar, cholesterol)
 *   reading   a number said in chat or logged (BP 140/90 this morning)
 *   device    the watch or phone, through an optional layer (lib/extensions)
 *   loop      a test or follow-up that is due or overdue
 *
 * An area takes its worst signal, so one bad sugar report is not averaged
 * away by good step counts. A signal older than eighteen months is dropped:
 * an old number is not a reason to worry today.
 *
 * WHAT THIS IS NOT. Not a diagnosis and not a risk score. The cut-offs below
 * are the common screening lines a doctor would also use to say "worth a
 * look", and the words say exactly that. Nothing here tells anyone to start
 * or stop a medicine.
 */

export type AreaKey = "heart" | "sugar" | "sleep" | "movement" | "weight" | "checkups";
export type Mark = "on_track" | "watch" | "act";
export type AreaStatus = Mark | "unknown";

export type Signal = {
  area: AreaKey;
  mark: Mark;
  /** One plain sentence, the person's own number in it. */
  line: string;
  source: "report" | "reading" | "device" | "loop";
  date: string | null;
  /** True for sample data shown in a preview: never stored, always labelled. */
  sample?: boolean;
};

export type Area = { key: AreaKey; label: string; status: AreaStatus; line: string; signals: Signal[] };

export const AREA_LABEL: Record<AreaKey, string> = {
  heart: "Heart and BP",
  sugar: "Sugar",
  sleep: "Sleep",
  movement: "Movement",
  weight: "Weight",
  checkups: "Check-ups",
};

const ORDER: readonly AreaKey[] = ["heart", "sugar", "sleep", "movement", "weight", "checkups"];
const RANK: Record<Mark, number> = { on_track: 0, watch: 1, act: 2 };
const STALE_DAYS = 548;

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function find(series: ReadonlyMap<string, Series>, keys: readonly string[]): Series | null {
  for (const k of keys) {
    const s = series.get(k);
    if (s) return s;
  }
  return null;
}

function fresh(s: Series | null, today: string): s is Series {
  return Boolean(s) && daysBetween(s!.latest.date, today) <= STALE_DAYS;
}

function source(s: Series): Signal["source"] {
  return s.latest.source === "record" ? "report" : s.latest.source === "device" ? "device" : "reading";
}

/**
 * Signals from what Cheeku already holds about the person: their reports,
 * readings said in chat, and their open follow-ups. Adults only for the
 * numbers; a child's areas come from check-ups and the watch.
 */
export function recordSignals(args: { series: ReadonlyMap<string, Series>; loops: readonly LoopView[]; today: string; ageYears: number | null; pregnant: boolean }): Signal[] {
  const { series, loops, today } = args;
  const out: Signal[] = [];
  const adult = args.ageYears === null || args.ageYears >= 18;

  if (adult) {
    const sys = find(series, ["bp_systolic"]);
    const dia = find(series, ["bp_diastolic"]);
    if (fresh(sys, today)) {
      const s = sys.latest.value;
      const d = dia && dia.latest.date === sys.latest.date ? dia.latest.value : null;
      const pair = d !== null ? `${fmt(s)}/${fmt(d)}` : fmt(s);
      const mark: Mark = s >= 140 || (d ?? 0) >= 90 ? "act" : s >= 130 || (d ?? 0) >= 80 ? "watch" : "on_track";
      const line = mark === "act" ? `BP ${pair} is above the line doctors like to see. Worth a few more readings and a word with the doctor.` : mark === "watch" ? `BP ${pair} is a little high. A few calm morning readings will show if it stays there.` : `BP ${pair} sits in a healthy range.`;
      out.push({ area: "heart", mark, line, source: source(sys), date: sys.latest.date });
    }

    const ldl = find(series, ["ldl_cholesterol", "ldl"]);
    if (fresh(ldl, today)) {
      const v = ldl.latest.value;
      const mark: Mark = v >= 160 ? "act" : v >= 130 ? "watch" : "on_track";
      out.push({ area: "heart", mark, line: mark === "on_track" ? `LDL cholesterol ${fmt(v)} is fine.` : `LDL cholesterol ${fmt(v)} is ${mark === "act" ? "high" : "on the high side"}. Food and walks help; the doctor decides the rest.`, source: source(ldl), date: ldl.latest.date });
    }

    const a1c = find(series, ["hba1c"]);
    const fbs = find(series, ["glucose_fasting"]);
    if (fresh(a1c, today)) {
      const v = a1c.latest.value;
      const mark: Mark = v >= 6.5 ? "act" : v >= 5.7 ? "watch" : "on_track";
      out.push({ area: "sugar", mark, line: mark === "on_track" ? `Average sugar (HbA1c) ${fmt(v)}% is in the normal range.` : `Average sugar (HbA1c) ${fmt(v)}% is ${mark === "act" ? "in the range a doctor treats" : "in the early-warning band"}.`, source: source(a1c), date: a1c.latest.date });
    } else if (fresh(fbs, today)) {
      const v = fbs.latest.value;
      const mark: Mark = v >= 126 ? "act" : v >= 100 ? "watch" : "on_track";
      out.push({ area: "sugar", mark, line: mark === "on_track" ? `Fasting sugar ${fmt(v)} is fine.` : `Fasting sugar ${fmt(v)} is ${mark === "act" ? "high" : "a little high"}. An HbA1c test shows the three-month picture.`, source: source(fbs), date: fbs.latest.date });
    }

    const bmi = find(series, ["bmi"]);
    const weight = find(series, ["weight", "body_weight"]);
    if (!args.pregnant && fresh(bmi, today)) {
      const v = bmi.latest.value;
      // Lower cut-offs for South Asian adults, as Indian guidance uses.
      const mark: Mark = v >= 27.5 || v < 17 ? "act" : v >= 23 || v < 18.5 ? "watch" : "on_track";
      out.push({ area: "weight", mark, line: mark === "on_track" ? `BMI ${fmt(v)} is in the healthy band.` : `BMI ${fmt(v)} is ${v < 18.5 ? "on the low side" : "above the healthy band for Indian adults"}.`, source: source(bmi), date: bmi.latest.date });
    } else if (!args.pregnant && fresh(weight, today) && weight.pctFromFirst !== null && weight.points.length >= 2) {
      const pct = weight.pctFromFirst;
      const mark: Mark = Math.abs(pct) >= 5 ? "watch" : "on_track";
      out.push({ area: "weight", mark, line: mark === "watch" ? `Weight has moved ${pct > 0 ? "up" : "down"} ${fmt(Math.abs(pct))}% since the first reading.` : `Weight is steady at ${fmt(weight.latest.value)} kg.`, source: source(weight), date: weight.latest.date });
    }
  }

  const overdue = loops.filter((l) => l.overdue);
  const soon = loops.filter((l) => !l.overdue && l.daysToDue !== null && l.daysToDue <= 30);
  if (overdue.length) out.push({ area: "checkups", mark: "act", line: `${overdue[0]!.title} is overdue${overdue.length > 1 ? `, and ${overdue.length - 1} more` : ""}.`, source: "loop", date: overdue[0]!.dueBy ?? null });
  else if (soon.length) out.push({ area: "checkups", mark: "watch", line: `${soon[0]!.title} is due within the month.`, source: "loop", date: soon[0]!.dueBy ?? null });
  else if (series.size || loops.length) out.push({ area: "checkups", mark: "on_track", line: "Nothing is overdue.", source: "loop", date: null });

  return out;
}

/** Signals grouped into areas, each taking its worst signal. Areas with nothing to go on are "unknown". */
export function longevityAreas(signals: readonly Signal[]): Area[] {
  return ORDER.map((key) => {
    const mine = signals.filter((s) => s.area === key).sort((a, b) => RANK[b.mark] - RANK[a.mark] || (b.date ?? "").localeCompare(a.date ?? ""));
    const worst = mine[0];
    return {
      key,
      label: AREA_LABEL[key],
      status: worst ? worst.mark : "unknown",
      line: worst ? worst.line : "Nothing to go on yet.",
      signals: mine,
    };
  });
}

/** The areas worth acting on first: act, then watch. For the plan and the chat. */
export function focusAreas(areas: readonly Area[]): Area[] {
  return areas.filter((a) => a.status === "act").concat(areas.filter((a) => a.status === "watch"));
}

/** Which daily-plan goal fits an area marked act or watch, if one does (lib/home/goals). */
export function goalForArea(key: AreaKey): "sleep" | "weight" | "sugar" | "legs" | null {
  return key === "sleep" ? "sleep" : key === "weight" ? "weight" : key === "sugar" ? "sugar" : key === "movement" ? "legs" : null;
}

/** What to type in chat to hear about one area. The sparrow answers it (AREA_Q in lib/memory/sparrow). */
export function areaQuestion(a: Pick<Area, "key" | "label">): string {
  return a.key === "checkups" ? "How are my check-ups?" : `How is my ${a.key === "heart" ? "heart and BP" : a.label.toLowerCase()} doing?`;
}
