/*
 * A2 — the four panels before any account exists.
 *
 * ┌─ THE ARC ────────────────────────────────────────────────────────────────┐
 * │                                                                          │
 * │  1. Ask me anything, in your own words.       (the invitation)           │
 * │  2. Give me the paperwork once; I'll keep it. (the mechanism)            │
 * │  3. And not only yours — the whole family's.  (the reach)                │
 * │  4. When it's time to act, I'll help you      (the action)               │
 * │     choose care that fits your history.                                  │
 * │                                                                          │
 * │ Each panel's last idea is the next panel's first. The voice is FIRST     │
 * │ PERSON throughout, one character start to finish, because the thing      │
 * │ being introduced is a companion and a companion introduces itself.       │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * REWRITTEN 2026-09-29 FOR THE READER WE ACTUALLY HAVE. The launch market is
 * India, and the earlier "global, not generic" copy was so careful not to be
 * local that it was not anyone's. The details now are the ones an Indian
 * household recognises on sight: reports in the almirah, prescriptions on a
 * WhatsApp thread, Mummy and Papa. No Hindi beyond words already used in
 * English conversation, and nothing about money.
 *
 * WHAT THE COPY MAY NEVER DO. Promise an answer, an opinion, or a reading of a
 * result. Everything here offers to REMEMBER and to EXPLAIN, and panel 2 says
 * out loud that every answer shows where it came from. Onboarding is where a
 * health app makes the promise it then has to keep.
 *
 * `kind` drives the composition rather than a shared template with swapped
 * props: each panel is laid out differently on purpose.
 */
export type Panel = {
  kind: "meet" | "memory" | "family" | "care" | "plan";
  /** One word for what the panel is about, above the headline. */
  eyebrow: string;
  lead: string;
  accent: string;
  body: string;
  cta: string;
};

/*
 * REWRITTEN 2026-11-18: FIVE WORRIES, FIVE ANSWERS.
 *
 * Each panel opens on something an Indian family already feels, in the words
 * they would use for it, and only then says what Cheeku does about it:
 *
 *   1. The 2am symptom search that makes everything sound fatal.
 *   2. "Reports laaye ho?" and the frantic hunt through the almirah.
 *   3. Parents in another city, and not knowing if Papa took his BP tablet.
 *   4. The wrong doctor, the repeated story, the 40-test package.
 *   5. Sugar and BP running in the family, and wanting to get ahead of it.
 *
 * The limits from the first version still hold: Cheeku explains, remembers,
 * reminds and books. It never diagnoses, never says a result is fine, and
 * every scene's answer is a read-back of what the lab or the person recorded.
 * The one Hindi line is the doctor's own, quoted, because every family has
 * heard it in exactly those words.
 */
export const PANELS: readonly Panel[] = [
  {
    kind: "meet",
    eyebrow: "Hi, I'm Cheeku",
    lead: "Googling at 2am?",
    accent: "Ask me instead.",
    body: "Google shows the scariest answer first. I read your own reports and explain them in plain words, and tell you honestly when it's time to see a doctor.",
    cta: "Show me how",
  },
  {
    kind: "memory",
    eyebrow: "Your health memory",
    lead: "“Reports laaye ho?”",
    accent: "Now it's always yes.",
    body: "Reports in the almirah, prescriptions on WhatsApp, scans lost in email. Snap them once. I keep every value by person and date, and show the trend when the doctor asks.",
    cta: "Nice, what else?",
  },
  {
    kind: "family",
    eyebrow: "The whole family",
    lead: "Parents far away?",
    accent: "Stay close to their health.",
    body: "Mummy-Papa's medicines, doses and due tests in one place. A gentle nudge when a tablet isn't ticked or a strip is running out. Each person's file stays private.",
    cta: "And when we need a doctor?",
  },
  {
    kind: "care",
    eyebrow: "Book care",
    lead: "No repeating your story.",
    accent: "No tests you don't need.",
    body: "Your doctor gets your note and old reports before the call. Lab tests at home, medicines to your door, and every result filed back on its own.",
    cta: "One last thing",
  },
  {
    kind: "plan",
    eyebrow: "Every day",
    lead: "Sugar, BP in the family?",
    accent: "Get ahead of it.",
    body: "A small plan each day, built from your own numbers. A walk after lunch, sleep on time, the test that's due. Little steps that add up.",
    cta: "Let's get started",
  },
];
