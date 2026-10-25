import { createHmac, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { covered } from "../samples/turns";
import type { Account } from "../samples/population";

/*
 * LOADS THE SYNTHETIC POPULATION INTO A STAGING PROJECT.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
 *   LOADTEST_ALLOW=<ref> npx tsx --tsconfig loadtest/tsconfig.json loadtest/seed/staging.ts
 *
 * NEVER PRODUCTION. It refuses to run unless LOADTEST_ALLOW is the project
 * ref in SUPABASE_URL, typed out: the same "say it on purpose" guard as
 * scripts/seed.ts, because seeding ten thousand fake families into the real
 * database is a one-way mistake.
 *
 * What it creates, per account in population.json (from samples/build.ts):
 * an auth user (loadtest+NNNNNN@cheeku.test), the required consents (so the
 * 0031 write guard lets their uploads in), the family and its subscription,
 * the members the plan covers (the seat trigger, 0013, refuses the rest, as
 * it would in production), the mother relation for children, the records and
 * their values, and a short chat history. Ids are the population's own, so
 * the canaries in requests.jsonl and turns.jsonl match rows in the database.
 *
 * Tokens for k6 go to out/tokens.json. With SUPABASE_JWT_SECRET set (the
 * project's legacy JWT secret) they are minted here, valid TOKEN_HOURS (6),
 * long enough for a soak. Without it each account signs in, SIGNIN_PER_MIN
 * at a time, to stay under the auth rate limit; those tokens last as long as
 * the project's JWT expiry, so raise that on staging before a long run.
 *
 *   --reset    deletes every user listed in out/seeded.json (rows cascade)
 *
 * Not run from a cloud session: it needs a staging project, and none exists
 * yet (launch tracker `ops-envs`). Read it before the first run.
 */

const { values: args } = parseArgs({
  options: {
    out: { type: "string", default: "loadtest/out" },
    reset: { type: "boolean", default: false },
    concurrency: { type: "string", default: "8" },
    limit: { type: "string", default: "0" },
  },
});

const URL = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";
const TOKEN_HOURS = Number(process.env.TOKEN_HOURS ?? 6);
const SIGNIN_PER_MIN = Number(process.env.SIGNIN_PER_MIN ?? 25);
const REQUIRED = ["account", "health_records", "ai_assistance", "family_profiles", "care_bookings"];

function fail(message: string): never {
  console.error(`\n  loadtest seed: ${message}\n`);
  process.exit(1);
}

if (!URL || !SERVICE || !ANON) fail("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY must be set.");
const ref = new globalThis.URL(URL).hostname.split(".")[0];
if (process.env.LOADTEST_ALLOW !== ref) fail(`refusing to seed ${URL}. Set LOADTEST_ALLOW=${ref} if this really is a staging project.`);

const admin = { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" };

async function call(path: string, init: RequestInit & { ok?: number[] } = {}): Promise<unknown> {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(`${URL}${path}`, { ...init, headers: { ...admin, ...(init.headers ?? {}) } });
    if (res.ok || init.ok?.includes(res.status)) return res.status === 204 || res.headers.get("content-length") === "0" ? null : res.json().catch(() => null);
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

const insert = (table: string, rows: unknown[]) => (rows.length ? call(`/rest/v1/${table}`, { method: "POST", body: JSON.stringify(rows), headers: { prefer: "return=minimal" } }) : null);

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");
function mint(userId: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ aud: "authenticated", role: "authenticated", sub: userId, email, iss: `${URL}/auth/v1`, iat: now, exp: now + TOKEN_HOURS * 3600 }));
  return `${head}.${body}.${b64url(createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest())}`;
}

let lastSignIn = 0;
async function signIn(email: string, password: string): Promise<string> {
  const gap = 60_000 / SIGNIN_PER_MIN;
  const wait = lastSignIn + gap - Date.now();
  lastSignIn = Math.max(Date.now(), lastSignIn + gap);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const res = (await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password }) }).then((r) => r.json())) as { access_token?: string; error_description?: string };
  if (!res.access_token) throw new Error(`sign-in ${email}: ${res.error_description ?? "no token"}`);
  return res.access_token;
}

async function seedAccount(a: Account): Promise<{ userId: string; accessToken: string; email: string }> {
  const password = randomBytes(18).toString("base64url");
  const user = (await call("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email: a.email, password, email_confirm: true, user_metadata: { loadtest: true } }) })) as { id: string };
  const userId = user.id;

  await insert("consent_log", REQUIRED.map((purpose) => ({ user_id: userId, consent_type: purpose, version: "loadtest", granted: true, method: "signup_checkbox" })));

  const [family] = (await call("/rest/v1/families", { method: "POST", body: JSON.stringify({ owner_id: userId, plan: a.plan }), headers: { prefer: "return=representation" } })) as { id: string }[];
  if (!family) throw new Error(`family for ${a.email}`);
  await insert("subscriptions", [{ family_id: family.id, tier: a.plan }]);

  // Only the members the plan covers: the seat trigger refuses the rest, in
  // the order covered_profile_ids reads them (primary, then oldest), which the
  // explicit created_at keeps.
  const seats = covered(a);
  const members = a.members.filter((m) => seats.has(m.id));
  const base = Date.now() - 30 * 86_400_000;
  await insert(
    "profiles",
    members.map((m, i) => {
      const p = a.bundles[m.id]?.profile ?? {};
      return { id: m.id, family_id: family.id, user_id: userId, name: m.name, dob: m.dob, sex: m.sex, relationship: m.relationship, is_primary: m.isPrimary, blood_group: m.bloodGroup, conditions: p.conditions ?? [], allergies: p.allergies ?? [], medications: [], created_at: new Date(base + i * 1000).toISOString() };
    }),
  );

  const relations = members.flatMap((m) => (a.bundles[m.id]?.relations ?? []).filter((r) => seats.has(String(r.related_profile_id))).map((r) => ({ user_id: userId, profile_id: m.id, related_profile_id: String(r.related_profile_id), type: String(r.type) })));
  await insert("profile_relations", relations);

  for (const m of members) {
    const b = a.bundles[m.id];
    if (!b) continue;
    await insert(
      "documents",
      b.documents.map((d) => ({ id: d.id, profile_id: m.id, user_id: userId, storage_path: `${userId}/${m.id}/${String(d.id)}.pdf`, mime_type: "application/pdf", doc_type: d.doc_type, status: "filed", event_date: d.event_date, facility: d.facility, doctor: d.doctor ?? null, extraction: { title: d.title, details: d.details }, confidence: 0.95, raw_text: null })),
    );
    await insert(
      "entities",
      b.entities.map((e) => ({ id: e.id, profile_id: m.id, user_id: userId, document_id: e.document_id, kind: e.kind, name: e.name, canonical_name: e.canonical_name, value: e.value, value_text: e.value_text, unit: e.unit, ref_range: e.ref_range, flag: e.flag, event_date: e.event_date })),
    );

    const history = a.history[m.id] ?? [];
    if (history.length) {
      const [conversation] = (await call("/rest/v1/conversations", { method: "POST", body: JSON.stringify({ profile_id: m.id, user_id: userId, title: history[0]?.content.slice(0, 80) ?? "Earlier" }), headers: { prefer: "return=representation" } })) as { id: string }[];
      const at = Date.now() - 2 * 86_400_000;
      await insert("messages", history.map((h, i) => ({ conversation_id: conversation?.id, user_id: userId, role: h.role, content: h.content, citations: [], safety_status: "clear", created_at: new Date(at + i * 60_000).toISOString() })));
    }
  }
  // The history above spent free chats through the quota trigger (0022); give them back.
  await call(`/rest/v1/subscriptions?family_id=eq.${family.id}`, { method: "PATCH", body: JSON.stringify({ chats_used_this_month: 0 }), headers: { prefer: "return=minimal" } });

  const accessToken = JWT_SECRET ? mint(userId, a.email) : await signIn(a.email, password);
  return { userId, accessToken, email: a.email };
}

async function pool<T>(items: readonly T[], size: number, fn: (x: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i] as T, i);
      }
    }),
  );
}

async function main() {
  const out = args.out as string;
  if (args.reset) {
    const seeded = JSON.parse(readFileSync(join(out, "seeded.json"), "utf8")) as string[];
    await pool(seeded, Number(args.concurrency), async (id) => {
      await call(`/auth/v1/admin/users/${id}`, { method: "DELETE", ok: [404] });
    });
    writeFileSync(join(out, "seeded.json"), "[]");
    console.log(`  removed ${seeded.length} load-test users and everything under them`);
    return;
  }

  const { accounts } = JSON.parse(readFileSync(join(out, "population.json"), "utf8")) as { accounts: Account[] };
  const limit = Number(args.limit);
  const todo = limit ? accounts.slice(0, limit) : accounts;
  const tokens: Record<string, { userId: string; accessToken: string; email: string }> = {};
  const seeded: string[] = [];
  const started = Date.now();
  let failed = 0;

  await pool(todo, Number(args.concurrency), async (a, i) => {
    try {
      const t = await seedAccount(a);
      tokens[a.id] = t;
      seeded.push(t.userId);
    } catch (e) {
      failed += 1;
      console.error(`  ${a.email}: ${(e as Error).message}`);
    }
    if ((i + 1) % 100 === 0) console.log(`  ${i + 1} / ${todo.length} accounts, ${((Date.now() - started) / 1000).toFixed(0)} s`);
  });

  writeFileSync(join(out, "tokens.json"), JSON.stringify(tokens));
  writeFileSync(join(out, "seeded.json"), JSON.stringify(seeded));
  console.log(`\n  seeded ${seeded.length} accounts (${failed} failed) in ${((Date.now() - started) / 1000).toFixed(0)} s; tokens in ${join(out, "tokens.json")}\n`);
  if (failed) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
