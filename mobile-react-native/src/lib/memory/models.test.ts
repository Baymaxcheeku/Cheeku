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

const { chatModel, FLOOR_REPLY, floorAnswers, ModelBusy, ModelUnavailable, noModel } = await import("./models");

const req = (floor: ModelRequest["floor"]["tier"] = null, reasons: string[] = []) =>
  ({ question: "q", history: [], memory: { person: { firstName: "Riya" } }, floor: { tier: floor, reasons } }) as unknown as ModelRequest;
const refused = (reason: string) => ({ data: null, error: { context: new Response(JSON.stringify({ error: "rate_limited", reason, retryAfter: 42 }), { status: 429 }) } });

describe("the chat model: Gemini through cheeku-chat, no stand-in", () => {
  beforeEach(() => invoke.mockReset());

  it("uses the model's answer and records which model wrote it", async () => {
    invoke.mockResolvedValue({ data: { paragraphs: ["from the model"], modelId: "gemini:gemini-3.5-flash-lite" }, error: null });
    const m = chatModel();
    expect((await m.respond(req())).paragraphs).toEqual(["from the model"]);
    expect(m.id).toBe("gemini:gemini-3.5-flash-lite");
  });

  it("reads what the photo showed, so it can be saved in place of the photo", async () => {
    invoke.mockResolvedValue({ data: { paragraphs: ["ok"], photoSummary: "  Strip of cetirizine 10 mg.  " }, error: null });
    expect((await chatModel().respond(req())).photoSummary).toBe("Strip of cetirizine 10 mg.");
    invoke.mockResolvedValue({ data: { paragraphs: ["ok"] }, error: null });
    expect((await chatModel().respond(req())).photoSummary).toBeNull();
  });

  it("sends the photo with the request", async () => {
    invoke.mockResolvedValue({ data: { paragraphs: ["a strip of paracetamol"] }, error: null });
    await chatModel().respond({ ...req(), image: { mimeType: "image/jpeg", data: "abc" } });
    expect(invoke.mock.calls[0]![1].body.image).toEqual({ mimeType: "image/jpeg", data: "abc" });
  });

  it("stops the turn when they are sending too fast", async () => {
    invoke.mockResolvedValue(refused("per_minute"));
    const err = await chatModel().respond(req()).catch((e) => e);
    expect(err).toBeInstanceOf(ModelBusy);
    expect(err.retryAfter).toBe(42);
  });

  it("says the allowance is spent for a quota or daily refusal, never a canned answer", async () => {
    for (const reason of ["quota", "daily"]) {
      invoke.mockResolvedValue(refused(reason));
      const err = await chatModel().respond(req()).catch((e) => e);
      expect(err).toBeInstanceOf(ModelUnavailable);
      expect(err.reason).toBe("quota");
    }
  });

  it("says it is down when the function, the model or the network fails", async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response("{}", { status: 503 }) } });
    expect((await chatModel().respond(req()).catch((e) => e)).reason).toBe("down");
    invoke.mockResolvedValue({ data: { paragraphs: [] }, error: null });
    expect((await chatModel().respond(req()).catch((e) => e)).reason).toBe("down");
    invoke.mockReturnValue(new Error("offline"));
    expect((await chatModel().respond(req()).catch((e) => e)).reason).toBe("down");
  });

  it("still tells them to call a doctor today when the floor says so and the model fails", async () => {
    invoke.mockResolvedValue(refused("per_hour"));
    const m = chatModel();
    const reply = await m.respond(req("contact_today", ["Fever above 39 for three days"]));
    expect(m.id).toBe(FLOOR_REPLY);
    expect(reply.tier).toBe("contact_today");
    expect(reply.paragraphs[0]).toContain("Riya should talk to a doctor today");
    expect(reply.paragraphs.join(" ")).toContain("Fever above 39 for three days");
    expect(reply.careOffer).toBe(true);
  });

  it("only a doctor-today floor or above answers on a failure", () => {
    expect(floorAnswers(null)).toBe(false);
    expect(floorAnswers("monitor")).toBe(false);
    expect(floorAnswers("contact_today")).toBe(true);
    expect(floorAnswers("go_now")).toBe(true);
  });

  it("noModel refuses as spent, so a spent allowance never reaches a model", async () => {
    expect((await noModel.respond(req()).catch((e) => e)).reason).toBe("quota");
  });
});
