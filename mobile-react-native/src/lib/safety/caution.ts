import type { SafetyResult } from "./detect";

/*
 * Tier 2. The middle of the three verdicts, and the one that had no UI at all.
 *
 * `detect` has returned "tier2" since the gate was ported, the verdict has been
 * written to every message row, and nothing has ever shown it to anyone. The
 * lexicon's own header says what it is for — "urgent but not immediately
 * life-threatening: banner + same-day care" — so the detection was right and
 * the response was missing. Someone typing "fever for more than 3 days now"
 * got a normal answer and no reason to see a doctor today.
 *
 * WHY IT IS NOT AN ESCALATION. Escalate interrupts: it takes the screen, refuses
 * to answer, and hands over phone numbers, because minutes matter. Tier 2 does
 * not interrupt. The question is still answered, because the answer is useful
 * and the reader asked for it — but it arrives with a line saying this is worth
 * being seen for today. Turning tier 2 into a full interrupt would train people
 * to dismiss the interrupt, and the day it matters they would dismiss that one
 * too.
 *
 * WHAT IT MUST NEVER DO. Name a condition, guess a cause, or suggest a
 * treatment. "Fever this long is worth a doctor seeing today" is an urgency
 * statement. "This could be dengue" is a diagnosis, and rule 1 forbids it
 * however likely it is.
 */

export type CautionCopy = {
  /** The urgency, stated plainly. Never a cause. */
  title: string;
  /** What to do, in one sentence. */
  body: string;
};

const DEFAULT: CautionCopy = {
  title: "Worth seeing someone today",
  body: "What you've described is the kind of thing a doctor should look at soon rather than wait out. Baymax can help you find the record, but it can't examine anyone.",
};

/*
 * Copy per rule id, so the sentence matches what was actually said. A generic
 * "please seek care" after a specific worry reads as a disclaimer and gets
 * skipped; naming the thing back shows it was heard.
 *
 * Keys are the `id` values under `tier2:` in lexicon.yaml. A rule with no entry
 * here falls back to DEFAULT rather than rendering nothing, so adding a lexicon
 * rule can never silently produce a blank banner.
 */
const BY_RULE: Record<string, CautionCopy> = {
  "prolonged-fever": {
    title: "A fever this long is worth checking today",
    body: "A fever running several days is one of the things doctors want to see rather than wait out. Worth an appointment today if you can get one.",
  },
  "infant-fever": {
    title: "A baby with a fever should be seen today",
    body: "Fever in a very young child is treated as urgent by every paediatrician, whatever the cause turns out to be. Please contact your doctor now.",
  },
  dehydration: {
    title: "Worth being seen today",
    body: "Not keeping fluids down is the part that gets serious quickly, especially for a child or an older person. A doctor should look at this today.",
  },
  "double-dose": {
    title: "Call a doctor or pharmacist now",
    body: "For anything to do with a dose already taken, speak to a pharmacist or your doctor rather than waiting. Baymax will not advise on medication amounts.",
  },
  "allergic-reaction": {
    title: "This needs seeing urgently",
    body: "Reactions can change fast. If breathing, the throat or the face are involved at all, treat it as an emergency and call 112 now.",
  },
};

export function cautionCopy(result: SafetyResult): CautionCopy {
  if (result.status !== "tier2") return DEFAULT;
  return (result.matched && BY_RULE[result.matched]) || DEFAULT;
}

/**
 * Does this verdict deserve the banner?
 *
 * Only tier2. `escalate` has its own full-screen interrupt and must never get
 * both, and `clear` gets nothing.
 */
export function shouldCaution(result: SafetyResult): boolean {
  return result.status === "tier2";
}
