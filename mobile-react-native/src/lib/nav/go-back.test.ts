import { describe, expect, it, vi } from "vitest";

import { goBack } from "./go-back";

function fakeRouter(canGoBack: boolean) {
  return { canGoBack: vi.fn(() => canGoBack), back: vi.fn(), replace: vi.fn() } as unknown as Parameters<typeof goBack>[0] & {
    back: ReturnType<typeof vi.fn>;
    replace: ReturnType<typeof vi.fn>;
  };
}

describe("goBack", () => {
  it("goes back when there is a screen behind", () => {
    const r = fakeRouter(true);
    goBack(r, "/home", 10_000);
    expect(r.back).toHaveBeenCalledTimes(1);
    expect(r.replace).not.toHaveBeenCalled();
  });
  it("opens the fallback when nothing is behind", () => {
    const r = fakeRouter(false);
    goBack(r, "/home", 20_000);
    expect(r.back).not.toHaveBeenCalled();
    expect(r.replace).toHaveBeenCalledWith("/home");
  });
  it("ignores a second tap while the first back is landing", () => {
    const r = fakeRouter(true);
    goBack(r, "/home", 30_000);
    goBack(r, "/home", 30_200);
    expect(r.back).toHaveBeenCalledTimes(1);
    goBack(r, "/home", 31_000);
    expect(r.back).toHaveBeenCalledTimes(2);
  });
});
