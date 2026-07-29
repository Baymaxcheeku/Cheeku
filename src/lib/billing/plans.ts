/*
 * Plans and the free quota.
 *
 * TWO CONFLICTS were resolved here, both recorded in PROGRESS.md.
 *
 * 1. THE FREE LIMIT. The spec says three chats a month; the chat frame says
 *    "Free users can have 5 chats with Baymax". The frames win by the standing
 *    rule, so it is five.
 *
 * 2. THE PRICES. The frames disagree with each other. The profile screen and
 *    both paywall screens say Solo ₹99/month and Family ₹249/month — and the
 *    paywall files are literally named "99:month" and "249:Month". The
 *    chat-limit frame says Solo ₹499, Family ₹899 and adds a ₹29/day plan.
 *    Two frames plus the filenames agree, one does not, so ₹99 and ₹249 are
 *    used and the outlier is flagged rather than silently averaged.
 *
 * Prices are held in paise. Storing ₹99 as a float and multiplying it by
 * anything is how billing bugs start.
 */

export type Tier = "free" | "micro" | "solo" | "family";

export type Plan = {
  tier: Tier;
  name: string;
  tagline: string;
  /** Paise. 9900 = ₹99. */
  priceInPaise: number;
  period: string;
  features: string[];
  /** Family members the plan covers, including the primary. */
  seats: number;
  highlight?: string;
};

export const FREE_CHAT_LIMIT = 5;

export const PLANS: Record<Exclude<Tier, "free" | "micro">, Plan> = {
  solo: {
    tier: "solo",
    name: "Solo Plan",
    tagline: "Personalised care, just for you",
    priceInPaise: 9_900,
    period: "month",
    seats: 1,
    features: [
      "Unlimited Ask Baymax",
      "Health insights from your records",
      "Unlimited document storage",
      "Priority support",
    ],
  },
  family: {
    tier: "family",
    name: "Family Plan",
    tagline: "For you and your loved ones",
    priceInPaise: 24_900,
    period: "month",
    seats: 4,
    highlight: "Most popular",
    features: [
      "Up to 4 family members",
      "Shared health insights",
      "Unlimited Ask Baymax",
      "All premium features",
    ],
  },
};

export const FREE_PLAN: Plan = {
  tier: "free",
  name: "Free Plan",
  tagline: "Get started with your records",
  priceInPaise: 0,
  period: "month",
  seats: 1,
  features: [
    `${FREE_CHAT_LIMIT} Ask Baymax chats a month`,
    "Unlimited document storage",
    "One profile",
  ],
};

/** "₹99". Whole rupees only — every price here is a round number. */
export function formatPrice(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function planFor(tier: Tier): Plan {
  if (tier === "solo") return PLANS.solo;
  if (tier === "family") return PLANS.family;
  return FREE_PLAN;
}

/** Paid tiers have no chat ceiling. */
export function isUnlimited(tier: Tier): boolean {
  return tier === "solo" || tier === "family";
}
