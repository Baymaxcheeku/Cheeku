"use server";

import { revalidatePath } from "next/cache";

import { activateTier, cancelSubscription, getEntitlement, type Entitlement } from "./quota";
import type { Tier } from "./plans";

/*
 * Checkout, mocked.
 *
 * V1 ships no payment provider, and this file is deliberately shaped so that
 * adding one does not touch anything else: `activateTier` is the only thing
 * that moves a family onto a plan, so a real provider's webhook calls that and
 * nothing here changes.
 *
 * WHAT THIS NEVER DOES, and must not when a provider is added: accept a card
 * number, a UPI PIN, a CVV or any other credential. The frames draw a card-and-
 * UPI chooser, and that is drawn — but the actual authorisation belongs in the
 * provider's own sheet, where it is their PCI scope and not ours. An app that
 * collects card details into its own form has taken on a liability it has no
 * reason to hold.
 */

export type CheckoutResult =
  | { ok: true; tier: Tier }
  | { ok: false; message: string };

export async function subscribe(tier: Exclude<Tier, "free">): Promise<CheckoutResult> {
  if (tier !== "solo" && tier !== "family") {
    return { ok: false, message: "That plan is not available." };
  }

  /*
   * A real provider would be called here and would take a second or two. The
   * delay is kept so the success state is reached the way it will be in
   * production — through a pending state — rather than instantly, which is the
   * one path that would never be exercised again once this is replaced.
   */
  await new Promise((resolve) => setTimeout(resolve, 900));

  const activated = await activateTier(tier);
  if (!activated) return { ok: false, message: "Could not activate the plan. Please try again." };

  // Entitlement changes what every screen may show, so the whole tree refreshes.
  revalidatePath("/", "layout");
  return { ok: true, tier };
}

export async function cancelPlan(): Promise<CheckoutResult> {
  const cancelled = await cancelSubscription();
  if (!cancelled) return { ok: false, message: "Could not cancel. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true, tier: "free" };
}

/** Read-only, for client components that need to render the current plan. */
export async function readEntitlement(): Promise<Entitlement> {
  return getEntitlement();
}
