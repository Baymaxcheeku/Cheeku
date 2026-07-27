"use server";

import { answerQuestion, type Citation, type GroundingRecord } from "@/lib/ai/mock/answer";
import { activeProfile } from "@/lib/profiles/context";
import { listProfileRecords } from "@/lib/records/queries";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import type { EntityFlag, RecordEntity } from "@/lib/records/types";
import type { SafetyStatus } from "@/lib/safety/detect";

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
  followUps: string[];
};

export type AskResult =
  | { ok: true; conversationId: string; user: ChatTurn; assistant: ChatTurn }
  | { ok: false; message: string };

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
   * Grounding is scoped to the ACTIVE PROFILE, not the account. This is rule 3
   * at its sharpest: pulling the whole family's records into the context would
   * let one member's results shape an answer given under another's name, which
   * is the exact leak the isolation boundary exists to prevent.
   */
  const summaries = await listProfileRecords(profile.id);
  const records = await withEntities(supabase, summaries);

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

  const answer = answerQuestion(trimmed, records);

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
      followUps: answer.followUps,
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
