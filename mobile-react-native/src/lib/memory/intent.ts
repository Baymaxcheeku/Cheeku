import { shortDate } from "@/lib/records/details";

import type { LoopView } from "./loops";
import { loopWhen } from "./loops";
import type { Series } from "./series";

/*
 * WHAT THE PERSON WANTS DONE, NOT ONLY WHAT THEY ASKED.
 *
 * The chat is the front door to everything Cheeku can arrange: a lab test, a
 * doctor, a dietician. "Book test again" used to fall through to "I could not
 * find anything about that"; it now reads the memory to work out WHICH test
 * (the HbA1c that's due, the panel last done in July), says why, and hands the
 * booking card to the chat. The booking itself then runs through the same
 * screens as the marketplace, and lands back in this person's thread.
 *
 * Two readers live here, both pure and tested:
 *
 *   bookingIntent   "book", "repeat", "schedule" + a service word, or a test
 *                   name with "again". Never fires on a question about a
 *                   result ("what was my HbA1c?").
 *   memberIntent    a family member named in the message ("Imaad has a
 *                   cough", "for my wife"), so the turn goes to THEIR memory.
 *                   Rule 4 of PLAN.md, made automatic.
 *
 * NO TRIAGE. A doctor intent names a specialty only when the person named it
 * ("a gynaecologist", "skin doctor"). Otherwise it is a general physician and
 * the pre-consultation flow lets them choose.
 */

export type ServiceId = "lab" | "doctor" | "fitness" | "medicine";

export type LabPick = {
  /** The catalogue id (`lab_tests.id`, migration 0027). */
  id: string;
  label: string;
  /** Why this one, from the memory: "Due in 10 weeks", "Last 5.9 % on 12 Jul". */
  because: string | null;
};

export type BookingIntent = {
  service: ServiceId;
  again: boolean;
  tests: LabPick[];
  /** Doctor bookings: a `SPECIALTIES` id, only when the person named one. */
  specialty: string | null;
  mode: "online" | "clinic" | null;
};

/** The lab catalogue as words: what people type, and what the result is filed as. */
export const LAB_WORDS: readonly { id: string; label: string; match: RegExp; series: string[] }[] = [
  { id: "hba1c", label: "HbA1c", match: /\bhba1c\b|\ba1c\b|glycated|average sugar|3[- ]month sugar/i, series: ["hba1c"] },
  { id: "fbs", label: "Fasting blood sugar", match: /fasting (blood )?sugar|\bfbs\b|\bglucose\b|sugar test|blood sugar/i, series: ["glucose_fasting"] },
  { id: "lipid", label: "Lipid profile", match: /lipid|cholesterol|triglycer|\bldl\b|\bhdl\b/i, series: ["ldl", "ldl_cholesterol", "total_cholesterol", "triglycerides"] },
  { id: "thyroid", label: "Thyroid profile", match: /thyroid|\btsh\b|\bt3\b|\bt4\b/i, series: ["tsh"] },
  { id: "cbc", label: "Complete blood count", match: /\bcbc\b|blood count|haemoglobin|hemoglobin|platelet|haemogram|hemogram/i, series: ["haemoglobin", "platelets"] },
  { id: "vitd", label: "Vitamin D", match: /vitamin\s*d\b|vit\.?\s*d\b/i, series: ["vitamin_d"] },
  { id: "b12", label: "Vitamin B12", match: /\bb12\b|b-12|cobalamin/i, series: ["vitamin_b12"] },
  { id: "lft", label: "Liver function test", match: /\blft\b|liver|bilirubin|sgpt|sgot/i, series: ["bilirubin_total", "alt", "ast"] },
  { id: "kft", label: "Kidney function test", match: /\bkft\b|\brft\b|kidney|creatinine|\burea\b/i, series: ["creatinine", "urea"] },
  { id: "urine", label: "Urine routine", match: /urine/i, series: [] },
  { id: "ferritin", label: "Iron studies with ferritin", match: /ferritin|\biron\b/i, series: ["ferritin"] },
  { id: "crp", label: "CRP", match: /\bcrp\b|c[- ]reactive/i, series: ["crp"] },
  { id: "fullbody", label: "Full body checkup", match: /full[- ]body|whole[- ]body|health check|annual check/i, series: [] },
];

/** The message with test names taken out, so "book the bilirubin test" is not read as a symptom. */
export function withoutTestNames(text: string): string {
  return LAB_WORDS.reduce((t, w) => t.replace(new RegExp(w.match.source, "gi"), " "), text);
}

const BOOK = /\b(book|booking|schedule|arrange|set up|order|repeat|redo|re-?do|re-?test)\b|\b(get|need|want|fix)\b[^.?!]{0,30}\b(tests?|checked|check-?up|done|doctor|appointment|consult(ation)?|specialist|dietician|dietitian|gyn\w*|paediatrician|pediatrician|class(es)?|trainer)\b/i;
const AGAIN = /\b(again|repeat|redo|re-?do|follow[- ]?up test|retest|re-?test|next one)\b/i;
const LAB = /\b(tests?|lab|labs|blood ?work|blood test|sample|home collection|check-?up|diagnostics?|investigations?)\b/i;
const DOCTOR = /\b(doctor|dr\.?|physician|paediatrician|pediatrician|specialist|consult(ation)?|appointment|gyn(a)?ecologist|gynae|gyno|dermatologist|skin doctor|ent\b|cardiologist|orthop(a)?edi[cs]t?|dietician|dietitian|nutritionist|gastro(enterologist)?)\b/i;
const FITNESS = /\b(fitness|yoga|gym|trainer|workout|exercise class|pilates|zumba|prenatal class)\b/i;
const MEDICINE = /\b(order|refill|deliver|delivery|buy)\b.*\b(medicine|medicines|meds|tablets?|syrup|prescription)\b|\b(medicine|medicines|meds)\b.*\b(delivery|refill|order)\b/i;
// A question about a result is not a booking: "what was my HbA1c last time?"
const QUESTION = /^(what|why|how|is|was|are|were|does|did|do|should|can|could|when|which)\b/i;

const SPECIALTY_WORDS: [RegExp, string][] = [
  [/gyn(a)?ecolog|gynae|gyno|obstetric|ob-?gyn/i, "gynae"],
  [/paediatric|pediatric|child specialist|baby doctor|kids? doctor/i, "paeds"],
  [/dermatolog|skin doctor|skin specialist/i, "derm"],
  [/\bent\b|ear,? nose|throat specialist/i, "ent"],
  [/gastro|stomach specialist/i, "gastro"],
  [/orthop|bone doctor|joint specialist/i, "ortho"],
  [/dietician|dietitian|nutritionist|diet plan/i, "diet"],
  [/general physician|\bgp\b|family doctor/i, "gp"],
];

const pct = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

function becauseFor(id: string, loops: readonly LoopView[], series: ReadonlyMap<string, Series>): string | null {
  const words = LAB_WORDS.find((w) => w.id === id);
  if (!words) return null;
  const loop = loops.find((l) => words.match.test(l.title) || words.match.test(l.detail ?? ""));
  const s = words.series.map((k) => series.get(k)).find((x): x is Series => Boolean(x));
  const unit = s?.unit ? (s.unit === "%" ? "%" : ` ${s.unit}`) : "";
  const last = s ? `last ${pct(s.latest.value)}${unit} on ${shortDate(s.latest.date)}` : null;
  if (loop) return [loopWhen(loop), last].filter(Boolean).join(", ");
  return last ? last.charAt(0).toUpperCase() + last.slice(1) : null;
}

/**
 * Which tests "again" means, from the memory: anything still open that a lab
 * test would close, then whatever was tested most recently. Never more than
 * three, and never a guess when the memory has nothing.
 */
function testsFromMemory(loops: readonly LoopView[], series: ReadonlyMap<string, Series>): string[] {
  const out: string[] = [];
  for (const l of loops) {
    if (!["test_ordered", "result_pending", "reminder", "followup_due"].includes(l.type)) continue;
    const hit = LAB_WORDS.find((w) => w.match.test(l.title) || w.match.test(l.detail ?? ""));
    if (hit && !out.includes(hit.id)) out.push(hit.id);
  }
  if (out.length) return out.slice(0, 3);
  // Most recent lab value first: that's the test they mean by "again".
  const recent = [...series.values()]
    .filter((s) => s.latest.source === "record")
    .sort((a, b) => b.latest.date.localeCompare(a.latest.date));
  const lastDate = recent[0]?.latest.date;
  for (const s of recent) {
    if (s.latest.date !== lastDate) break;
    const hit = LAB_WORDS.find((w) => w.series.includes(s.key));
    if (hit && !out.includes(hit.id)) out.push(hit.id);
  }
  return out.slice(0, 3);
}

export function bookingIntent(
  text: string,
  memory: { loops: readonly LoopView[]; series: ReadonlyMap<string, Series> },
): BookingIntent | null {
  const t = text.trim();
  if (!t) return null;
  const named = LAB_WORDS.filter((w) => w.match.test(t)).map((w) => w.id);
  const wantsBooking = BOOK.test(t) || AGAIN.test(t);
  const asking = QUESTION.test(t) && !/\b(can|could) (you|i|we)\b.*\b(book|schedule|arrange)\b/i.test(t);
  if (!wantsBooking || (asking && !/\bbook\b/i.test(t))) return null;
  const again = AGAIN.test(t);
  const mode = /\b(online|video|tele|from home)\b/i.test(t) ? "online" : /\b(clinic|in person|nearby|visit)\b/i.test(t) ? "clinic" : null;

  if (MEDICINE.test(t)) return { service: "medicine", again, tests: [], specialty: null, mode: null };
  if (FITNESS.test(t)) return { service: "fitness", again, tests: [], specialty: null, mode: null };

  // A doctor wins over a test when both are named ("book a doctor to read my test").
  if (DOCTOR.test(t) && !(named.length && !/\b(doctor|dr\.?|consult|appointment|specialist)\b/i.test(t))) {
    const specialty = SPECIALTY_WORDS.find(([re]) => re.test(t))?.[1] ?? null;
    return { service: "doctor", again, tests: [], specialty, mode };
  }

  if (LAB.test(t) || named.length) {
    const ids = named.length ? named : again ? testsFromMemory(memory.loops, memory.series) : [];
    const tests = [...new Set(ids)].map((id) => ({
      id,
      label: LAB_WORDS.find((w) => w.id === id)?.label ?? id,
      because: becauseFor(id, memory.loops, memory.series),
    }));
    return { service: "lab", again, tests, specialty: null, mode: null };
  }
  return null;
}

// ----------------------------------------------------------------- members --

export type MemberLike = { id: string; name: string; relationship: string | null; isPrimary: boolean; dob: string | null };

const RELATION_WORDS: [RegExp, RegExp][] = [
  [/\b(my )?(mom|mum|mummy|mother|amma|ammi|maa|mama)\b/i, /mother|mom|mum|amma|ammi|maa/i],
  [/\b(my )?(dad|daddy|father|papa|appa|abba|abbu|pappa)\b/i, /father|dad|papa|appa|abba|abbu/i],
  [/\b(my )?(wife|missus|biwi)\b/i, /wife|spouse|partner/i],
  [/\b(my )?(husband|hubby|pati)\b/i, /husband|spouse|partner/i],
  [/\b(my )?(son|boy|beta)\b/i, /\bson\b|child/i],
  [/\b(my )?(daughter|girl|beti)\b/i, /daughter|child/i],
  [/\b(my )?(grandma|grandmother|dadi|nani|paati|ammamma)\b/i, /grand(mother|ma)|dadi|nani/i],
  [/\b(my )?(grandpa|grandfather|dada|nana|thatha)\b/i, /grand(father|pa)|dada|nana/i],
  [/\b(my )?(brother|bhai)\b/i, /brother/i],
  [/\b(my )?(sister|didi|behen)\b/i, /sister/i],
];

const ageYears = (dob: string | null, today: Date) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return (today.getTime() - d.getTime()) / (365.25 * 86_400_000);
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The family member a message is about, when it names one other than the
 * person whose chat this is. Names win over relationships ("Nisha" over "my
 * wife"); "the baby" means the one child under three, if there is exactly
 * one; "me" or "myself" goes back to the account holder. When the message
 * names two different people, it switches to nobody: better to ask than to
 * file the wrong person's history.
 */
export function memberIntent(text: string, members: readonly MemberLike[], activeId: string, today = new Date()): { id: string; name: string; because: string } | null {
  const t = text.toLowerCase();
  const hits = new Map<string, string>();

  for (const m of members) {
    const first = m.name.trim().split(/\s+/)[0] ?? "";
    if (first.length >= 2 && new RegExp(`\\b${escape(first.toLowerCase())}('s)?\\b`).test(t)) hits.set(m.id, `named ${first}`);
  }
  if (hits.size === 0) {
    for (const [said, rel] of RELATION_WORDS) {
      if (!said.test(t)) continue;
      const matches = members.filter((m) => !m.isPrimary && m.relationship && rel.test(m.relationship));
      if (matches.length === 1 && matches[0]) hits.set(matches[0].id, `said "${(t.match(said)?.[0] ?? "").trim()}"`);
    }
    if (/\b(the |my |our )?(baby|newborn|infant|little one)\b/.test(t)) {
      const babies = members.filter((m) => !m.isPrimary && (ageYears(m.dob, today) ?? 99) < 3);
      if (babies.length === 1 && babies[0]) hits.set(babies[0].id, "said the baby");
    }
  }
  const active = members.find((m) => m.id === activeId);
  if (hits.size === 0 && active && !active.isPrimary && /\b(for me|about me|myself|my own)\b/.test(t)) {
    const me = members.find((m) => m.isPrimary);
    if (me) hits.set(me.id, "said me");
  }

  // Two people named, or only the active one: stay where we are.
  if (hits.size !== 1) return null;
  hits.delete(activeId);
  if (hits.size !== 1) return null;
  const [id, because] = [...hits.entries()][0] as [string, string];
  const who = members.find((m) => m.id === id);
  return who ? { id, name: who.name.split(" ")[0] ?? who.name, because } : null;
}
