/**
 * Applies mobile-react-native/supabase/migrations/*.sql in order, against DATABASE_URL.
 *
 * This exists because the Supabase SQL Editor reports only the first error and
 * gives no indication of how far a multi-file paste got — which left the schema
 * half-applied and undiagnosable. Here every file runs in its own transaction,
 * so a failure rolls that file back cleanly and names the exact statement.
 *
 * `--reset` drops the app's objects first. It is guarded on the database being
 * empty, because dropping tables that hold real records is not a thing a
 * migration script should ever do quietly.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "mobile-react-native", "supabase", "migrations");

const APP_TABLES = [
  "subscriptions",
  "consent_log",
  "messages",
  "conversations",
  "timeline_events",
  "entities",
  "documents",
  "profiles",
  "families",
] as const;

const RESET_SQL = `
drop trigger if exists profiles_limit_trigger on profiles;
drop function if exists enforce_profile_limit () cascade;
${APP_TABLES.map((t) => `drop table if exists ${t} cascade;`).join("\n")}
drop policy if exists "users read own document objects" on storage.objects;
drop policy if exists "users upload own document objects" on storage.objects;
drop policy if exists "users update own document objects" on storage.objects;
drop policy if exists "users delete own document objects" on storage.objects;
`;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "\nDATABASE_URL is not set.\n\n" +
      "Add it to .env.local. Supabase dashboard → Connect → Session pooler.\n",
  );
  process.exit(1);
}

/** Counts rows across whichever app tables currently exist. */
async function existingRowCount(client: Client): Promise<number> {
  const { rows } = await client.query<{ table_name: string }>(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1)`,
    [APP_TABLES],
  );
  let total = 0;
  for (const { table_name } of rows) {
    const r = await client.query<{ n: string }>(`select count(*)::text as n from "${table_name}"`);
    total += Number(r.rows[0]?.n ?? 0);
  }
  return total;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("connected\n");

  if (reset) {
    const rows = await existingRowCount(client);
    if (rows > 0) {
      console.error(`refusing to reset: ${rows} row(s) present. Clear them deliberately first.`);
      process.exit(1);
    }
    await client.query(RESET_SQL);
    console.log("reset  · dropped existing app objects (database was empty)\n");
  }

  /*
   * A ledger, so this is re-runnable.
   *
   * Without it every run replayed migration 0001 and died on "families already
   * exists" — which meant adding a seventh migration could not be applied at
   * all without resetting the database. Recorded inside each migration's own
   * transaction, so a rolled-back migration is not remembered as applied.
   */
  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  /*
   * Adopting a database that predates the ledger.
   *
   * The first five migrations were applied before this table existed, so an
   * empty ledger next to a populated schema means "already migrated, just not
   * recorded" — not "fresh database". Marking a migration as applied is only
   * safe when the thing it creates is demonstrably there, so each candidate is
   * checked against a table it is known to create.
   */
  const BASELINE: ReadonlyArray<[string, string]> = [
    ["0001_families_and_profiles.sql", "profiles"],
    ["0002_documents_and_entities.sql", "timeline_events"],
    ["0003_conversations_and_messages.sql", "messages"],
    ["0004_consent_and_subscriptions.sql", "subscriptions"],
  ];

  for (const [filename, table] of BASELINE) {
    await client.query(
      `insert into schema_migrations (filename)
       select $1
       where to_regclass($2) is not null
         and not exists (select 1 from schema_migrations where filename = $1)`,
      [filename, `public.${table}`],
    );
  }
  // 0005 creates a storage bucket rather than a table, so it is keyed off that.
  await client.query(
    `insert into schema_migrations (filename)
     select '0005_storage.sql'
     where exists (select 1 from storage.buckets where id = 'documents')
       and not exists (select 1 from schema_migrations where filename = '0005_storage.sql')`,
  );

  const { rows: appliedRows } = await client.query<{ filename: string }>(
    "select filename from schema_migrations",
  );
  const applied = new Set(appliedRows.map((r) => r.filename));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  --   ${file} (already applied)`);
      continue;
    }

    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (filename) values ($1)", [file]);
      await client.query("commit");
      ran += 1;
      console.log(`  ok   ${file}`);
    } catch (error) {
      await client.query("rollback");
      const e = error as { message?: string; position?: string; code?: string };
      console.error(`\n  FAIL ${file}`);
      console.error(`       ${e.code ?? ""} ${e.message ?? String(error)}`);
      // The character offset is the only thing that pins down which statement
      // in a 130-line file actually failed.
      if (e.position) {
        const upto = sql.slice(0, Number(e.position));
        console.error(`       at line ${upto.split("\n").length}:`);
        console.error(
          upto
            .split("\n")
            .slice(-3)
            .map((l) => `         | ${l}`)
            .join("\n"),
        );
      }
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log(
    ran === 0
      ? `\nAlready up to date (${files.length} migrations).`
      : `\n${ran} migration${ran === 1 ? "" : "s"} applied, ${files.length} total.`,
  );
}

main().catch((error) => {
  console.error("\n" + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
