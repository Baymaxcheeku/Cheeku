import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("@tanstack/query-async-storage-persister", () => ({
  createAsyncStoragePersister: () => ({}),
}));
// The offline setting lives in the keychain, which needs a phone.
vi.mock("@/lib/storage", () => ({ kv: { get: async () => null, set: async () => undefined, remove: async () => undefined } }));

const { shouldPersistQuery } = await import("./cache");

/*
 * The allowlist decides what health data is written to disk. A mistake here is
 * not a rendering bug — it is a chat transcript, or a billing state, sitting in
 * a file that outlives the session.
 */
const ask = (key: unknown[], status: "success" | "pending" | "error" = "success") =>
  shouldPersistQuery({ queryKey: key, state: { status } } as never);

describe("what is allowed to persist", () => {
  it("never writes out a read that is still in flight or that failed", () => {
    // Sign-out rejects home-context mid-flight; a pending entry on disk made
    // the persister log an error on the phone.
    expect(ask(["home-context"], "pending")).toBe(false);
    expect(ask(["records"], "error")).toBe(false);
    expect(ask(["home-context"], "success")).toBe(true);
  });

  it("caches the record reads, which is the point of the feature", () => {
    expect(ask(["records", "profile-id"])).toBe(true);
    expect(ask(["records-list", { docType: "lab" }])).toBe(true);
    expect(ask(["records-context"])).toBe(true);
    expect(ask(["record", "doc-id"])).toBe(true);
    expect(ask(["home-context"])).toBe(true);
  });

  it("never caches the chat", () => {
    // A transcript is a conversation about symptoms, which is more revealing
    // than the records it cites.
    expect(ask(["ask-context"])).toBe(false);
  });

  it("never caches entitlement", () => {
    // A lapsed plan that keeps working offline is a plan nobody has to renew.
    expect(ask(["entitlement"])).toBe(false);
  });

  it("never caches the app-lock setting", () => {
    // Writing "locked: false" to disk would be worth an attacker's time.
    expect(ask(["app-lock"])).toBe(false);
  });

  it("never caches the settings forms", () => {
    // Editing against a stale copy overwrites whatever was saved elsewhere.
    expect(ask(["settings-context"])).toBe(false);
    expect(ask(["settings-personal"])).toBe(false);
    expect(ask(["settings-health"])).toBe(false);
    expect(ask(["own-family"])).toBe(false);
  });

  it("refuses anything it has not been told about", () => {
    // The allowlist exists so a query added next year is excluded by default
    // rather than cached because nobody remembered to add it to a blocklist.
    expect(ask(["something-invented-later"])).toBe(false);
    expect(ask([])).toBe(false);
    expect(ask([{ not: "a string" }])).toBe(false);
  });
});
