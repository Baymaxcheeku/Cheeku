import {
  Activity,
  Baby,
  Dna,
  HeartHandshake,
  PersonStanding,
  Sparkles,
  type LucideIcon,
} from "lucide-react-native";

/*
 * The five journeys Cheeku is built around.
 *
 * These are the product's actual wedge, not marketing segments invented for an
 * onboarding screen: each one is a household that already keeps medical paper
 * in a drawer or a WhatsApp thread, and each one has a different reason the
 * memory layer matters. Naming them out loud on the way in does two things —
 * it tells the reader "this was built for my situation" in the two seconds
 * they are deciding, and it gives the rest of onboarding something true to
 * personalise against.
 *
 * `other` is deliberately part of the list rather than a fallback. Cheeku is a
 * general health companion; a grid of five specific lives with no way to say
 * "none of these, but I still want this" would read as a product that is not
 * for you.
 */

export type JourneyId =
  | "expecting"
  | "fertility"
  | "caregiver"
  | "new_parent"
  | "optimiser"
  | "other";

export type Journey = {
  id: JourneyId;
  icon: LucideIcon;
  /** What the reader calls themselves, not what a deck calls them. */
  label: string;
  /** The problem, in their words. One line, no product vocabulary. */
  problem: string;
  /**
   * What Cheeku says when this is picked in onboarding. Warmth and what it
   * will keep, NEVER a statement about the reader's health or the person
   * they care for.
   */
  reaction: string;
  /** Non-semantic tints. Health meaning owns green/amber/red elsewhere. */
  tint: string;
};

export const JOURNEYS: readonly Journey[] = [
  {
    id: "expecting",
    icon: HeartHandshake,
    label: "Expecting a baby",
    problem: "Every scan and test, trimester by trimester",
    reaction: "Congratulations! I'll keep every scan and test safe, week by week.",
    tint: "bg-[#f3e9fd] text-[#7b3fd4]",
  },
  {
    id: "fertility",
    icon: Dna,
    label: "Trying to conceive",
    problem: "Cycles, tests and reports, never lost",
    reaction: "I'll keep every cycle and report in order, so nothing slips.",
    tint: "bg-[#e6f1fd] text-[#1a6fc2]",
  },
  {
    id: "caregiver",
    icon: PersonStanding,
    label: "Caring for parents",
    problem: "Their reports and medicines, even from another city",
    reaction: "Looking after the ones who looked after you. I've got the paperwork.",
    tint: "bg-[#fdeee0] text-[#c2650b]",
  },
  {
    id: "new_parent",
    icon: Baby,
    label: "New parent",
    problem: "Vaccines, fevers and growth charts in one place",
    reaction: "Tiny human, lots of paperwork. I'll keep the vaccine card handy.",
    tint: "bg-[#fdeaf0] text-[#c22a6b]",
  },
  {
    id: "optimiser",
    icon: Activity,
    label: "Levelling up my health",
    problem: "Full-body checkups, finally in one place",
    reaction: "Love it. Every checkup side by side, so you can see what moved.",
    tint: "bg-[#eaf6ec] text-[#1f8a45]",
  },
  {
    id: "other",
    icon: Sparkles,
    label: "Just keeping track",
    problem: "One home for every report, whenever you need it",
    reaction: "Perfect. One home for everything, whenever you need it.",
    tint: "bg-brand-50 text-brand-600",
  },
];

export function journeyFor(id: string | null | undefined): Journey | null {
  return JOURNEYS.find((j) => j.id === id) ?? null;
}
