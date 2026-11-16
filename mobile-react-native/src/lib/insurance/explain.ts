import { rupeesShort, shortDate } from "@/lib/records/details";

import { BENEFITS, benefitLabel, POLICY_TYPE_LABEL, PRE_EXISTING, policyState, SPECIFIC, waitingLeft, type BenefitKey, type Policy } from "./policy";

/*
 * Cover, in plain words, from the person's own policy and nothing else.
 *
 * THE RULE. Every sentence here comes from a field the person gave us (or a
 * document they uploaded). Where the policy details are silent, we SAY they
 * are silent and point at whoever can answer: the policy wording, the TPA,
 * the insurer. We never guess what a policy "usually" covers; a wrong "yes,
 * that's covered" costs someone a hospital bill. And we never give medical
 * advice here: this answers money and paperwork questions only.
 */

export type CoverTopic =
  | "room_rent"
  | "co_pay"
  | "waiting"
  | "cashless"
  | "claim"
  | "renewal"
  | "amount"
  | "exclusions"
  | BenefitKey
  | "hospital"
  | "condition"
  | "general";

const TOPIC_WORDS: [CoverTopic, RegExp][] = [
  ["room_rent", /room rent|room limit|room category|single room|private room|icu charges/i],
  ["co_pay", /co-?pay|copay|co-payment|pay from my pocket|share of the bill/i],
  ["waiting", /waiting period|pre-?existing|ped\b|after how long|how long (do|must) (i|we) wait|wait(ing)? (for|till)/i],
  ["cashless", /cashless|network hospital|tpa|third party administrator|which hospital/i],
  ["claim", /\bclaim|reimburs|bills? (back|refund)|file (a|the) claim/i],
  ["renewal", /renew|expir|valid till|valid until|lapse|premium due|when does (it|the policy) end/i],
  ["amount", /how much (cover|is left|left)|sum insured|cover amount|balance|used up|left this year|remaining/i],
  ["exclusions", /exclu|not covered|what isn'?t covered|what is not covered/i],
];

/** Is this a question about insurance at all? */
export function isCoverQuestion(text: string): boolean {
  // A bare "cover" is not enough: "should I cover the wound?" is first aid.
  if (/insur|mediclaim|health policy|my policy|the policy|\bclaim|cashless|\btpa\b|sum insured|premium|co-?pay|room rent|waiting period|pre-?existing/i.test(text)) return true;
  return /\b(is|are|am|will|would|does)\b[^?.!]{0,50}\b(covered|cover it)\b/i.test(text) || /\bcoverage\b/i.test(text);
}

/** A stay in hospital: the core of every health policy. Checked after the benefits, so "after hospital" stays pre/post. */
const HOSPITAL = /hospital (stay|stays|bill|bills|admission)|hospitali[sz](ed|ation)|\badmitted\b|\badmission\b|in-?patient|\bicu\b|stay(ing)? in (the )?hospital/i;
/** Long-term conditions people ask about by name ("is my diabetes covered?"). */
const CONDITION_WORDS = /diabet|sugar|\bbp\b|blood pressure|hypertens|thyroid|asthma|heart|cholesterol|kidney|arthritis|pcos|pcod/i;

export function coverTopic(text: string, conditions: readonly string[] = []): CoverTopic {
  for (const [topic, re] of TOPIC_WORDS) if (re.test(text)) return topic;
  const lower = text.toLowerCase();
  for (const b of BENEFITS) if (b.words.some((w) => lower.includes(w))) return b.key;
  if (HOSPITAL.test(text)) return "hospital";
  if (asksIfCovered(text) && (CONDITION_WORDS.test(text) || conditions.some((c) => c.length >= 3 && lower.includes(c.toLowerCase())))) return "condition";
  return "general";
}

const SILENT = "The details saved for this policy don't say.";
const where = (p: Policy) => (p.tpa ? `${p.tpa.name}${p.tpa.phone ? ` (${p.tpa.phone})` : ""}` : p.insurer);
const askLine = (p: Policy) => `The policy wording lists it under benefits or exclusions, or ${where(p)} can confirm.`;

/** The whole policy as short lines, for the policy page and the chat. */
export function coverSummary(p: Policy, names: string[], now: Date = new Date()): string[] {
  const s = policyState(p, now);
  const out: string[] = [];
  const who = names.length ? `Covers ${listWords(names)}` : "Nobody is linked to it yet";
  out.push(`${POLICY_TYPE_LABEL[p.policyType]} with ${p.insurer}${p.plan ? ` (${p.plan})` : ""}. ${who}.`);
  out.push(statusLine(p, now));
  out.push(
    p.claimed > 0
      ? `${rupeesShort(p.sumInsured)} cover, ${rupeesShort(p.claimed)} used, ${rupeesShort(s.remaining)} left this policy year.`
      : `${rupeesShort(p.sumInsured)} cover this policy year.`,
  );
  if (p.cashless !== null) out.push(p.cashless ? `Cashless at network hospitals${p.tpa ? `, through ${where(p)}` : ""}.` : "Not cashless: you pay the hospital and claim the money back.");
  if (p.roomRent) out.push(`Room rent: ${p.roomRent}.`);
  if (p.coPay) out.push(`Co-pay: ${p.coPay}.`);
  for (const w of p.waiting) out.push(waitingLine(w, now));
  if (p.benefits.length) out.push(`Includes: ${p.benefits.map(benefitLabel).join(", ")}.`);
  if (p.exclusions.length) out.push(`Not covered: ${p.exclusions.slice(0, 6).join("; ")}${p.exclusions.length > 6 ? "; and more in the policy" : ""}.`);
  return out;
}

function statusLine(p: Policy, now: Date): string {
  const s = policyState(p, now);
  if (s.status === "expired") return `It ended on ${shortDate(p.end)}. Nothing is covered until it's renewed.`;
  if (s.status === "not_started") return `It starts on ${shortDate(p.start)}.`;
  if (s.status === "renew_soon") return `It renews in ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"}, on ${shortDate(p.end)}. A policy that lapses can lose its waiting-period credit, so renew on time.`;
  if (s.status === "unknown") return "No end date saved, so I can't say when it renews.";
  return `Active till ${shortDate(p.end)}.`;
}

function waitingLine(w: { label: string; until: string | null }, now: Date): string {
  const left = waitingLeft(w, now);
  const what = w.label === PRE_EXISTING ? "Conditions you had before buying" : w.label === SPECIFIC ? "The illnesses the policy lists separately (often cataract, hernia, joint replacement)" : w.label;
  if (left === null) return `${what}: there's a waiting period, with no end date saved.`;
  if (left <= 0) return `${what}: the waiting period ended on ${shortDate(w.until)}, so they're covered now.`;
  return `${what}: covered from ${shortDate(w.until)}, ${left} day${left === 1 ? "" : "s"} from now.`;
}

function listWords(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const STOP = new Set(["unless", "except", "treatment", "treatments", "expenses", "charges", "related", "within", "first", "years", "after", "other", "their", "about", "covered"]);

/** A saved exclusion the question names ("cosmetic surgery" in "is cosmetic surgery covered?"). */
export function namedExclusion(text: string, p: Policy): string | null {
  const lower = text.toLowerCase();
  for (const line of p.exclusions) {
    const words = line.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5 && !STOP.has(w));
    if (words.some((w) => lower.includes(w))) return line;
  }
  return null;
}

const asksIfCovered = (text: string) => /\bcover(ed|s)?\b|pay for|paid for|claim for|included/i.test(text);

/** An answer about one topic from one policy. */
function answerFor(p: Policy, text: string, topic: CoverTopic, now: Date): string[] {
  const excluded = namedExclusion(text, p);
  if (excluded && topic !== "exclusions") return [`"${excluded}" is in the exclusions you saved for ${p.insurer}, so that isn't covered.`];
  if (topic === "general" && asksIfCovered(text) && /\b(is|are|does|do|will|can)\b/i.test(text)) return [`${SILENT} ${askLine(p)}`];
  return topicAnswer(p, topic, now);
}

function topicAnswer(p: Policy, topic: CoverTopic, now: Date): string[] {
  const s = policyState(p, now);
  switch (topic) {
    case "room_rent":
      return [p.roomRent ? `Room rent on ${p.insurer}: ${p.roomRent}. A room above the limit usually cuts the whole claim in proportion, not just the room, so ask the hospital for a room inside it.` : `${SILENT} ${askLine(p)}`];
    case "co_pay":
      return [p.coPay ? `Co-pay on ${p.insurer}: ${p.coPay}. That's the share of each claim you pay yourself.` : `No co-pay is saved for this policy. If there is one, it's in the policy schedule; ${where(p)} can confirm.`];
    case "waiting":
      return p.waiting.length ? p.waiting.map((w) => waitingLine(w, now)) : [`No waiting periods are saved for this policy. The policy schedule lists them, usually for conditions you had before buying.`];
    case "cashless":
      if (p.cashless === null) return [`${SILENT} whether it's cashless. ${where(p)} can say which hospitals are in the network.`];
      return [p.cashless ? `Yes, ${p.insurer} is set up as cashless. At a network hospital, show the policy card at the insurance desk and they ask ${where(p)} to approve it.` : "It's not cashless: you pay the hospital, keep every bill and report, and claim the money back."];
    case "claim":
      return [
        `To claim on ${p.insurer}, tell ${where(p)} within a day of a planned admission, or within a day of an emergency one.`,
        "Keep the discharge summary, every bill with its receipt, the reports and the prescriptions. Most claims that are turned down are missing one of these.",
      ];
    case "renewal":
      return [statusLine(p, now)];
    case "hospital":
      return hospitalAnswer(p, now);
    case "condition": {
      const ped = p.waiting.find((w) => w.label === PRE_EXISTING);
      return [
        "If it was there before the policy was bought, the insurer treats it as a pre-existing condition: hospital care for it is covered only once that waiting period is over, and only if it was declared when buying.",
        ped ? waitingLine(ped, now) : `No pre-existing waiting period is saved for this policy. The policy schedule says how long it is; ${where(p)} can confirm.`,
        "Treatment that doesn't need a hospital stay, like regular medicines and doctor visits, is usually outside a hospital policy unless OPD cover is included.",
      ];
    }
    case "amount":
      return [p.claimed > 0 ? `${rupeesShort(s.remaining)} of ${rupeesShort(p.sumInsured)} is left this policy year (${rupeesShort(p.claimed)} used).` : `${rupeesShort(p.sumInsured)} of cover this policy year. No claims are saved against it.`];
    case "exclusions":
      return [p.exclusions.length ? `Not covered, from what you saved: ${p.exclusions.join("; ")}.` : `No exclusions are saved for this policy. The policy wording has the full list.`];
    case "general":
      return coverSummary(p, [], now).slice(1, 5);
    default: {
      const label = benefitLabel(topic);
      if (p.benefits.includes(topic)) {
        const w = topic === "maternity" ? p.waiting.find((x) => /matern/i.test(x.label)) : null;
        return [`${label} is listed as included on ${p.insurer}.${w ? ` ${waitingLine(w, now)}` : ""} Limits and sub-limits are in the policy wording.`];
      }
      if (p.exclusions.some((x) => BENEFITS.find((b) => b.key === topic)?.words.some((word) => x.toLowerCase().includes(word)))) {
        return [`${label} is in the exclusions you saved for ${p.insurer}, so it isn't covered.`];
      }
      return [`${label}: ${SILENT} ${askLine(p)}`];
    }
  }
}

/** "Does it cover hospital stays?": yes is what the policy is for; the saved terms say what shapes the bill. */
function hospitalAnswer(p: Policy, now: Date): string[] {
  const s = policyState(p, now);
  if (s.status === "expired" || s.status === "not_started") return [statusLine(p, now)];
  const left = p.claimed > 0 ? `with ${rupeesShort(s.remaining)} of ${rupeesShort(p.sumInsured)} left this policy year` : `up to ${rupeesShort(p.sumInsured)} this policy year`;
  const out = [
    p.policyType === "top_up"
      ? `Hospital stays are what a top-up pays for, once a bill crosses the deductible in its schedule, ${left}.`
      : `Yes. A stay in hospital is what this policy is for: ${p.insurer} pays for it, ${left}.`,
  ];
  const terms: string[] = [];
  terms.push(p.roomRent ? `a room-rent limit (${p.roomRent.charAt(0).toLowerCase()}${p.roomRent.slice(1)})` : "no room-rent limit saved");
  if (p.coPay) terms.push(`a co-pay of ${p.coPay}`);
  if (p.cashless !== null) terms.push(p.cashless ? `cashless at network hospitals${p.tpa ? ` through ${where(p)}` : ""}` : "not cashless, so you pay and claim it back");
  out.push(`What shapes the bill: ${listWords(terms)}.`);
  const waiting = p.waiting.filter((w) => (waitingLeft(w, now) ?? 1) > 0);
  // A waiting period still running is the one thing that can turn a stay down.
  for (const w of waiting.slice(0, 2)) out.push(waitingLine(w, now));
  if (p.benefits.includes("pre_post")) out.push("Bills from just before and after the stay (tests, follow-up visits) are listed as included too.");
  return out;
}

export type CoverReply = { paragraphs: string[]; followUps: string[] };

/**
 * The chat's answer to an insurance question, from the person's own policies.
 * `name` is whose chat this is; `policies` are the ones that cover them.
 */
export function coverReply(text: string, name: string, policies: Policy[], now: Date = new Date(), conditions: readonly string[] = []): CoverReply {
  if (!policies.length) {
    return {
      paragraphs: [
        `I don't have an insurance policy for ${name} yet.`,
        "Add it in Profile, Insurance: the insurer, policy number, cover and dates are enough to start, and the policy PDF if you have it. Then I can answer questions like this from the policy itself.",
      ],
      followUps: [],
    };
  }
  const topic = coverTopic(text, conditions);
  const live = policies.filter((p) => policyState(p, now).status !== "expired");
  const use = live.length ? live : policies;
  const paragraphs: string[] = [];
  for (const p of use.slice(0, 3)) {
    const body = answerFor(p, text, topic, now);
    paragraphs.push(...(use.length > 1 ? [`${p.insurer}${p.plan ? ` ${p.plan}` : ""}: ${body[0]}`, ...body.slice(1)] : body));
  }
  if (!live.length) paragraphs.push(`Every policy saved for ${name} has ended, so check the dates or renew first.`);
  paragraphs.push("This is from the policy details you saved. The insurer's policy wording is what counts on a claim.");
  const follow =
    topic === "general"
      ? ["Is room rent capped?", "Any waiting periods?", "How do I claim?"]
      : topic === "claim"
        ? ["Is it cashless?", "How much cover is left?"]
        : topic === "hospital"
          ? ["How do I claim?", "Is room rent capped?", "What isn't covered?"]
          : topic === "condition"
            ? ["Any waiting periods?", "Is OPD covered?"]
            : ["How do I claim?", "What isn't covered?"];
  return { paragraphs, followUps: follow };
}

/** For the model: each policy as a few plain lines it can quote, never invent from. */
export function coverDigest(policies: Policy[], namesFor: (p: Policy) => string[], now: Date = new Date()): { insurer: string; lines: string[] }[] {
  return policies.slice(0, 4).map((p) => ({ insurer: p.insurer, lines: coverSummary(p, namesFor(p), now) }));
}
