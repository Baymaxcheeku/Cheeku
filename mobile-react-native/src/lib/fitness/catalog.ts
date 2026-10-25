/*
 * FITNESS SESSIONS: WHAT CAN BE BOOKED (int-fitness, loop-fitness).
 *
 * A partner network of gyms and studios across 200+ Indian cities sells single
 * sessions to Cheeku at a base price; Cheeku adds its markup and sells them on.
 * This file is the vocabulary every other piece shares: the activities, how
 * hard each one is, and the price rule. No partner names, studio data or
 * prices are invented here; those come from the provider (provider.ts).
 */

export type ActivityId =
  | "gym"
  | "yoga"
  | "zumba"
  | "swimming"
  | "dance"
  | "pilates"
  | "functional"
  | "hiit"
  | "aerobics"
  | "kickboxing"
  | "prenatal_yoga"
  | "meditation"
  | "aqua";

/** How hard a session is. A person's needs can cap it (match.ts). */
export type Intensity = "gentle" | "moderate" | "high";
export const INTENSITY_RANK: Record<Intensity, number> = { gentle: 0, moderate: 1, high: 2 };

export type Activity = {
  id: ActivityId;
  /** Chip label, at most 16 characters. */
  label: string;
  intensity: Intensity;
  /** Hard on knees and ankles: jumping, running, sudden turns. */
  impact: boolean;
  /** Words people type for it. */
  words: RegExp;
};

export const ACTIVITIES: readonly Activity[] = [
  { id: "gym", label: "Gym", intensity: "moderate", impact: false, words: /\b(gym|weights?|strength|workout)\b/i },
  { id: "yoga", label: "Yoga", intensity: "gentle", impact: false, words: /\byoga\b/i },
  { id: "zumba", label: "Zumba", intensity: "high", impact: true, words: /\bzumba\b/i },
  { id: "swimming", label: "Swimming", intensity: "moderate", impact: false, words: /\bswim(ming)?\b|\bpool\b/i },
  { id: "dance", label: "Dance", intensity: "moderate", impact: true, words: /\bdanc(e|ing)\b|\bbollywood\b/i },
  { id: "pilates", label: "Pilates", intensity: "gentle", impact: false, words: /\bpilates\b/i },
  { id: "functional", label: "Functional", intensity: "high", impact: true, words: /\bfunctional\b|\bcross ?fit\b|\bcross ?train/i },
  { id: "hiit", label: "HIIT", intensity: "high", impact: true, words: /\bhiit\b|\binterval\b/i },
  { id: "aerobics", label: "Aerobics", intensity: "moderate", impact: true, words: /\baerobics?\b|\bcardio\b/i },
  { id: "kickboxing", label: "Kickboxing", intensity: "high", impact: true, words: /\bkick ?boxing\b|\bboxing\b|\bmma\b|\bmartial/i },
  { id: "prenatal_yoga", label: "Prenatal yoga", intensity: "gentle", impact: false, words: /\bprenatal\b|\bpregnan\w* yoga\b/i },
  { id: "meditation", label: "Meditation", intensity: "gentle", impact: false, words: /\bmeditat\w*\b|\bbreath\w*\b/i },
  { id: "aqua", label: "Aqua aerobics", intensity: "gentle", impact: false, words: /\baqua\b|\bwater aerobics\b/i },
];

export const activityById = (id: string | null | undefined): Activity | null => ACTIVITIES.find((a) => a.id === id) ?? null;

/** The activity a message names: "a yoga class near me" is yoga. */
export function activityIn(text: string): ActivityId | null {
  // Prenatal first: "prenatal yoga" must not read as plain yoga.
  const order = [...ACTIVITIES].sort((a, b) => Number(b.id === "prenatal_yoga") - Number(a.id === "prenatal_yoga"));
  return order.find((a) => a.words.test(text))?.id ?? null;
}

// --------------------------------------------------------------- pricing --

/*
 * THE PRICE RULE. The partner quotes a base price per session; Cheeku adds
 * its markup: 15%, at least ₹25, and the total rounds up to the next ₹10.
 * The server applies the same rule again when the booking is written
 * (migration 0039, app_config 'fitness_pricing'), so a client can never
 * set its own price.
 */
export const MARKUP = { pct: 15, min: 25 } as const;

export function priceFor(base: number, rule: { pct: number; min: number } = MARKUP): { base: number; markup: number; price: number } {
  const b = Math.max(0, Math.round(base));
  const raw = b + Math.max(rule.min, Math.round((b * rule.pct) / 100));
  const price = Math.ceil(raw / 10) * 10;
  return { base: b, markup: price - b, price };
}

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
