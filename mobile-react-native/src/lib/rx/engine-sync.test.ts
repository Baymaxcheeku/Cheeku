import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * The scorecard rules live in supabase/functions/rx-score/rx.ts (the Edge
 * Function) and are copied here as engine.ts, because Metro, Vercel and EAS
 * build from this folder and cannot bundle code outside it. One set of rules:
 * if this fails, copy the function's file over:
 *
 *   cp supabase/functions/rx-score/rx.ts src/lib/rx/engine.ts
 */
describe("prescription scorecard engine", () => {
  it("is the same file as the rx-score Edge Function's", () => {
    const app = readFileSync(resolve(__dirname, "engine.ts"), "utf8");
    const fn = readFileSync(resolve(__dirname, "../../../supabase/functions/rx-score/rx.ts"), "utf8");
    expect(app === fn).toBe(true);
  });
});
