import { answerQuestion, type Citation, type GroundingRecord } from "@/lib/ai/mock/answer";
import { assessProduct, findScenario, type ProductAssessment } from "@/lib/ai/mock/scenarios";
import { FREE_CHAT_LIMIT, isUnlimited } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { activeProfile } from "@/lib/profiles/context";
import { listProfileRecords } from "@/lib/records/queries";
import { supabase } from "@/lib/supabase/client";
import type { EntityFlag, RecordEntity } from "@/lib/records/types";
import type { SafetyResult, SafetyStatus } from "@/lib/safety/detect";

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

/** Attachment shown on a user's chat bubble — the demo product scenarios only. */
export type ChatAttachment = { kind: "product"; scenarioId: string; title: string; thumbnail: string };

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  grounded: boolean;
  /** How the reply was produced — decides how the UI frames it. Assistant turns only. */
  kind?: "grounded" | "general" | "silent" | "product";
  followUps: string[];
  attachment?: ChatAttachment;
  assessment?: ProductAssessment;
  /*
   * The gate's verdict for the question this answers. Carried on the turn so a
   * tier-2 caution stays beside its own answer in the transcript instead of
   * following whichever message happens to be last.
   */
  caution?: SafetyResult;
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
 * pre-check in `askBaymax` exists so a refused chat costs no work and never
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

/**
 * Did this write fail because the allowance ran out?
 *
 * The trigger raises `check_violation`, which arrives as an ordinary insert
 * error. Without this the paywall case renders as "Could not save the
 * conversation" — an error the reader cannot act on, for the one situation with
 * an obvious action.
 */
function isQuotaRefusal(error: { message?: string } | null | undefined): boolean {
  return Boolean(error?.message?.includes("free chat allowance exhausted"));
}

const QUOTA_SPENT = "You've used your free chats for this month.";

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
      message: QUOTA_SPENT,
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

  if (isQuotaRefusal(error)) return { ok: false, quota: true, message: QUOTA_SPENT };
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


/**
 * The product-safety demo path.
 *
 * NO SAFETY GATE RUNS HERE, and that is deliberate rather than an omission:
 * the question text is not free input, it is fixed copy attached to a scenario
 * the reader picked from a fixed list. There is no user string to screen.
 *
 * `scenarioId` is still validated against that list before anything is written,
 * because "the client only ever sends one of five values" is an assumption
 * about a client, not a property of a system.
 *
 * Gated by the same quota as a text question: it is Ask Baymax, not a separate
 * feature with its own allowance.
 */
export async function askAboutProduct(
  scenarioId: string,
  conversationId: string | null,
  safetyStatus: Exclude<SafetyStatus, "escalate">,
): Promise<AskResult> {
  const scenario = findScenario(scenarioId);
  if (!scenario) return { ok: false, message: "That item isn't available in this demo." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Your session expired. Please sign in again." };

  const profile = await activeProfile();
  if (!profile) return { ok: false, message: "Set up a profile before asking." };

  const quota = await chatQuota();
  if (quota.remaining !== null && quota.remaining <= 0) {
    return { ok: false, quota: true, message: QUOTA_SPENT };
  }

  const conditions = await profileConditions(profile.id);
  const assessment = assessProduct(scenarioId, conditions);
  if (!assessment) return { ok: false, message: "That item isn't available in this demo." };

  let convo = conversationId;
  if (!convo) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        profile_id: profile.id,
        user_id: user.id,
        title: scenario.sampleQuestion.slice(0, 80),
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: "Could not start the conversation." };
    convo = data.id as string;
  }

  /*
   * The transcript stores the verdict as prose, not the card's structure. A
   * medical transcript has to stay readable years later without the component
   * that rendered it, and a JSON blob of persona keys is not that.
   */
  const summary = [
    `${assessment.title} — ${assessment.verdictNote}`,
    assessment.personalNote ?? "",
    assessment.disclaimer,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data: rows, error } = await supabase
    .from("messages")
    .insert([
      {
        conversation_id: convo,
        user_id: user.id,
        role: "user",
        content: scenario.sampleQuestion,
        citations: [],
        safety_status: safetyStatus,
      },
      {
        conversation_id: convo,
        user_id: user.id,
        role: "assistant",
        content: summary,
        citations: [],
        safety_status: safetyStatus,
      },
    ])
    .select("id, role, content");

  if (isQuotaRefusal(error)) return { ok: false, quota: true, message: QUOTA_SPENT };
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
      content: scenario.sampleQuestion,
      citations: [],
      grounded: true,
      followUps: [],
      attachment: {
        kind: "product",
        scenarioId: scenario.id,
        title: scenario.title,
        thumbnail: scenario.thumbnail,
      },
    },
    assistant: {
      id: assistantRow.id as string,
      role: "assistant",
      content: summary,
      citations: [],
      grounded: false,
      kind: "product",
      followUps: [],
      assessment,
    },
  };
}
