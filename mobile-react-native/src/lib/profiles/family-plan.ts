import { FREE_CHAT_LIMIT, seatsFor, type Tier } from "@/lib/billing/plans";

/*
 * The plan rules for families, as pure functions (tested in family.test.ts).
 */


export type FamilyMode = "family" | "solo" | "free";

/** Which of the three experiences this account gets. The Daily pass is a Solo-shaped plan. */
export function familyMode(tier: Tier): FamilyMode {
  if (tier === "family") return "family";
  if (tier === "solo" || tier === "micro") return "solo";
  return "free";
}

export type PlanChange = {
  /** Members who stay reachable. */
  keep: string[];
  /** Members who become paused (locked, never deleted). */
  pause: string[];
  /** Members a paused plan would bring back. */
  unpause: string[];
  seatsBefore: number;
  seatsAfter: number;
  chatLine: string;
};

/**
 * What a plan change does to THIS family, in names rather than rules. The
 * plan screen reads this back before anyone confirms, so "you'll lose access
 * to family members" becomes "Amma and Ananya are paused, not deleted".
 * `members` must be in selectable order (primary first, then oldest first),
 * which is the order the seat rule keeps people in.
 */
export function planChange(members: readonly { name: string }[], from: Tier, to: Tier): PlanChange {
  const before = seatsFor(from);
  const after = seatsFor(to);
  const names = members.map((m) => m.name);
  return {
    keep: names.slice(0, after),
    pause: after < before ? names.slice(after, before) : [],
    unpause: after > before ? names.slice(before, after) : [],
    seatsBefore: before,
    seatsAfter: after,
    chatLine: to === "free" ? `${FREE_CHAT_LIMIT} chats a day with Cheeku` : "Unlimited chats with Cheeku",
  };
}

/** "Amma", "Amma and Ananya", "Amma, Ananya and Papa". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

