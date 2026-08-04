import type { SafetyResult } from "./detect";

/*
 * What to offer someone when the gate fires.
 *
 * The single most important decision in this file: a crisis of the mind and a
 * crisis of the body need different help. Offering an ambulance to someone who
 * has just said they want to die is the wrong response — it can read as a
 * threat of forced hospitalisation and is a known reason people stop talking.
 * Equally, offering a counselling helpline to someone describing chest pain
 * wastes the minutes that matter most.
 *
 * So the lexicon rule that matched decides which set of resources appears.
 */

export type EscalationKind = "medical" | "mental_health";

/**
 * Rule ids from lexicon.yaml that indicate a psychological crisis.
 *
 * `overdose` is deliberately NOT here. Swallowing poison or a whole strip of
 * pills is a physical emergency first — the body needs treating within minutes,
 * whatever the intent behind it — so it routes to medical, and the mental
 * health line is appended rather than substituted. Getting that order wrong
 * costs someone the hour that mattered.
 */
const MENTAL_HEALTH_RULES = new Set(["self-harm"]);

/** Rules that need urgent physical care AND a mental health line. */
const BOTH_RULES = new Set(["overdose"]);

export function escalationKind(result: SafetyResult): EscalationKind {
  return result.matched && MENTAL_HEALTH_RULES.has(result.matched) ? "mental_health" : "medical";
}

export type EmergencyContact = {
  label: string;
  detail: string;
  /** Digits only — what `tel:` dials. */
  number: string;
  /** The one to reach for first. */
  primary?: boolean;
};

/*
 * India-first, as the product is. 112 is the single national emergency number;
 * 108 reaches an ambulance directly in most states and is what people actually
 * know. Both are offered because 112 is correct and 108 is familiar, and in an
 * emergency familiarity wins.
 *
 * Tele-MANAS (14416) is the Government of India's 24/7 mental health line;
 * KIRAN (1800-599-0019) predates it and is still widely published. Numbers are
 * kept here rather than inline in the UI so there is exactly one place to
 * correct if one of them changes.
 */
export const MEDICAL_CONTACTS: readonly EmergencyContact[] = [
  {
    label: "Emergency services",
    detail: "Police, fire and medical. One number",
    number: "112",
    primary: true,
  },
  {
    label: "Ambulance",
    detail: "For life-threatening situations",
    number: "108",
  },
];

export const MENTAL_HEALTH_CONTACTS: readonly EmergencyContact[] = [
  {
    label: "Tele-MANAS",
    detail: "Free, 24/7, confidential mental health support",
    number: "14416",
    primary: true,
  },
  {
    label: "KIRAN helpline",
    detail: "24/7 support in 13 languages",
    number: "18005990019",
  },
  {
    label: "Emergency services",
    detail: "If someone is in immediate danger",
    number: "112",
  },
];

/* The mental health line appended to a medical escalation for `overdose`. */
const TELE_MANAS: EmergencyContact = {
  label: "Tele-MANAS",
  detail: "Free, 24/7, confidential mental health support",
  number: "14416",
};

export function contactsFor(result: SafetyResult): readonly EmergencyContact[] {
  if (escalationKind(result) === "mental_health") return MENTAL_HEALTH_CONTACTS;
  if (result.matched && BOTH_RULES.has(result.matched)) {
    return [...MEDICAL_CONTACTS, TELE_MANAS];
  }
  return MEDICAL_CONTACTS;
}

/** The headline and body of the interrupt, per kind. */
export function copyFor(kind: EscalationKind) {
  if (kind === "mental_health") {
    return {
      title: "Baymax can't help with this.",
      lead: "Please talk to someone who can.",
      body: "You deserve real support right now, from a person trained to give it. These lines are free and confidential.",
      why: "Your message mentions harm to yourself. That is outside what Baymax can safely respond to, and it is not something you should have to handle alone.",
    };
  }
  return {
    title: "Baymax can't help with this.",
    lead: "This may need immediate medical attention.",
    body: "Please contact a doctor or seek emergency care right away.",
    why: "Your message describes symptoms that fall outside what Baymax can safely respond to. A doctor can assess this properly; Baymax cannot.",
  };
}

/**
 * How long the interrupt refuses to be dismissed.
 *
 * The ruling on this flow was a hybrid: a hard, non-dismissible gate first,
 * then the design's softer support flow. Three seconds is short enough not to
 * trap anyone and long enough that the emergency numbers cannot be swiped past
 * before they have been read — which is the entire point of a hard gate.
 */
export const HOLD_MS = 3000;
