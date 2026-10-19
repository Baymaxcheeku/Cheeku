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
  /** The action. Card title, at most 30 characters (docs/content-system.md). */
  title: string;
  /** The payoff, one sentence. The card line, at most 60 characters. */
  why: string;
  /** How and why, for the plan and its sheets. At most 200 characters. */
  more: string;
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
  { key: "walk_after_meals", area: "sugar", pillar: "move", minutes: 10, title: "10-minute walk after lunch", why: "Busy muscles soak up the sugar.", more: "Muscles pull sugar out of the blood while they work. A short walk after eating is one of the simplest things that moves HbA1c." },
  { key: "sabzi_first", area: "sugar", pillar: "eat", title: "Sabzi first, then roti", why: "Same plate, gentler sugar spike.", more: "Fibre before roti or rice slows how fast sugar reaches the blood. Same plate, different order." },
  { key: "half_rice_swap", area: "sugar", pillar: "eat", title: "Half rice, half dal tonight", why: "More protein, fewer fast carbs, still full.", more: "More protein and fibre, fewer fast carbs, and you still feel full." },
  { key: "chai_no_sugar", area: "sugar", pillar: "eat", title: "One chai, no sugar", why: "One cup is a fine start.", more: "Two spoons in three cups a day adds up to about 100 calories of pure sugar. Start with one cup." },
  { key: "fruit_not_juice", area: "sugar", pillar: "eat", title: "Whole fruit, not juice", why: "Keep the fibre that slows the sugar.", more: "Juice keeps the sugar and loses the fibre that slows it down." },
  // blood pressure
  { key: "skip_pickle", area: "bp", pillar: "eat", title: "Skip the pickle and papad", why: "The saltiest bites on the plate.", more: "They are among the saltiest things on an Indian plate, and salt is what pushes pressure up." },
  { key: "bp_reading", area: "bp", pillar: "check", minutes: 5, title: "Check your BP tonight", why: "Sit for five minutes first.", more: "Sit for five minutes first, arm at heart level. Tell Cheeku the number and it goes on your chart." },
  { key: "slow_breaths_bp", area: "bp", pillar: "mind", minutes: 5, title: "5 minutes of slow breathing", why: "Slower breaths, calmer pressure.", more: "Slow breathing, about six breaths a minute, calms the nervous system that sets your pressure." },
  // lipids
  { key: "nuts_not_namkeen", area: "lipids", pillar: "eat", title: "Nuts instead of namkeen", why: "Good fats in, fried oil out.", more: "Almonds and walnuts bring the fats that help cholesterol, without the fried oil." },
  { key: "oil_teaspoon", area: "lipids", pillar: "eat", title: "A little less oil today", why: "A teaspoon per person is plenty.", more: "A teaspoon per person per dish is plenty for tadka. The rest is extra fat your heart carries." },
  { key: "oats_isabgol", area: "lipids", pillar: "eat", title: "Oats or isabgol at breakfast", why: "Fibre that mops up cholesterol.", more: "Soluble fibre binds cholesterol in the gut so less of it gets absorbed." },
  // thyroid
  { key: "thyroid_same_time", area: "thyroid", pillar: "check", title: "Thyroid tablet before chai", why: "Same time daily, empty stomach.", more: "That is how the label says to take it. Tea, coffee and breakfast too close to it can weaken how much gets absorbed." },
  // vitamin D
  { key: "morning_sun", area: "vitamin_d", pillar: "move", minutes: 15, title: "15 minutes of morning sun", why: "Free vitamin D. Most of us run low.", more: "Arms and face, before it gets harsh. Skin makes vitamin D from sunlight, and most Indians are low." },
  // B12
  { key: "b12_dairy", area: "b12", pillar: "eat", title: "Curd, paneer or an egg today", why: "Your easiest B12 top-up.", more: "B12 comes almost only from animal foods. Vegetarians get most of theirs from dairy." },
  // iron
  { key: "lemon_with_dal", area: "iron", pillar: "eat", title: "Lemon on your dal or palak", why: "Vitamin C helps the iron get in.", more: "Vitamin C helps the body absorb the iron in plant foods, sometimes several times over." },
  { key: "tea_away_from_meals", area: "iron", pillar: "eat", title: "Chai an hour after meals", why: "Keep the chai, just move the cup.", more: "Tea blocks iron absorption. Moving the cup, not giving it up, is enough." },
  // kidney
  { key: "painkiller_check", area: "kidney", pillar: "check", title: "Ask before any painkiller", why: "Some are hard on the kidneys.", more: "Painkillers like ibuprofen and diclofenac can be hard on the kidneys. Check with your doctor first." },
  { key: "less_salt_kidney", area: "kidney", pillar: "eat", title: "Go easy on salt today", why: "Less work for your kidneys.", more: "Less salt means less work for the kidneys and steadier blood pressure." },
  // liver
  { key: "no_alcohol_today", area: "liver", pillar: "eat", title: "An alcohol-free day", why: "A day off gives your liver room to repair.", more: "Every day off gives the liver room to repair. Most liver numbers respond within weeks." },
  { key: "skip_fried", area: "liver", pillar: "eat", title: "Skip the fried snack", why: "Less fat parked in the liver.", more: "Fried food and sugar are what build fat in the liver, the most common reason SGPT runs high." },
  // weight
  { key: "eighty_percent", area: "weight", pillar: "eat", title: "Stop when nearly full", why: "Fullness takes 20 minutes to arrive.", more: "It takes about 20 minutes for fullness to reach the brain. Eating slowly gets you there on less." },
  { key: "dinner_early", area: "weight", pillar: "eat", title: "Dinner done by 8:30", why: "Better sleep, steadier sugar.", more: "A longer gap before bed helps sleep, sugar and weight all at once." },
  // medicines
  { key: "med_stock", area: "medicines", pillar: "check", title: "Check your medicine strips", why: "Running low? Reorder before it's a gap.", more: "Anything running out this week? Reorder now, so no dose gets missed." },
  { key: "med_anchor", area: "medicines", pillar: "check", title: "Pair your dose with a habit", why: "Habits remember, so you don't have to.", more: "Brushing teeth, morning chai, dinner. A dose tied to a habit is the one that doesn't get missed." },
  // general longevity
  { key: "chair_stands", area: "general", pillar: "move", minutes: 3, title: "10 chair stands", why: "Strong legs, longer independence.", more: "Leg strength is one of the best predictors of a long, independent life. Stand up and sit down, slowly, ten times." },
  { key: "steps_7000", area: "general", pillar: "move", minutes: 30, title: "Get to 7,000 steps", why: "Where the biggest gains kick in.", more: "Large studies show the biggest drop in risk comes between 4,000 and 8,000 steps a day." },
  { key: "one_leg_balance", area: "general", pillar: "move", minutes: 2, title: "Brush your teeth on one leg", why: "Balance fades after 40. Keep yours.", more: "Balance fades quietly after 40. A minute a day keeps it, and keeps falls away." },
  { key: "take_stairs", area: "general", pillar: "move", title: "Take the stairs once", why: "A tiny workout for your heart.", more: "Short bursts of effort train the heart the same way longer workouts do." },
  { key: "stand_hourly", area: "general", pillar: "move", title: "Stand up every hour", why: "Long sitting is its own risk.", more: "Long unbroken sitting is its own risk, even for people who exercise." },
  { key: "protein_each_meal", area: "general", pillar: "eat", title: "Protein in every meal", why: "Dal, curd, paneer, eggs, chana.", more: "Dal, curd, paneer, eggs, chana. Muscle needs it daily, and Indian diets usually run short." },
  { key: "water_before_meals", area: "general", pillar: "eat", title: "Water before each meal", why: "Easy hydration, gentler appetite.", more: "Easy hydration, and it takes the edge off overeating." },
  { key: "one_fruit", area: "general", pillar: "eat", title: "One whole fruit today", why: "Seasonal and local is best.", more: "Fibre, potassium and vitamins in one go. Seasonal and local is best." },
  { key: "sleep_wind_down", area: "general", pillar: "sleep", minutes: 30, title: "Screens off 30 min before bed", why: "Darkness tells your brain it's night.", more: "Phone light tells the brain it is still daytime. Half an hour of dark makes sleep come faster." },
  { key: "same_bedtime", area: "general", pillar: "sleep", title: "Same bedtime tonight", why: "Your body clock loves a routine.", more: "A steady bedtime does more for sleep quality than a long lie-in at the weekend." },
  { key: "no_late_chai", area: "general", pillar: "sleep", title: "No chai after 4 pm", why: "Caffeine lingers into your sleep.", more: "Caffeine lingers for hours and makes sleep lighter even when you do drop off." },
  { key: "five_slow_breaths", area: "general", pillar: "mind", minutes: 2, title: "Five slow breaths, twice", why: "In for four, out for six.", more: "In for four, out for six. It lowers stress in the moment, and stress shows up in sleep, sugar and pressure." },
  { key: "call_someone", area: "general", pillar: "mind", minutes: 10, title: "Call someone you miss", why: "Good company is a longevity habit too.", more: "Strong social ties are linked to longer life about as much as quitting smoking." },
  { key: "walk_outside", area: "general", pillar: "mind", minutes: 15, title: "15 minutes outside, no phone", why: "Daylight lifts mood and sleep.", more: "Daylight and a little green lift mood and help you sleep at night." },
  { key: "log_weight", area: "general", pillar: "check", minutes: 1, title: "Weigh in this morning", why: "Once a week is plenty.", more: "Before breakfast, once a week. Tell Cheeku and it watches the trend so you don't have to." },
  { key: "plan_checkup", area: "general", pillar: "check", title: "When was your last checkup?", why: "Once a year after 30 catches things early.", more: "After 30, once a year catches the slow changes early: sugar, cholesterol, thyroid, vitamin D." },
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
      title: "Add your medicines",
      unlocks: "Unlocks the medicine check",
      route: "/scan",
      done: Boolean(signals.prescription || signals.medicines),
    },
    {
      key: "family",
      title: "Add a parent or partner",
      unlocks: "Get a nudge when their tests are due",
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
    eyebrow: "Unlock your plan",
    title: "One report. One daily plan.",
    body: "A blood test or prescription, even an old one. Photo, PDF or WhatsApp forward.",
  },
  building: {
    eyebrow: "Almost there",
    title: "One record away.",
    body: "Last year's blood test, the prescription in the drawer. Old is fine.",
  },
} as const;

/** What the unlock moment says Cheeku built Today from. */
export function viaLine(via: UnlockedVia | null): string {
  switch (via) {
    case "report":
      return "Built from your report. Made for your numbers.";
    case "prescription":
      return "Built from your prescription.";
    case "medicines":
      return "Built around your medicines.";
    case "due":
      return "Built around the test that's due.";
    case "lab":
      return "Built around your lab visit.";
    default:
      return "Built from what you've shared so far.";
  }
}

/** Streak milestones, and what Cheeku says at each. */
export const MILESTONES: { days: number; line: string }[] = [
  { days: 3, line: "Three in a row. A habit is born." },
  { days: 7, line: "A full week. Look at you go." },
  { days: 14, line: "Two weeks. This is just you now." },
  { days: 30, line: "30 days. Future you says thanks." },
];

export function milestoneFor(streak: number): { days: number; line: string } | null {
  return [...MILESTONES].reverse().find((m) => streak === m.days) ?? null;
}
