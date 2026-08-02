/*
 * A2 — the four panels before any account exists.
 *
 * REWRITTEN 2026-08-01. The previous copy was transcribed from the frames and
 * described features ("upload, store, and organize reports"). Every health app
 * says that, and none of it tells a woman who is 20 weeks pregnant, or a man
 * managing his mother's diabetes from another city, that this was built for
 * them. So the order now runs: what it is → who it is for → how it works →
 * who it protects, and panel 2 names the actual lives instead of listing file
 * types.
 *
 * `kind` drives the composition rather than a shared template with swapped
 * props: each panel is laid out differently on purpose.
 */
export type Panel = {
  kind: "meet" | "journeys" | "memory" | "family";
  lead: string;
  accent: string;
  body: string;
  cta: string;
};

export const PANELS: readonly Panel[] = [
  {
    kind: "meet",
    lead: "Your family's health,",
    accent: "finally remembered",
    body: "Every report, prescription and scan in one private place — and a companion that actually remembers what's in them.",
    cta: "Show me how",
  },
  {
    kind: "journeys",
    lead: "Built for the season",
    accent: "you're in right now",
    body: "Baymax adapts to what you're living through. Pick the one that fits — you can change it any time.",
    cta: "Continue",
  },
  {
    kind: "memory",
    lead: "Ask anything.",
    accent: "It already knows your history",
    body: "Baymax reads your documents, remembers what they said, and answers in plain language — always citing the record it came from.",
    cta: "Continue",
  },
  {
    kind: "family",
    lead: "One place for",
    accent: "everyone you look after",
    body: "Add your parents, your partner, your kids. Switch between them in a tap, and keep every history separate and private.",
    cta: "Create my account",
  },
];
