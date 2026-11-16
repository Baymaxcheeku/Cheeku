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
/** "How is my sugar doing?", "tell me about my sleep": one area, from Home's area strip or typed. */
export const AREA_Q = /\b(?:how(?:'s| is| are)|what about|tell me about|explain) (?:my |\w+'s |the )?(heart(?: and bp)?|bp|blood pressure|sugar|sleep|movement|moving|steps|weight|check-?ups)\b/i;
/** The "Goals" shortcut: change or pick the goal the daily plan is built around. */
export const GOALS = /\b((?:change|switch|pick|set|choose|update) (?:my |a |the )?(?:goal|plan)s?|my goals?|plan and goals?|goals? and plan)\b/i;
/** The "Book" shortcut: what can be set up, before they name a test or a doctor. */
export const BOOK_MENU = /\b(book something|start a booking|i want to book|help me book|what can you book|book for (?:me|us))\b/i;
/** "Which tests should I do this year?" from Lab tests. */
export const TESTS_DUE = /\b(?:(?:which|what) (?:blood )?tests? (?:should|do|must|to) (?:i|we|he|she|they|get|do)|tests? (?:are |is )?due|(?:yearly|annual) (?:tests?|check-?ups?)|what should i test)\b/i;
/** "Should I get a Vitamin D test?" from a test's page. Group 1 is the test. */
export const TEST_NEED = /\b(?:should (?:i|we) (?:get|do|take|book|repeat)|do (?:i|we) need|is it time for) (?:a |an |the |my )?(.{2,40}?)(?: tests?| checks?| again)?\s*\??$/i;
const TEST_WORDS = /hba1c|lipid|cholesterol|thyroid|tsh|vitamin|cbc|blood count|sugar|glucose|kidney|creatinine|liver|iron|ferritin|b12|urine|full body|haemoglobin|hemoglobin/i;
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const onDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return y && m && d ? `${d} ${MONTH[m - 1]} ${y}` : iso;
};
const plain = (t: string) => t.toLowerCase().replace(/\s*\(.*?\)/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const AREA_WORD: Record<string, string> = { heart: "heart", "heart and bp": "heart", bp: "heart", "blood pressure": "heart", sugar: "sugar", sleep: "sleep", movement: "movement", moving: "movement", steps: "movement", weight: "weight", checkups: "checkups", "check-ups": "checkups" };
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

const WORD = { on_track: "on track", watch: "keep an eye on it", act: "needs a step", unknown: "not enough to go on" } as const;

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

/** What helps each area, in one line. General knowledge, said plainly. */
const AREA_HELP: Record<string, string> = {
  heart: "What helps: a 20-minute walk most days, less salt and fried food, and BP checked once a month if there's a machine at home.",
  sugar: "What helps: a short walk after meals, dal or salad before rice, and fewer sweet drinks. Small, daily, boring: that's what moves HbA1c.",
  sleep: "What helps: the same bedtime every night, the phone out of the room, and no tea or coffee after 4 pm.",
  movement: "What helps: a few hundred more steps each week, not a big jump. Stairs and a walk after dinner add up fast.",
  weight: "What helps: one food swap at a time and a weigh-in once a week, same day, same time. Half a kilo a week is plenty.",
  checkups: "What helps: one yearly check-up on the calendar, and repeat tests booked when they're due. I'll remind you.",
};

const AREA_ROUTE: Record<string, [string, string]> = {
  heart: ["/labs", "Book a heart check"],
  sugar: ["/labs", "Book a sugar test"],
  sleep: ["/wearables/sleep", "Open my sleep"],
  movement: ["/fitness", "Find a class nearby"],
  weight: ["/today", "Today's plan"],
  checkups: ["/labs", "Book a check-up"],
};

function areaTurn(req: ModelRequest, w: WorldDigest, key: string): ModelReply {
  const name = req.memory.person.firstName;
  const a = w.longevity.find((x) => x.area === key);
  const label = a?.label ?? ({ heart: "Heart and BP", sugar: "Sugar", sleep: "Sleep", movement: "Movement", weight: "Weight", checkups: "Check-ups" } as Record<string, string>)[key] ?? key;
  const goal = goalForArea(key as never);
  const route = AREA_ROUTE[key];
  const actions: ChatAction[] = [];
  if (goal && a && a.status !== "on_track") actions.push(goalAction(goal));
  if (route) actions.push(open(route[0], route[1]));
  if (!a || a.status === "unknown") {
    const how = key === "sleep" || key === "movement" ? "Connect a watch, or just tell me (\"slept 6 hours\", \"walked 5k\")" : "A recent blood report would tell me";
    return { paragraphs: [`${label}: nothing to go on for ${name} yet. ${how}, and I'll keep an eye on it from then.`, AREA_HELP[key] ?? ""].filter(Boolean), citations: [], followUps: ["How am I doing overall?"], basis: "silent", actions: key === "sleep" || key === "movement" ? [open("/wearables/connect", "Connect a watch"), ...actions.slice(0, 1)] : actions };
  }
  const lines = key === "sleep" || key === "movement" ? w.device.filter((d) => (key === "sleep" ? /sleep/i : /step|active|walk/i).test(d)).map((d) => d.replace(/^Sample data, not a real reading\. /, "")) : [];
  const paragraphs = [
    `${label}, for ${name}: ${WORD[a.status]}.`,
    a.line,
    ...(lines.length ? [`From the watch:\n${lines.map((l) => `• ${l}`).join("\n")}`] : []),
    ...(a.sample ? ["(Some of this is sample data for now, not a real reading.)"] : []),
    a.status === "on_track" ? "Nothing to change here. Keep doing what you're doing." : AREA_HELP[key] ?? "",
  ].filter(Boolean);
  return { paragraphs, citations: [], followUps: ["How am I doing overall?", "How was my week?"], basis: "grounded", actions: actions.slice(0, 3) };
}

/** The tests on the person's list, and why, from their own follow-ups and areas. */
function testsDue(req: ModelRequest, w: WorldDigest): ModelReply {
  const name = req.memory.person.firstName;
  const due = req.memory.loops.filter((l) => TEST_WORDS.test(l.title) || /test|result|repeat/i.test(l.type));
  const why: string[] = [];
  const area = (k: string) => w.longevity.find((a) => a.area === k && (a.status === "watch" || a.status === "act"));
  if (area("sugar")) why.push("Sugar is one to keep an eye on, and HbA1c is the test that tracks it.");
  if (area("heart")) why.push("Heart and BP is one to keep an eye on, and a lipid profile tracks the cholesterol side of it.");
  const paragraphs: string[] = [];
  if (due.length) paragraphs.push(`Already on ${name}'s list:\n${due.slice(0, 4).map((l) => `• ${l.title}, ${l.when.toLowerCase()}`).join("\n")}`);
  else paragraphs.push(`Nothing is on ${name}'s list as due right now.`);
  paragraphs.push(...why);
  paragraphs.push("Beyond these, one yearly full check covers the basics. Which extra tests make sense is your doctor's call; I can write out what to ask.");
  const hba1c = due.find((l) => /hba1c/i.test(l.title));
  return {
    paragraphs,
    citations: [],
    followUps: [...(hba1c ? ["Book my HbA1c again"] : []), "Prepare for my appointment"],
    basis: due.length || why.length ? "grounded" : "general",
    actions: [open("/labs", "Book a test at home")],
  };
}

/** "Should I get a Vitamin D test?": the last result and whether it's on the list, never a yes from nowhere. */
function testNeed(req: ModelRequest, target: string): ModelReply | null {
  const name = req.memory.person.firstName;
  const t = plain(target).replace(/^(a|an|the|my) /, "");
  if (t.length < 2) return null;
  const r = req.memory.readings.find((x) => plain(x.name).startsWith(t) || plain(x.key).startsWith(t.replace(/ /g, "_")) || t.startsWith(plain(x.name)));
  const loop = req.memory.loops.find((l) => plain(l.title).includes(t));
  if (!r && !loop && !TEST_WORDS.test(t)) return null;
  const label = r?.name ?? loop?.title ?? target;
  const paragraphs: string[] = [];
  if (r) paragraphs.push(`Last ${r.name} for ${name}: ${r.latest.value}${r.unit ? ` ${r.unit}` : ""} on ${onDate(r.latest.date)}${r.read ? `. ${r.read}` : "."}`);
  if (loop) paragraphs.push(`It's on ${name}'s list: ${loop.title}, ${loop.when.toLowerCase()}. So yes, it's due.`);
  else if (r) paragraphs.push("Nothing on file says it's due again yet. If the doctor asked for a repeat, or something has changed, it's worth doing.");
  else paragraphs.push(`There's no ${target} result on file for ${name}, so I can't say how it looked before. Whether to test is your doctor's call; it's a simple home collection if they ask for it.`);
  return { paragraphs, citations: [], followUps: ["Which tests should I do this year?"], basis: r || loop ? "grounded" : "general", actions: [open("/labs", `Book ${label.length > 18 ? "it" : label} at home`)] };
}

const GOAL_PITCH: Record<keyof typeof GOAL_LABEL, string> = { sleep: "I want to sleep better", weight: "I want to lose weight", sugar: "I want to control my sugar", legs: "I want to walk more", calm: "I want to stress less" };

function goalsMenu(req: ModelRequest, w: WorldDigest): ModelReply {
  const focus = areasOf(w).find((a) => a.status === "act") ?? areasOf(w).find((a) => a.status === "watch") ?? null;
  const suggested = focus ? goalForArea(focus.area as never) : null;
  const paragraphs = [
    w.today.goal ? `Right now the plan is built around: ${w.today.goal}.` : "No goal picked yet, so the plan is a general one.",
    suggested && focus ? `If you're asking me, I'd pick ${GOAL_LABEL[suggested]}: ${focus.line}` : "Pick the one that matters most this month. One goal at a time works better than five.",
  ];
  const others = (Object.keys(GOAL_PITCH) as (keyof typeof GOAL_LABEL)[]).filter((g) => g !== suggested).slice(0, 3).map((g) => GOAL_PITCH[g]);
  return { paragraphs, citations: [], followUps: others, basis: "grounded", actions: [...(suggested ? [goalAction(suggested)] : []), open("/today", "See today's plan")] };
}

function bookMenu(req: ModelRequest, w: WorldDigest): ModelReply {
  const name = req.memory.person.firstName;
  const due = req.memory.loops.find((l) => /due|repeat|follow/i.test(`${l.title} ${l.when}`));
  const paragraphs = [
    `What should I set up for ${name}? I can book a test at home, a doctor (online or in a clinic) or a class nearby, and everything I book is filed in ${name}'s memory.`,
    ...(due ? [`Already on the list: ${due.title}, ${due.when.toLowerCase()}. I'll remind you when it's time to book it.`] : []),
  ];
  return { paragraphs, citations: [], followUps: ["Book a test at home", "Find a doctor", "Find a yoga class nearby"], basis: "grounded", actions: [open("/labs", "Test at home"), open("/fitness", "Class nearby"), open("/services", "All services")] };
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
  if ([...upcoming, ...recent].some((l) => /^(Home test|Doctor)/.test(l))) paragraphs.push("When a result comes back, I'll file it under the right person and tell you what changed.");
  else if (!upcoming.length) paragraphs.push(`Nothing coming up. Want me to book the next one?`);
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
  // A question asked about one record ("About Annual health check-up: ...") is for
  // the record answers; "health check" in a title must not start the big-picture turn.
  if (/^About [^:]{1,120}: /.test(q)) return null;
  if (w.today.justLogged.length && !req.memory.logged.length) return loggedActivity(req, w);
  if (w.family) return familyTurn(req, w);
  if (TESTS_DUE.test(q)) return testsDue(req, w);
  const need = TEST_NEED.exec(q);
  if (need) {
    const r = testNeed(req, need[1]!);
    if (r) return r;
  }
  if (WEEK.test(q)) return week(req, w);
  if (LONGEVITY.test(q)) return longevity(req, w);
  if (WANTS.test(q)) {
    const g = GOAL_WORDS.find((x) => x.match.test(q));
    if (g) return goalTurn(req, w, g.goal);
  }
  if (GOALS.test(q)) return goalsMenu(req, w);
  if (BOOK_MENU.test(q)) return bookMenu(req, w);
  const area = AREA_Q.exec(q);
  if (area) {
    const key = AREA_WORD[area[1]!.toLowerCase()];
    if (key) return areaTurn(req, w, key);
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
