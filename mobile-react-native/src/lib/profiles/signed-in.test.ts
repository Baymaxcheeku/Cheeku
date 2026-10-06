import { describe, expect, it, vi } from "vitest";

/*
 * Regression: signing in flashed "Set up a profile first" for a second or two.
 *
 * Signed out, row level security answers every profile query with zero rows,
 * which looks exactly like an account with no profile. That empty answer was
 * cached (and persisted) during sign-out, and the next sign-in opened on it.
 * A signed-out read must fail, never succeed with "nobody here".
 */
let session: unknown = null;
vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session } }) } },
}));
vi.mock("@/lib/storage", () => ({ kv: { get: async () => null, set: async () => undefined, remove: async () => undefined } }));
vi.mock("@/lib/billing/quota", () => ({ getEntitlement: async () => ({ tier: "free" }) }));
vi.mock("./avatar", () => ({ generatedAvatar: () => ({ svg: "", background: "#fff" }) }));
vi.mock("./photo", () => ({ signPhotos: async () => new Map() }));

const { assertSignedIn } = await import("./context");

describe("a signed-out read is an error, not an empty family", () => {
  it("throws with no session", async () => {
    session = null;
    await expect(assertSignedIn()).rejects.toThrow("signed out");
  });

  it("passes with a session", async () => {
    session = { user: { id: "u1" } };
    await expect(assertSignedIn()).resolves.toBeUndefined();
  });
});
