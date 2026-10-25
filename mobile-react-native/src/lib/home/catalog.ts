import { NUDGES, type Area, type Nudge, type Pillar } from "./content";

/*
 * EVERY TASK TODAY'S ACTION PLAN CAN OFFER.
 *
 * Five pillars, and under each a mix of kinds:
 *
 *   habit    tap Done (most of them)
 *   steps    a count against a target, with a screenshot of the watch or
 *            phone as proof until wearables connect
 *   meal     a photo of the plate per part of the day, plus a few taps on
 *            what's on it, read against the person's own numbers
 *   reading  a number (BP, fasting sugar, weight) that goes straight onto
 *            their chart in memory
 *   rating   how last night's sleep felt
 *   timer    a short guided session (breathing) that finishes itself
 *   dose     one part of the day's medicines, ticked dose by dose (meds.ts)
 *
 * The habits are content.ts's NUDGES, given a time of day here. The plan
 * (plan.ts) decides which of all this a given person sees today.
 */

export type TaskKind = "habit" | "steps" | "meal" | "reading" | "rating" | "timer" | "dose";
export type Window = "morning" | "midday" | "evening" | "anytime";
export type MealSlot = "breakfast" | "lunch" | "snacks" | "dinner";

/** `factLabel` is how the reading is named on the chart and in memory. */
export type ReadingField = { key: string; label: string; factLabel: string; unit: string; min: number; max: number; placeholder: string };

export type CatalogTask = {
  key: string;
  pillar: Pillar;
  kind: TaskKind;
  area: Area;
  /** Card title, at most 30 characters. */
  title: string;
  /** The card line, one sentence, at most 60 characters. */
  why: string;
  /** The detail for the plan and its sheets, at most 200 characters. */
  more: string;
  window: Window;
  minutes?: number;
  slot?: MealSlot;
  /** Readings: the fields to fill, each saved as its own fact. */
  fields?: ReadingField[];
  /** Fine for children, teenagers and pregnancy. */
  gentle?: boolean;
  /** Only weekly, on this weekday (1 = Monday). */
  weekday?: number;
};

// --------------------------------------------------------------- windows --

const WINDOW: Record<string, Window> = {
  walk_after_meals: "midday",
  sabzi_first: "midday",
  half_rice_swap: "evening",
  skip_pickle: "midday",
  slow_breaths_bp: "evening",
  oats_isabgol: "morning",
  thyroid_same_time: "morning",
  morning_sun: "morning",
  dinner_early: "evening",
  med_anchor: "morning",
  one_leg_balance: "morning",
  sleep_wind_down: "evening",
  same_bedtime: "evening",
  no_late_chai: "midday",
  call_someone: "evening",
  walk_outside: "morning",
  plan_checkup: "anytime",
};

/** Habits that become a richer task below, or that the steps task replaces. */
const REPLACED = new Set(["bp_reading", "log_weight", "steps_7000", "five_slow_breaths"]);

const GENTLE = new Set(["one_fruit", "walk_outside", "same_bedtime", "sleep_wind_down", "protein_each_meal", "call_someone", "morning_sun", "stand_hourly", "lemon_with_dal", "b12_dairy", "med_anchor", "med_stock"]);

const fromNudge = (n: Nudge): CatalogTask => ({
  key: n.key,
  pillar: n.pillar,
  kind: "habit",
  area: n.area,
  title: n.title,
  why: n.why,
  more: n.more,
  minutes: n.minutes,
  window: WINDOW[n.key] ?? "anytime",
  gentle: GENTLE.has(n.key),
});

// ----------------------------------------------------- the richer tasks --

export const STEPS_TASK: CatalogTask = {
  key: "steps",
  pillar: "move",
  kind: "steps",
  area: "general",
  title: "Walk your steps",
  why: "The cheapest longevity habit there is.",
  more: "Log your count and add a screenshot from your watch or phone, until your watch talks to Cheeku directly.",
  window: "anytime",
};

export const MEALS: CatalogTask[] = (
  [
    ["breakfast", "morning", "Breakfast"],
    ["lunch", "midday", "Lunch"],
    ["snacks", "midday", "Snacks and drinks"],
    ["dinner", "evening", "Dinner"],
  ] as const
).map(([slot, window, label]) => ({
  key: `meal:${slot}`,
  pillar: "eat" as const,
  kind: "meal" as const,
  area: "general" as const,
  slot,
  window,
  title: label,
  why: "Snap the plate, tap what's on it.",
  more: "Cheeku reads it against your own numbers and tells you what's working.",
  gentle: true,
}));

export const READINGS: Record<"bp" | "sugar" | "weight", CatalogTask> = {
  bp: {
    key: "reading:bp",
    pillar: "check",
    kind: "reading",
    area: "bp",
    title: "Log your BP",
    why: "Sit five minutes first, arm at heart level.",
    more: "Both numbers go straight onto your chart, so you and your doctor see the trend, not just today.",
    window: "evening",
    minutes: 5,
    fields: [
      { key: "bp_systolic", label: "Top number", factLabel: "BP systolic", unit: "mmHg", min: 60, max: 260, placeholder: "128" },
      { key: "bp_diastolic", label: "Bottom number", factLabel: "BP diastolic", unit: "mmHg", min: 30, max: 160, placeholder: "84" },
    ],
  },
  sugar: {
    key: "reading:sugar",
    pillar: "check",
    kind: "reading",
    area: "sugar",
    title: "Log your fasting sugar",
    why: "Before breakfast, after eight hours without food.",
    more: "One number a few times a week is enough to show which way it's heading.",
    window: "morning",
    fields: [{ key: "glucose_fasting", label: "Fasting sugar", factLabel: "Fasting glucose", unit: "mg/dL", min: 30, max: 600, placeholder: "104" }],
  },
  weight: {
    key: "reading:weight",
    pillar: "check",
    kind: "reading",
    area: "weight",
    title: "Weigh in",
    why: "Same scale, before breakfast.",
    more: "Once a week is plenty. Cheeku watches the trend so you don't have to.",
    window: "morning",
    weekday: 1,
    fields: [{ key: "weight", label: "Weight", factLabel: "Weight", unit: "kg", min: 2, max: 300, placeholder: "72.5" }],
  },
};

export const SLEEP_RATING: CatalogTask = {
  key: "sleep:rating",
  pillar: "sleep",
  kind: "rating",
  area: "general",
  title: "How did you sleep?",
  why: "One tap. Patterns show up within weeks.",
  more: "Over a few weeks it shows what helps you sleep and what doesn't.",
  window: "morning",
  gentle: true,
};

export const BREATHING: CatalogTask = {
  key: "mind:breathing",
  pillar: "mind",
  kind: "timer",
  area: "general",
  title: "2 minutes of slow breathing",
  why: "In for four, out for six. We'll count.",
  more: "Slow breathing calms the system that sets your pressure, sugar and sleep.",
  window: "anytime",
  minutes: 2,
  gentle: true,
};

/** More habits than content.ts carries, so every pillar has real choice. */
const EXTRA: CatalogTask[] = [
  { key: "brisk_walk_30", pillar: "move", kind: "habit", area: "general", window: "morning", minutes: 30, title: "A 30-minute brisk walk", why: "Talking should feel a little hard.", more: "Fast enough that talking takes a little effort. It is the dose most heart guidelines are built on." },
  { key: "stretch_5", pillar: "move", kind: "habit", area: "general", window: "morning", minutes: 5, gentle: true, title: "5 minutes of stretching", why: "Neck, shoulders, back, hips.", more: "Neck, shoulders, back and hips. Stiffness is where most aches in later life begin." },
  { key: "post_dinner_stroll", pillar: "move", kind: "habit", area: "general", window: "evening", minutes: 10, gentle: true, title: "A stroll after dinner", why: "Ten minutes softens the sugar spike.", more: "Ten minutes of walking after the biggest meal takes the edge off the sugar spike that follows it." },
  { key: "active_play", pillar: "move", kind: "habit", area: "general", window: "anytime", minutes: 60, gentle: true, title: "An hour of active play", why: "Out of breath and grinning.", more: "Running, cycling, a game outside. Children need about an hour a day of moving that gets them out of breath." },
  { key: "water_glasses", pillar: "eat", kind: "habit", area: "general", window: "anytime", gentle: true, title: "Water through the day", why: "Thirst often feels like hunger.", more: "A glass with every meal and one between. Thirst often feels like hunger or tiredness." },
  { key: "home_cooked", pillar: "eat", kind: "habit", area: "general", window: "anytime", title: "Home food all day", why: "Less hidden salt, oil and sugar.", more: "Outside food carries more salt, oil and sugar than it tastes like it does." },
  { key: "wake_same_time", pillar: "sleep", kind: "habit", area: "general", window: "morning", gentle: true, title: "Wake at your usual time", why: "Weekends too. Your clock notices.", more: "A steady wake-up time sets the body clock more than bedtime does, weekends included." },
  { key: "dark_cool_room", pillar: "sleep", kind: "habit", area: "general", window: "evening", gentle: true, title: "Dark, cool room tonight", why: "Curtains drawn, phone face down.", more: "Curtains drawn, fan or AC on, phone face down. The body sleeps deeper a little cool and fully dark." },
  { key: "short_nap", pillar: "sleep", kind: "habit", area: "general", window: "midday", title: "Naps under 30 minutes", why: "Refresh now, sleep fine tonight.", more: "A short nap refreshes. A long one steals from tonight's sleep." },
  { key: "gratitude_line", pillar: "mind", kind: "habit", area: "general", window: "evening", gentle: true, title: "One good thing today", why: "Write it down. Small and specific.", more: "Small, specific and written down. People who do this daily report better mood and sleep within weeks." },
  { key: "phone_free_meal", pillar: "mind", kind: "habit", area: "general", window: "midday", gentle: true, title: "One meal without your phone", why: "Slower eating, calmer mind.", more: "Eating slowly and paying attention helps digestion, fullness and a calmer mind." },
  { key: "digital_sunset", pillar: "mind", kind: "habit", area: "general", window: "evening", title: "No scrolling after 9 pm", why: "Let your mind switch off.", more: "Late scrolling keeps the mind switched on just when it needs to wind down." },
  { key: "meds_taken", pillar: "check", kind: "habit", area: "medicines", window: "anytime", gentle: true, title: "Today's medicines", why: "Tick once every dose is in.", more: "Tick it once every dose for today is in. Missed doses are the commonest reason treatment seems not to work." },
  { key: "checkin_symptoms", pillar: "check", kind: "habit", area: "general", window: "evening", title: "Anything feel off today?", why: "One line is enough. I'll keep it.", more: "A headache, poor sleep, a new pain. Tell Cheeku in a line and it keeps it with your history." },
];

export const HABITS: CatalogTask[] = [...NUDGES.filter((n) => !REPLACED.has(n.key)).map(fromNudge), ...EXTRA];

export const CATALOG: CatalogTask[] = [STEPS_TASK, ...MEALS, ...Object.values(READINGS), SLEEP_RATING, BREATHING, ...HABITS];

export const taskByKey = (key: string) => CATALOG.find((t) => t.key === key) ?? null;

export const WINDOW_LABEL: Record<Window, string> = { morning: "Morning", midday: "Afternoon", evening: "Evening", anytime: "Any time" };

/** The window a given hour sits in. */
export function windowAt(hour: number): Exclude<Window, "anytime"> {
  if (hour < 12) return "morning";
  if (hour < 17) return "midday";
  return "evening";
}
