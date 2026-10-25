import { dayNumber, daysBetween } from "@/lib/memory/clock";
import type { LedgerEntry } from "@/lib/memory/ledger";
import type { LoopView } from "@/lib/memory/loops";
import type { Series } from "@/lib/memory/series";

import { BREATHING, HABITS, MEALS, READINGS, SLEEP_RATING, STEPS_TASK, taskByKey, windowAt, type CatalogTask, type Window } from "./catalog";
import { AREA_LABEL, PILLARS, type Area, type Pillar } from "./content";
import { goalByKey, goalsFor, goalStreak, goalTaskKeys, goalTitle, readGoalPrefs, type Goal, type GoalView } from "./goals";
import type { PlateTag } from "./meals";
import { SLOT_LABEL, medsToday, readMedPrefs, type DoseView, type MedsToday, type Slot } from "./meds";
import { areaReasons, areasFromConditions, areasFromReadings, slug, type TodayAction } from "./today";

/*
 * TODAY'S ACTION PLAN: THE PERSONALISATION ENGINE.
 *
 * One person, one day. In goes what Cheeku knows (readings and how they
 * came back, conditions, medicines, what is due, age and life stage, what
 * they logged this week, their own preferences); out comes a plan across
 * the five pillars, each task saying whether it is there for them in
 * particular and why.
 *
 * THE MIX, ALWAYS IN THIS SHAPE:
 *   their due items        tests and follow-ups, first, whatever else
 *   the daily spine        steps (or active play for children), four meals,
 *                          last night's sleep, two minutes of breathing
 *   their own checks       BP, sugar or weight readings when an area calls
 *                          for them; medicines when they take any, one
 *                          card per part of the day with each dose on it
 *                          (meds.ts), or a single tick when the schedule
 *                          is not known yet
 *   personal habits        aimed at what their readings and conditions say,
 *                          at most four, two per area, rotating daily
 *   their goal             two to four check-ins for the one goal they
 *                          picked (goals.ts), tagged and ranked after due
 *   general habits         one per pillar, rotating, so the plan is never
 *                          only about what is wrong
 *
 * Babies get their due items and nothing else. Children, teenagers and
 * pregnancy get the gentle set, nothing aimed at a reading, and a doctor's
 * caveat on steps. Kidney flags drop every "drink more water" task.
 *
 * Ordered for the hour it is: what fits now, then any time, then later
 * today, then what the day has already passed.
 */

export type DailyLog = {
  id: string;
  profileId: string;
  day: string;
  taskKey: string;
  pillar: Pillar;
  kind: string;
  slot: string | null;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  tags: string[];
  photoPath: string | null;
  createdAt: string;
};

/** `goal` and `meds` are read through readGoalPrefs and readMedPrefs: jsonb a person's own client wrote. */
export type DailyPrefs = { steps_goal?: number; veg?: boolean; goal?: unknown; meds?: unknown };

/** What the plan needs from a ledger entry. Older callers pass name and status only. */
export type PlanMedicine = Pick<LedgerEntry, "name" | "status"> & Partial<Pick<LedgerEntry, "key" | "schedule" | "dose" | "timing" | "asNeeded" | "unitsPerDay">>;

export type PlanInput = {
  profileId: string;
  today: string;
  hour: number;
  loops: readonly LoopView[];
  series: ReadonlyMap<string, Series>;
  ledger: readonly PlanMedicine[];
  conditions: readonly string[];
  lifeStage: string;
  ageYears: number | null;
  pregnant: boolean;
  /** today_actions, any member; only this member's today counts. */
  actions: readonly TodayAction[];
  /** This member's logs, today and the week before. */
  logs: readonly DailyLog[];
  prefs: DailyPrefs;
};

export type TaskStatus = "open" | "done" | "later";

export type PlanTask = CatalogTask & {
  status: TaskStatus;
  /** There because of this person's own data, not general advice. */
  personal: boolean;
  /** "Your HbA1c is high (6.1%)", for personal tasks. */
  reason: string | null;
  chip: string;
  /** A test or follow-up that is due. */
  due?: boolean;
  /** One of the check-ins for the goal they picked. */
  goal?: boolean;
  dueLabel?: string;
  cta?: { label: string; route: string };
  /** Steps: count so far against today's target. */
  progress?: { value: number; target: number };
  /** Today's logs for this task. */
  logs: DailyLog[];
  /** A dose card: its part of the day, the time, and each medicine's dose. */
  dose?: { slot: Slot; time: string; doses: DoseView[] };
};

export type StepsTarget = { goal: number; target: number; ramping: boolean; line: string };

export type Plan = {
  tasks: PlanTask[];
  hero: PlanTask | null;
  byPillar: Record<Pillar, PlanTask[]>;
  pillarProgress: Record<Pillar, { done: number; total: number }>;
  done: number;
  total: number;
  steps: StepsTarget | null;
  areas: Area[];
  now: Exclude<Window, "anytime">;
  /** The running goal, if any. */
  goal: GoalView | null;
  /** Goals this member can pick. */
  goals: Goal[];
  /** Today's doses, stock and refills; null when they take nothing with a schedule. */
  meds: MedsToday | null;
};

// ---------------------------------------------------------------- helpers --

const THYROID_MED = /levothyrox|thyroxine|thyronorm|eltroxin|thyrox/i;
const WATER = new Set(["water_before_meals", "water_glasses"]);
const AREA_ORDER: Area[] = ["sugar", "bp", "kidney", "lipids", "liver", "iron", "vitamin_d", "b12", "thyroid", "weight"];

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

const GENERAL_PER_PILLAR: Record<Pillar, number> = { move: 1, eat: 1, sleep: 2, mind: 2, check: 1 };

const round500 = (n: number) => Math.round(n / 500) * 500;

/** ISO weekday, Monday = 1. */
const weekday = (iso: string) => ((dayNumber(iso) + 3) % 7) + 1;

// ------------------------------------------------------------------ steps --

export function stepsTarget(args: { ageYears: number | null; pregnant: boolean; prefs: DailyPrefs; recent: readonly number[] }): StepsTarget {
  const { ageYears, pregnant, prefs, recent } = args;
  const fallback = pregnant ? 6000 : ageYears !== null && ageYears >= 75 ? 5000 : ageYears !== null && ageYears >= 60 ? 7000 : 10000;
  const goal = prefs.steps_goal && prefs.steps_goal >= 1000 && prefs.steps_goal <= 30000 ? round500(prefs.steps_goal) : fallback;
  const avg = recent.length >= 3 ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
  if (avg !== null && avg < goal * 0.8) {
    const target = Math.min(goal, Math.max(3000, round500(avg * 1.15)));
    return { goal, target, ramping: true, line: `${target.toLocaleString("en-IN")} today, on the way to ${goal.toLocaleString("en-IN")}.` };
  }
  return { goal, target: goal, ramping: false, line: pregnant ? `${goal.toLocaleString("en-IN")} steps, or your doctor's number.` : `Your goal: ${goal.toLocaleString("en-IN")} steps.` };
}

// -------------------------------------------------------------- due items --

function dueTask(l: LoopView): PlanTask | null {
  if (l.type === "result_pending" || l.daysToDue === null || l.daysToDue > 7) return null;
  const days = Math.abs(l.daysToDue);
  const when = l.overdue ? `Due ${days} day${days === 1 ? "" : "s"} ago.` : l.daysToDue === 0 ? "Due today." : `Due in ${days} day${days === 1 ? "" : "s"}.`;
  const test = l.type === "test_ordered";
  return {
    key: `due:${slug(l.key)}`,
    pillar: "check",
    kind: "habit",
    area: "general",
    window: "anytime",
    title: test ? `Book your ${l.title}` : l.title,
    why: test ? `${when} Home collection takes ten minutes.` : `${when} Let's plan it.`,
    more: l.detail ?? (test ? "The result comes straight back into Cheeku and onto your chart." : "Cheeku can help you plan it."),
    status: "open",
    personal: true,
    reason: null,
    chip: test ? "Test" : l.type === "vaccine_due" ? "Vaccine" : l.type === "followup_due" ? "Follow-up" : "Reminder",
    due: true,
    dueLabel: l.overdue ? "Overdue" : "Due soon",
    cta: test ? { label: "Book collection", route: "/labs" } : { label: "Plan it", route: `/ask?q=${encodeURIComponent(`Help me plan: ${l.title}`)}` },
    logs: [],
  };
}

// ------------------------------------------------------------------- plan --

export function buildPlan(input: PlanInput): Plan {
  const { profileId, today, hour } = input;
  const n = seed(profileId, today);
  const now = windowAt(hour);
  const marks = new Map(input.actions.filter((a) => a.profileId === profileId && a.day === today).map((a) => [a.stepKey, a.status] as const));
  const todayLogs = input.logs.filter((l) => l.profileId === profileId && l.day === today);

  const baby = ["neonate", "infant", "toddler"].includes(input.lifeStage);
  const young = ["child", "teen"].includes(input.lifeStage);
  const gentle = young || input.pregnant;

  const reasons = areaReasons(input.series, input.conditions);
  const areas = gentle ? [] : AREA_ORDER.filter((a) => areasFromReadings(input.series).includes(a) || areasFromConditions(input.conditions).includes(a));
  const kidney = areas.includes("kidney");
  const allowed = (t: CatalogTask) => (!gentle || t.gentle) && !(kidney && WATER.has(t.key)) && (young ? t.key !== "brisk_walk_30" : t.key !== "active_play");
  const activeMeds = input.ledger.filter((e) => e.status === "active");
  const onThyroid = activeMeds.some((e) => THYROID_MED.test(e.name));

  const out: PlanTask[] = [];
  const seen = new Set<string>();
  const add = (t: CatalogTask | PlanTask | null, extra: Partial<PlanTask> = {}) => {
    if (!t || seen.has(t.key)) return;
    seen.add(t.key);
    const logs = todayLogs.filter((l) => l.taskKey === t.key);
    out.push({ status: "open", personal: false, reason: null, chip: t.area === "general" ? (PILLARS.find((p) => p.key === t.pillar)?.label ?? "") : AREA_LABEL[t.area], logs, ...t, ...extra });
  };

  // 1. What is due, always first.
  for (const l of input.loops) add(dueTask(l));
  const meds = buildMeds(input);
  if (baby) return finish(out, marks, now, null, areas, null, [], meds);

  // 2. The spine.
  let steps: StepsTarget | null = null;
  if (young) {
    const play = HABITS.find((h) => h.key === "active_play");
    if (play) add(play);
  } else {
    const recent = input.logs
      .filter((l) => l.profileId === profileId && l.taskKey === "steps" && l.day < today && daysBetween(l.day, today) <= 7 && l.value !== null)
      .reduce((m, l) => m.set(l.day, Math.max(m.get(l.day) ?? 0, l.value as number)), new Map<string, number>());
    steps = stepsTarget({ ageYears: input.ageYears, pregnant: input.pregnant, prefs: input.prefs, recent: [...recent.values()] });
    const best = Math.max(0, ...todayLogs.filter((l) => l.taskKey === "steps").map((l) => l.value ?? 0));
    add(STEPS_TASK, { progress: { value: best, target: steps.target }, why: steps.line });
  }
  for (const m of MEALS) add(m);
  add(SLEEP_RATING);
  add(BREATHING);

  // 3. Their own checks.
  if (areas.includes("bp")) add(READINGS.bp, { personal: true, reason: reasons.get("bp") ?? null });
  if (areas.includes("sugar") && dayNumber(today) % 2 === 0) add(READINGS.sugar, { personal: true, reason: reasons.get("sugar") ?? null });
  if (!gentle && weekday(today) === READINGS.weight.weekday) add(READINGS.weight, areas.includes("weight") ? { personal: true, reason: reasons.get("weight") ?? null } : {});
  if (activeMeds.length) {
    // One card per part of the day, each dose ticked on its own.
    for (const slot of meds?.slots ?? []) add(doseTask(slot));
    // With no schedule known for any of them, the single tick stays. Once
    // some have dose cards, the rest (often weekly) are set up on Your
    // medicines instead: a daily tick next to "Morning medicines" confused,
    // and is wrong for a weekly sachet. One name and a count: "Atorvastatin
    // and 2 more". Two names ran long and cut brand names in half.
    const loose = meds?.slots.length ? [] : activeMeds;
    const first = loose[0]?.name.trim() ?? "";
    const tick = HABITS.find((h) => h.key === "meds_taken");
    if (tick && loose.length) add(tick, { personal: true, reason: loose.length > 1 ? `${first} and ${loose.length - 1} more` : `For your ${first}` });
    if (onThyroid) {
      const t = HABITS.find((h) => h.key === "thyroid_same_time");
      if (t) add(t, { personal: true, reason: "For your thyroid tablet" });
    }
  }

  // 3b. Their goal: tag what the plan already holds, add the rest.
  const gate = { baby, gentle, allowed: (k: string) => { const t = taskByKey(k); return Boolean(t && t.kind !== "steps" && allowed(t)); } };
  const goals = goalsFor(gate);
  const goalPrefs = readGoalPrefs(input.prefs.goal);
  const goal = goalPrefs ? goalByKey(goalPrefs.key) : null;
  let goalKeys: string[] = [];
  if (goal && goalPrefs && goals.includes(goal)) {
    goalKeys = goalTaskKeys(goal, goalPrefs.answers, gate);
    for (const k of goalKeys) {
      const held = out.find((t) => t.key === k);
      // The "Your goal" pill says why; a reason line would repeat it. A task
      // that was already there for their own numbers keeps that reason.
      if (held) Object.assign(held, { goal: true, personal: true });
      else add(taskByKey(k), { goal: true, personal: true });
    }
  }
  const goalInfo =
    goal && goalPrefs && goalKeys.length
      ? {
          goal,
          keys: goalKeys,
          since: goalPrefs.since,
          title: goalTitle(goal, goalPrefs.answers),
          streak: goalStreak({ profileId, today, since: goalPrefs.since, taskKeys: goalKeys, actions: input.actions, logs: input.logs }),
          day: Math.max(1, daysBetween(goalPrefs.since, today) + 1),
        }
      : null;

  // 4. Personal habits, aimed at what their numbers say.
  let personal = 0;
  for (const area of areas) {
    const pool = HABITS.filter((h) => h.area === area && h.key !== "thyroid_same_time" && allowed(h));
    for (const h of rotate(pool, n).slice(0, 2)) {
      if (personal >= 4) break;
      if (seen.has(h.key)) continue;
      add(h, { personal: true, reason: reasons.get(area) ?? null });
      personal++;
    }
  }

  // 5. General habits in every pillar, so the plan is never only about what
  // is wrong. Sleep and mind get two: they have no spine task beyond one.
  for (const p of PILLARS) {
    const pool = HABITS.filter((h) => h.pillar === p.key && h.area === "general" && h.key !== "plan_checkup" && h.key !== "meds_taken" && allowed(h) && !seen.has(h.key));
    for (const h of rotate(pool, n).slice(0, GENERAL_PER_PILLAR[p.key])) add(h);
  }

  return finish(out, marks, now, steps, areas, goalInfo, goals, meds);
}

// ------------------------------------------------------------------ doses --

const SLOT_WINDOW: Record<Slot, Exclude<Window, "anytime">> = { morning: "morning", afternoon: "midday", night: "evening" };

function buildMeds(input: PlanInput): MedsToday | null {
  const entries = input.ledger
    .filter((e) => e.key)
    .map((e) => ({ key: e.key as string, name: e.name, status: e.status, schedule: e.schedule ?? null, dose: e.dose ?? null, timing: e.timing ?? "any", asNeeded: e.asNeeded ?? false, unitsPerDay: e.unitsPerDay ?? null }));
  if (!entries.length) return null;
  const meds = medsToday({ profileId: input.profileId, today: input.today, ledger: entries, actions: input.actions, prefs: readMedPrefs(input.prefs.meds) });
  return meds.meds.length || meds.unscheduled.length ? meds : null;
}

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h ?? 0;
  return `${hour % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${hour < 12 ? "am" : "pm"}`;
};

/** "Morning medicines", "2 doses around 8 am." The names are on the card, never in the title. */
function doseTask(s: MedsToday["slots"][number]): CatalogTask & Partial<PlanTask> {
  const n = s.doses.length;
  return {
    key: `dose:${s.slot}`,
    pillar: "check",
    kind: "dose",
    area: "medicines",
    window: SLOT_WINDOW[s.slot],
    gentle: true,
    title: `${SLOT_LABEL[s.slot]} medicines`,
    why: `${n === 1 ? "1 dose" : `${n} doses`} around ${clock(s.time)}. Tick each one.`,
    more: "Ticked doses build your week, so the doctor sees how it really went. Cheeku never changes a dose; ask your doctor first.",
    personal: true,
    dose: { slot: s.slot, time: s.time, doses: s.doses },
  };
}

const WINDOW_RANK = (w: Window, now: Exclude<Window, "anytime">): number => {
  const order: Exclude<Window, "anytime">[] = ["morning", "midday", "evening"];
  if (w === now) return 0;
  if (w === "anytime") return 1;
  return order.indexOf(w) > order.indexOf(now) ? 2 : 3;
};

function statusOf(t: PlanTask, marks: ReadonlyMap<string, "done" | "later">): TaskStatus {
  const mark = marks.get(t.key);
  if (mark === "done") return "done";
  if (t.kind === "steps") return t.progress && t.progress.target > 0 && t.progress.value >= t.progress.target ? "done" : (mark ?? "open");
  if ((t.kind === "meal" || t.kind === "reading" || t.kind === "rating" || t.kind === "timer") && t.logs.length) return "done";
  if (t.kind === "dose") return t.dose && t.dose.doses.every((d) => d.taken) ? "done" : (mark ?? "open");
  return mark ?? "open";
}

type GoalInfo = { goal: Goal; keys: string[]; since: string; title: string; streak: number; day: number };

function finish(
  tasks: PlanTask[],
  marks: ReadonlyMap<string, "done" | "later">,
  now: Exclude<Window, "anytime">,
  steps: StepsTarget | null,
  areas: Area[],
  goalInfo: GoalInfo | null,
  goals: Goal[],
  meds: MedsToday | null,
): Plan {
  const withStatus = tasks.map((t) => ({ ...t, status: statusOf(t, marks) }));
  const ordered = [...withStatus].sort(
    (a, b) =>
      Number(Boolean(b.due)) - Number(Boolean(a.due)) ||
      WINDOW_RANK(a.window, now) - WINDOW_RANK(b.window, now) ||
      Number(Boolean(b.goal)) - Number(Boolean(a.goal)) ||
      Number(b.personal) - Number(a.personal),
  );

  const open = ordered.filter((t) => t.status === "open");
  const hero =
    open.find((t) => t.due) ??
    open.find((t) => t.goal && WINDOW_RANK(t.window, now) <= 1) ??
    open.find((t) => t.personal && t.kind === "habit" && WINDOW_RANK(t.window, now) <= 1) ??
    open.find((t) => t.kind === "steps") ??
    open.find((t) => t.kind !== "meal") ??
    open[0] ??
    null;

  const byPillar = Object.fromEntries(PILLARS.map((p) => [p.key, ordered.filter((t) => t.pillar === p.key)])) as Record<Pillar, PlanTask[]>;
  const pillarProgress = Object.fromEntries(PILLARS.map((p) => [p.key, { done: byPillar[p.key].filter((t) => t.status === "done").length, total: byPillar[p.key].length }])) as Plan["pillarProgress"];
  const done = ordered.filter((t) => t.status === "done").length;
  const goalTasks = ordered.filter((t) => t.goal);
  const goal: GoalView | null = goalInfo
    ? {
        key: goalInfo.goal.key,
        title: goalInfo.title,
        noun: goalInfo.goal.noun,
        line: goalInfo.goal.line,
        day: goalInfo.day,
        streak: goalInfo.streak,
        doneToday: goalTasks.filter((t) => t.status === "done").length,
        totalToday: goalTasks.length,
        taskKeys: goalInfo.keys,
      }
    : null;
  return { tasks: ordered, hero, byPillar, pillarProgress, done, total: ordered.length, steps, areas, now, goal, goals, meds };
}

/**
 * The few that matter right now, for the top of Today: what is due, then the
 * goal's check-ins that fit this part of the day, then the plan's own order
 * (which already puts this window first). Everything else folds under
 * "Later today".
 */
export function nowTasks(plan: Plan, n = 3): PlanTask[] {
  const open = plan.tasks.filter((t) => t.status === "open");
  const picked: PlanTask[] = [];
  const take = (t: PlanTask) => {
    if (picked.length < n && !picked.includes(t)) picked.push(t);
  };
  open.filter((t) => t.due).forEach(take);
  open.filter((t) => t.goal && WINDOW_RANK(t.window, plan.now) <= 1).forEach(take);
  open.forEach(take);
  return picked;
}

/** The tags logged for each meal today, for the day's plate line. */
export function mealsToday(plan: Plan): PlateTag[][] {
  return plan.byPillar.eat.filter((t) => t.kind === "meal").flatMap((t) => t.logs.map((l) => l.tags as PlateTag[]));
}

export { taskByKey };
