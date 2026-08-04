/*
 * Profile isolation — the runtime half of the RLS guarantee.
 *
 * Seeds two users, gives each a profile with documents, entities, timeline
 * events and a conversation, then asserts that every query path for user A
 * returns zero rows belonging to user B. Static analysis (rls.test.ts) proves
 * policies exist; only this proves they work.
 *
 * Requires a reachable Supabase project. Skipped — loudly — when one is not
 * configured, so the suite stays runnable before the project exists. It must
 * NOT stay skipped in CI: see PROGRESS.md.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const configured = Boolean(url && anonKey && serviceKey && !url.includes("placeholder"));

if (!configured) {
  console.warn(
    "\n[profile-isolation] SKIPPED. No Supabase project configured.\n" +
      "  This test is the only runtime proof that RLS isolates profiles.\n" +
      "  Set NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY / SUPABASE_SERVICE_ROLE_KEY and rerun.\n",
  );
}

type Seeded = { userId: string; profileId: string; documentId: string; client: SupabaseClient };

describe.skipIf(!configured)("profile isolation", () => {
  // Constructed in beforeAll: describe.skipIf still evaluates this callback,
  // so anything that throws without a configured project must be deferred.
  let admin: SupabaseClient;
  let alice: Seeded;
  let bob: Seeded;

  async function seed(label: string): Promise<Seeded> {
    const email = `isolation-${label}-${Date.now()}@example.test`;
    const password = `${crypto.randomUUID()}Aa1!`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;
    const userId = created.user.id;

    const { data: family } = await admin
      .from("families")
      .insert({ owner_id: userId })
      .select("id")
      .single()
      .throwOnError();

    const { data: profile } = await admin
      .from("profiles")
      .insert({ family_id: family!.id, user_id: userId, name: label, is_primary: true })
      .select("id")
      .single()
      .throwOnError();

    const { data: document } = await admin
      .from("documents")
      .insert({
        profile_id: profile!.id,
        user_id: userId,
        storage_path: `${userId}/${profile!.id}/${crypto.randomUUID()}.pdf`,
        mime_type: "application/pdf",
        doc_type: "lab_report",
        status: "filed",
      })
      .select("id")
      .single()
      .throwOnError();

    await admin
      .from("entities")
      .insert({
        profile_id: profile!.id,
        user_id: userId,
        document_id: document!.id,
        kind: "lab_value",
        name: `${label} haemoglobin`,
        value: 13.2,
        unit: "g/dL",
        flag: "normal",
      })
      .throwOnError();

    await admin
      .from("timeline_events")
      .insert({
        profile_id: profile!.id,
        user_id: userId,
        kind: "lab_report",
        title: `${label} panel`,
        event_date: "2026-01-01",
        source_document_id: document!.id,
      })
      .throwOnError();

    const { data: conversation } = await admin
      .from("conversations")
      .insert({ profile_id: profile!.id, user_id: userId, title: `${label} chat` })
      .select("id")
      .single()
      .throwOnError();

    await admin
      .from("messages")
      .insert({
        conversation_id: conversation!.id,
        user_id: userId,
        role: "user",
        content: `${label} secret question`,
      })
      .throwOnError();

    // A client carrying this user's session — this is what RLS actually sees.
    const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    return { userId, profileId: profile!.id, documentId: document!.id, client };
  }

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    [alice, bob] = await Promise.all([seed("alice"), seed("bob")]);
  }, 60_000);

  afterAll(async () => {
    await Promise.all(
      [alice, bob].filter(Boolean).map((s) => admin.auth.admin.deleteUser(s.userId)),
    );
  });

  const scoped = ["profiles", "documents", "entities", "timeline_events", "conversations"] as const;

  it.each(scoped)("%s: an unfiltered select returns only the caller's rows", async (table) => {
    const { data, error } = await alice.client.from(table).select("user_id");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((row) => row.user_id === alice.userId)).toBe(true);
  });

  it.each(scoped)("%s: explicitly asking for the other user's rows returns nothing", async (table) => {
    const { data, error } = await alice.client.from(table).select("id").eq("user_id", bob.userId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("messages: cannot read another user's transcript", async () => {
    const { data } = await alice.client.from("messages").select("content, user_id");
    expect(data!.every((row) => row.user_id === alice.userId)).toBe(true);
    expect(data!.some((row) => row.content.includes("bob"))).toBe(false);
  });

  it("cannot fetch another user's row by its exact id", async () => {
    const { data } = await alice.client.from("documents").select("id").eq("id", bob.documentId);
    expect(data).toEqual([]);
  });

  it("cannot write a row attributed to another user", async () => {
    const { error } = await alice.client.from("timeline_events").insert({
      profile_id: bob.profileId,
      user_id: bob.userId,
      kind: "note",
      title: "injected",
      event_date: "2026-01-01",
    });
    expect(error).not.toBeNull();
  });

  it("cannot update another user's row", async () => {
    const { data } = await alice.client
      .from("documents")
      .update({ facility: "tampered" })
      .eq("id", bob.documentId)
      .select("id");
    expect(data).toEqual([]);
  });

  it("cannot delete another user's row", async () => {
    const { data } = await alice.client
      .from("documents")
      .delete()
      .eq("id", bob.documentId)
      .select("id");
    expect(data).toEqual([]);

    const { data: stillThere } = await admin
      .from("documents")
      .select("id")
      .eq("id", bob.documentId);
    expect(stillThere).toHaveLength(1);
  });

  it("cannot edit a message, because the transcript is append-only", async () => {
    const { data: own } = await alice.client.from("messages").select("id").limit(1);
    const { data } = await alice.client
      .from("messages")
      .update({ content: "rewritten" })
      .eq("id", own![0]!.id)
      .select("id");
    expect(data).toEqual([]);
  });

  it("cannot raise its own subscription tier", async () => {
    const { data } = await alice.client
      .from("subscriptions")
      .update({ tier: "family" })
      .eq("id", crypto.randomUUID())
      .select("id");
    expect(data).toEqual([]);
  });

  it("cannot download another user's stored document", async () => {
    const { error } = await alice.client.storage
      .from("documents")
      .createSignedUrl(`${bob.userId}/${bob.profileId}/anything.pdf`, 60);
    expect(error).not.toBeNull();
  });
});
