import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ModelRequest } from "./model";

const invoke = vi.fn();
// The spy hands back an Error for "the network failed" and the wrapper throws
// it, so no rejected promise sits in the spy's own results.
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
vi.mock("./mock-model", () => ({
  mockModel: { id: "stand-in", respond: async () => ({ paragraphs: ["stand-in answer"], citations: [], followUps: [], tier: null, basis: "general", careOffer: false }) },
}));

vi.stubEnv("EXPO_PUBLIC_CHAT_MODEL", "edge");
const { chatModel, ModelBusy, stopsTurn } = await import("./models");

const req = (floor: ModelRequest["floor"]["tier"] = null) => ({ question: "q", history: [], memory: {}, floor: { tier: floor, reasons: [] } }) as unknown as ModelRequest;
const refused = (reason: string) => ({ data: null, error: { context: new Response(JSON.stringify({ error: "rate_limited", reason, retryAfter: 42 }), { status: 429 }) } });

describe("edge model and the meter", () => {
  beforeEach(() => invoke.mockClear());

  it("uses the model's answer when the call is allowed", async () => {
    invoke.mockResolvedValue({ data: { paragraphs: ["from the model"], modelId: "cheeku-ft" }, error: null });
    const m = chatModel();
    expect((await m.respond(req())).paragraphs).toEqual(["from the model"]);
    expect(m.id).toBe("cheeku-ft");
  });

  it("stops the turn when they are sending too fast", async () => {
    invoke.mockResolvedValue(refused("per_minute"));
    const err = await chatModel().respond(req()).catch((e) => e);
    expect(err).toBeInstanceOf(ModelBusy);
    expect(err.retryAfter).toBe(42);
  });

  it("still answers a doctor-today question on the stand-in, even when rate-limited", async () => {
    invoke.mockResolvedValue(refused("per_hour"));
    const m = chatModel();
    expect((await m.respond(req("contact_today"))).paragraphs).toEqual(["stand-in answer"]);
    expect(m.id).toBe("stand-in");
  });

  it("falls back to the stand-in for a spent allowance or the daily ceiling", async () => {
    for (const reason of ["quota", "daily"]) {
      invoke.mockResolvedValue(refused(reason));
      expect((await chatModel().respond(req())).paragraphs).toEqual(["stand-in answer"]);
    }
  });

  it("falls back to the stand-in when the function or the meter is down", async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response("{}", { status: 503 }) } });
    expect((await chatModel().respond(req())).paragraphs).toEqual(["stand-in answer"]);
    // A network failure: invoke itself rejects.
    invoke.mockReturnValue(new Error("offline"));
    expect((await chatModel().respond(req())).paragraphs).toEqual(["stand-in answer"]);
  });

  it("only pace refusals below contact-today stop a turn", () => {
    expect(stopsTurn("per_minute", null)).toBe(true);
    expect(stopsTurn("per_hour", "monitor")).toBe(true);
    expect(stopsTurn("per_minute", "contact_today")).toBe(false);
    expect(stopsTurn("per_minute", "go_now")).toBe(false);
    expect(stopsTurn("quota", null)).toBe(false);
  });
});
