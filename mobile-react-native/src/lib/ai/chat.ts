import type { Citation } from "@/lib/ai/mock/answer";
import { assessProduct, findScenario, type ProductAssessment } from "@/lib/ai/mock/scenarios";
import { FREE_CHAT_LIMIT, isUnlimited } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { activeProfile } from "@/lib/profiles/context";
import { supabase } from "@/lib/supabase/client";
import type { SafetyResult, SafetyStatus } from "@/lib/safety/detect";

/*
 * The chat quota, and the product-check path.
 *
 * Ordinary messages no longer go through here. They run through the memory
 * layer (lib/memory/pipeline and lib/memory/store), which reads every message
 * against the member's history and stores the structured answer. What stays
 * is the quota display and the demo product scenarios.
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

const QUOTA_SPENT = "You've used today's free chats. They reset tomorrow.";

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
 * Gated by the same quota as a text question: it is Ask Cheeku, not a separate
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
        // Kept on the rows (migration 0009) so the card still draws when the
        // thread is loaded again, not only in the moment it was asked.
        attachment: { kind: "product", scenarioId: scenario.id, title: scenario.title, thumbnail: scenario.thumbnail },
        product_assessment: null,
      },
      {
        conversation_id: convo,
        user_id: user.id,
        role: "assistant",
        content: summary,
        citations: [],
        safety_status: safetyStatus,
        attachment: null,
        product_assessment: assessment,
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
