/*
 * THE MEMORY LAYER'S VOCABULARY.
 *
 * Cheeku is not a chatbot with a file attached. It is a longitudinal memory
 * for a household: every record, every reading someone typed into a chat,
 * every test a doctor ordered, held against a clock that means something for
 * that person (week 31 of a pregnancy, day 6 of a newborn's life, a 70-year
 * old's third year on a statin). The chat is the way in and out of it.
 *
 * The shape follows the system spec reverse-engineered from a twelve-month
 * family thread (pregnancy, delivery, the first weeks of a newborn), kept in
 * `docs/health-memory-layer-spec.md`:
 *
 *   subject graph   a household of linked people, one of whom can start life
 *                   inside another's timeline and be promoted at birth
 *   clock           a person-relative clock: gestational age, day of life
 *   thresholds      limits that depend on that clock, never a flat range
 *   series          every number with its previous value, delta and rate
 *   ledger          running medication state, de-duplicated by ingredient
 *   open loops      things ordered that have not closed
 *   tiers           every symptom resolves to one of four
 *   script          what to tell the doctor, built from stored values
 *   corrections     when a fact changes, earlier conclusions are revisited
 *
 * WHAT CHEEKU DOES AND DOES NOT DO. It does not diagnose. It uses general
 * health models to understand a symptom to a point, strips out the noise,
 * reads the risk against the person's own history, and turns that into a
 * clear next step and a better conversation with their doctor. The clinician
 * script is the product, not a diagnosis.
 */

// ---------------------------------------------------------------- subjects --

export type SubjectStatus = "active" | "gestational" | "archived";

export type RelationType = "mother" | "father" | "parent" | "child" | "spouse" | "sibling" | "other";

/** What a newborn carries over from the pregnancy it came from. */
export type BirthContext = {
  pregnancyId: string | null;
  motherId: string | null;
  /** Gestational age at birth, in days (37 weeks = 259). */
  gaAtBirthDays: number | null;
  deliveryMode: string | null;
  birthWeightKg: number | null;
  maternalBloodGroup: string | null;
  /** Medicines the mother was on in the last weeks, as names only. */
  inUteroMedicines: string[];
};

export type Relation = {
  subjectId: string;
  type: RelationType;
  name: string;
  /*
   * The ONLY field read across from a relative. Blood group of a mother is how
   * a newborn's jaundice gets read (mother O, baby A), and nothing else about
   * her file belongs in the baby's context. See PLAN.md rule 4.
   */
  bloodGroup: string | null;
};

export type Subject = {
  id: string;
  name: string;
  firstName: string;
  dob: string | null;
  sex: string | null;
  bloodGroup: string | null;
  countryOfCare: string | null;
  status: SubjectStatus;
  relationship: string | null;
  isPrimary: boolean;
  conditions: string[];
  allergies: string[];
  relations: Relation[];
  birth: BirthContext | null;
};

export type Dating = {
  date: string;
  /** Gestational age on `date`, in days. */
  gaDays: number;
  source: "scan" | "lmp" | "clinician";
  label: string | null;
  documentId: string | null;
};

export type Pregnancy = {
  id: string;
  profileId: string;
  lmp: string | null;
  edd: string | null;
  datings: Dating[];
  babyName: string | null;
  status: "ongoing" | "delivered" | "ended";
  deliveredOn: string | null;
  deliveryMode: string | null;
  childProfileId: string | null;
};

// ------------------------------------------------------------------- tiers --

/** Every symptom resolves to exactly one of these. */
export type Tier = "reassure" | "monitor" | "contact_today" | "go_now";

export const TIER_RANK: Record<Tier, number> = { reassure: 0, monitor: 1, contact_today: 2, go_now: 3 };

export const TIER_LABEL: Record<Tier, string> = {
  reassure: "Fits the expected pattern",
  monitor: "Keep an eye on it",
  contact_today: "Speak to the doctor today",
  go_now: "Go now",
};

export const TIER_SHORT: Record<Tier, string> = {
  reassure: "Expected",
  monitor: "Monitor",
  contact_today: "Call today",
  go_now: "Go now",
};

export function maxTier(...tiers: (Tier | null | undefined)[]): Tier {
  let best: Tier = "reassure";
  for (const t of tiers) if (t && TIER_RANK[t] > TIER_RANK[best]) best = t;
  return best;
}

export type TierSource = "lexicon" | "hard_stop" | "threshold" | "trend" | "symptom" | "ledger" | "model";

export type TierReason = { tier: Tier; source: TierSource; text: string };

// ------------------------------------------------------------------- facts --

/** Something said in the chat or read off a device, kept like a record value. */
export type Fact = {
  id: string;
  key: string;
  label: string;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  observedOn: string;
  source: "chat" | "device" | "record";
  messageId: string | null;
  documentId: string | null;
  supersededBy: string | null;
};
