import type { HomeSignals, UnlockedVia } from "./rules";

/*
 * THE WORDS ON HOME, AND THE DAILY STEPS.
 *
 * Longevity is a long game played one small move a day. Every step here is
 * something a person can do today, in an Indian kitchen or on an Indian
 * street, in under fifteen minutes, with no equipment. Each trains one of five
 * pillars, and a week that touches all five is the thing worth celebrating.
 *
 * WHAT A STEP MAY NEVER SAY. Start, stop or change a medicine. Set a number to
 * hit for a reading. Promise an outcome. A step is a habit, and the "why" is
 * one honest sentence about it. Where a step only makes sense for some people
 * (water for someone with kidney disease, fasting for someone on insulin), it
 * is not in this list at all.
 */

export type Pillar = "move" | "eat" | "sleep" | "mind" | "check";

export const PILLARS: { key: Pillar; label: string }[] = [
  { key: "move", label: "Move" },
  { key: "eat", label: "Eat" },
  { key: "sleep", label: "Sleep" },
  { key: "mind", label: "Mind" },
  { key: "check", label: "Check" },
];

export type Area = "sugar" | "bp" | "lipids" | "thyroid" | "vitamin_d" | "b12" | "iron" | "kidney" | "liver" | "weight" | "medicines" | "general";

export type Nudge = {
  key: string;
  area: Area;
  pillar: Pillar;
  title: string;
  why: string;
  minutes?: number;
};

/** What the chip on the step card calls each area: "Sugar plan". */
export const AREA_LABEL: Record<Area, string> = {
  sugar: "Sugar plan",
  bp: "Blood pressure",
  lipids: "Heart health",
  thyroid: "Thyroid",
  vitamin_d: "Vitamin D",
  b12: "Vitamin B12",
  iron: "Iron and energy",
  kidney: "Kidney care",
  liver: "Liver care",
  weight: "Weight",
  medicines: "Medicines",
  general: "Live longer",
};

export const NUDGES: readonly Nudge[] = [
  // sugar
  { key: "walk_after_meals", area: "sugar", pillar: "move", minutes: 10, title: "A 10-minute walk after lunch", why: "Muscles pull sugar out of the blood while they work. A short walk after eating is one of the simplest things that moves HbA1c." },
  { key: "sabzi_first", area: "sugar", pillar: "eat", title: "Eat the sabzi or salad first", why: "Fibre before roti or rice slows how fast sugar reaches the blood. Same plate, different order." },
  { key: "half_rice_swap", area: "sugar", pillar: "eat", title: "Swap half your rice for dal at dinner", why: "More protein and fibre, fewer fast carbs, and you still feel full." },
  { key: "chai_no_sugar", area: "sugar", pillar: "eat", title: "One chai today without sugar", why: "Two spoons in three cups a day adds up to about 100 calories of pure sugar. Start with one cup." },
  { key: "fruit_not_juice", area: "sugar", pillar: "eat", title: "Whole fruit instead of juice", why: "Juice keeps the sugar and loses the fibre that slows it down." },
  // blood pressure
  { key: "skip_pickle", area: "bp", pillar: "eat", title: "Skip the pickle and papad today", why: "They are among the saltiest things on an Indian plate, and salt is what pushes pressure up." },
  { key: "bp_reading", area: "bp", pillar: "check", minutes: 5, title: "Take a seated BP reading this evening", why: "Sit for five minutes first, arm at heart level. Tell Cheeku the number and it goes on your chart." },
  { key: "slow_breaths_bp", area: "bp", pillar: "mind", minutes: 5, title: "Five minutes of slow breathing", why: "Slow breathing, about six breaths a minute, calms the nervous system that sets your pressure." },
  // lipids
  { key: "nuts_not_namkeen", area: "lipids", pillar: "eat", title: "A handful of nuts instead of namkeen", why: "Almonds and walnuts bring the fats that help cholesterol, without the fried oil." },
  { key: "oil_teaspoon", area: "lipids", pillar: "eat", title: "Cook with a little less oil today", why: "A teaspoon per person per dish is plenty for tadka. The rest is extra fat your heart carries." },
  { key: "oats_isabgol", area: "lipids", pillar: "eat", title: "Add oats or isabgol to breakfast", why: "Soluble fibre binds cholesterol in the gut so less of it gets absorbed." },
  // thyroid
  { key: "thyroid_same_time", area: "thyroid", pillar: "check", title: "Thyroid tablet at the same time, before tea", why: "That is how the label says to take it. Tea, coffee and breakfast too close to it can weaken how much gets absorbed." },
  // vitamin D
  { key: "morning_sun", area: "vitamin_d", pillar: "move", minutes: 15, title: "15 minutes of morning sun", why: "Arms and face, before it gets harsh. Skin makes vitamin D from sunlight, and most Indians are low." },
  // B12
  { key: "b12_dairy", area: "b12", pillar: "eat", title: "Curd, paneer or an egg with one meal", why: "B12 comes almost only from animal foods. Vegetarians get most of theirs from dairy." },
  // iron
  { key: "lemon_with_dal", area: "iron", pillar: "eat", title: "Squeeze lemon on your dal or palak", why: "Vitamin C helps the body absorb the iron in plant foods, sometimes several times over." },
  { key: "tea_away_from_meals", area: "iron", pillar: "eat", title: "Keep tea an hour away from meals", why: "Tea blocks iron absorption. Moving the cup, not giving it up, is enough." },
  // kidney
  { key: "painkiller_check", area: "kidney", pillar: "check", title: "Ask before taking a painkiller", why: "Painkillers like ibuprofen and diclofenac can be hard on the kidneys. Check with your doctor first." },
  { key: "less_salt_kidney", area: "kidney", pillar: "eat", title: "Go easy on salt today", why: "Less salt means less work for the kidneys and steadier blood pressure." },
  // liver
  { key: "no_alcohol_today", area: "liver", pillar: "eat", title: "An alcohol-free day", why: "Every day off gives the liver room to repair. Most liver numbers respond within weeks." },
  { key: "skip_fried", area: "liver", pillar: "eat", title: "Skip the fried snack today", why: "Fried food and sugar are what build fat in the liver, the most common reason SGPT runs high." },
  // weight
  { key: "eighty_percent", area: "weight", pillar: "eat", title: "Stop eating when you're nearly full", why: "It takes about 20 minutes for fullness to reach the brain. Eating slowly gets you there on less." },
  { key: "dinner_early", area: "weight", pillar: "eat", title: "Finish dinner by 8:30", why: "A longer gap before bed helps sleep, sugar and weight all at once." },
  // medicines
  { key: "med_stock", area: "medicines", pillar: "check", title: "Check your medicine strips", why: "Anything running out this week? Reorder now, so no dose gets missed." },
  { key: "med_anchor", area: "medicines", pillar: "check", title: "Tie your dose to something daily", why: "Brushing teeth, morning chai, dinner. A dose tied to a habit is the one that doesn't get missed." },
  // general longevity
  { key: "chair_stands", area: "general", pillar: "move", minutes: 3, title: "10 chair stands", why: "Leg strength is one of the best predictors of a long, independent life. Stand up and sit down, slowly, ten times." },
  { key: "steps_7000", area: "general", pillar: "move", minutes: 30, title: "Get to 7,000 steps", why: "Large studies show the biggest drop in risk comes between 4,000 and 8,000 steps a day." },
  { key: "one_leg_balance", area: "general", pillar: "move", minutes: 2, title: "Stand on one leg while you brush", why: "Balance fades quietly after 40. A minute a day keeps it, and keeps falls away." },
  { key: "take_stairs", area: "general", pillar: "move", title: "Take the stairs once today", why: "Short bursts of effort train the heart the same way longer workouts do." },
  { key: "stand_hourly", area: "general", pillar: "move", title: "Stand up once every hour", why: "Long unbroken sitting is its own risk, even for people who exercise." },
  { key: "protein_each_meal", area: "general", pillar: "eat", title: "Protein in every meal today", why: "Dal, curd, paneer, eggs, chana. Muscle needs it daily, and Indian diets usually run short." },
  { key: "water_before_meals", area: "general", pillar: "eat", title: "A glass of water before each meal", why: "Easy hydration, and it takes the edge off overeating." },
  { key: "one_fruit", area: "general", pillar: "eat", title: "One whole fruit today", why: "Fibre, potassium and vitamins in one go. Seasonal and local is best." },
  { key: "sleep_wind_down", area: "general", pillar: "sleep", minutes: 30, title: "Screens off 30 minutes before bed", why: "Phone light tells the brain it is still daytime. Half an hour of dark makes sleep come faster." },
  { key: "same_bedtime", area: "general", pillar: "sleep", title: "Go to bed at the same time tonight", why: "A steady bedtime does more for sleep quality than a long lie-in at the weekend." },
  { key: "no_late_chai", area: "general", pillar: "sleep", title: "No chai or coffee after 4 pm", why: "Caffeine lingers for hours and makes sleep lighter even when you do drop off." },
  { key: "five_slow_breaths", area: "general", pillar: "mind", minutes: 2, title: "Five slow breaths, twice today", why: "In for four, out for six. It lowers stress in the moment, and stress shows up in sleep, sugar and pressure." },
  { key: "call_someone", area: "general", pillar: "mind", minutes: 10, title: "Call someone you haven't spoken to this week", why: "Strong social ties are linked to longer life about as much as quitting smoking." },
  { key: "walk_outside", area: "general", pillar: "mind", minutes: 15, title: "15 minutes outside, no phone", why: "Daylight and a little green lift mood and help you sleep at night." },
  { key: "log_weight", area: "general", pillar: "check", minutes: 1, title: "Note your weight this morning", why: "Before breakfast, once a week. Tell Cheeku and it watches the trend so you don't have to." },
  { key: "plan_checkup", area: "general", pillar: "check", title: "Check when your last full checkup was", why: "After 30, once a year catches the slow changes early: sugar, cholesterol, thyroid, vitamin D." },
];

export const nudgeByKey = (key: string) => NUDGES.find((n) => n.key === key) ?? null;

// ------------------------------------------------------- the unlock card --

export type UnlockRow = {
  key: "report" | "meds" | "family" | "asked";
  title: string;
  unlocks: string;
  route: string;
  done: boolean;
};

/**
 * The checklist on the starter and building cards. The first row is the one
 * that matters: one report unlocks Today. The others make Today better, and
 * say so.
 */
export function unlockRows(signals: HomeSignals): UnlockRow[] {
  return [
    {
      key: "report",
      title: "Add your latest report",
      unlocks: "Unlocks your daily plan",
      route: "/scan",
      done: Boolean(signals.report || signals.lab || signals.due),
    },
    {
      key: "meds",
      title: "Add a prescription or medicines",
      unlocks: "Unlocks the medicine check",
      route: "/scan",
      done: Boolean(signals.prescription || signals.medicines),
    },
    {
      key: "family",
      title: "Add a parent or partner",
      unlocks: "Unlocks alerts when their tests are due",
      route: "/family/add",
      done: Boolean(signals.family),
    },
    {
      key: "asked",
      title: "Ask your first question",
      unlocks: "Cheeku starts remembering",
      route: "/ask",
      done: Boolean(signals.asked),
    },
  ];
}

export const UNLOCK_COPY = {
  starter: {
    eyebrow: "Unlock your daily plan",
    title: "One record turns this into your daily plan.",
    body: "Your latest blood test or prescription is enough, even an old one. A photo, a WhatsApp forward or a PDF from your email all work.",
  },
  building: {
    eyebrow: "Almost there",
    title: "One record away from your daily plan.",
    body: "Whatever you have last: a blood test from last year, the prescription in the drawer, a discharge summary. Old is fine. Cheeku reads it and builds Today around it.",
  },
} as const;

/** What the unlock moment says Cheeku built Today from. */
export function viaLine(via: UnlockedVia | null): string {
  switch (via) {
    case "report":
      return "Cheeku read your report and built your first daily plan around it.";
    case "prescription":
      return "Cheeku read your prescription and built your first daily plan around it.";
    case "medicines":
      return "Cheeku has your medicines and built your first daily plan around them.";
    case "due":
      return "Cheeku found a test that's due and built your first daily plan around it.";
    case "lab":
      return "Your lab visit is booked, and Cheeku built your first daily plan around it.";
    default:
      return "Cheeku has enough to work with now, and built your first daily plan.";
  }
}

/** Streak milestones, and what Cheeku says at each. */
export const MILESTONES: { days: number; line: string }[] = [
  { days: 3, line: "Three days in a row. That's how habits start." },
  { days: 7, line: "A full week. Small steps, done daily, are the whole game." },
  { days: 14, line: "Two weeks straight. This is turning into who you are." },
  { days: 30, line: "Thirty days. Your future self says thank you." },
];

export function milestoneFor(streak: number): { days: number; line: string } | null {
  return [...MILESTONES].reverse().find((m) => streak === m.days) ?? null;
}
