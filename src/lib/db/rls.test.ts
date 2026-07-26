/*
 * Static audit of the migrations.
 *
 * We have no Supabase project yet, so this cannot prove RLS behaves correctly
 * at runtime — that is what `profile-isolation.test.ts` does, and it only runs
 * when a database is reachable. What this file CAN do, on every commit and with
 * no infrastructure, is prove that no table was ever added without policies.
 * That is the mistake that actually happens: a migration lands in a hurry and
 * the table is world-readable until someone notices.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../supabase/migrations");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// Comments are stripped so prose about a banned pattern never trips a check
// looking for that pattern — the audit must read the SQL, not the commentary.
const sql = files
  .map((f) => readFileSync(join(migrationsDir, f), "utf8").replace(/^\s*--.*$/gm, ""))
  .join("\n");

/** Tables Supabase owns and we only attach policies to. */
const EXTERNAL_TABLES = new Set(["storage.objects", "storage.buckets"]);

function createdTables(source: string): string[] {
  return [...source.matchAll(/create table (?:if not exists )?(\w+)\s*\(/g)]
    .map((m) => m[1]!)
    .filter((t) => !EXTERNAL_TABLES.has(t));
}

function policiesFor(source: string, table: string) {
  const pattern = new RegExp(
    `create policy\\s+"[^"]+"\\s+on\\s+${table}\\s+for\\s+(select|insert|update|delete)`,
    "g",
  );
  return new Set([...source.matchAll(pattern)].map((m) => m[1]!));
}

describe("migrations", () => {
  it("exist and are numbered sequentially", () => {
    expect(files.length).toBeGreaterThan(0);
    files.forEach((file, i) => {
      expect(file).toMatch(new RegExp(`^${String(i + 1).padStart(4, "0")}_`));
    });
  });

  it("never grant blanket access", () => {
    expect(sql).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(sql).not.toMatch(/with\s+check\s*\(\s*true\s*\)/i);
  });

  it("never disable or force-skip row level security", () => {
    expect(sql).not.toMatch(/disable row level security/i);
  });
});

describe.each(createdTables(sql))("table %s", (table) => {
  it("enables row level security", () => {
    expect(sql).toContain(`alter table ${table} enable row level security`);
  });

  it("has at least a select policy, so it is not write-only by accident", () => {
    expect([...policiesFor(sql, table)]).toContain("select");
  });

  it("scopes every policy to the authenticated user", () => {
    const blocks = [...sql.matchAll(new RegExp(`create policy\\s+"[^"]+"\\s+on\\s+${table}[\\s\\S]*?;`, "g"))];
    expect(blocks.length).toBeGreaterThan(0);
    for (const [block] of blocks) {
      expect(block).toMatch(/auth\.uid\s*\(\s*\)/);
    }
  });
});

describe("tables that must NOT be client-writable", () => {
  it("consent_log is append-only — an editable consent record is not evidence", () => {
    const verbs = policiesFor(sql, "consent_log");
    expect(verbs.has("update")).toBe(false);
    expect(verbs.has("delete")).toBe(false);
  });

  it("messages cannot be edited — the transcript is a safety audit trail", () => {
    expect(policiesFor(sql, "messages").has("update")).toBe(false);
  });

  it("subscriptions cannot be self-upgraded by the client", () => {
    const verbs = policiesFor(sql, "subscriptions");
    expect(verbs.has("update")).toBe(false);
    expect(verbs.has("delete")).toBe(false);
  });
});

describe("storage", () => {
  it("creates the documents bucket private", () => {
    expect(sql).toMatch(/'documents',\s*'documents',\s*false/);
  });

  it("caps uploads at 10MB, matching the application-layer limit", () => {
    expect(sql).toContain("10485760");
  });

  it("allowlists only the four accepted mime types", () => {
    const allowlist = /allowed_mime_types[\s\S]*?array\[([^\]]+)\]/.exec(sql)?.[1] ?? "";
    expect(allowlist).toContain("image/jpeg");
    expect(allowlist).toContain("image/png");
    expect(allowlist).toContain("image/heic");
    expect(allowlist).toContain("application/pdf");
    expect(allowlist).not.toMatch(/image\/svg|text\/html|application\/octet/);
  });

  it("scopes object policies to a user-owned key prefix", () => {
    const blocks = [
      ...sql.matchAll(/create policy\s+"[^"]+"\s+on\s+storage\.objects[\s\S]*?;/g),
    ];
    expect(blocks.length).toBe(4);
    for (const [block] of blocks) {
      expect(block).toContain("storage.foldername");
      expect(block).toMatch(/auth\.uid\s*\(\s*\)::text/);
    }
  });
});
