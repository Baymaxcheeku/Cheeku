/*
 * Plans and the free quota.
 *
 * TWO CONFLICTS were resolved here, both recorded in PROGRESS.md.
 *
 * 1. THE FREE LIMIT. The spec says three chats a month; the chat frame says
 *    "Free users can have 5 chats with Baymax". The frames win by the standing
 *    rule, so it is five.
 *
 *    CHANGED 2026-08-19, by Athar: five a DAY, not a month. Five a month is a
 *    demonstration that a health companion exists rather than a trial of one —
 *    a person with a worrying result spends all five in an evening and has no
 *    reason to return for four weeks. The number itself is unchanged; the
 *    period is. `enforce_chat_quota` (migration 0022) is the authority and
 *    duplicates the 5, so the two must be changed together.
 *
 * 2. THE PRICES. The frames disagree with each other. The profile screen and
 *    both paywall screens say Solo ₹99/month and Family ₹249/month — and the
 *    paywall files are literally named "99:month" and "249:Month". The
 *    chat-limit frame says Solo ₹499, Family ₹899 and adds a ₹29/day plan.
 *    Two frames plus the filenames agree, one does not, so ₹99 and ₹249 are
 *    used and the outlier is flagged rather than silently averaged.
 *
 *    RESOLVED FURTHER, 2026-07-30: Athar asked for the chooser to offer "all
 *    three — daily, 99rs and 249". So the ₹29/day plan from the outlier frame
 *    is adopted (it is a real product idea, and the only part of that frame
 *    that wasn't a price conflict), while its ₹499/₹899 pricing stays rejected.
 *
 * Prices are held in paise. Storing ₹99 as a float and multiplying it by
 * anything is how billing bugs start.
 */

export type Tier = "free" | "micro" | "solo" | "family";

/** How long a Daily pass lasts once bought. */
export const DAILY_PASS_HOURS = 24;

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

export const PLANS: Record<Exclude<Tier, "free">, Plan> = {
  /*
   * The Daily pass. Priced per day rather than per month, which is why
   * `period` is load-bearing rather than decorative — every price line in the
   * UI reads "₹X / {period}" off this.
   *
   * It exists for the case the monthly plans handle badly: someone with one
   * report they want explained tonight, who should not have to think about a
   * subscription to get it.
   */
  micro: {
    tier: "micro",
    name: "Daily Pass",
    tagline: "Flexible, for short-term needs",
    priceInPaise: 2_900,
    period: "day",
    seats: 1,
    features: [
      `Unlimited Ask Baymax for ${DAILY_PASS_HOURS} hours`,
      "Health insights from your records",
      "No subscription, no renewal",
    ],
  },
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
    `${FREE_CHAT_LIMIT} Ask Baymax chats a day`,
    "Unlimited document storage",
    "One profile",
  ],
};

/** "₹99". Whole rupees only — every price here is a round number. */
export function formatPrice(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function planFor(tier: Tier): Plan {
  if (tier === "micro") return PLANS.micro;
  if (tier === "solo") return PLANS.solo;
  if (tier === "family") return PLANS.family;
  return FREE_PLAN;
}

/**
 * Paid tiers have no chat ceiling.
 *
 * `micro` is included, but a Daily pass also has to still be *within* its 24
 * hours — that check lives in quota.ts, which is the only place that can see
 * `expires_at`. This function answers "does this tier have a ceiling", not "is
 * this subscription currently valid"; conflating the two would hand an expired
 * pass unlimited chats.
 */
export function isUnlimited(tier: Tier): boolean {
  return tier === "micro" || tier === "solo" || tier === "family";
}

/** The chooser's order: most popular first, cheapest commitment last. */
export const PLAN_ORDER: readonly Plan[] = [PLANS.family, PLANS.solo, PLANS.micro];

/**
 * How many family members a tier covers.
 *
 * Free and Daily are single-profile: the one made at onboarding. Adding members
 * is the thing the Family plan is actually for, so it is what the upsell on the
 * Profile screen and the add-member sheet both gate on.
 */
export function seatsFor(tier: Tier): number {
  return planFor(tier).seats;
}

/** Only the Family plan can hold more than one person. */
export function allowsFamily(tier: Tier): boolean {
  return tier === "family";
}

/*
 * ┌─ UNIT PRICING ───────────────────────────────────────────────────────────┐
 * │                                                                          │
 * │ ₹249 a month is a number people compare against other subscriptions.     │
 * │ ₹8 a day is a number they compare against a cup of tea, and it is the    │
 * │ same price. Every high-performing paywall in the category prints both,   │
 * │ and it is not a trick as long as the arithmetic is real and the full     │
 * │ amount is still the loudest figure on the card — which it is here.       │
 * │                                                                          │
 * │ Rounded to whole rupees, and never rounded DOWN to flatter the plan: a   │
 * │ daily figure that does not multiply back is the kind of small dishonesty │
 * │ that costs more trust than the sale is worth.                            │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
const DAYS_IN_MONTH = 30;

/**
 * "about ₹8 a day", or null when the plan is already priced per day.
 *
 * "about" is load-bearing. ₹99 over 30 days is ₹3.30, which rounds to ₹3, and
 * a bare "₹3 a day" multiplies back to ₹90 — a plan quietly cheaper than the
 * price printed directly above it. The hedge costs one word and makes the line
 * true at any price.
 */
export function perDayLabel(plan: Plan): string | null {
  if (plan.period === "day") return null;
  const paisePerDay = plan.priceInPaise / DAYS_IN_MONTH;
  return `about ${formatPrice(paisePerDay)} a day`;
}

/** "₹62 per person" — only meaningful on a plan that holds several. */
export function perSeatLabel(plan: Plan): string | null {
  if (plan.seats < 2) return null;
  return `${formatPrice(plan.priceInPaise / plan.seats)} per person`;
}

/**
 * What the Family plan saves against buying its seats separately.
 *
 * Computed, never typed in. A discount figure written by hand is one pricing
 * change away from being a lie printed on the most persuasive line of the
 * paywall.
 */
export function familySavingPercent(): number {
  const separately = PLANS.solo.priceInPaise * PLANS.family.seats;
  const saved = separately - PLANS.family.priceInPaise;
  return Math.round((saved / separately) * 100);
}
