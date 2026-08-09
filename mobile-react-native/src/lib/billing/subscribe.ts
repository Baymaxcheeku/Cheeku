import { supabase } from "@/lib/supabase/client";
import type { Tier } from "./plans";

/*
 * The demo checkout's activation step.
 *
 * NO PAYMENT HAPPENS HERE, and the UI must never imply otherwise. This calls
 * `activate_tier_demo`, which grants the tier outright so the paywall can be
 * walked end to end before a provider exists. The database gates it behind
 * `app_flags.demo_billing`, and both the flag and the function are dropped
 * before real billing ships — see migration 0012.
 *
 * WHAT REPLACES THIS. Razorpay's checkout returns a payment id and signature
 * that only a server can verify, because a client that decides its own payment
 * succeeded is a client that always succeeds. So the real version is: open
 * Razorpay's own sheet, hand the result to a webhook or Edge Function, and let
 * THAT write the tier. The screen above this file barely changes; this file is
 * the part that gets thrown away.
 */

export type SubscribeResult = { ok: true } | { ok: false; message: string };

export async function subscribeDemo(tier: Exclude<Tier, "free">): Promise<SubscribeResult> {
  const { data, error } = await supabase.rpc("activate_tier_demo", { p_tier: tier });

  if (error) {
    /*
     * The flag being off is the one failure worth naming, because it is a
     * deliberate state rather than a fault — somebody turned the demo off and
     * the reader should be told that, not asked to retry forever.
     */
    if (error.message.includes("demo billing is disabled")) {
      return { ok: false, message: "Plans are not available in this build yet." };
    }
    return { ok: false, message: "That did not go through. Please try again." };
  }

  if (data !== true) return { ok: false, message: "That did not go through. Please try again." };
  return { ok: true };
}

/**
 * Cancels, returning the family to free.
 *
 * NOT a demo function, unlike `subscribeDemo`. Cancelling is a right rather
 * than a purchase — the stores require it in-app, and DPDP expects people to be
 * able to stop processing they consented to — so `cancel_subscription` survives
 * real billing and is not behind the demo flag. When a provider lands, this
 * gains a call to the store's own subscription API beside it; it does not go
 * away.
 *
 * The free chat allowance is deliberately NOT refilled by cancelling. See the
 * note in migration 0015.
 */
export async function cancelSubscription(): Promise<SubscribeResult> {
  const { data, error } = await supabase.rpc("cancel_subscription");
  if (error || data !== true) {
    return { ok: false, message: "We couldn't cancel that. Please try again." };
  }
  return { ok: true };
}
