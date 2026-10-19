import { useInfiniteQuery, useQuery, type QueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";

import { CONSENT_PAUSED, reportIfConsentRefused } from "@/lib/legal/consent";
import { chatQuota } from "@/lib/ai/chat";
import { supabase } from "@/lib/supabase/client";

import { todayIso } from "./clock";
import type { MemoryBundle } from "./context";
import { mockModel } from "./mock-model";
import { chatModel, ModelBusy } from "./models";
import { planTurn, type TurnPlan } from "./pipeline";
import { BOOKING_REPLY, eventMemory, factUsage, readThreadRow, replyText, SITTING_GAP_MS, sittingFor, toTurnMemory, type BookedEvent, type ThreadMessage } from "./thread";
import type { Fact, Tier } from "./types";

/*
 * THE MEMORY LAYER'S READS AND WRITES.
 *
 * Reads: `memory_bundle` (one member's whole memory) and `chat_thread` (their
 * continuous thread, in pages). Both are migration 0030; before it runs, each
 * falls back to plain RLS-scoped reads so the chat keeps working, just with
 * nothing remembered from the chat itself.
 *
 * Writes, per turn, in this order: the two messages in one insert (so a
 * question is never saved without its answer), then the readings said in it,
 * then any corrections. Facts after messages, because a fact points at the
 * message it came from.
 *
 * QUOTA. Emergencies and hard-stops are saved as `escalated`, which the quota
 * trigger never charges and never refuses. Someone describing a three-week-old
 * with a fever must not meet a paywall.
 */

export const memoryKey = (profileId: string | undefined) => ["memory", profileId ?? "none"] as const;
export const threadKey = (profileId: string | undefined) => ["thread", profileId ?? "none"] as const;

const missing = (message: string | undefined) => Boolean(message && /could not find the function|function .* does not exist|column .* does not exist|could not find the .* column/i.test(message));

export async function fetchMemory(profileId: string): Promise<MemoryBundle | null> {
  const { data, error } = await supabase.rpc("memory_bundle", { p_profile: profileId });
  if (!error) return (data as MemoryBundle | null) ?? null;
  if (!missing(error.message)) throw new Error(`memory: ${error.message}`);

  const [profile, documents, entities] = await Promise.all([
    supabase.from("profiles").select("id, name, relationship, is_primary, dob, sex, blood_group, conditions, allergies, medications").eq("id", profileId).maybeSingle(),
    supabase.from("documents").select("id, doc_type, status, event_date, facility, doctor, created_at, extraction").eq("profile_id", profileId),
    supabase.from("entities").select("id, document_id, kind, name, canonical_name, value, value_text, unit, ref_range, flag, event_date").eq("profile_id", profileId),
  ]);
  if (!profile.data) return null;
  return {
    profile: profile.data as Record<string, unknown>,
    relations: [],
    pregnancies: [],
    documents: (documents.data ?? []) as Record<string, unknown>[],
    entities: (entities.data ?? []) as Record<string, unknown>[],
    facts: [],
    loops: [],
    stats: null,
  };
}

export function useMemory(profileId: string | undefined) {
  return useQuery({ queryKey: memoryKey(profileId), queryFn: () => fetchMemory(profileId as string), enabled: Boolean(profileId), staleTime: 30_000 });
}

const PAGE = 40;

export async function fetchThread(profileId: string, before: string | null): Promise<ThreadMessage[]> {
  const { data, error } = await supabase.rpc("chat_thread", { p_profile: profileId, p_before: before, p_limit: PAGE });
  if (!error) return ((data ?? []) as Record<string, unknown>[]).map(readThreadRow);
  if (!missing(error.message)) throw new Error(`thread: ${error.message}`);

  // Before 0030: the member's sittings, then their messages.
  const convos = await supabase.from("conversations").select("id").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(50);
  const ids = (convos.data ?? []).map((c) => c.id as string);
  if (!ids.length) return [];
  let q = supabase.from("messages").select("id, conversation_id, role, content, citations, safety_status, attachment, product_assessment, created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(PAGE);
  if (before) q = q.lt("created_at", before);
  const rows = await q;
  return ((rows.data ?? []) as Record<string, unknown>[]).map(readThreadRow);
}

/** Pages of the thread, newest page first; each page is newest-first too. */
export function useThread(profileId: string | undefined) {
  return useInfiniteQuery({
    queryKey: threadKey(profileId),
    queryFn: ({ pageParam }) => fetchThread(profileId as string, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < PAGE ? undefined : (last[last.length - 1]?.createdAt ?? undefined)),
    enabled: Boolean(profileId),
    staleTime: 15_000,
  });
}

export type SendResult =
  | { ok: true; plan: TurnPlan; user: ThreadMessage; assistant: ThreadMessage | null }
  | { ok: false; quota: true; message: string }
  | { ok: false; quota?: false; message: string };

const QUOTA_SPENT = "You've used today's free chats. They reset tomorrow.";
const BUSY = "That's a lot of messages in a short time. Give it a minute, then send it again.";

export async function sendTurn(args: {
  text: string;
  profileId: string;
  thread: readonly ThreadMessage[];
  bundle: MemoryBundle;
  /** A record the question was asked from ("Ask about this report"). */
  about?: { id: string; title: string; date: string | null } | null;
}): Promise<SendResult> {
  const text = args.text.trim();
  if (!text) return { ok: false, message: "Type something first." };
  if (text.length > 1000) return { ok: false, message: "That's a lot for one message. Try splitting it in two." };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) return { ok: false, message: "Your session expired. Please sign in again." };

  // The record it was asked from rides along for the model and the matcher;
  // the saved question stays in their own words.
  const about = args.about;

  /*
   * The allowance is read BEFORE planning. With it spent, the turn is still
   * planned (that is where an emergency is recognised, and an emergency is
   * never refused) but on the on-device stand-in, so a refused question costs
   * no model call. The server meter refuses it as well; this just avoids asking.
   */
  const quota = await chatQuota();
  const spent = quota.remaining !== null && quota.remaining <= 0;
  let plan: TurnPlan;
  try {
    plan = await planTurn({
      text: about ? `About ${about.title}${about.date ? ` (${about.date})` : ""}: ${text}` : text,
      bundle: args.bundle,
      today: todayIso(),
      history: args.thread.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      usage: factUsage(args.thread),
      model: spent ? mockModel : chatModel(),
      newId: randomUUID,
    });
  } catch (e) {
    if (e instanceof ModelBusy) return { ok: false, message: BUSY };
    throw e;
  }
  const emergency = plan.status !== "answered";

  if (!emergency && spent) return { ok: false, quota: true, message: QUOTA_SPENT };

  let conversationId = sittingFor(args.thread);
  if (!conversationId) {
    const { data, error } = await supabase.from("conversations").insert({ profile_id: args.profileId, user_id: userId, title: text.slice(0, 80) }).select("id").single();
    if (error || !data) return { ok: false, message: "Couldn't save that. Check your connection and try again." };
    conversationId = data.id as string;
  }

  const safety = emergency ? "escalated" : plan.gate.status === "tier2" ? "tier2" : "clear";
  const now = new Date().toISOString();
  const userRow = { id: randomUUID(), conversation_id: conversationId, user_id: userId, role: "user", content: text, citations: [], safety_status: safety };
  const memory = toTurnMemory(plan);
  const assistantRow =
    plan.status === "escalate"
      ? null
      : {
          id: randomUUID(),
          conversation_id: conversationId,
          user_id: userId,
          role: "assistant",
          content: replyText(plan),
          citations: [
            ...(about ? [{ documentId: about.id, label: about.title }] : []),
            ...(plan.reply?.citations ?? []).filter((c) => c.documentId !== about?.id),
          ],
          safety_status: safety,
          tier: plan.decision.tier,
          memory,
          model_id: plan.modelId,
        };

  /*
   * Every row carries the same keys: PostgREST builds one column list for a
   * multi-row insert and sends NULL for a key a row is missing.
   */
  const withMemory = [{ ...userRow, tier: null, memory: null, model_id: null }, ...(assistantRow ? [assistantRow] : [])];
  let { error } = await supabase.from("messages").insert(withMemory);
  if (error && missing(error.message)) {
    // Before 0030 the tier and memory columns do not exist yet: save the prose.
    const plain = withMemory.map(({ tier: _t, memory: _m, model_id: _id, ...rest }) => rest);
    ({ error } = await supabase.from("messages").insert(plain));
  }
  if (error?.message?.includes("free chat allowance exhausted")) return { ok: false, quota: true, message: QUOTA_SPENT };
  if (reportIfConsentRefused(error)) return { ok: false, message: CONSENT_PAUSED };
  if (error) return { ok: false, message: "Couldn't save that. Check your connection and try again." };

  // Readings said in the message, then corrections. Best effort: the answer is
  // already saved, and a missing table (before 0030) must not undo it.
  if (plan.facts.length) {
    await supabase.from("memory_facts").insert(
      plan.facts.map((f) => ({
        id: f.id,
        user_id: userId,
        profile_id: args.profileId,
        key: f.key,
        label: f.label,
        value: f.value,
        value_text: f.valueText,
        unit: f.unit,
        observed_on: f.observedOn,
        source: f.source === "device" ? "device" : "chat",
        message_id: userRow.id,
      })),
    );
  }
  for (const r of plan.revisions) {
    const replacement = plan.facts.find((f) => f.key === r.key);
    if (replacement) await supabase.from("memory_facts").update({ superseded_by: replacement.id, superseded_at: now }).eq("id", r.supersedes);
  }

  const asMessage = (row: typeof userRow | NonNullable<typeof assistantRow>): ThreadMessage =>
    readThreadRow({ ...row, created_at: now, memory: "memory" in row ? row.memory : null, tier: "tier" in row ? row.tier : null });
  return { ok: true, plan, user: asMessage(userRow), assistant: assistantRow ? asMessage(assistantRow) : null };
}

/**
 * Files a booking in the person's own thread, wherever it was made: the
 * chat's card, the marketplace, the doctor flow. It lands as one assistant
 * entry with a "Booked" card, in the open sitting or a new one, so the memory
 * knows a result is coming or a doctor has the note. Assistant rows are never
 * charged against the free allowance (0022 counts only the person's own).
 * Best effort: the booking itself already succeeded.
 */
export async function recordBooking(profileId: string, event: BookedEvent, text: string): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) return false;

    const recent = await supabase.from("conversations").select("id, created_at, last_message_at").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const last = recent.data as { id: string; created_at: string; last_message_at?: string | null } | null;
    let conversationId = last && Date.now() - Date.parse(last.last_message_at ?? last.created_at) < SITTING_GAP_MS ? last.id : null;
    if (!conversationId) {
      const { data, error } = await supabase.from("conversations").insert({ profile_id: profileId, user_id: userId, title: event.title.slice(0, 80) }).select("id").single();
      if (error || !data) return false;
      conversationId = data.id as string;
    }
    const row = { conversation_id: conversationId, user_id: userId, role: "assistant", content: text, citations: [], safety_status: "clear" };
    let { error } = await supabase.from("messages").insert({ ...row, tier: null, memory: eventMemory(event), model_id: BOOKING_REPLY });
    if (error && missing(error.message)) ({ error } = await supabase.from("messages").insert(row));
    return !error;
  } catch {
    return false;
  }
}

export function refreshMemory(qc: QueryClient, profileId: string) {
  void qc.invalidateQueries({ queryKey: memoryKey(profileId) });
  void qc.invalidateQueries({ queryKey: ["health-file", profileId] });
}

// ------------------------------------------------------------------ loops --

export async function setLoopStatus(
  profileId: string,
  loop: { key: string; type: string; title: string; detail: string | null; openedOn: string; dueBy: string | null; sourceDocumentId: string | null },
  status: "open" | "closed" | "dismissed",
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;
  const { error } = await supabase.from("open_loops").upsert(
    {
      user_id: session.user.id,
      profile_id: profileId,
      key: loop.key,
      type: loop.type,
      title: loop.title.slice(0, 120),
      detail: loop.detail?.slice(0, 240) ?? null,
      opened_on: loop.openedOn,
      due_by: loop.dueBy,
      status,
      source_document_id: loop.sourceDocumentId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,key" },
  );
  return !error;
}

export async function addReminder(profileId: string, title: string, dueBy: string | null): Promise<boolean> {
  return setLoopStatus(profileId, { key: `reminder:${randomUUID()}`, type: "reminder", title, detail: null, openedOn: todayIso(), dueBy, sourceDocumentId: null }, "open");
}

// ------------------------------------------------------------------ facts --

/** Corrects a remembered reading by hand: the old one is kept, superseded. */
/**
 * Replaces a reading with a corrected one. `id` is the new fact's id: passing
 * the same one again (a Retry after a failed save) upserts rather than adding
 * a second copy.
 */
export async function correctFact(profileId: string, old: Fact, value: number, id: string = randomUUID()): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;
  const ins = await supabase.from("memory_facts").upsert({
    id,
    user_id: session.user.id,
    profile_id: profileId,
    key: old.key,
    label: old.label,
    value,
    value_text: null,
    unit: old.unit,
    observed_on: old.observedOn,
    source: "chat",
  });
  if (ins.error) return false;
  const up = await supabase.from("memory_facts").update({ superseded_by: id, superseded_at: new Date().toISOString() }).eq("id", old.id);
  return !up.error;
}

export async function forgetFact(id: string): Promise<boolean> {
  const { error } = await supabase.from("memory_facts").delete().eq("id", id);
  return !error;
}

// ------------------------------------------------------------- pregnancy --

export type PregnancyInput = { lmp: string | null; edd: string | null; scanDate: string | null; scanWeeks: number | null; scanDays: number | null; scanLabel: string | null; babyName: string | null };

export async function savePregnancy(profileId: string, input: PregnancyInput, existingId: string | null, existingDatings: unknown[] = []): Promise<{ ok: true } | { ok: false; message: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, message: "Your session expired. Please sign in again." };
  const datings = [...existingDatings];
  if (input.scanDate && input.scanWeeks !== null) {
    datings.push({ date: input.scanDate, ga_days: input.scanWeeks * 7 + (input.scanDays ?? 0), source: "scan", label: input.scanLabel || "Scan" });
  }
  if (!input.lmp && !input.edd && !datings.length) return { ok: false, message: "Add the first day of the last period, the due date, or a scan's dating." };
  const row = { user_id: session.user.id, profile_id: profileId, lmp: input.lmp, edd: input.edd, datings, baby_name: input.babyName, updated_at: new Date().toISOString() };
  const { error } = existingId ? await supabase.from("pregnancies").update(row).eq("id", existingId) : await supabase.from("pregnancies").insert(row);
  if (error) return { ok: false, message: missing(error.message) ? "Pregnancy tracking needs the latest database update (migration 0030)." : "Couldn't save that. Try again." };
  return { ok: true };
}

export async function promotePregnancy(
  pregnancyId: string,
  baby: { name: string; dob: string; sex: string | null; deliveryMode: string | null; weightKg: number | null; gaDays: number | null },
): Promise<{ ok: true; childId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("promote_pregnancy", {
    p_pregnancy: pregnancyId,
    p_name: baby.name,
    p_dob: baby.dob,
    p_sex: baby.sex,
    p_delivery_mode: baby.deliveryMode,
    p_birth_weight_kg: baby.weightKg,
    p_ga_at_birth_days: baby.gaDays,
  });
  if (error) {
    if (/plan covers/.test(error.message)) return { ok: false, message: "Your plan is full. Upgrade to the Family plan, or free a seat, to add the baby." };
    if (/future|name|closed/.test(error.message)) return { ok: false, message: error.message.charAt(0).toUpperCase() + error.message.slice(1) + "." };
    return { ok: false, message: "Couldn't add the baby. Try again." };
  }
  return { ok: true, childId: String(data) };
}

export async function endPregnancy(id: string): Promise<boolean> {
  const { error } = await supabase.from("pregnancies").update({ status: "ended", updated_at: new Date().toISOString() }).eq("id", id);
  return !error;
}

// --------------------------------------------------------------- sittings --

export type Sitting = { id: string; title: string; startedAt: string; lastAt: string; messages: number; tier: Tier | null };

const RANK: Record<string, number> = { reassure: 0, monitor: 1, contact_today: 2, go_now: 3 };

/** Every sitting for a member, newest first, with its highest tier. */
export async function listSittings(profileId: string): Promise<Sitting[]> {
  type Row = { id: string; title: string | null; created_at: string; last_message_at?: string | null; messages: { role: string; tier?: string | null; safety_status?: string }[] };
  // Typed as plain strings so both column lists give the same row type.
  const full: string = "id, title, created_at, last_message_at, messages(role, tier, safety_status)";
  const before0030: string = "id, title, created_at, messages(role, safety_status)";
  const read = (cols: string) => supabase.from("conversations").select(cols).eq("profile_id", profileId).order("created_at", { ascending: false }).limit(200);
  let res = await read(full);
  if (res.error && missing(res.error.message)) res = await read(before0030);
  if (res.error) throw new Error(`sittings: ${res.error.message}`);
  return ((res.data ?? []) as unknown as Row[])
    .filter((c) => c.messages.length > 0)
    .map((c) => {
      let tier: Tier | null = null;
      for (const m of c.messages) {
        const t = (m.safety_status === "escalated" ? "go_now" : m.tier) ?? null;
        if (t && t in RANK && (tier === null || (RANK[t] ?? 0) > (RANK[tier] ?? 0))) tier = t as Tier;
      }
      return { id: c.id, title: c.title ?? "Conversation", startedAt: c.created_at, lastAt: c.last_message_at ?? c.created_at, messages: c.messages.length, tier };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export function useSittings(profileId: string | undefined) {
  return useQuery({ queryKey: ["thread", profileId ?? "none", "sittings"], queryFn: () => listSittings(profileId as string), enabled: Boolean(profileId) });
}

/** One sitting's messages, oldest first. */
export async function fetchSitting(conversationId: string): Promise<ThreadMessage[]> {
  const full: string = "id, conversation_id, role, content, citations, safety_status, tier, memory, attachment, product_assessment, created_at";
  const before0030: string = "id, conversation_id, role, content, citations, safety_status, attachment, product_assessment, created_at";
  const read = (cols: string) => supabase.from("messages").select(cols).eq("conversation_id", conversationId).order("created_at", { ascending: true });
  let res = await read(full);
  if (res.error && missing(res.error.message)) res = await read(before0030);
  if (res.error) throw new Error(`sitting: ${res.error.message}`);
  return ((res.data ?? []) as unknown as Record<string, unknown>[]).map(readThreadRow);
}
