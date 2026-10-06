import { supabase } from "@/lib/supabase/client";
import { sessionUser, shared } from "@/lib/supabase/session";
import { FREE_CHAT_LIMIT, isUnlimited, type Tier } from "./plans";

/*
 * Entitlement — THE READ PATH ONLY.
 *
 * The web module also holds `consumeChat`, `activateTier` and
 * `cancelSubscription`. Those are deliberately absent here and must stay
 * absent: every one of them writes with the SERVICE-ROLE KEY, because
 * `subscriptions` has no update policy by design. Shipping that key in a mobile
 * bundle would hand every installed copy of the app the ability to grant itself
 * any tier and reset anyone's quota — the bundle is not a secret, it is a file
 * on a phone.
 *
 * So the writes belong somewhere the client cannot impersonate. `consumeChat`
 * now lives in the database as `messages_chat_quota_trigger` (migration 0011),
 * which spends a chat inside the message insert itself — so there is nothing
 * here to call, and nothing a client can decline to call. When billing lands in
 * Phase 6 the tier writer becomes a validated store receipt. Until then,
 * nothing in this app changes a tier.
 *
 * The read below is safe on the client because it is RLS-scoped: it can only
 * see the caller's own family row, and being wrong about it in the client's
 * favour changes nothing — the gate that matters runs where the write happens.
 */

export type Entitlement = {
  tier: Tier;
  chatsUsed: number;
  /** null when the tier has no ceiling. */
  chatsRemaining: number | null;
  limit: number | null;
  canChat: boolean;
  periodStart: string;
  /** ISO expiry of an active Daily pass; null for every other tier. */
  expiresAt: string | null;
};

/**
 * An `expires_at` in the past means a Daily pass has run out, so the row's tier
 * no longer entitles anything.
 */
function passElapsed(tier: Tier, expiresAt: string | null | undefined): boolean {
  if (tier !== "micro") return false;
  if (!expiresAt) return true; // A micro row with no expiry is malformed; fail closed.
  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Today's period key. The free allowance resets DAILY (migration 0022).
 *
 * It was the first of the month. Five chats a month is not a trial of a health
 * companion — one worrying result burns all five in an evening and the app has
 * nothing to offer for four weeks. The database is the authority on this; the
 * two must agree or the client shows a ceiling the trigger does not enforce.
 *
 * Built from local date parts rather than toISOString(), which converts to UTC
 * first and would roll the allowance over at the wrong hour for every reader
 * east or west of it.
 */
function currentPeriodStart(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function freeEntitlement(): Entitlement {
  return {
    tier: "free",
    chatsUsed: 0,
    chatsRemaining: FREE_CHAT_LIMIT,
    limit: FREE_CHAT_LIMIT,
    canChat: true,
    periodStart: currentPeriodStart(),
    expiresAt: null,
  };
}

/*
 * The web version wrapped this in React's `cache()` to dedupe within a single
 * server render. The equivalent here is react-query's cache, which the screens
 * own — so this stays a plain function and callers key it as `["entitlement"]`.
 */
export function getEntitlement(): Promise<Entitlement> {
  return sessionUser().then((user) => (user ? shared(`entitlement:${user.id}`, () => readEntitlement(user.id)) : freeEntitlement()));
}

/*
 * ONE QUERY. This was three in a row (who am I on the auth server, my
 * family, its subscription) and ran three to six times per screen. The user
 * id now comes from the session on the phone, and the family and its
 * subscription come back together through the foreign key
 * (subscriptions.family_id references families.id, unique), as a nested
 * select.
 */
async function readEntitlement(userId: string): Promise<Entitlement> {
  const { data: family } = await supabase
    .from("families")
    .select("id, subscriptions(tier, chats_used_this_month, period_start, expires_at)")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!family?.id) return freeEntitlement();
  // A one-to-one embed can come back as an object or a one-row array.
  const nested = (family as { subscriptions?: unknown }).subscriptions;
  const data = (Array.isArray(nested) ? nested[0] : nested) as
    | { tier: string; chats_used_this_month: number | null; period_start: string; expires_at: string | null }
    | null
    | undefined;

  if (!data) return freeEntitlement();

  const storedTier = data.tier as Tier;
  const expiresAt = data.expires_at as string | null;

  /*
   * An elapsed Daily pass reports as free so the paywall shows the free
   * allowance rather than an expired plan the reader cannot act on. The row is
   * left alone: a read that mutates billing state is a read that surprises
   * someone during an incident.
   */
  const tier = passElapsed(storedTier, expiresAt) ? "free" : storedTier;

  // A counter belonging to a day that has ended reads as zero. The reset
  // itself happens on the next write, wherever that ends up living.
  const rolledOver = String(data.period_start) < currentPeriodStart();
  const used = rolledOver ? 0 : Number(data.chats_used_this_month ?? 0);

  if (isUnlimited(tier)) {
    return {
      tier,
      chatsUsed: used,
      chatsRemaining: null,
      limit: null,
      canChat: true,
      periodStart: currentPeriodStart(),
      expiresAt: tier === "micro" ? expiresAt : null,
    };
  }

  return {
    tier,
    chatsUsed: used,
    chatsRemaining: Math.max(0, FREE_CHAT_LIMIT - used),
    limit: FREE_CHAT_LIMIT,
    canChat: used < FREE_CHAT_LIMIT,
    periodStart: currentPeriodStart(),
    expiresAt: null,
  };
}
