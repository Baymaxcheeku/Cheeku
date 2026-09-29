/*
 * A2 — the three panels before any account exists.
 *
 * ┌─ THE ARC ────────────────────────────────────────────────────────────────┐
 * │                                                                          │
 * │  1. Ask me anything, in your own words.       (the invitation)           │
 * │  2. Give me the paperwork once; I'll keep it. (the mechanism)            │
 * │  3. And not only yours — the whole family's.  (the reach)                │
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
  kind: "meet" | "memory" | "family";
  /**
   * One word for what the panel is about, above the headline.
   *
   * It gives the four screens a spine you can feel before reading a sentence,
   * and it means the headline never has to do the job of a label.
   */
  eyebrow: string;
  lead: string;
  accent: string;
  body: string;
  cta: string;
};

export const PANELS: readonly Panel[] = [
  {
    kind: "meet",
    eyebrow: "Hi, I'm Cheeku",
    lead: "Health doubts? Ask me.",
    accent: "Even the awkward ones.",
    body: "The things you Google at 2am, or forgot to ask the doctor. Ask in your own words and I'll explain in plain ones. No judgement, no appointment.",
    cta: "Show me how",
  },
  {
    kind: "memory",
    eyebrow: "Your health memory",
    lead: "No more digging for",
    accent: "that one report.",
    body: "Reports in the almirah, prescriptions on WhatsApp, scans lost in email. Give them to me once. I'll remember every line, and always show you where an answer came from.",
    cta: "Nice, what else?",
  },
  {
    kind: "family",
    eyebrow: "The whole family",
    lead: "Mummy, Papa, the kids and you.",
    accent: "One app.",
    body: "Switch between family members in a tap. Every person's history stays separate, private and never sold.",
    cta: "Let's get started",
  },
];
