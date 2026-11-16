import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, expect, it, vi } from "vitest";

/*
 * WHO ANSWERED? Runs the app's real chat layer (planTurn + chatModel(), the
 * same code store.ts uses) for a handful of questions, signed in as a real
 * account against the live project, and reports for each one whether the
 * rules, Gemini (through cheeku-chat) or the hard-coded stand-in answered.
 *
 * The person is a made-up adult with one lab report, so no real member's
 * records are sent anywhere. Each model turn spends one chat from the probe
 * account's daily allowance (metered by claim_model_call). Nothing is saved
 * to messages.
 */

const calls: { status: number; ms: number }[] = [];
let client: SupabaseClient;

vi.mock("@/lib/supabase/client", () => {
  const tracked: typeof fetch = async (input, init) => {
    const t = Date.now();
    const res = await fetch(input, init);
    if (String(input instanceof Request ? input.url : input).includes("/functions/v1/cheeku-chat")) calls.push({ status: res.status, ms: Date.now() - t });
    return res;
  };
  client = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: tracked },
  });
  return { supabase: client };
});

const { planTurn } = await import("@/lib/memory/pipeline");
const { chatModel } = await import("@/lib/memory/models");
const { BOOKING_REPLY } = await import("@/lib/memory/thread");
import type { MemoryBundle } from "@/lib/memory/context";

const today = new Date().toISOString().slice(0, 10);

const riya: MemoryBundle = {
  profile: { id: "probe", name: "Riya", dob: "1992-03-14", sex: "female", blood_group: "B+", conditions: [], allergies: ["penicillin"], medications: [] },
  relations: [],
  pregnancies: [],
  documents: [{ id: "probe-lab", doc_type: "lab_report", event_date: "2026-06-02", title: "Blood test, Thyrocare", details: { sections: [] } }],
  entities: [
    { kind: "lab_value", name: "Fasting Glucose", canonical_name: "glucose_fasting", value: 104, unit: "mg/dL", ref_range: "70-99", flag: "high", event_date: "2026-06-02", document_id: "probe-lab" },
    { kind: "lab_value", name: "HbA1c", canonical_name: "hba1c", value: 5.9, unit: "%", ref_range: "<5.7", flag: "high", event_date: "2026-06-02", document_id: "probe-lab" },
  ],
  facts: [],
  loops: [],
  stats: { records: 1, messages: 0, conversations: 0, first_message_at: null },
};

const QUESTIONS = process.env.CHAT_PROBE_Q ? process.env.CHAT_PROBE_Q.split("|").map((q) => q.trim()).filter(Boolean) : [
  "hi cheeku",
  "my fasting sugar was 128 this morning, is that bad?",
  "how am I doing overall?",
  "my husband has crushing chest pain",
];

beforeAll(async () => {
  const email = process.env.CHAT_PROBE_EMAIL;
  const password = process.env.CHAT_PROBE_PASSWORD;
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL) throw new Error("No EXPO_PUBLIC_SUPABASE_URL in .env.local");
  if (!email || !password) throw new Error("Set CHAT_PROBE_EMAIL and CHAT_PROBE_PASSWORD");
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed: ${error.message}`);
});

it("reports who answered each question", async () => {
  const rows: string[] = [];
  for (const q of QUESTIONS) {
    calls.length = 0;
    const t = Date.now();
    let plan: Awaited<ReturnType<typeof planTurn>>;
    try {
      plan = await planTurn({ text: q, bundle: riya, today, history: [], usage: [], model: chatModel(), newId: randomUUID });
    } catch (e) {
      // ModelBusy: the meter refused for pace (6 a minute). The app says "give it a minute".
      rows.push(`\nQ: ${q}\n   -> REFUSED by the meter (${(e as Error).message}); wait a minute and run again`);
      continue;
    }
    const ms = Date.now() - t;
    const fn = calls[0];
    const id = plan.modelId ?? "";
    const who =
      plan.status !== "answered" ? `RULES (safety: ${plan.status})`
      : id === BOOKING_REPLY ? "RULES (booking)"
      : id.startsWith("gemini:") ? `GEMINI (${id.slice(7)})`
      : id === "cheeku-mock-1" ? `STAND-IN, hard-coded${fn ? ` (cheeku-chat answered HTTP ${fn.status})` : " (function not called)"}`
      : !fn ? "RULES (answered without a model)"
      : `OTHER (${id})`;
    const full = process.env.CHAT_PROBE_FULL === "1";
    const first = full ? (plan.reply?.paragraphs ?? []).join("\n   ") || "(safety script, no model)" : plan.reply?.paragraphs?.[0] ?? "(safety script, no model)";
    const shown = full ? first : `${first.slice(0, 150)}${first.length > 150 ? "..." : ""}`;
    rows.push(`\nQ: ${q}\n   -> ${who}  [${ms} ms${fn ? `, function ${fn.status} in ${fn.ms} ms` : ""}]\n   "${shown}"${full && plan.reply?.followUps?.length ? `\n   chips: ${plan.reply.followUps.join(" / ")}` : ""}`);
  }
  const report = `\n===== WHO ANSWERED (${today}) =====${rows.join("\n")}\n`;
  console.log(report);
  if (process.env.CHAT_PROBE_OUT) writeFileSync(process.env.CHAT_PROBE_OUT, report);
  expect(rows).toHaveLength(QUESTIONS.length);
});
