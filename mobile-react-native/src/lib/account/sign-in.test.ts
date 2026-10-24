import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: async (...a: unknown[]) => {
        const out = await invoke(...a);
        if (out instanceof Error) throw out;
        return out;
      },
    },
  },
}));

const { removeSignIn } = await import("./sign-in");

const refused = (status: number) => ({ data: null, error: { context: new Response(JSON.stringify({ error: "x" }), { status }) } });

describe("removing the sign-in", () => {
  beforeEach(() => invoke.mockReset());

  it("asks the function with the typed confirmation and reports success", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await removeSignIn()).toEqual({ ok: true });
    expect(invoke).toHaveBeenCalledWith("delete-account", { body: { confirm: "DELETE" } });
  });

  it("never reports success without the function saying ok", async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    expect((await removeSignIn()).ok).toBe(false);
  });

  it("tells the person to sign in again when the session has expired", async () => {
    invoke.mockResolvedValue(refused(401));
    const r = await removeSignIn();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/sign in again/i);
  });

  it("asks for another tap when records are still there", async () => {
    invoke.mockResolvedValue(refused(409));
    const r = await removeSignIn();
    if (!r.ok) expect(r.message).toMatch(/still there/i);
  });

  it("says the sign-in is still there when the network or server fails", async () => {
    invoke.mockResolvedValue(new Error("offline"));
    const r = await removeSignIn();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/sign-in is still there/i);
    invoke.mockResolvedValue(refused(503));
    const s = await removeSignIn();
    if (!s.ok) expect(s.message).toMatch(/sign-in is still there/i);
  });
});
