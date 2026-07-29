import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import { FREE_CHAT_LIMIT, isUnlimited, type Tier } from "./plans";

/*
 * Entitlement.
 *
 * Every function here decides whether something is allowed. That decision is
 * made on the SERVER, from the database, on the way in to the action being
 * gated — never from a prop, never from anything the client sent, and never as
 * a rendering concern. The paywall UI reads the same numbers, but only to draw
 * itself; if it disagreed with this file, this file would still be right.
 *
 * `subscriptions` has no update policy by design, so the counter is written
 * with the service key. Both writes below are keyed on a family_id derived from
 * `requireUser()`, which is the only thing standing in for RLS here.
 */

export type Entitlement = {
  tier: Tier;
  chatsUsed: number;
  /** null when the tier has no ceiling. */
  chatsRemaining: number | null;
  limit: number | null;
  canChat: boolean;
  periodStart: string;
};

/** The signed-in user's family. Everything on a plan hangs off this. */
async function familyIdFor(userId: string): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("families")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Today's period key. Quotas reset on the 1st. */
function currentPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function getEntitlement(): Promise<Entitlement> {
  const user = await requireUser();
  const familyId = await familyIdFor(user.id);

  const free: Entitlement = {
    tier: "free",
    chatsUsed: 0,
    chatsRemaining: FREE_CHAT_LIMIT,
    limit: FREE_CHAT_LIMIT,
    canChat: true,
    periodStart: currentPeriodStart(),
  };
  if (!familyId) return free;

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("subscriptions")
    .select("tier, chats_used_this_month, period_start")
    .eq("family_id", familyId)
    .maybeSingle();

  if (!data) return free;

  const tier = data.tier as Tier;
  const period = String(data.period_start);

  /*
   * A stale period means the counter belongs to a month that has ended, so it
   * reads as zero here. The row is not rewritten on a read — that would make
   * every page load a write, and a read that mutates is a read that surprises
   * someone during an incident. `consumeChat` does the reset when it next
   * writes.
   */
  const rolledOver = period < currentPeriodStart();
  const used = rolledOver ? 0 : Number(data.chats_used_this_month ?? 0);

  if (isUnlimited(tier)) {
    return {
      tier,
      chatsUsed: used,
      chatsRemaining: null,
      limit: null,
      canChat: true,
      periodStart: currentPeriodStart(),
    };
  }

  return {
    tier,
    chatsUsed: used,
    chatsRemaining: Math.max(0, FREE_CHAT_LIMIT - used),
    limit: FREE_CHAT_LIMIT,
    canChat: used < FREE_CHAT_LIMIT,
    periodStart: currentPeriodStart(),
  };
}

/**
 * Records one chat against the quota. Returns false when the caller is over it.
 *
 * The check and the increment are the same operation on purpose. Reading the
 * quota, deciding, and then incrementing separately leaves a window where two
 * requests both see the last remaining chat — which is how a "3 free" limit
 * quietly becomes four.
 */
export async function consumeChat(): Promise<boolean> {
  const user = await requireUser();
  const familyId = await familyIdFor(user.id);
  if (!familyId) return true;

  const admin = createAdminSupabase();
  const { data } = await admin
    .from("subscriptions")
    .select("tier, chats_used_this_month, period_start")
    .eq("family_id", familyId)
    .maybeSingle();

  // No row means no plan has been set up; treat as free and start the counter.
  if (!data) {
    await admin.from("subscriptions").insert({
      family_id: familyId,
      tier: "free",
      chats_used_this_month: 1,
      period_start: currentPeriodStart(),
    });
    return true;
  }

  if (isUnlimited(data.tier as Tier)) return true;

  const period = currentPeriodStart();
  const rolledOver = String(data.period_start) < period;
  const used = rolledOver ? 0 : Number(data.chats_used_this_month ?? 0);

  if (used >= FREE_CHAT_LIMIT) return false;

  await admin
    .from("subscriptions")
    .update({ chats_used_this_month: used + 1, period_start: period })
    .eq("family_id", familyId);

  return true;
}

/**
 * Moves the family onto a paid tier.
 *
 * There is no payment processor behind this. It is called only after the mock
 * checkout resolves, and is the single place a tier changes — so when a real
 * provider is wired in, its webhook calls this and nothing else moves.
 */
export async function activateTier(tier: Exclude<Tier, "free">): Promise<boolean> {
  const user = await requireUser();
  const familyId = await familyIdFor(user.id);
  if (!familyId) return false;

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("subscriptions")
    .upsert(
      {
        family_id: familyId,
        tier,
        chats_used_this_month: 0,
        period_start: currentPeriodStart(),
      },
      { onConflict: "family_id" },
    );

  return !error;
}

/** Back to free. Used by the settings screen's cancel. */
export async function cancelSubscription(): Promise<boolean> {
  const user = await requireUser();
  const familyId = await familyIdFor(user.id);
  if (!familyId) return false;

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("subscriptions")
    .update({ tier: "free" })
    .eq("family_id", familyId);

  return !error;
}
