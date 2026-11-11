/*
 * STEPS AND SLEEP, SAID IN A MESSAGE.
 *
 * "walked 6k today", "6,200 steps", "slept 5 hours", "only slept 4.5 hrs",
 * "soya 6 ghante". A number outside a sane range is ignored, and a question
 * ("should I walk 10k steps?") is not a log.
 */
export type Activity = { steps: number | null; sleepMinutes: number | null };

export function activityFromText(text: string): Activity {
  const t = text.toLowerCase().replace(/(\d),(\d{3})/g, "$1$2");
  if (/\?\s*$/.test(t) || /\b(should|how many|is it|can i|kitne)\b/.test(t)) return { steps: null, sleepMinutes: null };
  let steps: number | null = null;
  const k = t.match(/\b(\d{1,2}(?:\.\d)?)\s*k\b(?:\s*steps?)?/);
  const n = t.match(/\b(\d{3,6})\s*steps?\b/);
  if (n) steps = Number(n[1]);
  else if (k && /\b(walk|walked|steps?|chala|did|done|hit)\b/.test(t)) steps = Math.round(Number(k[1]) * 1000);
  if (steps !== null && (steps < 100 || steps > 100000)) steps = null;

  let sleepMinutes: number | null = null;
  const s = t.match(/\b(?:slept|sleep|sleeping|soya|soyi|so gaya|so gayi)\b[^0-9]{0,20}(\d{1,2}(?:\.\d)?)\s*(?:hours?|hrs?|h|ghante|ghanta)\b(?:\s*(?:and\s*)?(\d{1,2})\s*(?:min(?:ute)?s?|m)\b)?/);
  if (s) sleepMinutes = Math.round(Number(s[1]) * 60 + (s[2] ? Number(s[2]) : 0));
  if (sleepMinutes !== null && (sleepMinutes < 60 || sleepMinutes > 960)) sleepMinutes = null;
  return { steps, sleepMinutes };
}
