import { describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: "u1", email: "a@b.c" } } } }) } },
}));

const { shared, sessionUser } = await import("./session");

describe("shared: one request for identical concurrent asks", () => {
  it("runs once for asks made while it is in flight", async () => {
    const run = vi.fn(() => new Promise<number>((r) => setTimeout(() => r(42), 10)));
    const [a, b, c] = await Promise.all([shared("k", run), shared("k", run), shared("k", run)]);
    expect([a, b, c]).toEqual([42, 42, 42]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("asks again once the first one has settled (never serves stale data)", async () => {
    const run = vi.fn(async () => Math.random());
    await shared("k2", run);
    await shared("k2", run);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("keeps different keys apart", async () => {
    const one = vi.fn(async () => "one");
    const two = vi.fn(async () => "two");
    expect(await Promise.all([shared("user:a", one), shared("user:b", two)])).toEqual(["one", "two"]);
  });

  it("a failure is shared, then cleared so the next ask retries", async () => {
    const run = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(Promise.all([shared("k3", run), shared("k3", run)])).rejects.toThrow("offline");
    expect(run).toHaveBeenCalledTimes(1);
    await expect(shared("k3", run)).rejects.toThrow("offline");
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe("sessionUser", () => {
  it("reads the id from the local session, with no network call", async () => {
    expect(await sessionUser()).toEqual({ id: "u1", email: "a@b.c" });
  });
});
