import { ACTIVITIES, activityById, INTENSITY_RANK, type ActivityId, type Intensity } from "./catalog";
import { distanceKm, type Place, type Session, type Studio } from "./provider";

/*
 * WHO A SESSION SUITS (loop-fitness).
 *
 * The profile becomes a short list of needs, each need says which activities
 * help, which to keep away from and how hard a class may be. Every studio and
 * session is then scored on the phone. Nothing about the person leaves it:
 * the network only ever sees a place and a day.
 *
 * Reasons are card reasons (36 characters at most) and describe the class,
 * never an outcome: "Low impact, kind to knees", not "Will fix your knees".
 */

export type Need = "weight" | "sugar" | "bp" | "heart" | "joints" | "calm" | "sleep" | "legs" | "elder" | "prenatal" | "kids";

export type FitnessProfile = {
  conditions: readonly string[];
  /** daily_prefs.goal.key, when a Today goal is picked. */
  goal: string | null;
  ageYears: number | null;
  pregnant: boolean;
  /** From height and weight, when both are known. */
  bmi: number | null;
  /** "male" hides women-only studios. */
  sex?: string | null;
};

type Rule = {
  /** Activities that suit this need, best first. */
  likes: ActivityId[];
  avoid?: ActivityId[];
  /** Hardest class this need allows. */
  cap?: Intensity;
  noImpact?: boolean;
  reason: string;
};

export const NEED_RULES: Record<Need, Rule> = {
  weight: { likes: ["functional", "zumba", "swimming", "aerobics", "gym", "dance"], reason: "For your weight goal" },
  sugar: { likes: ["gym", "functional", "aerobics", "swimming", "yoga"], reason: "Steady movement for sugar" },
  bp: { likes: ["yoga", "swimming", "aerobics", "meditation", "aqua"], avoid: ["hiit", "kickboxing"], cap: "moderate", reason: "Moderate pace for your BP plan" },
  heart: { likes: ["yoga", "aqua", "meditation"], avoid: ["hiit", "kickboxing", "functional", "zumba"], cap: "gentle", reason: "Gentle pace, easy on the heart" },
  joints: { likes: ["aqua", "swimming", "yoga", "pilates"], noImpact: true, reason: "Low impact, kind to knees" },
  calm: { likes: ["yoga", "meditation", "pilates"], reason: "Slow, calm and steady" },
  sleep: { likes: ["yoga", "meditation", "swimming"], reason: "Evening calm for better sleep" },
  legs: { likes: ["pilates", "yoga", "aqua", "gym"], noImpact: true, reason: "Builds steady legs, low impact" },
  elder: { likes: ["yoga", "aqua", "meditation", "pilates"], noImpact: true, cap: "moderate", reason: "Gentle pace, easy to start" },
  prenatal: { likes: ["prenatal_yoga"], reason: "Prenatal, gentle pace" },
  kids: { likes: ["swimming", "dance", "kickboxing", "yoga"], reason: "Fun and active for kids" },
};

const WORDS: [Need, RegExp][] = [
  ["weight", /\b(obes\w*|overweight|weight|pcos|pcod)\b/i],
  ["sugar", /\b(diabet\w*|sugar|prediabet\w*|insulin)\b/i],
  ["bp", /\b(high bp|bp|hypertension|blood pressure)\b/i],
  ["heart", /\b(heart|cardiac|angina|bypass|stent)\b/i],
  ["joints", /\b(arthritis|knee\w*|joint\w*|back pain|spondyl\w*|osteo\w*)\b/i],
  ["calm", /\b(anxiety|stress|depress\w*|migraine|panic)\b/i],
  ["sleep", /\b(insomnia|sleep)\b/i],
];

/** The needs this person has, strongest first. */
export function needsFor(p: FitnessProfile): Need[] {
  if (p.pregnant || p.conditions.some((c) => /\bpregnan/i.test(c))) return ["prenatal"];
  const out: Need[] = [];
  const add = (n: Need) => {
    if (!out.includes(n)) out.push(n);
  };
  if (p.ageYears !== null && p.ageYears < 13) return ["kids"];
  for (const c of p.conditions) for (const [need, re] of WORDS) if (re.test(c)) add(need);
  if (p.bmi !== null && p.bmi >= 27.5) add("weight");
  // The goal they picked for Today leads.
  const goal = p.goal && p.goal in NEED_RULES ? (p.goal as Need) : null;
  if (goal) {
    if (out.includes(goal)) out.splice(out.indexOf(goal), 1);
    out.unshift(goal);
  }
  if (p.ageYears !== null && p.ageYears >= 60) add("elder");
  return out;
}

export type Fit = {
  needs: Need[];
  /** Hardest class allowed; the strictest need wins. */
  cap: Intensity;
  noImpact: boolean;
  avoid: Set<ActivityId>;
  /** Activities in the order they suit this person. */
  ranked: ActivityId[];
  /** "Check with your doctor first" applies. */
  doctorNote: boolean;
  /** Women-only studios are shown. */
  womenOnly: boolean;
};

/** A need in a sentence: "for the weight goal", "with the knees in mind". */
export const NEED_PHRASE: Record<Need, string> = {
  weight: "the weight goal",
  sugar: "the sugar plan",
  bp: "BP",
  heart: "the heart",
  joints: "the knees and joints",
  calm: "a calmer mind",
  sleep: "better sleep",
  legs: "steadier legs",
  elder: "an easy start",
  prenatal: "pregnancy",
  kids: "a growing kid",
};

export function fitFor(p: FitnessProfile): Fit {
  const needs = needsFor(p);
  let cap: Intensity = "high";
  let noImpact = false;
  const avoid = new Set<ActivityId>();
  const score = new Map<ActivityId, number>();
  needs.forEach((n, i) => {
    const r = NEED_RULES[n];
    if (r.cap && INTENSITY_RANK[r.cap] < INTENSITY_RANK[cap]) cap = r.cap;
    if (r.noImpact) noImpact = true;
    for (const a of r.avoid ?? []) avoid.add(a);
    // The first need counts most; within a need, the first activity.
    r.likes.forEach((a, j) => score.set(a, (score.get(a) ?? 0) + (needs.length - i) * 2 + (r.likes.length - j)));
  });
  // Prenatal is only ever prenatal yoga or meditation.
  if (needs[0] === "prenatal") {
    for (const a of ACTIVITIES) if (a.id !== "prenatal_yoga" && a.id !== "meditation") avoid.add(a.id);
    cap = "gentle";
  } else avoid.add("prenatal_yoga");
  const allowed = (id: ActivityId) => {
    const a = activityById(id);
    return a !== null && !avoid.has(id) && INTENSITY_RANK[a.intensity] <= INTENSITY_RANK[cap] + 1 && !(noImpact && a.impact);
  };
  const ranked = ACTIVITIES.map((a) => a.id)
    .filter(allowed)
    .sort((x, y) => (score.get(y) ?? 0) - (score.get(x) ?? 0));
  const heart = p.conditions.some((c) => /\b(heart|cardiac|angina|bypass|stent)\b/i.test(c));
  const doctorNote = needs[0] === "prenatal" || heart || (p.ageYears !== null && p.ageYears >= 60);
  return { needs, cap, noImpact, avoid, ranked, doctorNote, womenOnly: p.sex !== "male" };
}

/** Whether a session is within what this person should book. */
export function allows(fit: Fit, s: Pick<Session, "activity" | "intensity">): boolean {
  const a = activityById(s.activity);
  if (!a || fit.avoid.has(s.activity)) return false;
  if (fit.noImpact && a.impact) return false;
  return INTENSITY_RANK[s.intensity] <= INTENSITY_RANK[fit.cap];
}

/** Why it is suggested, in 36 characters. Null when nothing personal applies. */
export function reasonFor(fit: Fit, activity: ActivityId): string | null {
  for (const n of fit.needs) if (NEED_RULES[n].likes.includes(activity)) return NEED_RULES[n].reason;
  return null;
}

export type Match = {
  session: Session;
  studio: Studio;
  km: number;
  score: number;
  reason: string | null;
};

/**
 * Ranks sessions for one person: how well the activity suits them, how close
 * the studio is, and how soon it starts. Sessions that are full, already
 * started or beyond their limits are left out.
 */
export function matchSessions(args: {
  fit: Fit;
  place: Place;
  items: readonly { session: Session; studio: Studio }[];
  now?: Date;
  activity?: ActivityId | null;
}): Match[] {
  const now = (args.now ?? new Date()).getTime();
  const pref = new Map(args.fit.ranked.map((a, i) => [a, args.fit.ranked.length - i]));
  const out: Match[] = [];
  for (const { session, studio } of args.items) {
    if (session.seatsLeft <= 0) continue;
    const at = Date.parse(session.startsAt);
    if (!(at > now)) continue;
    if (!allows(args.fit, session)) continue;
    if (args.activity && session.activity !== args.activity) continue;
    if (studio.womenOnly && !args.fit.womenOnly) continue;
    const km = distanceKm(args.place, studio);
    const hours = (at - now) / 3_600_000;
    const suit = args.fit.needs.length ? (pref.get(session.activity) ?? 0) / Math.max(1, args.fit.ranked.length) : 0.5;
    const near = 1 / (1 + km / 2);
    const soon = 1 / (1 + hours / 24);
    out.push({ session, studio, km, score: suit * 3 + near * 2 + soon + (session.level === "beginner" ? 0.2 : 0), reason: reasonFor(args.fit, session.activity) });
  }
  return out.sort((a, b) => b.score - a.score || a.session.startsAt.localeCompare(b.session.startsAt));
}

/** The best few, with variety: at most `per` of one activity and of one studio. */
export function varied(matches: readonly Match[], limit: number, per = 2): Match[] {
  const byAct = new Map<string, number>();
  const byStudio = new Map<string, number>();
  const out: Match[] = [];
  for (const m of matches) {
    if (out.length >= limit) break;
    const a = byAct.get(m.session.activity) ?? 0;
    const s = byStudio.get(m.studio.id) ?? 0;
    if (a >= per || s >= per) continue;
    byAct.set(m.session.activity, a + 1);
    byStudio.set(m.studio.id, s + 1);
    out.push(m);
  }
  // Too few kinds nearby: fill up from the rest, best first.
  for (const m of matches) if (out.length < limit && !out.includes(m)) out.push(m);
  return out;
}

/** Studios ranked for the person: ones offering what suits them first, then distance. */
export function rankStudios(fit: Fit, place: Place, studios: readonly Studio[], activity?: ActivityId | null): { studio: Studio; km: number; reason: string | null }[] {
  const pref = new Map(fit.ranked.map((a, i) => [a, fit.ranked.length - i]));
  return studios
    .filter((s) => fit.womenOnly || !s.womenOnly)
    .filter((s) => (activity ? s.activities.includes(activity) : s.activities.some((a) => pref.has(a))))
    .map((studio) => {
      const best = [...studio.activities].filter((a) => pref.has(a)).sort((x, y) => (pref.get(y) ?? 0) - (pref.get(x) ?? 0))[0] ?? null;
      const km = distanceKm(place, studio);
      const suit = best ? (pref.get(best) ?? 0) / Math.max(1, fit.ranked.length) : 0;
      return { studio, km, reason: best ? reasonFor(fit, best) : null, score: (fit.needs.length ? suit * 3 : 0) + 2 / (1 + km / 2) };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ studio, km, reason }) => ({ studio, km, reason }));
}

/** BMI from height (cm) and weight (kg), when both are plausible. */
export function bmiFrom(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm < 100 || weightKg < 20) return null;
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
}
