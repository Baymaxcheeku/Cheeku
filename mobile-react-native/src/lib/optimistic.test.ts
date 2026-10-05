import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";

import { optimisticQueries, runOptimistic, useSaveError } from "./optimistic";

beforeEach(() => useSaveError.getState().clear());

describe("runOptimistic", () => {
  it("changes the screen before the save finishes", async () => {
    let screen = "old";
    let release: () => void = () => undefined;
    const saving = runOptimistic({
      apply: () => (screen = "new"),
      revert: () => (screen = "old"),
      write: () => new Promise<void>((r) => (release = r)),
    });
    expect(screen).toBe("new");
    release();
    expect(await saving).toBe(true);
    expect(screen).toBe("new");
    expect(useSaveError.getState().message).toBeNull();
  });

  it("rolls back and offers Retry when the save throws", async () => {
    let screen = "old";
    const ok = await runOptimistic({
      apply: () => (screen = "new"),
      revert: () => (screen = "old"),
      write: () => Promise.reject(new Error("offline")),
      message: "Couldn't save that.",
    });
    expect(ok).toBe(false);
    expect(screen).toBe("old");
    expect(useSaveError.getState().message).toBe("Couldn't save that.");
    expect(useSaveError.getState().retry).toBeTypeOf("function");
  });

  it("treats false and { ok: false } as failures, and prefers the server's reason", async () => {
    let screen = 0;
    const op = { apply: () => (screen += 1), revert: () => (screen -= 1) };
    expect(await runOptimistic({ ...op, write: async () => false })).toBe(false);
    expect(await runOptimistic({ ...op, write: async () => ({ ok: false, message: "Height should be in centimetres." }), message: "fallback" })).toBe(false);
    expect(screen).toBe(0);
    expect(useSaveError.getState().message).toBe("Height should be in centimetres.");
  });

  it("Retry runs the same change again and clears the bar when it lands", async () => {
    let screen = "old";
    let online = false;
    await runOptimistic({
      apply: () => (screen = "new"),
      revert: () => (screen = "old"),
      write: async () => (online ? { ok: true } : { ok: false }),
    });
    expect(screen).toBe("old");
    online = true;
    useSaveError.getState().retry?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(screen).toBe("new");
    expect(useSaveError.getState().message).toBeNull();
  });
});

describe("optimisticQueries", () => {
  it("patches cached data at once and restores the exact snapshot on failure", async () => {
    const qc = new QueryClient();
    const before = [{ id: "a", read: false }];
    qc.setQueryData(["inbox"], before);
    let seenDuringSave: unknown = null;
    const ok = await optimisticQueries(qc, [{ key: ["inbox"], update: (old) => (old as typeof before).map((i) => ({ ...i, read: true })) }], {
      write: async () => {
        seenDuringSave = qc.getQueryData(["inbox"]);
        throw new Error("offline");
      },
    });
    expect(seenDuringSave).toEqual([{ id: "a", read: true }]);
    expect(ok).toBe(false);
    expect(qc.getQueryData(["inbox"])).toEqual([{ id: "a", read: false }]);
  });

  it("leaves an unloaded query alone", async () => {
    const qc = new QueryClient();
    await optimisticQueries(qc, [{ key: ["nothing"], update: () => ["x"] }], { write: async () => true });
    expect(qc.getQueryData(["nothing"])).toBeUndefined();
  });
});
