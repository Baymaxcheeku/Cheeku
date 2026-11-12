import { goalForArea } from "@/lib/longevity/areas";

import type { ChatAction, MemoryDigest, ModelReply, ModelRequest, WorldDigest } from "./model";

/*
 * THE SPARROW'S SCRIPTED TURNS.
 *
 * Until Archit plugs the real model in (docs/master/CHEEKU_CHAT_PROMPT.md),
 * the stand-in answers these from the digest, in Cheeku's own voice, so the
 * whole flow can be felt end to end: longevity areas, the week, goals,
 * the watch, bookings and the family round-up.
 *
 * THE VOICE (owner's pick, 11 Nov 2026): a playful sparrow. Light, warm,
 * a little bird humour, never at the person's expense and never when
 * something is worrying. The rules decide "worrying": these turns only run
 * when the floor is below "monitor", and they never touch a symptom.
 */

export const LONGEVITY = /\b(how am i doing|how(?:'s| is) (?:my|\w+'?s?) health|am i (?:healthy|ok|okay|fit)|longevity|overall|health (?:check|summary|report card|overview)|kaisa chal raha|my areas)\b/i;
export const WEEK = /\b(my week|(?:\w+'s )?week(?:ly)? (?:summary|check.?in|review)|how was (?:my|the|\w+'s) week|this week so far|weekly|hafta|hafte)\b/i;
export const DEVICE = /\b(how did i sleep|my sleep|sleep (?:this|last) week|my steps|steps (?:this|today)|resting heart|heart rate|hrv|my watch|fitbit|apple health|health connect|workouts?|how active)\b/i;
export const CARE = /\b(my (?:bookings?|appointments?|tests booked|classes)|upcoming|what(?:'s| is) booked|any (?:bookings?|appointments?)|next (?:test|appointment|class))\b/i;
const WANTS = /\b(want|wanna|help me|trying|i'?d like|goal|plan to|need to|chahta|chahti|start)\b/i;
const GOAL_WORDS: { goal: "sleep" | "weight" | "sugar" | "legs" | "calm"; match: RegExp }[] = [
  { goal: "weight", match: /\b(lose weight|weight (?:loss|kam)|reduce (?:my )?weight|lose \d+ ?kg|patla|slim down)\b/i },
  { goal: "sleep", match: /\b(sleep better|better sleep|more sleep|sleep more|neend)\b/i },
  { goal: "sugar", match: /\b((?:control|lower|reduce|manage|bring down) (?:my )?sugar|sugar (?:control|kam)|reverse (?:my )?(?:diabetes|prediabetes))\b/i },
  { goal: "legs", match: /\b(walk more|more steps|get fit(?:ter)?|be fit(?:ter)?|more active|exercise more|stronger legs)\b/i },
  { goal: "calm", match: /\b(stress less|less stress|calm(?:er)? down|be calmer|relax more|less tension|anxious less)\b/i },
];

const OPENERS = ["Chirp!", "Hopped through your numbers.", "Here's what my little notebook says.", "Perched on your file for a second."];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** A light opener, its own short paragraph, picked by the question so a repeat reads the same. */
function opener(q: string): string {
  return OPENERS[hash(q) % OPENERS.length]!;
}

/** How an area reads mid-sentence: "your heart and BP", not "heart and bp". */
const AREA_SAY: Record<string, string> = { heart: "your heart and BP", sugar: "sugar", sleep: "sleep", movement: "moving more", weight: "weight", checkups: "the check-ups" };

const WORD = { on_track: "on track", watch: "worth watching", act: "needs a step", unknown: "not enough to go on" } as const;

function calm(req: ModelRequest): boolean {
  const t = req.floor.tier;
  return t === null || t === "reassure";
}

function areasOf(w: WorldDigest) {
  return w.longevity.filter((a) => a.status !== "unknown");
}

function sampleNote(w: WorldDigest): string[] {
  return w.longevity.some((a) => a.sample) || w.device.some((d) => d.startsWith("Sample data")) ? ["(The watch numbers are sample data for now, not real readings.)"] : [];
}

const GOAL_LABEL = { sleep: "sleep", weight: "weight", sugar: "sugar", legs: "movement", calm: "stress" } as const;

function goalAction(goal: keyof typeof GOAL_LABEL, label?: string): ChatAction {
  return { type: "set_goal", goal, label: label ?? `Make ${GOAL_LABEL[goal]} my goal` };
}

const open = (route: string, label: string): ChatAction => ({ type: "open", route, label });

// ------------------------------------------------------------------ turns --

function loggedActivity(req: ModelRequest, w: WorldDigest): ModelReply {
  const said = w.today.justLogged;
  const paragraphs = [`Noted: ${said.join(" and ")}. Tucked into today's log.`];
  const steps = w.today.stepsToday;
  if (said.some((s) => s.includes("steps")) && steps !== null) {
    const left = 8000 - steps;
    paragraphs.push(left > 0 ? `${left.toLocaleString("en-IN")} more and today hits 8,000. One evening walk after dinner does it.` : "That's past 8,000 for the day. Wings well stretched!");
  }
  const sleep = said.find((s) => s.includes("sleep"));
  if (sleep) {
    const h = Number(sleep.split("h")[0]);
    paragraphs.push(h < 6 ? "That's a short night. Tonight, try lights out half an hour earlier and the phone outside the room. I'll watch the week, not just one night." : h >= 7 ? "A proper night's rest. Love to see it." : "Not bad. Seven hours is the sweet spot if the day allows it.");
  }
  return { paragraphs, citations: [], followUps: ["How was my week?", "How am I doing overall?"], basis: "grounded", actions: [open("/today", "See today's plan")] };
}

function longevity(req: ModelRequest, w: WorldDigest): ModelReply {
  const name = req.memory.person.firstName;
  const areas = areasOf(w);
  if (!areas.length) {
    return {
      paragraphs: [`I don't have enough on ${name} yet to say how the big areas look. A recent blood report and a connected watch are the two things that tell me most.`, "Send me a report, or connect Apple Health or Health Connect, and I'll start a proper picture."],
      citations: [],
      followUps: ["What tests should I do yearly?"],
      basis: "silent",
      actions: [open("/wearables/connect", "Connect a watch")],
    };
  }
  const focus = areas.find((a) => a.status === "act") ?? areas.find((a) => a.status === "watch") ?? null;
  const goal = focus ? goalForArea(focus.area as never) : null;
  const paragraphs = [
    opener(req.question),
    `Here's how ${name} is doing, area by area:\n${areas.map((a) => `• ${a.label}: ${WORD[a.status]}. ${a.line}`).join("\n")}`,
    ...sampleNote(w),
    focus
      ? `If I had to pick one thing, it's ${AREA_SAY[focus.area] ?? focus.label}. Not a big overhaul: one small change a day. That's how sparrows build nests, one twig at a time.`
      : `Everything I can see is on track. Keep doing what you're doing, and keep the yearly check-up on the calendar.`,
  ];
  return {
    paragraphs,
    citations: [],
    followUps: ["How was my week?", focus ? `What helps ${AREA_SAY[focus.area] ?? focus.label}?` : "What should I test this year?"],
    basis: "grounded",
    actions: [...(goal ? [goalAction(goal)] : []), open("/today", "Today's plan")],
  };
}

function week(req: ModelRequest, w: WorldDigest): ModelReply {
  const name = req.memory.person.firstName;
  const pick = (k: string) => w.longevity.find((a) => a.area === k && a.status !== "unknown");
  const lines: string[] = [];
  for (const k of ["movement", "sleep", "heart"]) {
    const a = pick(k);
    if (a) lines.push(`• ${a.label}: ${a.line}`);
  }
  if (w.today.goal) lines.push(`• Goal: ${w.today.goal}.`);
  if (w.care.upcoming[0]) lines.push(`• Coming up: ${w.care.upcoming[0]}.`);
  const loop = req.memory.loops[0];
  if (loop) lines.push(`• Still open: ${loop.title}, ${loop.when.toLowerCase()}.`);
  if (!lines.length) {
    return {
      paragraphs: [`Not much to sum up for ${name}'s week yet. Connect a watch or tell me your steps and sleep here ("slept 6 hours", "walked 5k") and next week's check-in will have real numbers.`],
      citations: [],
      followUps: [],
      basis: "silent",
      actions: [open("/wearables/connect", "Connect a watch")],
    };
  }
  return {
    paragraphs: [opener(req.question), `${name}'s week, in a sunflower seed:\n${lines.join("\n")}`, ...sampleNote(w), "And how did the week feel to you, honestly? Numbers only tell half of it."],
    citations: [],
    followUps: ["Tired", "Okay", "Flying"],
    basis: "grounded",
    actions: [open("/wearables", "See all my numbers")],
  };
}

const GOAL_TEXT: Record<keyof typeof GOAL_LABEL, string> = {
  weight: "Slow and steady wins this one: half a kilo a week is plenty, and it stays off. I'll shape the daily plan around one food swap and a walk, and keep weight in your weekly check-in.",
  sleep: "Good sleep fixes more than people think: sugar, mood, cravings, BP. I'll put a wind-down step in the evening plan and watch your nights with you.",
  sugar: "Sugar responds well to small daily things: a walk after meals, fewer sweet drinks, dal or salad before rice. I'll build those into the plan and line up the next HbA1c when it's due.",
  legs: "Love it. We'll build up gently from where you are, a few hundred steps more each week, so it sticks instead of hurting.",
  calm: "Calmer is a real health goal, not a soft one: it shows up in BP and sleep. I'll add a five-minute breather to the plan and check in on how the week felt.",
};

function goalTurn(req: ModelRequest, w: WorldDigest, goal: keyof typeof GOAL_LABEL): ModelReply {
  const m = req.memory;
  if (goal === "weight" && m.person.modifiers.includes("pregnant")) {
    return { paragraphs: ["Not a weight-loss goal during pregnancy: the baby needs you to gain, steadily. Your doctor tracks it at each visit. I can make sleep or gentle walks the goal instead."], citations: [], followUps: [], basis: "general", actions: [goalAction("sleep", "Make sleep my goal"), goalAction("legs", "Gentle walks instead")] };
  }
  const area = w.longevity.find((a) => goalForArea(a.area as never) === goal && a.status !== "unknown");
  const paragraphs = [`${GOAL_TEXT[goal]}`];
  if (area) paragraphs.push(`Where you are now: ${area.line}`);
  paragraphs.push("Tap below and it's yours from today. You can change it any time.");
  return { paragraphs, citations: [], followUps: ["What's the first step?"], basis: area ? "grounded" : "general", actions: [goalAction(goal, "Make it my goal"), open("/today", "See the plan")] };
}

function device(req: ModelRequest, w: WorldDigest): ModelReply {
  const name = req.memory.person.firstName;
  const lines = w.device.map((d) => d.replace(/^Sample data, not a real reading\. /, ""));
  if (!lines.length) {
    return {
      paragraphs: [`No watch or phone is connected for ${name} yet, so I can't see steps or sleep. Connect Apple Health or Health Connect and I'll read them every day. Or just tell me: "slept 6 hours", "walked 5k".`],
      citations: [],
      followUps: [],
      basis: "silent",
      actions: [open("/wearables/connect", "Connect a device")],
    };
  }
  const sleepAsked = /sleep/i.test(req.question);
  const mark = w.longevity.find((a) => a.area === (sleepAsked ? "sleep" : "movement") && a.status !== "unknown");
  return {
    paragraphs: [opener(req.question), `From the watch:\n${lines.map((l) => `• ${l}`).join("\n")}`, ...sampleNote(w), ...(mark ? [mark.line] : [])],
    citations: [],
    followUps: ["How am I doing overall?", "How was my week?"],
    basis: "grounded",
    actions: [open(sleepAsked ? "/wearables/sleep" : "/wearables", sleepAsked ? "Open my sleep" : "Open Your body")],
  };
}

function care(req: ModelRequest, w: WorldDigest): ModelReply {
  const name = req.memory.person.firstName;
  const { upcoming, recent } = w.care;
  if (!upcoming.length && !recent.length) {
    return { paragraphs: [`Nothing booked for ${name} right now. Want me to set up a test at home, a doctor, or a class?`], citations: [], followUps: ["Book a test at home", "Find a doctor"], basis: "grounded" };
  }
  const paragraphs: string[] = [];
  if (upcoming.length) paragraphs.push(`Coming up for ${name}:\n${upcoming.map((u) => `• ${u}`).join("\n")}`);
  if (recent.length) paragraphs.push(`Recently:\n${recent.map((u) => `• ${u}`).join("\n")}`);
  paragraphs.push("When a result comes back, I'll file it under the right person and tell you what changed.");
  return { paragraphs, citations: [], followUps: [], basis: "grounded", actions: [open("/appointments", "My appointments")] };
}

function familyTurn(req: ModelRequest, w: WorldDigest): ModelReply {
  const fam = w.family ?? [];
  return {
    paragraphs: [
      opener(req.question),
      `The whole nest, one line each:\n${fam.map((p) => `• ${p.name}${p.you ? " (you)" : p.relation ? ` (${p.relation})` : ""}: ${p.line}`).join("\n")}`,
      "Tap a name at the top to ask about anyone in detail. I keep each person's file separate.",
    ],
    citations: [],
    followUps: [],
    basis: "grounded",
    actions: [open("/family", "Open family")],
  };
}

/**
 * The sparrow's turn for this request, or null to let the older stand-in
 * answer. Order matters: logging first (they told us something), then the
 * family, the week, the big picture, a goal, the watch, bookings.
 */
export function sparrowTurn(req: ModelRequest): ModelReply | null {
  const w = req.memory.world;
  if (!w || !calm(req) || req.memory.symptoms.length) return null;
  const q = req.question;
  if (w.today.justLogged.length && !req.memory.logged.length) return loggedActivity(req, w);
  if (w.family) return familyTurn(req, w);
  if (WEEK.test(q)) return week(req, w);
  if (LONGEVITY.test(q)) return longevity(req, w);
  if (WANTS.test(q)) {
    const g = GOAL_WORDS.find((x) => x.match.test(q));
    if (g) return goalTurn(req, w, g.goal);
  }
  if (DEVICE.test(q)) return device(req, w);
  if (CARE.test(q)) return care(req, w);
  return null;
}

/** For tests and the prompt doc: a digest's world with nothing in it. */
export function emptyWorld(): WorldDigest {
  return { longevity: [], today: { goal: null, logged: [], stepsToday: null, justLogged: [] }, care: { upcoming: [], recent: [] }, device: [], family: null };
}

export type { MemoryDigest };
