import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { STORAGE_REGISTRY, isRegistered, keysFor, temporaryPrefixes } from "./storage-registry";

const root = resolve(__dirname, "../../..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) ? [p] : [];
  });
}

/*
 * Any string constant that looks like one of the app's storage keys. Keys are
 * named `baymax...` or `cheeku...` with a dot or underscore, which is also
 * how this check finds them: a key that breaks the pattern breaks the check,
 * and the comment in storage-registry.ts says to keep it.
 */
const KEY = /(?:const\s+\w*KEY\w*\s*=\s*)["'`]((?:baymax|cheeku)[._][\w.-]+)["'`]/g;

describe("on-device storage", () => {
  const source = [...files(join(root, "src")), ...files(join(root, "app"))];
  const used = new Set<string>();
  for (const f of source) for (const m of readFileSync(f, "utf8").matchAll(KEY)) if (m[1]) used.add(m[1]);

  it("finds the keys the app writes", () => {
    expect(used.size).toBeGreaterThan(5);
  });

  it.each([...used])("%s is listed in the storage registry", (key) => {
    expect(isRegistered(key), `${key} is stored on the phone but not in STORAGE_REGISTRY. Add it, with its scope.`).toBe(true);
  });

  it("wipes everything about the person on sign-out", () => {
    const account = keysFor("account");
    for (const k of ["baymax_profile", "cheeku.labAddress", "cheeku.serviceAddress", "cheeku.appointments", "baymax.offline.v1"]) {
      expect(account).toContain(k);
    }
  });

  it("every health or personal item is wiped on sign-out", () => {
    for (const i of STORAGE_REGISTRY) {
      if (i.contains === "health" || i.contains === "personal") expect(i.scope, i.key).toBe("account");
    }
  });

  it("knows the temporary folders photos pass through", () => {
    expect(temporaryPrefixes()).toEqual(expect.arrayContaining(["ImagePicker/", "ImageManipulator/", "cheeku-ai-export-"]));
  });

  it("matches wildcards", () => {
    expect(isRegistered("sb-abcd-auth-token.0")).toBe(true);
    expect(isRegistered("cheeku.somethingNew")).toBe(false);
  });
});
