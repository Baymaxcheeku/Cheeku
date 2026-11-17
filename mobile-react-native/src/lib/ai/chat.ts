import { FREE_CHAT_LIMIT, isUnlimited } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";

/*
 * The chat quota.
 *
 * Messages run through the memory layer (lib/memory/pipeline and
 * lib/memory/store). The demo product picker that lived here (fixed product
 * scenarios with canned verdicts) was removed on 2026-11-17: a photo in chat
 * now goes to the model (lib/chat/photo). Old product answers still render
 * from the message row (lib/ai/product-assessment).
 */

export type ChatQuota = { used: number; limit: number | null; remaining: number | null };

/**
 * What the reader has left this period.
 *
 * THIS IS THE DISPLAY COPY OF THE QUOTA, NOT THE ENFORCEMENT.
 *
 * The counter it reads is written by `messages_chat_quota_trigger` in migration
 * 0011, which spends one chat per user message inside the insert itself. So
 * this is the same number the database will act on, but being wrong about it in
 * the client's favour changes nothing: the send still fails at the write. The
 * pre-check in `askCheeku` exists so a refused chat costs no work and never
 * reaches the transcript, not because it stops anybody.
 *
 * An earlier version counted rows in `messages`, because nothing maintained the
 * counter. That has to stay gone now the trigger is live: the trigger does not
 * charge for escalations and a row count does, so the two would drift apart by
 * one every time somebody hit the safety gate — drift in the direction of
 * billing people for asking about an emergency.
 */
export async function chatQuota(): Promise<ChatQuota> {
  const entitlement = await getEntitlement();
  if (isUnlimited(entitlement.tier)) return { used: 0, limit: null, remaining: null };

  return {
    used: entitlement.chatsUsed,
    limit: FREE_CHAT_LIMIT,
    remaining: Math.max(0, FREE_CHAT_LIMIT - entitlement.chatsUsed),
  };
}
