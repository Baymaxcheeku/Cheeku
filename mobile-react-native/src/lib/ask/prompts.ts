import type { JourneyId } from "@/lib/onboarding/journeys";

/*
 * The suggested questions under the Ask box.
 *
 * ┌─ WHY THEY WERE WRONG ────────────────────────────────────────────────────┐
 * │                                                                          │
 * │ They were three hardcoded strings, and the first was "Is this safe       │
 * │ during pregnancy?". Somebody who told us during onboarding that they     │
 * │ are tracking their general health and living with obesity opened the app │
 * │ and was asked about pregnancy. That is worse than a generic prompt: a    │
 * │ suggestion that misses this badly says the app was not listening when    │
 * │ it asked.                                                                │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ WHAT MAY DECIDE A PROMPT, AND WHAT MAY NOT ─────────────────────────────┐
 * │                                                                          │
 * │ MAY: the journey picked at onboarding, and the conditions the reader     │
 * │ typed into their own profile. Both are things they said about            │
 * │ themselves, in their own words.                                          │
 * │                                                                          │
 * │ MAY NOT: anything read out of their documents. Surfacing "what does a    │
 * │ high HbA1c mean" because a lab value came back high is a diagnosis       │
 * │ dressed as a helpful suggestion — the app would be telling somebody it   │
 * │ thinks they are diabetic, in the form of a chip. This is the same line   │
 * │ the knowledge feed holds, and it holds here for the same reason.         │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * EVERY PROMPT IS ONE CHEEKU CAN HONESTLY TAKE. They ask it to read back,
 * compare, explain a term, or help prepare for an appointment. None asks
 * whether to take something, change a dose, or whether a result is bad — the
 * app must never answer those, and a suggested question is a promise that it
 * will.
 */

/*
 * A prompt carries a TOPIC as well as its words.
 *
 * Without it the first render put "Which of my numbers moved since last time?"
 * directly above "Which of my numbers changed since last time?" — two entries
 * from two different lists, distinct as strings, identical as questions. A
 * reader does not see two lists; they see a suggestion box that repeated
 * itself. Deduplication is therefore by topic, not by text.
 */
export type PromptEntry = { topic: string; text: string };

type Entry = PromptEntry;

export type Prompt = string;

/*
 * Always available, and true for somebody who has declared nothing and
 * uploaded nothing. These are the fallback, and they are deliberately the
 * plainest questions in the file — a first-day reader should not be shown a
 * prompt that only makes sense once they have history.
 */
const BASE: readonly Entry[] = [
  { topic: "last-report", text: "What does my last report mean?" },
  { topic: "jargon", text: "Explain a word from my report" },
  { topic: "appointment", text: "What should I ask my doctor next time?" },
];

const BY_JOURNEY: Record<JourneyId, readonly Entry[]> = {
  expecting: [
    { topic: "last-scan", text: "What did my last scan record?" },
    { topic: "due", text: "Which tests are still due this trimester?" },
    { topic: "appointment", text: "What should I ask at my next antenatal visit?" },
  ],
  fertility: [
    { topic: "last-report", text: "What did my last cycle bloodwork say?" },
    { topic: "jargon", text: "Explain a term from my fertility report" },
    { topic: "changed", text: "What has changed since my last round of tests?" },
  ],
  caregiver: [
    { topic: "file", text: "What is in my mother's file this year?" },
    { topic: "changed", text: "Which of their results changed since last time?" },
    { topic: "appointment", text: "What should I ask at their next appointment?" },
  ],
  new_parent: [
    { topic: "vaccines", text: "Which vaccinations are recorded so far?" },
    { topic: "last-report", text: "What did the last paediatric visit note?" },
    { topic: "appointment", text: "What should I ask at the next check-up?" },
  ],
  optimiser: [
    { topic: "changed", text: "Which of my numbers moved since last time?" },
    { topic: "last-report", text: "What was my last full panel?" },
    { topic: "jargon", text: "Explain what this marker measures" },
  ],
  other: [
    { topic: "file", text: "What is in my health file so far?" },
    { topic: "out-of-range", text: "Which results are outside the lab's range?" },
    { topic: "appointment", text: "What should I ask at my next check-up?" },
  ],
};

/*
 * Condition-led prompts.
 *
 * Matched on a SUBSTRING of what the reader typed, lowercased, because this is
 * a free-text field: "type 2 diabetes", "Diabetes (T2)" and "diabetic" are the
 * same person describing the same thing. Matching loosely is right here — the
 * cost of a near-miss is one prompt that is slightly off, and the cost of an
 * exact match is a reader who typed "hypothyroid" seeing nothing.
 *
 * The wording never characterises the condition, and never implies a target, a
 * goal or a judgement. "What did my last thyroid panel say" is a question about
 * a document. "Am I managing my weight well?" would be an invitation for the
 * app to grade somebody's body, which it will not do.
 */
const BY_CONDITION: readonly { match: readonly string[]; prompts: readonly Entry[] }[] = [
  {
    match: ["obes", "overweight", "weight", "bmi"],
    prompts: [
      { topic: "last-report", text: "What did my last lipid panel say?" },
      { topic: "changed", text: "Which of my numbers changed since last time?" },
      { topic: "appointment", text: "What should I ask my doctor about my results?" },
    ],
  },
  {
    match: ["diabet", "hba1c", "sugar", "glucose", "prediabet"],
    prompts: [
      { topic: "jargon", text: "What does HbA1c actually measure?" },
      { topic: "last-report", text: "What was my last sugar reading?" },
      { topic: "out-of-range", text: "Which of my results are outside the lab's range?" },
    ],
  },
  {
    match: ["thyroid", "hypothyroid", "hyperthyroid", "tsh"],
    prompts: [
      { topic: "last-report", text: "What did my last thyroid panel say?" },
      { topic: "jargon", text: "What does TSH measure?" },
      { topic: "changed", text: "Has my TSH changed since last time?" },
    ],
  },
  {
    match: ["blood pressure", "hypertens", "bp"],
    prompts: [
      { topic: "last-report", text: "What blood pressure readings are on file?" },
      { topic: "jargon", text: "What do the two numbers in a reading mean?" },
      { topic: "appointment", text: "What should I ask at my next check-up?" },
    ],
  },
  {
    match: ["pcos", "pcod"],
    prompts: [
      { topic: "last-report", text: "What did my last hormone panel record?" },
      { topic: "jargon", text: "Explain a term from my report" },
      { topic: "changed", text: "What has changed since my last tests?" },
    ],
  },
  {
    match: ["asthma", "copd", "breath"],
    prompts: [
      { topic: "last-report", text: "What did my last lung test record?" },
      { topic: "medicines", text: "Which prescriptions are on file for me?" },
      { topic: "appointment", text: "What should I ask at my next appointment?" },
    ],
  },
  {
    match: ["anaem", "anem", "iron", "ferritin", "b12", "vitamin"],
    prompts: [
      { topic: "last-report", text: "What were my last iron and B12 levels?" },
      { topic: "changed", text: "Have those levels changed since last time?" },
      { topic: "jargon", text: "What does ferritin measure?" },
    ],
  },
  {
    match: ["heart", "cardiac", "cholesterol", "lipid"],
    prompts: [
      { topic: "last-report", text: "What did my last lipid profile say?" },
      { topic: "jargon", text: "Explain what LDL measures" },
      { topic: "changed", text: "Which of my results moved since last time?" },
    ],
  },
  {
    match: ["kidney", "renal", "creatinine"],
    prompts: [
      { topic: "last-report", text: "What did my last kidney panel record?" },
      { topic: "jargon", text: "What does creatinine measure?" },
      { topic: "changed", text: "Has it changed since my last test?" },
    ],
  },
  {
    match: ["allerg"],
    prompts: [
      { topic: "file", text: "What allergies are recorded in my file?" },
      { topic: "last-report", text: "What did my last allergy test say?" },
      { topic: "appointment", text: "What should I ask at my next appointment?" },
    ],
  },
];

/**
 * Up to three prompts for this reader.
 *
 * ORDER IS THE POINT. The condition they typed comes first, because it is the
 * most specific thing they have told us; the journey second; the plain
 * fallbacks last, and only to fill. That way the first chip always speaks to
 * the most personal signal available, and a reader who declared nothing still
 * gets three sensible questions rather than an empty row.
 */
export function promptEntriesFor(
  journey: string | null | undefined,
  conditions: readonly string[] = [],
  limit = 3,
): PromptEntry[] {
  const declared = conditions.map((c) => c.trim().toLowerCase()).filter(Boolean);

  const fromConditions = BY_CONDITION.filter((entry) =>
    entry.match.some((needle) => declared.some((c) => c.includes(needle))),
  ).flatMap((entry) => entry.prompts);

  const fromJourney = journey && journey in BY_JOURNEY ? BY_JOURNEY[journey as JourneyId] : [];

  /*
   * Interleaved rather than concatenated when both exist. Taking three
   * straight off the condition list would bury the journey entirely, and
   * somebody who is expecting AND anaemic should see one of each — those are
   * two different reasons they opened the app.
   */
  const ordered: Entry[] = [];
  const longest = Math.max(fromConditions.length, fromJourney.length);
  for (let i = 0; i < longest; i += 1) {
    const condition = fromConditions[i];
    const journeyPrompt = fromJourney[i];
    if (condition) ordered.push(condition);
    if (journeyPrompt) ordered.push(journeyPrompt);
  }

  // One question per topic. See the note on `PromptEntry`.
  const seen = new Set<string>();
  const out: PromptEntry[] = [];
  for (const entry of [...ordered, ...BASE]) {
    if (seen.has(entry.topic)) continue;
    seen.add(entry.topic);
    out.push(entry);
    if (out.length === limit) break;
  }
  return out;
}

/**
 * The same prompts as text.
 *
 * The Home chips need only the words; the Ask starters need the topic too, so
 * each row can carry an icon that matches what it asks. One source either way
 * — two lists would drift, and then the app would suggest one set of questions
 * on Home and a different set one tap later.
 */
export function promptsFor(
  journey: string | null | undefined,
  conditions: readonly string[] = [],
  limit = 3,
): Prompt[] {
  return promptEntriesFor(journey, conditions, limit).map((entry) => entry.text);
}
