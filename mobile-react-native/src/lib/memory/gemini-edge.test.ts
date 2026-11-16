import { afterEach, describe, expect, it, vi } from "vitest";

import { askGemini, geminiBody, readGemini } from "../../../supabase/functions/cheeku-chat/gemini";
import { REPLY_SCHEMA } from "../../../supabase/functions/cheeku-chat/prompt";

// The Gemini path of the cheeku-chat Edge Function: the request it builds, how
// it reads a reply, and when it moves on to the fallback model. No network.

const reply = { paragraphs: ["Hi Riya."], citations: [], followUps: [], basis: "general" };
const response = (obj: unknown, extra: Record<string, unknown> = {}) => ({
  candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(obj) }] }, ...extra }],
});

describe("geminiBody", () => {
  it("asks for JSON in the reply schema, with the system prompt kept apart from the person's turn", () => {
    const b = geminiBody("SYSTEM", "USER", REPLY_SCHEMA) as Record<string, any>;
    expect(b.systemInstruction.parts[0].text).toBe("SYSTEM");
    expect(b.contents).toEqual([{ role: "user", parts: [{ text: "USER" }] }]);
    expect(b.generationConfig.responseMimeType).toBe("application/json");
    expect(b.generationConfig.responseJsonSchema).toBe(REPLY_SCHEMA);
    expect(b.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
  });
});

describe("readGemini", () => {
  it("reads the JSON reply", () => {
    expect(readGemini(response(reply))).toEqual(reply);
  });

  it("joins a reply split across parts and skips thought parts", () => {
    const text = JSON.stringify(reply);
    const res = { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "thinking...", thought: true }, { text: text.slice(0, 10) }, { text: text.slice(10) }] } }] };
    expect(readGemini(res)).toEqual(reply);
  });

  it("tolerates a fenced reply", () => {
    const res = { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "```json\n" + JSON.stringify(reply) + "\n```" }] } }] };
    expect(readGemini(res)).toEqual(reply);
  });

  it("gives nothing for a blocked, cut-off, empty or non-object reply", () => {
    expect(readGemini(response(reply, { finishReason: "SAFETY" }))).toBeNull();
    expect(readGemini(response(reply, { finishReason: "MAX_TOKENS" }))).toBeNull();
    expect(readGemini({ candidates: [] })).toBeNull();
    expect(readGemini({ promptFeedback: { blockReason: "OTHER" } })).toBeNull();
    expect(readGemini(response(["a list"]))).toBeNull();
    expect(readGemini({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not json" }] } }] })).toBeNull();
  });
});

describe("askGemini", () => {
  afterEach(() => vi.unstubAllGlobals());
  const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});

  const stub = (answers: (() => Response)[]) => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string> });
      const next = answers.shift();
      return next ? Promise.resolve(next()) : Promise.reject(new Error("no more answers"));
    });
    return calls;
  };
  const ok = () => new Response(JSON.stringify(response(reply)));
  const status = (s: number) => () => new Response("{}", { status: s });

  it("answers from the first model, with the key in a header and never the URL", async () => {
    const calls = stub([ok]);
    const got = await askGemini({ key: "SECRET", models: ["m-lite", "m-flash"] }, "s", "u", {});
    expect(got).toEqual({ ok: true, reply, model: "m-lite" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain("/m-lite:generateContent");
    expect(calls[0]!.url).not.toContain("SECRET");
    expect(calls[0]!.headers["x-goog-api-key"]).toBe("SECRET");
  });

  it.each([404, 429, 500, 503])("moves to the fallback on %i", async (s) => {
    quiet();
    const calls = stub([status(s), ok]);
    const got = await askGemini({ key: "k", models: ["m-lite", "m-flash"] }, "s", "u", {});
    expect(got).toEqual({ ok: true, reply, model: "m-flash" });
    expect(calls).toHaveLength(2);
  });

  it("moves to the fallback when the first reply is unusable or the call fails", async () => {
    quiet();
    stub([() => new Response(JSON.stringify(response(reply, { finishReason: "SAFETY" }))), ok]);
    expect(await askGemini({ key: "k", models: ["a", "b"] }, "s", "u", {})).toMatchObject({ ok: true, model: "b" });
    stub([]);
    expect(await askGemini({ key: "k", models: ["a", "b"] }, "s", "u", {})).toEqual({ ok: false, error: "model_unreachable" });
  });

  it.each([400, 401, 403])("does not retry a configuration fault (%i)", async (s) => {
    quiet();
    const calls = stub([status(s), ok]);
    expect(await askGemini({ key: "k", models: ["a", "b"] }, "s", "u", {})).toEqual({ ok: false, error: "model_error", status: s });
    expect(calls).toHaveLength(1);
  });

  it("skips blank and repeated model names", async () => {
    quiet();
    const calls = stub([status(500), status(500)]);
    await askGemini({ key: "k", models: ["a", " ", "a", "b"] }, "s", "u", {});
    expect(calls.map((c) => c.url.split("/").pop())).toEqual(["a:generateContent", "b:generateContent"]);
  });
});
