/*
 * A2 — the four panels before any account exists.
 *
 * REWRITTEN 2026-08-19. The four panels each said a true thing, but they said
 * it as four unrelated statements: "finally remembered", "the season you're
 * in", "ask anything", "one place for everyone". Nothing carried a reader from
 * one to the next, and the voice changed between them — panel 1 spoke about
 * the product, panel 3 spoke as the product.
 *
 * ┌─ THE ARC ────────────────────────────────────────────────────────────────┐
 * │                                                                          │
 * │  1. I'm here, and I don't need you to know the words.  (the invitation)  │
 * │  2. Tell me once — I'll hold it, and give it back.     (the mechanism)   │
 * │  3. And not only for you.                              (the reach)       │
 * │                                                                          │
 * │ THREE, NOT FOUR. The fourth used to be the journey picker. Asking a      │
 * │ stranger to classify their own life before an account exists takes an    │
 * │ answer with nowhere to put it — it went to local storage to wait for a   │
 * │ profile that might never be created — and puts a survey between them     │
 * │ and the product. It now lives at `/journey`, one screen after the        │
 * │ profile is made, where it writes straight to the row it belongs to.      │
 * │                                                                          │
 * │ Each panel's last idea is the next panel's first. The voice is FIRST     │
 * │ PERSON throughout, one character start to finish, because the thing      │
 * │ being introduced is a companion and a companion introduces itself.       │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * GLOBAL, NOT GENERIC. No "lakh", no "₹", no US insurance vocabulary, no
 * clinic names. The examples are body parts and worries, which travel.
 *
 * WHAT THE COPY MAY NEVER DO. Promise an answer, an opinion, or a reading of a
 * result. Everything here offers to REMEMBER and to EXPLAIN, and panel 3 says
 * out loud that the answer comes from the reader's own document. Onboarding is
 * where a health app makes the promise it then has to keep.
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
    eyebrow: "Hello",
    lead: "Ask me the question",
    accent: "you'd never ask out loud",
    body: "At 2am, in your own words, with no appointment and no judgement. I'm Cheeku — a health companion for you and the people you look after.",
    cta: "Show me how",
  },
  {
    kind: "memory",
    eyebrow: "Memory",
    lead: "Tell me once.",
    accent: "I'll never make you repeat it",
    body: "Send me your reports, prescriptions and scans. I'll remember what they say and explain them in plain language — always showing you the document the answer came from.",
    cta: "Continue",
  },
  {
    kind: "family",
    eyebrow: "Family",
    lead: "One place for",
    accent: "everyone you look after",
    body: "Add your parents, your partner, your kids. Switch between them in a tap, and keep every history separate and private.",
    cta: "Create my account",
  },
];
