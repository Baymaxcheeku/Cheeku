import { answerQuestion, type GroundingRecord } from "@/lib/ai/mock/answer";
import type { DocType, RecordEntity } from "@/lib/records/types";

import { shortDate } from "@/lib/records/details";

import { weeksBefore } from "./clock";
import type { ChatModel, MemoryDigest, ModelReply, ModelRequest } from "./model";

/*
 * THE STAND-IN MODEL.
 *
 * Until Cheeku's fine-tuned model is wired in, this answers from the digest
 * alone, the same input the real one will get. That is the point of it: if
 * this can write a useful, specific answer from the digest, the contract is
 * carrying enough, and the real model only has to write it better.
 *
 * It picks one of five shapes by what the question is about, and writes like
 * the reference thread did: the person's name, the actual numbers and dates,
 * one clear next step, no filler.
 */

const MED = /\b(medicines?|medications?|meds|tablets?|capsules?|syrups?|drops?|creams?|ointments?|supplements?|doses?|taking|take (it|them|both)|together|prescribed|vitamins?|sachets?|pills?)\b/i;
const LOOPS = /\b(pending|due|follow.?up|missing|still waiting|not back|results? (come|back)|what'?s left|open items?|anything (left|due|pending)|chase)\b/i;
const CLOCK = /\b(how many weeks|weeks pregnant|due date|\bedd\b|maternity (leave|pay|benefit)|fly|flight|airline|travel|hospital bag|birth certificate|how old|day of life|what week)\b/i;

function groundingRecords(m: MemoryDigest): GroundingRecord[] {
  return m.records.map((r) => ({
    id: r.id,
    profileId: "",
    profileName: m.person.firstName,
    profileAvatarSeed: null,
    title: r.title,
    docType: r.type as DocType,
    status: "filed",
    mimeType: "application/pdf",
    eventDate: r.date,
    facility: r.facility,
    doctor: r.doctor,
    confidence: null,
    severity: "normal",
    createdAt: r.date ?? "",
    entities: r.values.map(
      (v, i): RecordEntity => ({
        id: `${r.id}-${i}`,
        kind: "lab_value",
        name: v.name,
        canonicalName: null,
        value: Number.isFinite(Number.parseFloat(v.value)) ? Number.parseFloat(v.value) : null,
        valueText: v.value,
        unit: v.value.split(" ").slice(1).join(" ") || null,
        refRange: v.range,
        flag: (v.flag as RecordEntity["flag"]) ?? null,
        eventDate: r.date,
      }),
    ),
  }));
}

/** The readings this question is about, blood pressure as one line. */
function focusLines(m: MemoryDigest): string[] {
  const focus = m.readings.filter((r) => r.focus);
  const lines: string[] = [];
  const sys = focus.find((r) => r.key === "bp_systolic");
  const dia = focus.find((r) => r.key === "bp_diastolic");
  for (const r of focus) {
    if (r.key === "bp_diastolic") continue;
    // A within-range read says little next to a change the rules already named.
    if (r.read && !(m.changes.length && /: within it\.$/.test(r.read))) {
      lines.push(r.read);
      continue;
    }
    if (r.read) continue;
    if (r.key === "bp_systolic" && dia && sys) {
      const now = `${sys.latest.value}/${dia.latest.value} on ${shortDate(sys.latest.date)}`;
      lines.push(
        sys.previous && dia.previous
          ? `Blood pressure went from ${sys.previous.value}/${dia.previous.value} on ${shortDate(sys.previous.date)} to ${now}.`
          : `Blood pressure ${now}.`,
      );
      continue;
    }
    if (r.change) lines.push(`${r.name} went from ${r.change}.`);
  }
  return lines;
}

function symptomReply(req: ModelRequest): ModelReply {
  const m = req.memory;
  const [first, ...rest] = m.symptoms;
  if (!first) return { paragraphs: [], citations: [], followUps: [], basis: "general" };
  const name = m.person.firstName;
  const paragraphs: string[] = [first.mechanism];
  for (const s of rest.slice(0, 1)) paragraphs.push(s.mechanism);

  if (m.logged.length) paragraphs.push(`Noted: ${m.logged.join("; ")}. I've kept it with ${name}'s readings.`);
  const own = [...m.changes, ...focusLines(m).filter((l) => !m.changes.some((c) => c.startsWith(l.slice(0, 12))))];
  if (own.length) paragraphs.push(`From ${name}'s own numbers: ${own.slice(0, 3).join(" ")}`);
  else if (m.askForReadings.length) paragraphs.push(`There's no recent reading on file for this, so I'm going on what you've described. ${m.askForReadings[0]}`);
  // Notes (blood group, dating) are drawn beside the answer, not repeated in it.
  const tier = req.floor.tier;
  const stage = m.person.modifiers.some((x) => x === "pregnant" || x === "neonate" || x === "postpartum") ? `For ${m.person.clock.toLowerCase()}, this` : "This";
  if (tier === "reassure") paragraphs.push(`${stage} fits the usual pattern. ${first.homeCare.slice(0, 2).join(" ")}`);
  else if (tier === "monitor") {
    const flagged = m.changes.some((c) => c.includes("the lab printed")) ? " The values outside the lab's range are worth raising at the next appointment." : "";
    paragraphs.push(`Nothing here needs a doctor tonight.${flagged} ${first.homeCare[0] ?? ""} Keep an eye on the signs below; any one of them changes the answer, and I'd want you to call.`);
  }
  else if (tier === "contact_today") paragraphs.push("This is worth a call to the doctor today, not an emergency. I've written out what to tell them below, with the numbers, so the call takes two minutes.");

  return {
    paragraphs,
    citations: [],
    followUps: tier === "contact_today" ? ["Find the doctor's number", "What if it gets worse tonight?"] : ["What would make this urgent?", "Log a reading"],
    basis: own.length ? "grounded" : "general",
  };
}

/** A reading said on its own: keep it, place it against the last one, say what it means. */
function loggedReply(req: ModelRequest): ModelReply {
  const m = req.memory;
  const name = m.person.firstName;
  const paragraphs = [`Noted: ${m.logged.join("; ")}. I've kept it with ${name}'s readings.`];
  const own = [...m.changes, ...focusLines(m)];
  if (own.length) paragraphs.push(own.slice(0, 3).join(" "));
  const tier = req.floor.tier;
  if (tier === "monitor") paragraphs.push("One reading isn't a verdict. Sit quietly for five minutes and take it again. If it stays up on a few days this week, the doctor will want to see the numbers, and I'll have them ready.");
  else if (tier === "contact_today") paragraphs.push("That's high enough to call the doctor about today. If there's a headache, chest pain, breathlessness or blurred vision with it, don't wait: go now.");
  else if (tier === "go_now") paragraphs.push("That's in the range where someone should be seen now.");
  return { paragraphs, citations: [], followUps: ["Show the trend", "What would make this urgent?"], basis: "grounded" };
}

function medicineReply(req: ModelRequest): ModelReply {
  const m = req.memory;
  const active = m.medicines.filter((x) => x.status !== "ended");
  if (!active.length) {
    return {
      paragraphs: [`I don't have any current medicines on file for ${m.person.firstName}. Add a prescription or a photo of the box and I'll keep track of what's in it, including anything that doubles up.`],
      citations: [],
      followUps: ["Add a prescription"],
      basis: "silent",
    };
  }
  const paragraphs = [`${m.person.firstName} is currently on: ${active.map((x) => x.name).join(", ")}.`];
  const flagged = m.flags.filter((f) => f.tier !== "reassure");
  if (flagged.length) for (const f of flagged.slice(0, 2)) paragraphs.push(`${f.title}. ${f.text}`);
  else paragraphs.push("Nothing on that list doubles up on the same ingredient, and nothing stands out for this age.");
  const supplements = m.flags.filter((f) => f.tier === "reassure");
  for (const f of supplements.slice(0, 1)) paragraphs.push(f.text);
  paragraphs.push("I won't change a dose or tell anyone to stop something. If two things above need sorting out, the prescriber is the person to ask, and the list above is what to show them.");
  return { paragraphs, citations: [], followUps: ["What does each one contain?", "Add a medicine box"], basis: "grounded" };
}

function loopsReply(req: ModelRequest): ModelReply {
  const m = req.memory;
  if (!m.loops.length) {
    return { paragraphs: [`Nothing is waiting on ${m.person.firstName}'s side right now: no tests ordered without a result, no follow-up coming up, no vaccine due.`], citations: [], followUps: [], basis: "grounded" };
  }
  return {
    paragraphs: [
      `Here's what's still open for ${m.person.firstName}:`,
      ...m.loops.map((l) => `${l.title}. ${l.when}.${l.because ? ` ${l.because}` : ""}`),
      ...(m.loops.some((l) => l.type === "result_pending") ? ["Results that were billed but never arrived are the easy ones to lose track of. A quick call to the lab with the bill number usually finds them."] : []),
    ],
    citations: [],
    followUps: ["Remind me about these", "Which one matters most?"],
    basis: "grounded",
  };
}

function clockReply(req: ModelRequest): ModelReply {
  const m = req.memory;
  const q = req.question.toLowerCase();
  const paragraphs: string[] = [`${m.person.firstName}: ${m.person.clock}.`];
  const edd = m.person.edd;
  if (edd) paragraphs.push(`Due date: ${shortDate(edd)}${m.notes.some((n) => /due date/.test(n)) ? ", going by the scan" : ""}.`);
  if (/maternity/.test(q) && edd) {
    paragraphs.push(
      `In India, the Maternity Benefit Act lets paid leave start up to 8 weeks before the due date, so from ${shortDate(weeksBefore(edd, 8))}, out of 26 weeks in total for a first or second child. HR will want the due date from the scan, not the LMP.`,
    );
  }
  if (/fly|flight|airline|travel/.test(q) && m.person.modifiers.includes("pregnant")) {
    paragraphs.push("Most airlines ask for a doctor's fitness letter from 28 weeks and stop carrying passengers around 36 weeks, or 32 for twins. The airline's own rule is the one that counts, and travel insurance often has its own, earlier cut-off.");
  }
  if (/hospital bag/.test(q)) paragraphs.push("Most people have the hospital bag packed by 36 weeks, so it's ready if the baby comes early.");
  if (/birth certificate/.test(q)) paragraphs.push("The hospital usually registers the birth and the certificate comes from the local municipal office. Keep the discharge summary handy: it has the exact time, weight and the parents' details the form asks for.");
  if (!edd && paragraphs.length === 1) paragraphs.push("Everything I work out for this, from thresholds to due dates, runs off this clock, so tell me if a date looks wrong.");
  return { paragraphs, citations: [], followUps: [], basis: "grounded" };
}

function recordsReply(req: ModelRequest): ModelReply {
  const answer = answerQuestion(req.question, groundingRecords(req.memory), req.memory.person.conditions);
  const reads = req.memory.readings.filter((r) => r.read).slice(0, 2);
  const paragraphs = [...answer.paragraphs];
  if (reads.length && answer.kind === "grounded") paragraphs.splice(paragraphs.length - 1, 0, ...reads.map((r) => r.read as string));
  return { paragraphs, citations: answer.citations, followUps: answer.followUps, basis: answer.kind };
}

export const mockModel: ChatModel = {
  id: "cheeku-mock-1",
  async respond(req) {
    if (req.memory.symptoms.length) return symptomReply(req);
    if (req.memory.logged.length) return loggedReply(req);
    if (CLOCK.test(req.question)) return clockReply(req);
    if (LOOPS.test(req.question)) return loopsReply(req);
    if (MED.test(req.question) || req.memory.medicines.some((m) => req.question.toLowerCase().includes(m.name.toLowerCase().split(" ")[0] ?? "~"))) return medicineReply(req);
    return recordsReply(req);
  },
};
