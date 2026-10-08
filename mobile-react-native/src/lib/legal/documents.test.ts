import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CONSENTED_KINDS, DOCUMENT_HASHES, LEGAL_DOCUMENTS, LEGAL_ORDER, canonical, consentedVersions } from "./documents";
import { OPTIONAL_PURPOSES, PURPOSE_COPY, REQUIRED_PURPOSES } from "./purposes";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const migrations = resolve(__dirname, "../../../../supabase/migrations");
const sql = readdirSync(migrations)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(migrations, f), "utf8"))
  .join("\n");

describe("legal documents", () => {
  it.each(LEGAL_ORDER)("%s: the published hash matches the text in the app", (kind) => {
    const actual = sha(canonical(LEGAL_DOCUMENTS[kind]));
    // The message is the fix: copy the hash, and bump the version if the text changed.
    expect(DOCUMENT_HASHES[kind], `${kind} hash is now ${actual}. Bump its version and update DOCUMENT_HASHES and legal_documents.`).toBe(actual);
  });

  it.each(LEGAL_ORDER)("%s: this version and hash are published in legal_documents", (kind) => {
    const doc = LEGAL_DOCUMENTS[kind];
    // One row per (kind, version) with the matching hash, in some migration.
    const row = new RegExp(`\\('${kind}',\\s*'${doc.version}',[\\s\\S]{0,800}?'${DOCUMENT_HASHES[kind]}'`);
    expect(sql).toMatch(row);
  });

  it.each(LEGAL_ORDER)("%s: version is the date it takes effect", (kind) => {
    const doc = LEGAL_DOCUMENTS[kind];
    expect(doc.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doc.effectiveOn).toBe(doc.version);
  });

  it("every document the sign-up box agrees to is material", () => {
    for (const k of CONSENTED_KINDS) expect(LEGAL_DOCUMENTS[k].material).toBe(true);
    expect(Object.keys(consentedVersions()).sort()).toEqual([...CONSENTED_KINDS].sort());
  });

  it("the consent notice itemises every purpose, required and optional", () => {
    const text = canonical(LEGAL_DOCUMENTS.health_consent);
    for (const p of [...REQUIRED_PURPOSES, ...OPTIONAL_PURPOSES]) expect(text).toContain(PURPOSE_COPY[p].title);
  });

  it("no legal text uses an em dash", () => {
    for (const k of LEGAL_ORDER) expect(canonical(LEGAL_DOCUMENTS[k])).not.toContain("—");
  });

  it("never promises end-to-end encryption, which the service cannot offer", () => {
    for (const k of LEGAL_ORDER) expect(canonical(LEGAL_DOCUMENTS[k]).toLowerCase()).not.toContain("end to end");
  });
});
