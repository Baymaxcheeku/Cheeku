import type { SafetyResult } from "@/lib/safety/detect";

import type { ResolvedClock } from "./clock";
import type { LedgerFlag } from "./ledger";
import type { NotableChange } from "./series";
import type { populationOf} from "./symptoms";
import { type SymptomMatch } from "./symptoms";
import type { ThresholdRead } from "./thresholds";
import { maxTier, TIER_RANK, type Tier, type TierReason } from "./types";

/*
 * THE ESCALATION LADDER.
 *
 * Every symptom resolves to exactly one of four tiers:
 *
 *   reassure       fits the expected pattern for where they are on their clock.
 *                  Explain the mechanism, say what helps at home.
 *   monitor        plausible but unconfirmed. Name the exact signs that would
 *                  move it up.
 *   contact_today  needs a clinician, not urgently. Script the call.
 *   go_now         red flags. Where to go and the number, no hedging.
 *
 * HARD-STOPS OVERRIDE THE MODEL. Some combinations bypass reasoning entirely:
 * reduced movements at 26 weeks, a fever in a three-week-old. No amount of
 * text substitutes for an examination, so these get a go-now answer with no
 * analysis at all. They sit beside the safety lexicon (`lib/safety`), which is
 * frozen and tested on its own; these rules are the clock-aware layer the
 * lexicon cannot express, because it has no idea who is speaking.
 *
 * The model can raise a tier. Nothing it says can lower one.
 */

export type HardStop = { id: string; title: string; text: string; where: string };

type Rule = { id: string; who: (c: ResolvedClock) => boolean; all: RegExp[]; any?: RegExp[]; title: string; text: string; where: string };

const pregnantFrom = (weeks: number) => (c: ResolvedClock) => c.relative?.kind === "gestational" && c.relative.weeks >= weeks;
const pregnant = (c: ResolvedClock) => c.relative?.kind === "gestational";
const under3Months = (c: ResolvedClock) => c.ageDays !== null && c.ageDays <= 90;
const newborn = (c: ResolvedClock) => c.relative?.kind === "day_of_life";
const postpartum = (c: ResolvedClock) => c.relative?.kind === "postpartum";

const LABOUR_WARD = "the labour ward or maternity emergency where the delivery is booked, or the nearest one";
const PAEDS = "the nearest children's emergency department";

export const HARD_STOPS: readonly Rule[] = [
  {
    id: "reduced-movement",
    who: pregnantFrom(24),
    all: [/(less|fewer|reduced|no|not|hardly any|stopped|kam|slow(er)?)\b.{0,25}\b(movement|moving|kick)|\b(movement|moving|kicks?)\b.{0,25}\b(less|fewer|reduced|stopped|slowed|kam|not)\b|baby (is ?n[o']?t|isnt|has ?n[o']?t) (moving|kicked)/i],
    title: "A change in the baby's movements needs checking now",
    text: "Fewer movements, or a change in their pattern, is checked with a monitor at the hospital the same day, every time. Please don't wait to see if it picks up, and don't rely on a home doppler.",
    where: LABOUR_WARD,
  },
  {
    id: "pelvic-pain-movement",
    who: pregnantFrom(20),
    all: [/pelvic (pain|pressure)|pressure (low down|in the pelvis)|pain low down/i],
    title: "Pelvic pressure at this stage needs an examination",
    text: "Pain or pressure low down in the middle of a pregnancy needs a doctor to examine the cervix. That cannot be done from a description, so it should be seen today, now rather than later.",
    where: LABOUR_WARD,
  },
  {
    id: "pregnancy-bleeding",
    who: pregnant,
    all: [/\b(bleed(ing)?|blood) (from|down there|vaginal)|\bvaginal bleed|\bheavy bleed|\bbleeding\b/i],
    title: "Bleeding in pregnancy needs to be seen now",
    text: "Any bleeding in pregnancy is assessed in person. Take a pad with you so they can see how much.",
    where: LABOUR_WARD,
  },
  {
    id: "waters",
    who: pregnant,
    all: [/water(s)? (broke|break|has broken|leak)|leaking (fluid|water)|fluid (leak|coming)|gush of (fluid|water)/i],
    title: "Leaking fluid needs checking now",
    text: "If the waters may have broken, the hospital wants to check you and the baby straight away, whatever the stage.",
    where: LABOUR_WARD,
  },
  {
    id: "preeclampsia-signs",
    who: pregnantFrom(20),
    all: [/headache|sir dard|sar dard/i],
    any: [/vision|blurr|spots|flash|seeing stars/i],
    title: "Headache with vision changes needs checking now",
    text: "A headache together with blurred vision or flashing lights after 20 weeks is checked straight away, with a blood pressure reading and a urine test.",
    where: LABOUR_WARD,
  },
  {
    id: "preterm-contractions",
    who: (c) => c.relative?.kind === "gestational" && c.relative.weeks < 37,
    all: [/contraction|tightenings? (every|coming)|labou?r pains?/i],
    title: "Regular contractions before 37 weeks need checking now",
    text: "Tightenings that come regularly before 37 weeks are checked at the hospital the same day.",
    where: LABOUR_WARD,
  },
  {
    id: "young-baby-fever",
    who: under3Months,
    all: [/\bfever|\bbukhar|\bhot to (the )?touch|high temp|\btemperature\b.{0,12}\b(3[8-9]|10[0-4])/i],
    title: "A fever under 3 months old needs a doctor now",
    text: "Babies this young can be unwell without showing it, so any temperature of 38°C (100.4°F) or more is seen straight away, even if the baby seems fine otherwise.",
    where: PAEDS,
  },
  {
    id: "young-baby-not-feeding",
    who: under3Months,
    all: [/not (feeding|drinking|taking (feeds|milk))|won'?t (feed|drink|take)|refus(ing|es) (feeds|milk|to feed)|stopped feeding/i],
    title: "A young baby who is not feeding needs to be seen now",
    text: "Missing feeds in the first weeks can tip into dehydration and low sugar quickly.",
    where: PAEDS,
  },
  {
    id: "young-baby-floppy",
    who: under3Months,
    all: [/floppy|limp|hard to wake|won'?t wake|very sleepy|unresponsive|blue (lips|tinge)|turning blue|fit\b|seizure|jerking/i],
    title: "This needs a doctor now",
    text: "A baby who is floppy, very hard to wake, turning blue or having jerking movements needs emergency care.",
    where: PAEDS,
  },
  {
    id: "newborn-jaundice-severe",
    who: newborn,
    all: [/yellow|jaundice|pee?liya/i],
    any: [/palms?|soles?|feet|legs|day (one|1|0)\b|first day|born (today|yesterday)|white (stool|poo)|pale (stool|poo)|chalky/i],
    title: "This kind of yellowing needs to be seen today, now",
    text: "Yellow reaching the palms or soles, yellow on the first day, or pale chalky stools are the signs doctors want to see in person straight away, with a bilirubin test.",
    where: PAEDS,
  },
  {
    id: "postpartum-bleeding",
    who: postpartum,
    all: [/soak(ing|ed)? (a |through )?pad|heavy bleed|large clots|bleeding (heavily|a lot|more)/i],
    title: "Heavy bleeding after birth needs care now",
    text: "Soaking a pad an hour, or passing large clots, is an emergency after giving birth.",
    where: LABOUR_WARD,
  },
  {
    id: "postpartum-clot",
    who: postpartum,
    all: [/(calf|leg) (pain|swelling|swollen)|one leg (swollen|swelling|painful)/i],
    title: "A painful swollen leg after birth needs checking now",
    text: "After giving birth the risk of a clot in the leg is higher, and it is checked the same day.",
    where: "the nearest emergency department",
  },
];

/** The first hard-stop this message trips for this person, or null. */
export function hardStopFor(text: string, clock: ResolvedClock): HardStop | null {
  for (const r of HARD_STOPS) {
    if (!r.who(clock)) continue;
    if (!r.all.every((p) => p.test(text))) continue;
    if (r.any && !r.any.some((p) => p.test(text))) continue;
    return { id: r.id, title: r.title, text: r.text, where: r.where };
  }
  return null;
}

export type TierDecision = {
  /** Null for a plain question with nothing clinical in it ("when is the follow-up?"). */
  tier: Tier | null;
  reasons: TierReason[];
  hardStop: HardStop | null;
  /** The specific signs that would move it up a tier, for monitor and below. */
  watchFor: string[];
};

/**
 * One tier from every signal. The rules set a floor; `modelTier` can only
 * raise it. A hard-stop or an escalate from the lexicon short-circuits.
 */
export function decideTier(input: {
  gate: SafetyResult;
  hardStop: HardStop | null;
  symptoms: readonly SymptomMatch[];
  reads: readonly ThresholdRead[];
  changes: readonly NotableChange[];
  flags: readonly LedgerFlag[];
  clock: ResolvedClock;
  modelTier?: Tier | null;
  /** Anything else the rules found, like a lab-flagged value tied to the symptom. */
  extra?: readonly TierReason[];
}): TierDecision {
  const reasons: TierReason[] = [];

  if (input.gate.status === "escalate") {
    reasons.push({ tier: "go_now", source: "lexicon", text: "The message describes an emergency." });
    return { tier: "go_now", reasons, hardStop: null, watchFor: [] };
  }
  if (input.hardStop) {
    reasons.push({ tier: "go_now", source: "hard_stop", text: input.hardStop.title });
    return { tier: "go_now", reasons, hardStop: input.hardStop, watchFor: [] };
  }

  if (input.gate.status === "tier2") reasons.push({ tier: "contact_today", source: "lexicon", text: "What was described is worth a doctor seeing today." });
  for (const s of input.symptoms) reasons.push({ tier: s.tier, source: "symptom", text: `${s.model.label}, for ${populationLabel(s.population)}` });
  for (const r of input.reads) reasons.push({ tier: r.tier, source: "threshold", text: r.text });
  for (const c of input.changes) reasons.push({ tier: c.kind === "weight_loss" ? "contact_today" : "monitor", source: "trend", text: c.text });
  for (const f of input.flags) if (TIER_RANK[f.tier] >= TIER_RANK.monitor) reasons.push({ tier: f.tier, source: "ledger", text: f.title });
  for (const r of input.extra ?? []) reasons.push(r);
  if (input.modelTier) reasons.push({ tier: input.modelTier, source: "model", text: "The model's own reading." });

  const tier = reasons.length ? maxTier(...reasons.map((r) => r.tier)) : null;
  reasons.sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);

  const watchFor = tier && TIER_RANK[tier] <= TIER_RANK.monitor ? [...new Set(input.symptoms.flatMap((s) => s.watchFor))].slice(0, 5) : [];
  return { tier, reasons, hardStop: null, watchFor };
}

function populationLabel(p: ReturnType<typeof populationOf>): string {
  return { neonate: "a newborn", infant: "a baby", child: "a child", adult: "an adult", older_adult: "an older adult", pregnant: "pregnancy", postpartum: "the weeks after birth" }[p];
}
