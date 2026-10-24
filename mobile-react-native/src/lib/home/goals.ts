import { daysBetween } from "@/lib/memory/clock";

import type { Pillar } from "./content";
import type { TodayAction } from "./today";

/*
 * GOALS: ONE THING A PERSON WANTS, TURNED INTO A FEW CHECK-INS A DAY.
 *
 * Pick a goal, answer two quick questions, and the action plan carries two to
 * four of its tasks every day, ranked just after anything due, until the goal
 * is changed or stopped. Proven by AQ's health goals (docs/research/aq-ant-afu.md).
 *
 * WHAT A GOAL IS NOT. A target number for a reading, a diet, or a reason to
 * change a medicine. Every task here is an existing habit from the catalog,
 * already written to the content system's rules; a goal only chooses which
 * ones and says why in one line.
 *
 * WHO SEES WHICH. Weight and sugar are adults only and never in pregnancy:
 * those are a doctor's call, not an app's. The rest also run through the
 * plan's own `allowed` gate, so a child only ever gets the gentle habits, and
 * a goal with nothing left for this person is not offered at all.
 *
 * Stored in profiles.daily_prefs.goal (jsonb, migration 0034): no new table.
 */

export type GoalKey = "sleep" | "weight" | "sugar" | "legs" | "calm";

export type GoalOption = {
  value: string;
  /** Chip text, at most 24 characters. */
  label: string;
  /** Task keys this answer adds. */
  adds?: readonly string[];
  /** Hour of the day for the reminder, when this question sets it. */
  hour?: number;
};

export type GoalQuestion = { key: string; ask: string; options: readonly GoalOption[] };

export type Goal = {
  key: GoalKey;
  /** Card title, at most 30 characters. */
  title: string;
  /** Card line, at most 60 characters. */
  line: string;
  /** How the header names it: "Built around your sleep goal". */
  noun: string;
  pillar: Pillar;
  /** Adults only, never in pregnancy. */
  adultOnly: boolean;
  /** Always in the plan while the goal runs. */
  base: readonly string[];
  questions: readonly GoalQuestion[];
  /** Reminder hour when no answer sets one. */
  hour: number;
};

export const GOALS: readonly Goal[] = [
  {
    key: "sleep",
    title: "Sleep better",
    line: "Same hour to bed, and a calmer last hour.",
    noun: "sleep",
    pillar: "sleep",
    adultOnly: false,
    base: ["same_bedtime", "sleep:rating"],
    hour: 21,
    questions: [
      {
        key: "blocker",
        ask: "What keeps you up?",
        options: [
          { value: "phone", label: "My phone", adds: ["sleep_wind_down"] },
          { value: "chai", label: "Late chai or coffee", adds: ["no_late_chai"] },
          { value: "mind", label: "A busy mind", adds: ["mind:breathing"] },
          { value: "hours", label: "Odd hours", adds: ["wake_same_time"] },
        ],
      },
      {
        key: "bedtime",
        ask: "When do you usually go to bed?",
        options: [
          { value: "22", label: "Around 10", hour: 21 },
          { value: "23", label: "Around 11", hour: 22 },
          { value: "0", label: "Around midnight", hour: 23 },
          { value: "1", label: "Later than that", hour: 23 },
        ],
      },
    ],
  },
  {
    key: "weight",
    title: "Lose a few kilos",
    line: "Small swaps at meals, one weigh-in a week.",
    noun: "weight",
    pillar: "eat",
    adultOnly: true,
    base: ["eighty_percent", "post_dinner_stroll"],
    hour: 19,
    questions: [
      {
        key: "amount",
        ask: "How much would you like to lose?",
        options: [
          { value: "3", label: "About 3 kg" },
          { value: "5", label: "About 5 kg" },
          { value: "8", label: "8 kg or more" },
        ],
      },
      {
        key: "hardest",
        ask: "What's hardest for you?",
        options: [
          { value: "late", label: "Late dinners", adds: ["dinner_early"] },
          { value: "snacks", label: "Snacking", adds: ["nuts_not_namkeen"] },
          { value: "moving", label: "Not moving enough", adds: ["brisk_walk_30"] },
          { value: "portions", label: "Big portions" },
        ],
      },
    ],
  },
  {
    key: "sugar",
    title: "Steady sugar",
    line: "Walk after meals, and swaps that keep it level.",
    noun: "sugar",
    pillar: "eat",
    adultOnly: true,
    base: ["sabzi_first", "walk_after_meals"],
    hour: 13,
    questions: [
      {
        key: "check",
        ask: "Do you check your sugar at home?",
        options: [
          { value: "yes", label: "Yes, with a meter", adds: ["reading:sugar"] },
          { value: "no", label: "Not yet" },
        ],
      },
      {
        key: "slip",
        ask: "Where does it slip most?",
        options: [
          { value: "chai", label: "Sweet chai", adds: ["chai_no_sugar"] },
          { value: "rice", label: "Rice at dinner", adds: ["half_rice_swap"] },
          { value: "sweets", label: "Juice and sweets", adds: ["fruit_not_juice"] },
        ],
      },
    ],
  },
  {
    key: "legs",
    title: "Stronger legs",
    line: "Five minutes a day keeps you on your feet for life.",
    noun: "legs",
    pillar: "move",
    adultOnly: false,
    base: ["chair_stands", "stand_hourly"],
    hour: 8,
    questions: [
      {
        key: "steady",
        ask: "How steady are you on your feet?",
        options: [
          { value: "very", label: "Very steady", adds: ["one_leg_balance", "take_stairs"] },
          { value: "bit", label: "A bit wobbly", adds: ["one_leg_balance"] },
          { value: "hold", label: "I hold on to things" },
        ],
      },
      {
        key: "time",
        ask: "When can you fit five minutes?",
        options: [
          { value: "morning", label: "Mornings", hour: 8 },
          { value: "evening", label: "Evenings", hour: 18 },
        ],
      },
    ],
  },
  {
    key: "calm",
    title: "Calmer mind",
    line: "Two quiet minutes and one good moment a day.",
    noun: "calm",
    pillar: "mind",
    adultOnly: false,
    base: ["mind:breathing", "gratitude_line"],
    hour: 21,
    questions: [
      {
        key: "when",
        ask: "When does stress build up?",
        options: [
          { value: "morning", label: "Mornings", hour: 8 },
          { value: "work", label: "During the day", hour: 13 },
          { value: "night", label: "At night", hour: 21 },
        ],
      },
      {
        key: "helps",
        ask: "What usually helps you?",
        options: [
          { value: "people", label: "Talking to someone", adds: ["call_someone"] },
          { value: "outside", label: "Being outside", adds: ["walk_outside"] },
          { value: "quiet", label: "Time off my phone", adds: ["phone_free_meal"] },
        ],
      },
    ],
  },
];

export const goalByKey = (key: string | undefined): Goal | null => GOALS.find((g) => g.key === key) ?? null;

/** What daily_prefs.goal holds. */
export type GoalPrefs = {
  key: GoalKey;
  /** The day it started, ISO date. */
  since: string;
  answers: Record<string, string>;
  /** A daily phone reminder was asked for. */
  remind?: boolean;
};

export function readGoalPrefs(raw: unknown): GoalPrefs | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!goalByKey(typeof r.key === "string" ? r.key : undefined)) return null;
  if (typeof r.since !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.since)) return null;
  const answers: Record<string, string> = {};
  if (r.answers && typeof r.answers === "object" && !Array.isArray(r.answers)) {
    for (const [k, v] of Object.entries(r.answers)) if (typeof v === "string") answers[k] = v;
  }
  return { key: r.key as GoalKey, since: r.since, answers, remind: r.remind === true };
}

export type GoalGate = { baby: boolean; gentle: boolean; allowed: (key: string) => boolean };

/** The goal's tasks for these answers, base first, minus anything not allowed for this person. */
export function goalTaskKeys(goal: Goal, answers: Readonly<Record<string, string>>, gate: Pick<GoalGate, "allowed">): string[] {
  const keys = [...goal.base];
  for (const q of goal.questions) {
    const opt = q.options.find((o) => o.value === answers[q.key]);
    for (const k of opt?.adds ?? []) if (!keys.includes(k)) keys.push(k);
  }
  return keys.filter((k) => gate.allowed(k)).slice(0, 4);
}

/** Goals this person can pick: none for babies, no weight or sugar in the gentle set, and never one left empty. */
export function goalsFor(gate: GoalGate): Goal[] {
  if (gate.baby) return [];
  return GOALS.filter((g) => !(g.adultOnly && gate.gentle) && goalTaskKeys(g, {}, gate).length > 0);
}

/** The hour the daily reminder fires: the answer that sets one, else the goal's own. */
export function reminderHour(goal: Goal, answers: Readonly<Record<string, string>>): number {
  for (const q of goal.questions) {
    const opt = q.options.find((o) => o.value === answers[q.key]);
    if (opt?.hour !== undefined) return opt.hour;
  }
  return goal.hour;
}

/** "Lose 5 kg" once the amount is known; the goal's title otherwise. */
export function goalTitle(goal: Goal, answers: Readonly<Record<string, string>>): string {
  if (goal.key === "weight" && answers.amount) return answers.amount === "8" ? "Lose 8 kg or more" : `Lose ${answers.amount} kg`;
  return goal.title;
}

export type GoalView = {
  key: GoalKey;
  title: string;
  noun: string;
  line: string;
  /** Day 1 is the day it started. */
  day: number;
  /** Days in a row with at least one goal check-in. Today counts once done; until then the streak is still alive. */
  streak: number;
  doneToday: number;
  totalToday: number;
  taskKeys: string[];
};

/**
 * Days in a row with at least one of the goal's tasks done, from today back.
 * A habit is done by its today_actions row; a meal, reading, rating or timer
 * by its daily log. An open today does not break the streak.
 */
export function goalStreak(args: {
  profileId: string;
  today: string;
  since: string;
  taskKeys: readonly string[];
  actions: readonly TodayAction[];
  logs: readonly { profileId: string; day: string; taskKey: string }[];
}): number {
  const { profileId, today, since, actions, logs } = args;
  const keys = new Set(args.taskKeys);
  const days = new Set<string>();
  for (const a of actions) if (a.profileId === profileId && a.status === "done" && keys.has(a.stepKey)) days.add(a.day);
  for (const l of logs) if (l.profileId === profileId && keys.has(l.taskKey)) days.add(l.day);
  const span = Math.max(0, daysBetween(since, today));
  let streak = 0;
  for (let i = 0; i <= span; i++) {
    const d = new Date(Date.parse(`${today}T00:00:00Z`) - i * 86_400_000).toISOString().slice(0, 10);
    if (days.has(d)) streak++;
    else if (i > 0) break;
  }
  return streak;
}
