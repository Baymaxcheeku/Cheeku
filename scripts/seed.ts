/*
 * Loads the demo family into Supabase.
 *
 *   pnpm seed        — create the demo user and insert fixtures (idempotent)
 *   pnpm seed:reset  — delete the demo user, cascading everything, then reseed
 *
 * Uses the service-role key, which bypasses RLS. That is correct here and
 * nowhere else: this is a local CLI, never bundled, never imported by the app.
 * It refuses to run against a project that does not look like a dev one unless
 * SEED_ALLOW_REMOTE=1 is set, because "I seeded prod" is a one-way mistake.
 */
import { createClient } from "@supabase/supabase-js";

import { SEED_PROFILES } from "./fixtures/family";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? "demo@baymax.test";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "baymax-demo-2026!";

const reset = process.argv.includes("--reset");

function fail(message: string): never {
  console.error(`\n  seed: ${message}\n`);
  process.exit(1);
}

if (!url || !serviceKey) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.\n" +
      "  No Supabase project is configured yet — see PROGRESS.md.",
  );
}

const looksLocal = /localhost|127\.0\.0\.1|\.local/.test(url);
if (!looksLocal && process.env.SEED_ALLOW_REMOTE !== "1") {
  fail(
    `refusing to seed a non-local project (${url}).\n` +
      "  Set SEED_ALLOW_REMOTE=1 if you really mean it.",
  );
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function findDemoUser() {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email === DEMO_EMAIL) ?? null;
}

async function main() {
  const existing = await findDemoUser();

  if (existing && reset) {
    console.log(`  removing demo user ${DEMO_EMAIL} (cascades to all rows)`);
    const { error } = await db.auth.admin.deleteUser(existing.id);
    if (error) throw error;
  } else if (existing) {
    fail(`demo user ${DEMO_EMAIL} already exists. Run \`pnpm seed:reset\` to rebuild it.`);
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (createError) throw createError;
  const userId = created.user.id;

  const { data: family, error: familyError } = await db
    .from("families")
    .insert({ owner_id: userId, plan: "free" })
    .select("id")
    .single();
  if (familyError) throw familyError;

  await db
    .from("subscriptions")
    .insert({ family_id: family.id, tier: "free" })
    .throwOnError();

  await db
    .from("consent_log")
    .insert({ user_id: userId, consent_type: "dpdp_processing", version: "1.0.0", granted: true })
    .throwOnError();

  let documentCount = 0;
  let entityCount = 0;

  for (const profile of SEED_PROFILES) {
    await db
      .from("profiles")
      .insert({
        id: profile.id,
        family_id: family.id,
        user_id: userId,
        name: profile.name,
        dob: profile.dob,
        sex: profile.sex,
        relationship: profile.relationship,
        avatar_ring: profile.avatarRing,
        is_primary: profile.isPrimary,
        conditions: profile.conditions,
        medications: profile.medications,
      })
      .throwOnError();

    for (const doc of profile.documents) {
      await db
        .from("documents")
        .insert({
          id: doc.id,
          profile_id: profile.id,
          user_id: userId,
          // No object is uploaded: fixtures describe records, not files. The
          // path is shaped like a real one so signed-URL code paths still work.
          storage_path: `${userId}/${profile.id}/${doc.id}.${doc.mimeType === "application/pdf" ? "pdf" : "jpg"}`,
          mime_type: doc.mimeType,
          doc_type: doc.docType,
          status: doc.status,
          event_date: doc.eventDate,
          facility: doc.facility,
          doctor: doc.doctor ?? null,
          extraction: { title: doc.title, fields: doc.entities.length },
          confidence: doc.confidence,
          raw_text: doc.rawText,
        })
        .throwOnError();
      documentCount += 1;

      if (doc.entities.length > 0) {
        await db
          .from("entities")
          .insert(
            doc.entities.map((e) => ({
              id: e.id,
              profile_id: profile.id,
              user_id: userId,
              document_id: doc.id,
              kind: e.kind,
              name: e.name,
              canonical_name: e.canonicalName ?? null,
              value: e.value ?? null,
              value_text: e.valueText ?? null,
              unit: e.unit ?? null,
              ref_range: e.refRange ?? null,
              flag: e.flag ?? null,
              event_date: e.eventDate,
            })),
          )
          .throwOnError();
        entityCount += doc.entities.length;
      }
    }

    if (profile.timeline.length > 0) {
      await db
        .from("timeline_events")
        .insert(
          profile.timeline.map((t) => ({
            id: t.id,
            profile_id: profile.id,
            user_id: userId,
            kind: t.kind,
            title: t.title,
            summary: t.summary,
            event_date: t.eventDate,
            source_document_id: t.sourceDocumentId ?? null,
          })),
        )
        .throwOnError();
    }
  }

  console.log(
    `\n  seeded ${SEED_PROFILES.length} profiles, ${documentCount} documents, ${entityCount} entities` +
      `\n  sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
