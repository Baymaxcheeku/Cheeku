"use server";

import { answerQuestion, type Citation, type GroundingRecord } from "@/lib/ai/mock/answer";
import { assessProduct, findScenario, type ProductAssessment } from "@/lib/ai/mock/scenarios";
import { consumeChat } from "@/lib/billing/quota";
import { activeProfile } from "@/lib/profiles/context";
import { listProfileRecords } from "@/lib/records/queries";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import type { EntityFlag, RecordEntity } from "@/lib/records/types";
import type { SafetyStatus } from "@/lib/safety/detect";

/** Attachment shown on a user's chat bubble — the demo product-photo scenarios only. */
export type ChatAttachment = { kind: "product"; scenarioId: string; title: string; thumbnail: string };

/*
 * The chat's write path.
 *
 * The safety gate does NOT run here. It runs client-side, before this is ever
 * called, because rule 2 requires it to be deterministic and under 200ms — a
 * network round trip cannot promise either. What arrives here is the gate's
 * VERDICT, which is recorded on the row so an escalation is auditable after the
 * fact.
 *
 * A verdict of "escalate" never reaches this function at all: the client shows
 * the interrupt instead of sending. The parameter exists so a tier-2 message,
 * which does get answered, carries its flag into the transcript.
 */

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
};

export type AskResult =
  | { ok: true; conversationId: string; user: ChatTurn; assistant: ChatTurn }
  /*
   * `quota` is separate from a plain failure because the client does something
   * entirely different with it: it holds the question and opens the paywall,
   * rather than showing an error. Collapsing the two would mean parsing a
   * message string to decide, which is how the pending question gets lost.
   */
  | { ok: false; quota: true; message: string }
  | { ok: false; quota?: false; message: string };

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

  const user = await requireUser();
  const supabase = await createServerSupabase();
  const profile = await activeProfile();
  if (!profile) return { ok: false, message: "Set up a profile before asking." };

  /*
   * The quota gate, on the way in. Entitlement is decided here from the
   * database, not from anything the client sent — a limit enforced in the UI is
   * a limit enforced for people who do not open dev tools.
   *
   * It sits after the profile check and before any work, so a refused chat
   * costs nothing and is never written to the transcript.
   */
  if (!(await consumeChat())) {
    return {
      ok: false,
      quota: true,
      message: "You've used your free chats for this month.",
    };
  }

  /*
   * Grounding is scoped to the ACTIVE PROFILE, not the account. This is rule 3
   * at its sharpest: pulling the whole family's records into the context would
   * let one member's results shape an answer given under another's name, which
   * is the exact leak the isolation boundary exists to prevent.
   */
  const summaries = await listProfileRecords(profile.id);
  const [records, conditions] = await Promise.all([
    withEntities(supabase, summaries),
    profileConditions(supabase, profile.id, user.id),
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
 * The product-safety demo path — a photo scenario picked from `ProductPicker`
 * rather than an arbitrary upload (see scenarios.ts for why). Gated by the
 * same quota as a text question: it is Ask Baymax, not a separate feature.
 *
 * `scenarioId` is validated against the fixed, server-side list before
 * anything is written — it never trusts the client to have sent a real one.
 */
export async function askAboutProduct(
  scenarioId: string,
  conversationId: string | null,
  safetyStatus: Exclude<SafetyStatus, "escalate">,
): Promise<AskResult> {
  const scenario = findScenario(scenarioId);
  if (!scenario) return { ok: false, message: "That item isn't available in this demo." };

  const user = await requireUser();
  const supabase = await createServerSupabase();
  const profile = await activeProfile();
  if (!profile) return { ok: false, message: "Set up a profile before asking." };

  if (!(await consumeChat())) {
    return { ok: false, quota: true, message: "You've used your free chats for this month." };
  }

  const conditions = await profileConditions(supabase, profile.id, user.id);
  const assessment = assessProduct(scenarioId, conditions);
  if (!assessment) return { ok: false, message: "That item isn't available in this demo." };

  let convo = conversationId;
  if (!convo) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ profile_id: profile.id, user_id: user.id, title: scenario.title })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: "Could not start the conversation." };
    convo = data.id as string;
  }

  const attachment: ChatAttachment = {
    kind: "product",
    scenarioId: scenario.id,
    title: scenario.title,
    thumbnail: scenario.thumbnail,
  };

  // A flat-text mirror of the card, so history, export and the messages
  // table's `content` column (not null) all carry something readable even
  // where the structured `product_assessment` isn't rendered.
  const summary = [
    `${scenario.title}: ${assessment.verdict === "safe" ? "Safe" : assessment.verdict === "caution" ? "Use with care" : "Avoid"}.`,
    assessment.verdictNote,
    assessment.disclaimer,
  ].join(" ");

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
        attachment,
      },
      {
        conversation_id: convo,
        user_id: user.id,
        role: "assistant",
        content: summary,
        citations: [],
        safety_status: safetyStatus,
        product_assessment: assessment,
      },
    ])
    .select("id, role, content");

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
      attachment,
    },
    assistant: {
      id: assistantRow.id as string,
      role: "assistant",
      content: summary,
      citations: [],
      grounded: false,
      kind: "product",
      followUps: ["Ask something else"],
      assessment,
    },
  };
}

/**
 * Records an escalation without answering it.
 *
 * When the gate fires, the question is still written to the transcript — with
 * `safety_status = 'escalated'` and no assistant reply. A safety audit that
 * cannot see what was said is not an audit, and the messages table is
 * deliberately append-only for exactly this reason.
 */
export async function recordEscalation(
  question: string,
  conversationId: string | null,
): Promise<{ ok: boolean; conversationId?: string }> {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const profile = await activeProfile();
  if (!profile) return { ok: false };

  let convo = conversationId;
  if (!convo) {
    const { data } = await supabase
      .from("conversations")
      .insert({ profile_id: profile.id, user_id: user.id, title: "Safety escalation" })
      .select("id")
      .single();
    if (!data) return { ok: false };
    convo = data.id as string;
  }

  await supabase.from("messages").insert({
    conversation_id: convo,
    user_id: user.id,
    role: "user",
    content: question.trim().slice(0, 1000),
    safety_status: "escalated",
  });

  return { ok: true, conversationId: convo };
}

/**
 * The active profile's own declared conditions (Health profile), scoped to
 * both the profile id and the caller — never another family member's, per
 * rule 3, and never a row RLS wouldn't already have returned.
 */
async function profileConditions(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  profileId: string,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("conditions")
    .eq("id", profileId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.conditions as string[] | null) ?? [];
}

/** Attaches each document's entities, which is what the engine reads. */
async function withEntities(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  summaries: Awaited<ReturnType<typeof listProfileRecords>>,
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
    const list = byDocument.get(key);
    if (list) list.push(entity);
    else byDocument.set(key, [entity]);
  }

  return summaries.map((s) => ({ ...s, entities: byDocument.get(s.id) ?? [] }));
}
