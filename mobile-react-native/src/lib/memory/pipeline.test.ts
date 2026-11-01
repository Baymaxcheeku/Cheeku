import { describe, expect, it } from "vitest";

import { buildContext, type MemoryBundle } from "./context";
import { isCorrection, parseFacts } from "./facts";
import { buildLedger, ledgerFlags, parseStrength } from "./ledger";
import { deriveLoops, openLoops, relevantLoops } from "./loops";
import type { ChatModel, ModelReply } from "./model";
import { mockModel } from "./mock-model";
import { planTurn } from "./pipeline";
import { readPolicy, type Policy } from "@/lib/insurance/policy";
import { resolveClock } from "./clock";

/*
 * The reference thread, replayed. Each case is something that actually
 * happened over twelve months, and what the layer has to do about it.
 */

export const imaad = (over: Partial<MemoryBundle> = {}): MemoryBundle => ({
  profile: {
    id: "b",
    name: "Imaad",
    dob: "2026-09-01",
    sex: "male",
    blood_group: "A+",
    conditions: [],
    allergies: [],
    medications: [],
    birth: { ga_at_birth_days: 273, delivery_mode: "c-section", birth_weight_kg: 3.5, maternal_blood_group: "O+", mother_id: "m" },
  },
  relations: [{ related_profile_id: "m", type: "mother", name: "Nisha", blood_group: "O+" }],
  pregnancies: [],
  documents: [
    {
      id: "inv",
      doc_type: "booking_invoice",
      event_date: "2026-09-03",
      title: "Lab bill",
      details: { invoiceNo: "B1", issuedAt: "2026-09-03", partner: "Neo Labs", tests: [{ name: "Newborn screening panel", price: 1800 }, { name: "Total bilirubin", price: 300 }], subtotal: 2100, total: 2100, status: "paid", slot: { date: "2026-09-03" } },
    },
    { id: "lab", doc_type: "lab_report", event_date: "2026-09-04", title: "Bilirubin", details: { sections: [] } },
    {
      id: "rx",
      doc_type: "prescription",
      event_date: "2026-09-05",
      title: "Prescription",
      details: {
        doctor: { name: "Dr. Roy", phone: "+91 98300 00000", clinic: "Roy Child Clinic" },
        medicines: [{ name: "Vitamin D3 drops", strength: "400 IU/ml", dose: "1 ml", schedule: "1-0-0", form: "drops" }],
        tests: [],
        followUp: "2026-09-12",
      },
    },
    {
      id: "box",
      doc_type: "medication",
      event_date: "2026-09-05",
      title: "Supplement box",
      details: {
        source: "label",
        medicines: [
          {
            name: "Kidcal paediatric syrup",
            strength: "per 5 ml",
            dose: "5 ml",
            schedule: "1-0-1",
            form: "syrup",
            pack: { composition: [{ name: "Calcium", amount: 150, unit: "mg" }, { name: "Vitamin D3", amount: 400, unit: "IU" }], regulatoryClass: "nutraceutical", licence: "FSSAI 1001", excipients: ["Aspartame"], route: "oral" },
          },
        ],
      },
    },
  ],
  entities: [{ kind: "lab_value", name: "Total Bilirubin", canonical_name: "bilirubin_total", value: 11.0, unit: "mg/dL", ref_range: "0.3-1.2", flag: "high", event_date: "2026-09-04", document_id: "lab" }],
  facts: [],
  loops: [],
  stats: { records: 4, messages: 20, conversations: 3, first_message_at: "2026-03-01T10:00:00Z" },
  ...over,
});

export const nisha = (over: Partial<MemoryBundle> = {}): MemoryBundle => ({
  profile: { id: "m", name: "Nisha", dob: "1992-08-11", sex: "female", blood_group: "O+", conditions: [], allergies: [], medications: [] },
  relations: [],
  pregnancies: [{ id: "p", profile_id: "m", lmp: "2026-03-05", status: "ongoing", datings: [{ date: "2026-09-01", ga_days: 210, source: "scan", label: "growth scan" }] }],
  documents: [],
  entities: [],
  facts: [],
  loops: [],
  stats: null,
  ...over,
});

let n = 0;
const newId = () => `f${++n}`;
const run = (text: string, bundle: MemoryBundle, today: string, model: ChatModel = mockModel, usage: { messageId: string; factIds: string[] }[] = []) =>
  planTurn({ text, bundle, today, history: [], usage, model, newId });

const noModel: ChatModel = {
  id: "never",
  respond: () => {
    throw new Error("a hard-stop must never reach the model");
  },
};

describe("the clock decides the threshold", () => {
  it("reads the same bilirubin as over on day 6 and scripts the call", async () => {
    const plan = await run("Bilirubin came back 11.0 today and his eyes are still yellow", imaad({ entities: [] }), "2026-09-07");
    expect(plan.status).toBe("answered");
    expect(plan.decision.tier).toBe("contact_today");
    expect(plan.decision.reasons.some((r) => r.source === "threshold" && /day 6.*over/.test(r.text))).toBe(true);
    expect(plan.script?.opener).toBe("This is about Imaad, day 6 of life, born at 39w by c-section.");
    expect(plan.script?.to).toBe("Dr. Roy");
    expect(plan.script?.text).toMatch(/Mother is O\+ and baby is A\+/);
  });

  it("reads 11.0 taken on day 3 against the day-3 limit, even when asked about later", async () => {
    const plan = await run("what was his bilirubin?", imaad(), "2026-09-07");
    const chip = plan.reading.find((r) => r.key === "bilirubin_total");
    expect(chip?.value).toBe("11 mg/dL");
    expect(plan.decision.reasons.find((r) => r.source === "threshold")?.text).toMatch(/day 3.*ask which chart/);
  });
});

describe("hard-stops bypass the model", () => {
  it("sends a fever under three months straight to go-now", async () => {
    const plan = await run("he feels hot, I think he has a fever", imaad(), "2026-09-20", noModel);
    expect(plan.status).toBe("hard_stop");
    expect(plan.decision.tier).toBe("go_now");
    expect(plan.decision.hardStop?.id).toBe("young-baby-fever");
    expect(plan.reply).toBeNull();
  });

  it("treats fewer movements at 30 weeks as go-now, with no analysis", async () => {
    const plan = await run("baby is moving less than usual since morning and some pelvic pressure", nisha(), "2026-09-01", noModel);
    expect(plan.status).toBe("hard_stop");
    expect(plan.decision.hardStop?.id).toBe("reduced-movement");
    expect(plan.script?.opener).toMatch(/30w pregnant by scan dating/);
  });

  it("leaves the frozen lexicon in charge of emergencies", async () => {
    const plan = await run("my husband has crushing chest pain", nisha(), "2026-09-01", noModel);
    expect(plan.status).toBe("escalate");
  });
});

describe("the ledger", () => {
  it("adds vitamin D across products and flags the total for a newborn", () => {
    const ctx = buildContext(imaad(), "2026-09-07");
    const flag = ctx.flags.find((f) => f.kind === "upper_limit");
    expect(flag?.title).toBe("Vitamin D adds up to 1,200 IU a day");
    expect(flag?.tier).toBe("contact_today");
    expect(ctx.flags.some((f) => f.kind === "regulatory")).toBe(true);
  });

  it("raises the ledger flag in an answer about the drops", async () => {
    const plan = await run("can I keep giving him both the drops and the syrup?", imaad(), "2026-09-07");
    expect(plan.flags.map((f) => f.kind)).toContain("upper_limit");
    expect(plan.reply?.paragraphs.join(" ")).toMatch(/1,200 IU/);
  });

  it("reads strengths per ml", () => {
    expect(parseStrength("400 IU/ml")).toEqual({ amount: 400, unit: "IU", perMl: 1 });
    expect(parseStrength("60,000 IU")).toEqual({ amount: 60000, unit: "IU", perMl: null });
  });

  it("flags a steroid cream on a newborn", () => {
    const ledger = buildLedger(
      [{ id: "c", doc_type: "prescription", event_date: "2026-09-10", details: { doctor: { name: "Dr. X" }, medicines: [{ name: "Hydrocortisone 1% cream", form: "cream", schedule: "1-0-1", durationDays: 7 }] } }],
      [],
      "2026-09-12",
    );
    const flags = ledgerFlags(ledger, resolveClock({ dob: "2026-09-01", sex: "male", birth: null }, "2026-09-12"));
    expect(flags[0]?.kind).toBe("age_route");
  });
});

describe("open loops", () => {
  it("notices a billed test whose result never came", () => {
    const b = imaad();
    const loops = openLoops(deriveLoops(b.documents.map((d) => ({ ...d, id: String(d.id), doc_type: String(d.doc_type), event_date: d.event_date as string, details: d.details })), b.entities, "2026-09-07"), "2026-09-07");
    expect(loops.map((l) => l.title)).toEqual(["Newborn screening panel result", "Follow-up with Dr. Roy"]);
  });

  it("makes the pending screen relevant the moment aspartame is in a product", async () => {
    const ctx = buildContext(imaad(), "2026-09-07");
    const words = ctx.ledger.flatMap((e) => e.excipients.map((x) => x.toLowerCase()));
    expect(relevantLoops(ctx.loops, "is the syrup ok?", [], words)[0]?.because).toMatch(/aspartame.*whether that's safe/);
  });
});

describe("self-correction", () => {
  it("replaces a misread weight and names the answers that leaned on it", async () => {
    const bundle = imaad({ facts: [{ id: "w1", key: "weight", label: "Weight", value: 3.7, unit: "kg", observed_on: "2026-09-07", source: "chat" }] });
    const plan = await run("sorry, I meant his weight is down to 3.3 kg, not up", bundle, "2026-09-07", mockModel, [{ messageId: "a1", factIds: ["w1"] }]);
    expect(plan.revisions).toHaveLength(1);
    expect(plan.revisions[0]?.before).toBe("3.7 kg");
    expect(plan.revisions[0]?.after).toBe("3.3 kg");
    expect(plan.revisions[0]?.affectedMessageIds).toEqual(["a1"]);
    expect(plan.context.series.get("weight")?.latest.value).toBe(3.3);
  });

  it("only treats a message as a correction when it says so", () => {
    expect(isCorrection("weight is 3.3 kg")).toBe(false);
    expect(isCorrection("actually it was 3.3")).toBe(true);
  });
});

describe("facts said in the chat", () => {
  const adult = resolveClock({ dob: "1992-08-11", sex: "female", birth: null }, "2026-09-01");
  it("pulls a BP reading off a home monitor", () => {
    const f = parseFacts("my omron says 99/64 this morning", "2026-09-01", adult);
    expect(f.map((x) => [x.key, x.value, x.source])).toEqual([
      ["bp_systolic", 99, "device"],
      ["bp_diastolic", 64, "device"],
    ]);
  });
  it("reads grams and Fahrenheit", () => {
    expect(parseFacts("weighed 3300 g at the clinic", "2026-09-01", adult)[0]?.value).toBe(3.3);
    expect(parseFacts("temperature 100.4 F", "2026-09-01", adult)[0]?.value).toBe(38);
  });
  it("leaves a number alone when it cannot tell what it measures", () => {
    expect(parseFacts("she slept 3 hours", "2026-09-01", adult)).toEqual([]);
  });
});

describe("the tier is a floor the model can only raise", () => {
  const says = (tier: ModelReply["tier"]): ChatModel => ({ id: "t", respond: async () => ({ paragraphs: ["x"], citations: [], followUps: [], basis: "general", tier }) });

  it("ignores a model that tries to reassure a day-6 bilirubin over the limit", async () => {
    const plan = await run("bilirubin 11.0 today", imaad({ entities: [] }), "2026-09-07", says("reassure"));
    expect(plan.decision.tier).toBe("contact_today");
  });

  it("lets a model make an answer more cautious", async () => {
    const plan = await run("a small rash on his cheek", imaad(), "2026-09-07", says("contact_today"));
    expect(plan.decision.tier).toBe("contact_today");
  });
});

describe("memory spans the household, narrowly", () => {
  it("surfaces scan dating over LMP, with the gap", () => {
    const ctx = buildContext(nisha(), "2026-09-01");
    expect(ctx.clock.label).toBe("Week 30 of pregnancy");
    expect(ctx.notes[0]?.text).toMatch(/By the LMP this is 25w 5d; the growth scan puts it at 30w/);
  });

  it("answers the admin questions off the same clock", async () => {
    const plan = await run("when can my maternity leave start?", nisha(), "2026-09-01");
    expect(plan.reply?.paragraphs.join(" ")).toMatch(/8 weeks before the due date, so from/);
  });
});

describe("readings in context", () => {
  const adult = (over: Partial<MemoryBundle> = {}): MemoryBundle => ({
    profile: { id: "a", name: "Athar Ali", dob: "1990-03-02", sex: "male", conditions: [], allergies: [], medications: [] },
    relations: [],
    pregnancies: [],
    documents: [],
    entities: [],
    facts: [],
    loops: [],
    stats: null,
    ...over,
  });
  const t = (id: string, value: number, observed_on: string) => ({ id, key: "temperature", label: "Temperature", value, unit: "°C", observed_on, source: "chat" });

  it("does not quote last month's temperature for tonight's fever, and asks for one", async () => {
    const plan = await run("fever since this morning", adult({ facts: [t("t1", 38.4, "2026-08-20")] }), "2026-10-01");
    expect(plan.reading).toEqual([]);
    expect(plan.reply?.paragraphs.join(" ")).toMatch(/Take a temperature and tell me the number/);
  });

  it("keeps a BP said on its own, and reads it the way doctors say it", async () => {
    const plan = await run("my bp is 142/94 today", adult(), "2026-10-01");
    expect(plan.facts.map((f) => f.key)).toEqual(["bp_systolic", "bp_diastolic"]);
    expect(plan.decision.tier).toBe("monitor");
    expect(plan.reply?.paragraphs[0]).toBe("Noted: Blood pressure 142/94 mmHg, today. I've kept it with Athar's readings.");
    expect(plan.reply?.paragraphs.join(" ")).toMatch(/140 or more counting as high for adults: over/);
  });

  it("treats a severe adult reading as a call today, not go now, unless there are symptoms", async () => {
    const plan = await run("bp 184/112 this morning", adult(), "2026-10-01");
    expect(plan.decision.tier).toBe("contact_today");
    expect(plan.script).not.toBeNull();
  });

  it("raises a lab-flagged value that bears on the symptom", async () => {
    const plan = await run("so tired lately", adult({ entities: [{ kind: "lab_value", name: "TSH", canonical_name: "tsh", value: 5.8, unit: "µIU/mL", ref_range: "0.4-4.5", flag: "high", event_date: "2026-08-27", document_id: "d" }] }), "2026-10-01");
    expect(plan.decision.tier).toBe("monitor");
    expect(plan.reply?.paragraphs.join(" ")).toMatch(/TSH 5.8 µIU\/mL is above the range the lab printed \(0.4-4.5\)/);
  });
});

describe("the answer shape for everyday baby worries", () => {
  const day22 = (): MemoryBundle => imaad({ profile: { ...(imaad().profile as Record<string, unknown>), dob: "2026-09-09" } });

  it("explains, lists what helps, suggests a paediatrician, invites a record, and offers a doctor", async () => {
    const plan = await run("He is feeling bit sleepy today and farting a lot recently", day22(), "2026-10-01");
    expect(plan.status).toBe("answered");
    expect(plan.decision.tier).toBe("monitor");
    const [first, ...rest] = plan.reply?.paragraphs ?? [];
    expect(first).toMatch(/^At 22 days old, gas is one of the most common things/);
    const tips = rest.find((p) => p.startsWith("Things that usually help:"));
    expect(tips).toMatch(/• Bicycle legs: with him on his back/);
    expect(tips).toMatch(/• Tummy massage/);
    const tail = rest.slice(-3);
    expect(tail[0]).toMatch(/better to have a paediatrician take a proper look/);
    expect(tail[1]).toMatch(/record or a reading you'd like to add/);
    expect(tail[2]).toBe("Shall I connect you with a paediatrician nearby, or set up an online consultation?");
    expect(plan.reply?.careOffer).toBe(true);
    expect(plan.decision.watchFor[0]).toMatch(/Hard to wake/);
  });

  it("still sends a very sleepy newborn straight to a doctor", async () => {
    const plan = await run("he is very sleepy and hard to wake for feeds", day22(), "2026-10-01");
    expect(plan.status).toBe("hard_stop");
  });

  it("says they, not he or she, when the profile has no sex", async () => {
    const b = day22();
    const plan = await run("so much gas lately", { ...b, profile: { ...(b.profile as Record<string, unknown>), sex: null } }, "2026-10-01");
    expect(plan.reply?.paragraphs.join(" ")).toMatch(/Burp them during/);
  });

  it("keeps an unfamiliar description general, and still offers a doctor", async () => {
    const plan = await run("he keeps hiccupping since yesterday", day22(), "2026-10-01");
    expect(plan.reply?.paragraphs[0]).toMatch(/^I don't have a specific guide for that yet/);
    expect(plan.reply?.careOffer).toBe(true);
  });
});

describe("booking from the chat", () => {
  it("'book test again' is answered by the rules, with a booking card, and never reaches the model", async () => {
    const plan = await run("Book the bilirubin test again", imaad(), "2026-09-08", noModel);
    expect(plan.status).toBe("answered");
    expect(plan.modelId).toBe("rules:booking");
    expect(plan.booking?.service).toBe("lab");
    expect(plan.booking?.tests.map((t) => t.id)).toEqual(["lft"]);
    expect(plan.reply?.paragraphs[0]).toMatch(/for Imaad again/);
  });

  it("a booking with a symptom still gets the model's answer, with the card under it", async () => {
    const plan = await run("Book a doctor, he has a cough", imaad(), "2027-06-01", mockModel);
    expect(plan.booking?.service).toBe("doctor");
    expect(plan.modelId).not.toBe("rules:booking");
  });

  it("an emergency is never turned into a booking", async () => {
    const plan = await run("book a doctor, I have chest pain", imaad(), "2026-09-08", noModel);
    expect(plan.status).toBe("escalate");
    expect(plan.booking).toBeNull();
  });
});

describe("insurance questions", () => {
  const policy = readPolicy({
    id: "pol",
    insurer: "Star Health",
    policy_no: "SH-1",
    policy_type: "family_floater",
    sum_insured: 500000,
    claimed: 0,
    end_date: "2027-06-30",
    room_rent: "1% of the sum insured a day",
    covered_profile_ids: ["b"],
  }) as Policy;
  const askedModel: ChatModel = {
    id: "spy",
    respond: async () => ({ paragraphs: ["model answer"], citations: [], followUps: [], basis: "general" }),
  };

  it("are answered from the saved policy, without the model", async () => {
    const plan = await run("is room rent capped on our insurance?", imaad({ policies: [policy] }), "2026-11-01", noModel);
    expect(plan.status).toBe("answered");
    expect(plan.reply?.paragraphs[0]).toContain("1% of the sum insured a day");
    expect(plan.reply?.basis).toBe("grounded");
  });

  it("only use policies that cover this person", async () => {
    const other = { ...policy, coveredProfileIds: ["someone-else"] };
    const plan = await run("what does my insurance cover?", imaad({ policies: [other] }), "2026-11-01", noModel);
    expect(plan.reply?.paragraphs[0]).toContain("don't have an insurance policy for Imaad");
  });

  it("with a symptom, go to the model, which sees the cover", async () => {
    let seen: unknown = null;
    const spy: ChatModel = { id: "spy", respond: async (req) => ((seen = req.memory.cover), askedModel.respond(req)) };
    const plan = await run("he has a mild nappy rash, is a doctor visit covered by insurance?", imaad({ policies: [policy] }), "2026-11-01", spy);
    expect(plan.reply?.paragraphs[0]).toBe("model answer");
    expect(JSON.stringify(seen)).toContain("Star Health");
  });
});
