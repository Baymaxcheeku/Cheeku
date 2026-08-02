import {
  Activity,
  Baby,
  Dna,
  HeartHandshake,
  PersonStanding,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/*
 * The five journeys Baymax is built around.
 *
 * These are the product's actual wedge, not marketing segments invented for an
 * onboarding screen: each one is a household that already keeps medical paper
 * in a drawer or a WhatsApp thread, and each one has a different reason the
 * memory layer matters. Naming them out loud on the way in does two things —
 * it tells the reader "this was built for my situation" in the two seconds
 * they are deciding, and it gives the rest of onboarding something true to
 * personalise against.
 *
 * `other` is deliberately part of the list rather than a fallback. Baymax is a
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
  /** Non-semantic tints. Health meaning owns green/amber/red elsewhere. */
  tint: string;
};

export const JOURNEYS: readonly Journey[] = [
  {
    id: "expecting",
    icon: HeartHandshake,
    label: "Expecting",
    problem: "Every scan and test, week by week",
    tint: "bg-[#f3e9fd] text-[#7b3fd4]",
  },
  {
    id: "fertility",
    icon: Dna,
    label: "Trying to conceive",
    problem: "Cycles and protocols that never get lost",
    tint: "bg-[#e6f1fd] text-[#1a6fc2]",
  },
  {
    id: "caregiver",
    icon: PersonStanding,
    label: "Caring for a parent",
    problem: "Manage their health from another city",
    tint: "bg-[#fdeee0] text-[#c2650b]",
  },
  {
    id: "new_parent",
    icon: Baby,
    label: "New parent",
    problem: "Vaccines, fevers and growth in one place",
    tint: "bg-[#fdeaf0] text-[#c22a6b]",
  },
  {
    id: "optimiser",
    icon: Activity,
    label: "Optimising my health",
    problem: "Panels and wearables, finally explained",
    tint: "bg-[#eaf6ec] text-[#1f8a45]",
  },
  {
    id: "other",
    icon: Sparkles,
    label: "Just keeping track",
    problem: "A home for everything, whenever it's needed",
    tint: "bg-brand-50 text-brand-600",
  },
];

export function journeyFor(id: string | null | undefined): Journey | null {
  return JOURNEYS.find((j) => j.id === id) ?? null;
}
