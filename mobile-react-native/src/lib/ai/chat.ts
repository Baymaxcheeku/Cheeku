import { answerQuestion, type Citation, type GroundingRecord } from "@/lib/ai/mock/answer";
import { FREE_CHAT_LIMIT, isUnlimited } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { activeProfile } from "@/lib/profiles/context";
import { listProfileRecords } from "@/lib/records/queries";
import { supabase } from "@/lib/supabase/client";
import type { EntityFlag, RecordEntity } from "@/lib/records/types";
import type { SafetyStatus } from "@/lib/safety/detect";

/*
 * The chat's write path.
 *
 * THE SAFETY GATE DOES NOT RUN HERE. It runs before this is ever called, on
 * the device, because rule 2 requires it to be deterministic and under 200ms —
 * a network round trip can promise neither. What arrives here is the gate's
 * VERDICT, recorded on the row so an escalation is auditable after the fact.
 *
 * A verdict of "escalate" never reaches this function: the caller shows the
 * interrupt instead of sending. The parameter exists so a tier-2 message, which
 * does get answered, carries its flag into the transcript.
 */

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  grounded: boolean;
  /** How the reply was produced — decides how the UI frames it. Assistant turns only. */
  kind?: "grounded" | "general" | "silent";
  followUps: string[];
};

export type AskResult =
  | { ok: true; conversationId: string; user: ChatTurn; assistant: ChatTurn }
  /*
   * `quota` is separate from a plain failure because the caller does something
   * entirely different with it: it holds the question and opens the paywall
   * rather than showing an error. Collapsing the two would mean parsing a
   * message string to decide, which is how the pending question gets lost.
   */
  | { ok: false; quota: true; message: string }
  | { ok: false; quota?: false; message: string };

/** First of the month, matching quota.ts. */
function periodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * How many chats have been used this period, COUNTED FROM THE TRANSCRIPT.
 *
 * The web build read `subscriptions.chats_used_this_month`, incremented by
 * `consumeChat` with the service key. That key cannot exist in this bundle, so
 * the counter cannot be written here at all.
 *
 * Counting the rows instead is not a workaround, it is a better source: the
 * count is derived from messages that actually exist, under RLS, so a client
 * cannot inflate its own allowance by lying about a number. Deleting rows to
 * win chats back is not possible either — `messages` is append-only by policy.
 *
 * WHAT IS STILL MISSING is the enforcement half. This function decides whether
 * to *offer* the send; nothing stops a modified client from inserting past the
 * limit, because the insert is a plain RLS-permitted write. Closing that needs
 * the Edge Function tracked in PLAN.md under Phase 4 — the same one the upload
 * write should move behind.
 */
export async function chatsUsedThisPeriod(): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", `${periodStart()}T00:00:00Z`);

  // Fail OPEN on a read error rather than locking someone out of a paid
  // feature because a count did not come back.
  if (error) return 0;
  return count ?? 0;
}

export type ChatQuota = { used: number; limit: number | null; remaining: number | null };

export async function chatQuota(): Promise<ChatQuota> {
  const entitlement = await getEntitlement();
  if (isUnlimited(entitlement.tier)) return { used: 0, limit: null, remaining: null };

  const used = await chatsUsedThisPeriod();
  return {
    used,
    limit: FREE_CHAT_LIMIT,
    remaining: Math.max(0, FREE_CHAT_LIMIT - used),
  };
}

export async function askBaymax(
  question: string,
  conversationId: string | null,
  safetyStatus: Exclude<SafetyStatus, "escalate">,
): Promise<AskResult> {
  const trimmed = question.trim();
  if (!trimmed) return { ok: false, message: "Type a question first." };
  if (trimmed.length > 1000) {
    return { ok: false, message: "That question is too long. Try shortening it." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Your session expired. Please sign in again." };

  const profile = await activeProfile();
  if (!profile) return { ok: false, message: "Set up a profile before asking." };

  /*
   * The quota check, on the way in — after the profile check and before any
   * work, so a refused chat costs nothing and never reaches the transcript.
   */
  const quota = await chatQuota();
  if (quota.remaining !== null && quota.remaining <= 0) {
    return {
      ok: false,
      quota: true,
      message: "You've used your free chats for this month.",
    };
  }

  /*
   * GROUNDING IS SCOPED TO THE ACTIVE PROFILE, not the account. This is rule 3
   * at its sharpest: pulling the whole family's records into the context would
   * let one member's results shape an answer given under another's name, which
   * is the exact leak the isolation boundary exists to prevent.
   */
  const summaries = await listProfileRecords(profile.id);
  const [records, conditions] = await Promise.all([
    withEntities(summaries),
    profileConditions(profile.id),
  ]);

  let convo = conversationId;
  if (!convo) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        profile_id: profile.id,
        user_id: user.id,
        // The first question makes a serviceable title, trimmed to fit a list.
        title: trimmed.slice(0, 80),
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: "Could not start the conversation." };
    convo = data.id as string;
  }

  const answer = answerQuestion(trimmed, records, conditions);

  /*
   * Both messages are inserted in one call so a transcript can never end up
   * holding a question with no answer — the table is append-only by policy and
   * has no update path to repair a half-write.
   */
  const { data: rows, error } = await supabase
    .from("messages")
    .insert([
      {
        conversation_id: convo,
        user_id: user.id,
        role: "user",
        content: trimmed,
        /*
         * Explicitly empty, not omitted. In a multi-row insert PostgREST builds
         * one column list from the union of the rows and sends NULL for any key
         * a row is missing — so leaving this off here does not fall back to the
         * column default, it violates the NOT NULL constraint.
         */
        citations: [],
        safety_status: safetyStatus,
      },
      {
        conversation_id: convo,
        user_id: user.id,
        role: "assistant",
        content: answer.paragraphs.join("\n\n"),
        citations: answer.citations,
        safety_status: safetyStatus,
      },
    ])
    .select("id, role, content, citations");

  if (error || !rows || rows.length < 2) {
    return { ok: false, message: "Could not save the conversation." };
  }

  const userRow = rows.find((r) => r.role === "user");
  const assistantRow = rows.find((r) => r.role === "assistant");
  if (!userRow || !assistantRow) {
    return { ok: false, message: "Could not save the conversation." };
  }

  return {
    ok: true,
    conversationId: convo,
    user: {
      id: userRow.id as string,
      role: "user",
      content: trimmed,
      citations: [],
      grounded: true,
      followUps: [],
    },
    assistant: {
      id: assistantRow.id as string,
      role: "assistant",
      content: assistantRow.content as string,
      citations: answer.citations,
      grounded: answer.grounded,
      kind: answer.kind,
      followUps: answer.followUps,
    },
  };
}

/**
 * Records an escalated turn without answering it.
 *
 * The question still enters the transcript, flagged. An escalation that leaves
 * no record is not auditable, and "the app showed someone emergency numbers"
 * is precisely the event that has to be reconstructable later.
 */
export async function recordEscalation(
  question: string,
  conversationId: string | null,
): Promise<{ conversationId: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { conversationId };

  const profile = await activeProfile();
  if (!profile) return { conversationId };

  let convo = conversationId;
  if (!convo) {
    const { data } = await supabase
      .from("conversations")
      .insert({ profile_id: profile.id, user_id: user.id, title: question.slice(0, 80) })
      .select("id")
      .single();
    convo = (data?.id as string | undefined) ?? null;
  }
  if (!convo) return { conversationId: null };

  await supabase.from("messages").insert({
    conversation_id: convo,
    user_id: user.id,
    role: "user",
    content: question.trim(),
    citations: [],
    safety_status: "escalate",
  });

  return { conversationId: convo };
}

/** Loads the entities each summary needs before it can ground an answer. */
async function withEntities(
  summaries: readonly Awaited<ReturnType<typeof listProfileRecords>>[number][],
): Promise<GroundingRecord[]> {
  if (summaries.length === 0) return [];

  const { data } = await supabase
    .from("entities")
    .select("id, document_id, kind, name, canonical_name, value, value_text, unit, ref_range, flag, event_date")
    .in(
      "document_id",
      summaries.map((s) => s.id),
    );

  const byDocument = new Map<string, RecordEntity[]>();
  for (const row of data ?? []) {
    const entity: RecordEntity = {
      id: row.id as string,
      kind: row.kind as RecordEntity["kind"],
      name: row.name as string,
      canonicalName: row.canonical_name as string | null,
      value: row.value as number | null,
      valueText: row.value_text as string | null,
      unit: row.unit as string | null,
      refRange: row.ref_range as string | null,
      flag: row.flag as EntityFlag | null,
      eventDate: row.event_date as string | null,
    };
    const key = row.document_id as string;
    byDocument.set(key, [...(byDocument.get(key) ?? []), entity]);
  }

  return summaries.map((summary) => ({
    ...summary,
    entities: byDocument.get(summary.id) ?? [],
  }));
}

/**
 * The reader's own declared conditions, from their Health profile.
 *
 * NEVER anything the engine inferred from a document. It only decides whether a
 * general answer gets a personalised paragraph, and inferring a condition from
 * a lab value and then speaking as though the reader has it would be a
 * diagnosis by the back door.
 */
async function profileConditions(profileId: string): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("conditions")
    .eq("id", profileId)
    .maybeSingle();

  const conditions = data?.conditions;
  return Array.isArray(conditions) ? (conditions as string[]) : [];
}
