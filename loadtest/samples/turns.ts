import { MUST_FIRE } from "../../mobile-react-native/src/lib/safety/fixtures/must-fire";

import { pick, type Account, type Member, type Rng } from "./population";

/*
 * SAMPLE MESSAGES, EACH WITH THE ANSWER KEY.
 *
 * A turn is what someone types, from whichever member's thread is open, and
 * the truth a person reading it would agree on: who it is about, and so
 * where it must land. The truth is written from the generator's own
 * knowledge of the family, never by calling memberIntent, so the report can
 * measure how often the app's reader gets it right.
 *
 *   about     the member the message is about, or "ambiguous" when a
 *             careful person would have to ask (two people named, two sons
 *             and "my son", two members called Arjun)
 *   land      where the turn should be saved and answered: `about`, or the
 *             open thread when ambiguous (the app's rule: ask, don't guess)
 *   outcome   "answer", "escalate" (the safety gate, no model), or "refused"
 *             (a member the plan has paused: nothing is sent)
 */

export type Category =
  | "own"
  | "switch_name"
  | "switch_relation"
  | "the_baby"
  | "back_to_me"
  | "my_in_other_thread"
  | "two_people"
  | "booking"
  | "reading"
  | "emergency"
  | "general";

export type Turn = {
  id: string;
  account: string;
  activeProfile: string;
  text: string;
  category: Category;
  truth: { about: string; land: string; outcome: "answer" | "escalate" | "refused" };
};

/** What the plan covers, in the order covered_profile_ids (0011) uses: primary first, then oldest. */
export function covered(a: Account): Set<string> {
  const seats = a.plan === "family" ? 4 : 1;
  return new Set(a.members.slice(0, seats).map((m) => m.id));
}

const EMERGENCIES = MUST_FIRE.filter((m) => m.tier === "escalate").map((m) => m.text);

const SYMPTOMS = ["has had a cough since yesterday", "has a mild headache since this morning", "feels tired all the time lately", "has a runny nose and keeps sneezing", "has an upset stomach since last night"];
const GENERAL = ["How much water should I drink in a day?", "Is it okay to walk right after dinner?", "What is a normal resting heart rate?", "How many hours of sleep do adults need?"];
const TESTS: Record<string, string> = { hba1c: "HbA1c", glucose_fasting: "fasting sugar test", tsh: "thyroid test", vitamin_d: "vitamin D test", haemoglobin: "CBC", ldl: "lipid profile", creatinine: "kidney function test" };

/** The words a person uses for this member, relative to the account holder. */
function relationWords(m: Member): string[] {
  switch (m.relationship) {
    case "Spouse":
      return m.sex === "female" ? ["my wife", "biwi"] : ["my husband", "hubby"];
    case "Mother":
      return ["my mom", "amma", "maa", "my mother"];
    case "Father":
      return ["papa", "my dad", "abbu", "my father"];
    case "Son":
      return ["my son", "beta"];
    case "Daughter":
      return ["my daughter", "beti"];
    case "Grandparent":
      return m.sex === "female" ? ["dadi", "nani", "my grandma"] : ["dada", "nana", "my grandpa"];
    default:
      return [];
  }
}

/** Members a careful reader could take these words to mean. */
function describedBy(a: Account, m: Member): Member[] {
  return a.members.filter((o) => !o.isPrimary && o.relationship === m.relationship && (m.relationship !== "Spouse" && m.relationship !== "Grandparent" ? true : o.sex === m.sex));
}

const sameName = (a: Account, m: Member) => a.members.filter((o) => o.firstName.toLowerCase() === m.firstName.toLowerCase()).length > 1;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pronoun = (m: Member) => (m.sex === "female" ? "her" : "his");
const isBaby = (m: Member) => !m.isPrimary && m.ageYears < 3;

const WEIGHTS: [Category, number][] = [
  ["own", 30],
  ["switch_name", 14],
  ["switch_relation", 10],
  ["the_baby", 3],
  ["back_to_me", 3],
  ["my_in_other_thread", 3],
  ["two_people", 4],
  ["booking", 12],
  ["reading", 8],
  ["emergency", 3],
  ["general", 10],
];
const TOTAL = WEIGHTS.reduce((s, [, w]) => s + w, 0);

function category(r: Rng): Category {
  let x = r() * TOTAL;
  for (const [c, w] of WEIGHTS) {
    x -= w;
    if (x <= 0) return c;
  }
  return "own";
}

/** One turn for this account, or null when the family has nobody the category needs. */
function attempt(r: Rng, a: Account, c: Category, id: string): Turn | null {
  const seats = covered(a);
  const primary = a.members[0] as Member;
  const selectable = a.members.filter((m) => seats.has(m.id));
  const active = selectable.length > 1 && r() < 0.3 ? pick(r, selectable.filter((m) => !m.isPrimary)) : primary;
  const others = a.members.filter((m) => m.id !== active.id);
  const turn = (text: string, about: string, outcome: Turn["truth"]["outcome"] = "answer"): Turn => {
    const paused = about !== "ambiguous" && !seats.has(about);
    const out = outcome === "answer" && paused ? "refused" : outcome;
    return { id, account: a.id, activeProfile: active.id, text, category: c, truth: { about, land: about === "ambiguous" || out === "refused" ? active.id : about, outcome: out } };
  };
  const subject = (m: Member) => (m.id === active.id && !active.isPrimary ? m.firstName : m.isPrimary ? "I" : m.firstName);

  switch (c) {
    case "own": {
      if (active.isPrimary) return turn(pick(r, ["What was my last HbA1c?", "Is my vitamin D better than last time?", "I have had a headache for two days", "What did my last report say?"]), active.id);
      return turn(pick(r, [`What was ${pronoun(active)} last haemoglobin?`, `${active.firstName} ${pick(r, SYMPTOMS)}`, `Is ${active.firstName}'s vitamin D better than last time?`]), sameName(a, active) ? "ambiguous" : active.id);
    }
    case "switch_name": {
      if (!others.length) return null;
      const m = pick(r, others);
      if (m.isPrimary) return null;
      const text = r() < 0.5 ? `${m.firstName} ${pick(r, SYMPTOMS)}` : `What was ${m.firstName}'s last ${pick(r, ["HbA1c", "haemoglobin", "vitamin D"])}?`;
      return turn(text, sameName(a, m) ? "ambiguous" : m.id);
    }
    case "switch_relation": {
      const m = others.filter((o) => relationWords(o).length).length ? pick(r, others.filter((o) => relationWords(o).length)) : null;
      if (!m) return null;
      const words = pick(r, relationWords(m));
      const text = r() < 0.6 ? `${cap(words)} ${pick(r, SYMPTOMS)}` : `${cap(words)}'s fasting sugar this morning was ${120 + Math.floor(r() * 60)}`;
      return turn(text, describedBy(a, m).length > 1 ? "ambiguous" : m.id);
    }
    case "the_baby": {
      const babies = a.members.filter(isBaby);
      if (!babies.length) return null;
      const baby = babies[0] as Member;
      if (baby.id === active.id) return null;
      return turn(pick(r, ["The baby has a mild rash on the cheeks", "The baby has been sneezing a lot today"]), babies.length > 1 ? "ambiguous" : baby.id);
    }
    case "back_to_me": {
      if (active.isPrimary) return null;
      return turn(pick(r, ["Book a test for me", "Can you check my own last sugar report?"]), primary.id);
    }
    case "my_in_other_thread": {
      // In a child's thread, "my" still means the person typing.
      if (active.isPrimary) return null;
      return turn(pick(r, ["What was my last HbA1c?", "My BP was 138/88 this morning"]), primary.id);
    }
    case "two_people": {
      const two = a.members.filter((m) => !m.isPrimary);
      if (two.length < 2) return null;
      const [x, y] = [two[0] as Member, two[1] as Member];
      return turn(`${x.firstName} and ${y.firstName} both have colds since yesterday`, "ambiguous");
    }
    case "booking": {
      const m = r() < 0.5 ? active : pick(r, a.members);
      const test = m.tested.length ? (TESTS[pick(r, m.tested)] as string) : "full body checkup";
      if (m.id === active.id) return turn(active.isPrimary ? `Book my ${test} again` : `Book ${pronoun(active)} ${test} again`, active.id);
      if (m.isPrimary) return turn(`Book a ${test} for me`, m.id);
      return turn(`Book ${test} again for ${m.firstName}`, sameName(a, m) ? "ambiguous" : m.id);
    }
    case "reading": {
      const m = r() < 0.6 ? active : pick(r, a.members);
      const who = subject(m);
      if (who === "I") return turn(pick(r, ["My BP today was 132/84", "My fasting sugar this morning was 142"]), m.id);
      return turn(`${who}'s BP today was ${110 + Math.floor(r() * 40)}/${70 + Math.floor(r() * 20)}`, sameName(a, m) ? "ambiguous" : m.id);
    }
    case "emergency":
      return turn(pick(r, EMERGENCIES), "ambiguous", "escalate");
    case "general":
      return turn(pick(r, GENERAL), active.id);
  }
}

export function makeTurn(r: Rng, a: Account, id: string): Turn {
  for (let i = 0; i < 8; i += 1) {
    const t = attempt(r, a, category(r), id);
    if (t) return t;
  }
  return attempt(r, a, "general", id) as Turn;
}
