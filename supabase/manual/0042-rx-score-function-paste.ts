// rx-score, as ONE file for the Supabase dashboard editor (Edge Functions > Deploy a new
// function > Via Editor). Same code as supabase/functions/rx-score/index.ts + rx.ts,
// joined so it can be pasted in one go. Keep the two in step if either changes:
// regenerate with the command in supabase/functions/rx-score/README.md.

// The prescription scorecard: every medicine on a prescription, read down to
// its salts and checked against ten standards and the person's own records.
//
// ONE FILE, NO IMPORTS, on purpose. The rx-score Edge Function (Deno) and the
// app (its fallback, and its tests) both import this file, the way geo/parse.ts
// is shared. Deno wants ".ts" on import paths and the app's TypeScript refuses
// them, so nothing here imports anything.
//
// WHAT IT IS NOT. A doctor. It never says "stop taking" anything: every finding
// that needs action becomes a question for the prescriber, in words the person
// can read out. Red ("stop") is kept for the few things that should be asked
// about before the first dose: an allergy match, a banned combination, a
// medicine that should not be taken in pregnancy, and a known dangerous pair.
//
// THE FORMULARY IS A STARTER LIST. About 50 salts and 60 brands common in
// India, written for the launch and pending clinician sign-off
// (tracker: ai-clinical-signoff). The licensed brand-to-salt resolver
// (ai-brand-salt) replaces BRANDS and SALTS when it lands; nothing else here
// should need to change. Anything not in the list is reported as "couldn't
// check", never as fine. Prices are indicative MRPs for comparison only.

export const RX_VERSION = 1;

// ------------------------------------------------------------------ shapes --

export type Status = "clear" | "act" | "stop" | "unknown";
export type CheckId = "salt" | "banned" | "allergy" | "interactions" | "dose" | "duplicate" | "conditions" | "pregnancy" | "reports" | "instructions";

export type Source = { label: string; documentId?: string | null };
export type Finding = { medicine: string; status: Status; text: string; source?: Source };
export type Check = { id: CheckId; n: number; title: string; status: Status; line: string; findings: Finding[] };
export type Alternative = { name: string; price: number | null; per: string; note: string; prescribed: boolean; generic: boolean; save: number | null };
export type MedicineCard = {
  name: string;
  salts: { name: string; strength: string | null }[];
  resolved: boolean;
  how: string | null;
  status: Status;
  alternatives: Alternative[];
};
export type Verdict = { tone: "fits" | "sort" | "stop" | "partial"; title: string; line: string };
export type Scorecard = {
  version: number;
  documentId: string;
  profileId: string;
  person: string;
  doctor: string | null;
  scoredAt: string;
  score: { clear: number; act: number; stop: number; unknown: number; of: 10 };
  verdict: Verdict;
  checks: Check[];
  medicines: MedicineCard[];
  questions: string[];
  basis: { records: number; labs: number; medicines: number };
};

/** One medicine as the prescription reader writes it (records/details.ts). */
export type RxMedicine = {
  name: string;
  strength: string | null;
  form: string;
  dose: string | null;
  schedule: [number, number, number] | string | null;
  timing: string | null;
  durationDays: number | null;
  asNeeded?: boolean;
  note?: string | null;
};
export type RxInput = {
  today: string;
  document: { id: string; eventDate: string | null; doctor: string | null; medicines: RxMedicine[] };
  person: {
    id: string;
    name: string;
    dob: string | null;
    sex: string | null;
    weightKg: number | null;
    allergies: string[];
    conditions: string[];
    pregnancy: { weeks: number } | null;
    deliveredDaysAgo: number | null;
  };
  /** What they already take, from other prescriptions and their own list. */
  current: { name: string; strength: string | null; source: Source }[];
  /** The latest value of each lab test on file. */
  labs: { key: string; name: string; value: number; unit: string | null; flag: string | null; date: string | null; source: Source }[];
  records: number;
};

// --------------------------------------------------------------- formulary --

type Pregnancy = "safe" | "caution" | "avoid";
type Salt = {
  id: string;
  name: string;
  cls: string;
  aliases?: string[];
  /** Adult ceiling per day, in the salt's unit. */
  maxDaily?: number;
  unit?: "mg" | "mcg" | "IU";
  /** Children: per-dose range in mg/kg, and the youngest age in months. */
  perKg?: [number, number];
  minMonths?: number;
  minYears?: number;
  pregnancy?: [Pregnancy, string];
  lactation?: [Pregnancy, string];
  /** Conditions, matched against the person's list. */
  conditions?: { match: RegExp; status: Status; text: string; ask: string }[];
  kidney?: { below: number; status: Status; text: string };
  /** Reports that bear on it. */
  labs?: { key: string; when: "high" | "low"; above?: number; below?: number; status: Status; text: string; ask?: string }[];
  /** Taken long term, so a prescription often has no duration. */
  ongoing?: boolean;
  /** Needs a written duration (antibiotics). */
  course?: boolean;
  allergy?: RegExp;
};

const NSAID_COND = [
  { match: /kidney|ckd|renal/i, status: "stop" as Status, text: "Painkillers like this can harm kidneys that are already weak.", ask: "Is {med} safe with {first}'s kidney condition, or is paracetamol enough?" },
  { match: /ulcer|gastritis|acid/i, status: "act" as Status, text: "Can upset a stomach with a history of ulcers or acidity.", ask: "Should {first} take a stomach protector with {med}?" },
  { match: /asthma/i, status: "act" as Status, text: "Can set off wheezing in some people with asthma.", ask: "{first} has asthma. Is {med} all right, or is paracetamol safer?" },
  { match: /heart failure|hypertension|blood pressure|bp/i, status: "act" as Status, text: "Can raise blood pressure and hold water.", ask: "With {first}'s blood pressure, how long is it safe to take {med}?" },
];
const NSAID_PREG: [Pregnancy, string] = ["avoid", "Not advised in pregnancy, especially after 20 weeks."];

const S = (s: Salt): Salt => s;
export const SALTS: Salt[] = [
  S({ id: "paracetamol", name: "Paracetamol", cls: "analgesic", aliases: ["acetaminophen", "pcm"], maxDaily: 4000, unit: "mg", perKg: [10, 15], pregnancy: ["safe", "The usual choice for pain and fever in pregnancy."], lactation: ["safe", "Fine while breastfeeding."],
    conditions: [{ match: /liver|hepat|cirrhosis/i, status: "act", text: "Needs a lower daily limit with liver disease.", ask: "What is the most paracetamol {first} should take in a day, with the liver condition?" }] }),
  S({ id: "ibuprofen", name: "Ibuprofen", cls: "nsaid", maxDaily: 2400, unit: "mg", perKg: [5, 10], minMonths: 3, pregnancy: NSAID_PREG, lactation: ["safe", "Short courses are fine while breastfeeding."], conditions: NSAID_COND, kidney: { below: 30, status: "stop", text: "Kidney function is low for this painkiller." } }),
  S({ id: "diclofenac", name: "Diclofenac", cls: "nsaid", maxDaily: 150, unit: "mg", minYears: 14, pregnancy: NSAID_PREG, lactation: ["caution", "Short courses only while breastfeeding."], conditions: NSAID_COND, kidney: { below: 30, status: "stop", text: "Kidney function is low for this painkiller." } }),
  S({ id: "aceclofenac", name: "Aceclofenac", cls: "nsaid", maxDaily: 200, unit: "mg", minYears: 18, pregnancy: NSAID_PREG, lactation: ["avoid", "Not advised while breastfeeding."], conditions: NSAID_COND, kidney: { below: 30, status: "stop", text: "Kidney function is low for this painkiller." } }),
  S({ id: "nimesulide", name: "Nimesulide", cls: "nsaid", maxDaily: 200, unit: "mg", minYears: 12, pregnancy: NSAID_PREG, lactation: ["avoid", "Not advised while breastfeeding."], conditions: NSAID_COND }),
  S({ id: "aspirin", name: "Aspirin", cls: "antiplatelet", aliases: ["acetylsalicylic acid"], maxDaily: 4000, unit: "mg", minYears: 16, pregnancy: ["caution", "Low-dose aspirin is sometimes prescribed in pregnancy on purpose; anything else, ask."], lactation: ["caution", "Low dose only while breastfeeding."], allergy: /aspirin|nsaid|salicylate/i }),
  S({ id: "cetirizine", name: "Cetirizine", cls: "antihistamine", maxDaily: 10, unit: "mg", minMonths: 6, pregnancy: ["safe", "Commonly used in pregnancy."], lactation: ["caution", "Can make a breastfed baby drowsy; occasional doses are fine."] }),
  S({ id: "levocetirizine", name: "Levocetirizine", cls: "antihistamine", maxDaily: 5, unit: "mg", minMonths: 6, pregnancy: ["caution", "Less studied in pregnancy than cetirizine."], lactation: ["caution", "Can make a breastfed baby drowsy."] }),
  S({ id: "fexofenadine", name: "Fexofenadine", cls: "antihistamine", maxDaily: 180, unit: "mg", minMonths: 6, pregnancy: ["caution", "Less studied in pregnancy."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "chlorpheniramine", name: "Chlorpheniramine", cls: "antihistamine", maxDaily: 24, unit: "mg", minYears: 2, pregnancy: ["caution", "Ask before using in pregnancy."], lactation: ["caution", "Can make a breastfed baby drowsy."] }),
  S({ id: "montelukast", name: "Montelukast", cls: "leukotriene", maxDaily: 10, unit: "mg", minMonths: 6, pregnancy: ["caution", "Used in pregnancy when asthma needs it."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "amoxicillin", name: "Amoxicillin", cls: "penicillin", maxDaily: 3000, unit: "mg", perKg: [10, 30], course: true, allergy: /penicillin|amoxi|ampicillin|augmentin/i, pregnancy: ["safe", "Widely used in pregnancy."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "clavulanate", name: "Clavulanic acid", cls: "penicillin", aliases: ["clavulanate potassium"], course: true, allergy: /penicillin|amoxi|augmentin/i, pregnancy: ["safe", "Widely used in pregnancy."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "azithromycin", name: "Azithromycin", cls: "macrolide", maxDaily: 500, unit: "mg", perKg: [5, 10], course: true, allergy: /azithro|macrolide|erythro/i, pregnancy: ["safe", "Used in pregnancy when needed."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "ciprofloxacin", name: "Ciprofloxacin", cls: "fluoroquinolone", maxDaily: 1500, unit: "mg", minYears: 18, course: true, allergy: /cipro|quinolone/i, pregnancy: ["avoid", "Usually avoided in pregnancy."], lactation: ["avoid", "Usually avoided while breastfeeding."] }),
  S({ id: "metronidazole", name: "Metronidazole", cls: "nitroimidazole", maxDaily: 2000, unit: "mg", course: true, pregnancy: ["caution", "Ask, especially in the first trimester."], lactation: ["caution", "Can pass into milk; short courses are usually fine."] }),
  S({ id: "metformin", name: "Metformin", cls: "biguanide", maxDaily: 2550, unit: "mg", minYears: 10, ongoing: true, pregnancy: ["caution", "Sometimes continued in pregnancy under a doctor."], lactation: ["safe", "Fine while breastfeeding."],
    kidney: { below: 30, status: "stop", text: "Kidney function is below the line for metformin." },
    labs: [{ key: "hba1c", when: "high", above: 5.6, status: "clear", text: "HbA1c {value}: there is a sugar reason for it." }] }),
  S({ id: "glimepiride", name: "Glimepiride", cls: "sulfonylurea", maxDaily: 8, unit: "mg", ongoing: true, pregnancy: ["avoid", "Usually switched to insulin in pregnancy."], lactation: ["avoid", "Not advised while breastfeeding."],
    labs: [{ key: "hba1c", when: "low", below: 6.5, status: "act", text: "HbA1c {value} is near normal; this one can drop sugar too low.", ask: "{first}'s HbA1c is {value}. Is {med} still needed at this dose?" }] }),
  S({ id: "atorvastatin", name: "Atorvastatin", cls: "statin", maxDaily: 80, unit: "mg", minYears: 10, ongoing: true, pregnancy: ["avoid", "Statins are stopped in pregnancy."], lactation: ["avoid", "Statins are not advised while breastfeeding."],
    labs: [{ key: "ldl", when: "high", above: 100, status: "clear", text: "LDL {value}: it is what this is for." }, { key: "alt", when: "high", above: 120, status: "act", text: "Liver enzyme ALT is {value}, over three times normal.", ask: "{first}'s ALT is {value}. Is {med} still right?" }] }),
  S({ id: "rosuvastatin", name: "Rosuvastatin", cls: "statin", maxDaily: 40, unit: "mg", minYears: 10, ongoing: true, pregnancy: ["avoid", "Statins are stopped in pregnancy."], lactation: ["avoid", "Statins are not advised while breastfeeding."],
    labs: [{ key: "ldl", when: "high", above: 100, status: "clear", text: "LDL {value}: it is what this is for." }] }),
  S({ id: "amlodipine", name: "Amlodipine", cls: "ccb", maxDaily: 10, unit: "mg", ongoing: true, pregnancy: ["caution", "Sometimes used in pregnancy under a doctor."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "telmisartan", name: "Telmisartan", cls: "arb", maxDaily: 80, unit: "mg", ongoing: true, pregnancy: ["avoid", "Blood pressure medicines of this kind are not used in pregnancy."], lactation: ["caution", "Ask while breastfeeding."] }),
  S({ id: "losartan", name: "Losartan", cls: "arb", maxDaily: 100, unit: "mg", ongoing: true, pregnancy: ["avoid", "Blood pressure medicines of this kind are not used in pregnancy."], lactation: ["caution", "Ask while breastfeeding."] }),
  S({ id: "levothyroxine", name: "Levothyroxine", cls: "thyroid", aliases: ["thyroxine", "l-thyroxine"], maxDaily: 300, unit: "mcg", ongoing: true, pregnancy: ["safe", "Keep taking it; the dose often goes up in pregnancy."], lactation: ["safe", "Fine while breastfeeding."],
    labs: [
      { key: "tsh", when: "high", above: 4.5, status: "clear", text: "TSH {value} is high: the thyroid needs this." },
      { key: "tsh", when: "low", below: 0.4, status: "act", text: "TSH {value} is low; the dose may be more than needed.", ask: "{first}'s TSH is {value}. Should the {med} dose come down?" },
    ] }),
  S({ id: "ferrous_ascorbate", name: "Ferrous ascorbate", cls: "iron", ongoing: false, pregnancy: ["safe", "Iron is routine in pregnancy."], lactation: ["safe", "Fine while breastfeeding."],
    labs: [
      { key: "ferritin", when: "low", below: 30, status: "clear", text: "Ferritin {value} is low: iron is right." },
      { key: "haemoglobin", when: "low", below: 12, status: "clear", text: "Haemoglobin {value} is low: iron is right." },
      { key: "ferritin", when: "high", above: 200, status: "act", text: "Ferritin {value} is already high.", ask: "{first}'s ferritin is {value}. Is more iron needed?" },
    ] }),
  S({ id: "ferrous_sulphate", name: "Ferrous sulphate", cls: "iron", pregnancy: ["safe", "Iron is routine in pregnancy."], lactation: ["safe", "Fine while breastfeeding."],
    labs: [{ key: "ferritin", when: "low", below: 30, status: "clear", text: "Ferritin {value} is low: iron is right." }] }),
  S({ id: "folic_acid", name: "Folic acid", cls: "vitamin", aliases: ["folate"], pregnancy: ["safe", "Recommended before and during pregnancy."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "calcium_carbonate", name: "Calcium carbonate", cls: "calcium", aliases: ["calcium"], pregnancy: ["safe", "Recommended in pregnancy."], lactation: ["safe", "Recommended while breastfeeding."] }),
  S({ id: "cholecalciferol", name: "Vitamin D3", cls: "vitamin_d", aliases: ["cholecalciferol", "vitamin d"], unit: "IU", pregnancy: ["safe", "Usual doses are fine in pregnancy."], lactation: ["safe", "Fine while breastfeeding."],
    labs: [
      { key: "vitamin_d", when: "low", below: 30, status: "clear", text: "Vitamin D {value} is low: this is what it is for." },
      { key: "vitamin_d", when: "high", above: 100, status: "act", text: "Vitamin D {value} is already high.", ask: "{first}'s vitamin D is {value}. Should {med} continue?" },
    ] }),
  S({ id: "methylcobalamin", name: "Methylcobalamin", cls: "vitamin", aliases: ["vitamin b12"], pregnancy: ["safe", "Fine in pregnancy."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "pantoprazole", name: "Pantoprazole", cls: "ppi", maxDaily: 80, unit: "mg", pregnancy: ["caution", "Used in pregnancy when needed."], lactation: ["caution", "Short courses are usually fine."] }),
  S({ id: "omeprazole", name: "Omeprazole", cls: "ppi", maxDaily: 40, unit: "mg", pregnancy: ["caution", "Used in pregnancy when needed."], lactation: ["caution", "Short courses are usually fine."] }),
  S({ id: "esomeprazole", name: "Esomeprazole", cls: "ppi", maxDaily: 40, unit: "mg", pregnancy: ["caution", "Used in pregnancy when needed."], lactation: ["caution", "Short courses are usually fine."] }),
  S({ id: "rabeprazole", name: "Rabeprazole", cls: "ppi", maxDaily: 40, unit: "mg", pregnancy: ["caution", "Ask in pregnancy."], lactation: ["caution", "Ask while breastfeeding."] }),
  S({ id: "domperidone", name: "Domperidone", cls: "prokinetic", maxDaily: 30, unit: "mg", pregnancy: ["caution", "Ask in pregnancy."], lactation: ["caution", "Ask while breastfeeding."],
    conditions: [{ match: /heart|arrhythm|qt/i, status: "act", text: "Can affect heart rhythm.", ask: "With {first}'s heart history, is {med} safe?" }] }),
  S({ id: "ondansetron", name: "Ondansetron", cls: "antiemetic", maxDaily: 24, unit: "mg", pregnancy: ["caution", "Ask, especially in the first trimester."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "doxylamine", name: "Doxylamine", cls: "antiemetic", pregnancy: ["safe", "Commonly used for morning sickness."], lactation: ["caution", "Can make a breastfed baby drowsy."] }),
  S({ id: "pyridoxine", name: "Pyridoxine", cls: "vitamin", aliases: ["vitamin b6"], pregnancy: ["safe", "Commonly used for morning sickness."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "salbutamol", name: "Salbutamol", cls: "bronchodilator", aliases: ["albuterol"], pregnancy: ["safe", "Inhaled salbutamol is used in pregnancy."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "clopidogrel", name: "Clopidogrel", cls: "antiplatelet", maxDaily: 75, unit: "mg", ongoing: true, pregnancy: ["caution", "Ask in pregnancy."], lactation: ["caution", "Ask while breastfeeding."] }),
  S({ id: "warfarin", name: "Warfarin", cls: "anticoagulant", ongoing: true, pregnancy: ["avoid", "Not used in pregnancy."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "isotretinoin", name: "Isotretinoin", cls: "retinoid", pregnancy: ["avoid", "Causes birth defects; never in pregnancy."], lactation: ["avoid", "Not used while breastfeeding."] }),
  S({ id: "ors", name: "Oral rehydration salts", cls: "ors", aliases: ["ors"], pregnancy: ["safe", "Fine in pregnancy."], lactation: ["safe", "Fine while breastfeeding."] }),
  S({ id: "bromhexine", name: "Bromhexine", cls: "mucolytic" }),
  S({ id: "phenylephrine", name: "Phenylephrine", cls: "decongestant", pregnancy: ["avoid", "Decongestants are best avoided in pregnancy."] }),
  S({ id: "guaifenesin", name: "Guaifenesin", cls: "expectorant", aliases: ["guaiphenesin"] }),
  S({ id: "codeine", name: "Codeine", cls: "opioid", minYears: 12, pregnancy: ["avoid", "Not advised in pregnancy."], lactation: ["avoid", "Not advised while breastfeeding."] }),
  S({ id: "pholcodine", name: "Pholcodine", cls: "opioid" }),
  S({ id: "promethazine", name: "Promethazine", cls: "antihistamine", minYears: 2 }),
];

const ONE = (salt: string, amount: number | null = null) => ({ salt, amount });
type Brand = { name: string; salts: { salt: string; amount: number | null }[]; price?: number; per?: string; generic?: boolean };
const B = (name: string, salts: Brand["salts"], price?: number, per = "10 tablets", generic = false): Brand => ({ name, salts, price, per, generic });
export const BRANDS: Brand[] = [
  B("Dolo 650", [ONE("paracetamol", 650)], 21), B("Calpol 650", [ONE("paracetamol", 650)], 19), B("Crocin 650", [ONE("paracetamol", 650)], 22), B("Paracetamol 650 (Jan Aushadhi)", [ONE("paracetamol", 650)], 8, "10 tablets", true),
  B("Crocin Advance", [ONE("paracetamol", 500)], 20), B("Calpol 500", [ONE("paracetamol", 500)], 14), B("Paracetamol 500 (Jan Aushadhi)", [ONE("paracetamol", 500)], 6, "10 tablets", true),
  B("Calpol drops", [ONE("paracetamol", 100)], 45, "15 mL"), B("Paracetamol drops (Jan Aushadhi)", [ONE("paracetamol", 100)], 18, "15 mL", true),
  B("Combiflam", [ONE("ibuprofen", 400), ONE("paracetamol", 325)], 45, "20 tablets"), B("Brufen 400", [ONE("ibuprofen", 400)], 18), B("Ibuprofen 400 (Jan Aushadhi)", [ONE("ibuprofen", 400)], 7, "10 tablets", true),
  B("Voveran 50", [ONE("diclofenac", 50)], 26), B("Diclofenac 50 (Jan Aushadhi)", [ONE("diclofenac", 50)], 5, "10 tablets", true),
  B("Zerodol P", [ONE("aceclofenac", 100), ONE("paracetamol", 325)], 70), B("Nise", [ONE("nimesulide", 100)], 50),
  B("Ecosprin 75", [ONE("aspirin", 75)], 5, "14 tablets"),
  B("Cetzine", [ONE("cetirizine", 10)], 20), B("Okacet", [ONE("cetirizine", 10)], 18), B("Cetirizine 10 (Jan Aushadhi)", [ONE("cetirizine", 10)], 4, "10 tablets", true),
  B("Levocet", [ONE("levocetirizine", 5)], 42), B("Xyzal", [ONE("levocetirizine", 5)], 75), B("Allegra 120", [ONE("fexofenadine", 120)], 220),
  B("Montair LC", [ONE("montelukast", 10), ONE("levocetirizine", 5)], 230), B("Montek LC", [ONE("montelukast", 10), ONE("levocetirizine", 5)], 190),
  B("Mox 500", [ONE("amoxicillin", 500)], 90), B("Novamox 500", [ONE("amoxicillin", 500)], 85),
  B("Augmentin 625 Duo", [ONE("amoxicillin", 500), ONE("clavulanate", 125)], 220, "10 tablets"), B("Clavam 625", [ONE("amoxicillin", 500), ONE("clavulanate", 125)], 200, "10 tablets"),
  B("Azithral 500", [ONE("azithromycin", 500)], 120, "5 tablets"), B("Azee 500", [ONE("azithromycin", 500)], 110, "5 tablets"),
  B("Ciplox 500", [ONE("ciprofloxacin", 500)], 75), B("Flagyl 400", [ONE("metronidazole", 400)], 20, "15 tablets"),
  B("Glycomet 500", [ONE("metformin", 500)], 20), B("Glycomet GP 1", [ONE("metformin", 500), ONE("glimepiride", 1)], 95), B("Metformin 500 (Jan Aushadhi)", [ONE("metformin", 500)], 6, "10 tablets", true),
  B("Atorva 10", [ONE("atorvastatin", 10)], 75), B("Lipvas 10", [ONE("atorvastatin", 10)], 70), B("Storvas 10", [ONE("atorvastatin", 10)], 80), B("Atorvastatin 10 (Jan Aushadhi)", [ONE("atorvastatin", 10)], 9, "10 tablets", true),
  B("Rosuvas 10", [ONE("rosuvastatin", 10)], 190), B("Amlong 5", [ONE("amlodipine", 5)], 35), B("Amlodipine 5 (Jan Aushadhi)", [ONE("amlodipine", 5)], 4, "10 tablets", true),
  B("Telma 40", [ONE("telmisartan", 40)], 110, "15 tablets"), B("Telmisartan 40 (Jan Aushadhi)", [ONE("telmisartan", 40)], 12, "15 tablets", true), B("Losar 50", [ONE("losartan", 50)], 60),
  B("Thyronorm 25", [ONE("levothyroxine", 25)], 14), B("Eltroxin 25", [ONE("levothyroxine", 25)], 12), B("Thyrox 25", [ONE("levothyroxine", 25)], 11),
  B("Thyronorm 50", [ONE("levothyroxine", 50)], 16), B("Eltroxin 50", [ONE("levothyroxine", 50)], 15),
  B("Orofer XT", [ONE("ferrous_ascorbate", 100), ONE("folic_acid", 1.5)], 179), B("Ferium XT", [ONE("ferrous_ascorbate", 100), ONE("folic_acid", 1.5)], 152), B("Ferrous ascorbate and folic acid (Jan Aushadhi)", [ONE("ferrous_ascorbate", 100), ONE("folic_acid", 1.5)], 38, "10 tablets", true),
  B("Ferrous ascorbate 100", [ONE("ferrous_ascorbate", 100)], 95), B("Folvite 5", [ONE("folic_acid", 5)], 45, "30 tablets"),
  B("Shelcal 500", [ONE("calcium_carbonate", 1250), ONE("cholecalciferol", 250)], 80), B("Calcium and vitamin D3 (Jan Aushadhi)", [ONE("calcium_carbonate", 1250), ONE("cholecalciferol", 250)], 15, "10 tablets", true),
  B("Uprise D3 60K", [ONE("cholecalciferol", 60000)], 120, "4 capsules"), B("D-Rise 60K", [ONE("cholecalciferol", 60000)], 110, "4 capsules"), B("Vitamin D3 60,000 IU", [ONE("cholecalciferol", 60000)], 100, "4 capsules"),
  B("Pan 40", [ONE("pantoprazole", 40)], 150, "15 tablets"), B("Pantocid 40", [ONE("pantoprazole", 40)], 160, "15 tablets"), B("Pantoprazole 40 (Jan Aushadhi)", [ONE("pantoprazole", 40)], 10, "15 tablets", true),
  B("Omez 20", [ONE("omeprazole", 20)], 60, "20 capsules"), B("Pan D", [ONE("pantoprazole", 40), ONE("domperidone", 30)], 200, "15 capsules"),
  B("Doxinate", [ONE("doxylamine", 10), ONE("pyridoxine", 10)], 140), B("Emeset 4", [ONE("ondansetron", 4)], 55),
  B("Clopilet 75", [ONE("clopidogrel", 75)], 70, "15 tablets"), B("Asthalin", [ONE("salbutamol", 100)], 150, "200 puffs"),
];

/** Fixed-dose combinations banned in India (CDSCO notification, June 2023). Sorted salt ids. */
const BANNED: { salts: string[]; label: string }[] = [
  { salts: ["nimesulide", "paracetamol"], label: "Nimesulide with paracetamol (dispersible tablets)" },
  { salts: ["chlorpheniramine", "codeine"], label: "Chlorpheniramine with codeine (syrup)" },
  { salts: ["pholcodine", "promethazine"], label: "Pholcodine with promethazine" },
  { salts: ["amoxicillin", "bromhexine"], label: "Amoxicillin with bromhexine" },
  { salts: ["bromhexine", "salbutamol"], label: "Salbutamol with bromhexine" },
  { salts: ["bromhexine", "chlorpheniramine", "guaifenesin", "paracetamol", "phenylephrine"], label: "Paracetamol, bromhexine, phenylephrine, chlorpheniramine and guaifenesin" },
].map((b) => ({ ...b, salts: [...b.salts].sort() }));

/** Pairs worth a word. a and b are salt ids or classes. */
const PAIRS: { a: string; b: string; status: Status; text: string; ask: string }[] = [
  { a: "thyroid", b: "iron", status: "act", text: "Iron cuts how much of the thyroid tablet gets in. Keep them 4 hours apart.", ask: "Can {first} take {x} first thing and {y} 4 hours later?" },
  { a: "thyroid", b: "calcium", status: "act", text: "Calcium cuts how much of the thyroid tablet gets in. Keep them 4 hours apart.", ask: "Can {first} take {x} first thing and {y} at night?" },
  { a: "iron", b: "calcium", status: "act", text: "Calcium blocks iron. Take them at different meals.", ask: "Should {first} take {x} at lunch and {y} at dinner?" },
  { a: "fluoroquinolone", b: "iron", status: "act", text: "Iron stops the antibiotic working. Take the antibiotic 2 hours before or 6 hours after.", ask: "How should {first} space {x} and {y}?" },
  { a: "fluoroquinolone", b: "calcium", status: "act", text: "Calcium stops the antibiotic working. Take the antibiotic 2 hours before or 6 hours after.", ask: "How should {first} space {x} and {y}?" },
  { a: "nsaid", b: "anticoagulant", status: "stop", text: "Together they raise the risk of bleeding.", ask: "{first} takes {y}. Is {x} safe with it, or is paracetamol better?" },
  { a: "nsaid", b: "antiplatelet", status: "act", text: "Together they raise the risk of stomach bleeding.", ask: "{first} takes {y}. Is {x} safe with it?" },
  { a: "nsaid", b: "arb", status: "act", text: "Together they can strain the kidneys and blunt blood pressure control.", ask: "{first} takes {y} for blood pressure. Is {x} all right for a few days?" },
  { a: "clopidogrel", b: "omeprazole", status: "act", text: "Omeprazole weakens clopidogrel. Pantoprazole is the usual swap.", ask: "Could {first} take pantoprazole instead of {y} with {x}?" },
  { a: "clopidogrel", b: "esomeprazole", status: "act", text: "Esomeprazole weakens clopidogrel. Pantoprazole is the usual swap.", ask: "Could {first} take pantoprazole instead of {y} with {x}?" },
  { a: "metronidazole", b: "warfarin", status: "stop", text: "Metronidazole makes warfarin much stronger.", ask: "{first} takes warfarin. Is {x} safe, and should the INR be checked?" },
  { a: "sulfonylurea", b: "biguanide", status: "clear", text: "A usual pairing for sugar.", ask: "" },
];

// -------------------------------------------------------------- resolving --

const SALT_BY_ID = new Map(SALTS.map((s) => [s.id, s]));
/** A brand's salt by id. Every id in BRANDS is in SALTS; a typo fails loudly in the tests. */
function saltOf(id: string): Salt {
  const s = SALT_BY_ID.get(id);
  if (!s) throw new Error(`formulary: unknown salt ${id}`);
  return s;
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();

function numberIn(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

type Resolved = { brand: Brand | null; salts: { salt: Salt; amount: number | null }[] };

/** "Dolo 650" or "Paracetamol drops 100 mg/mL" or "Thyronorm 25 mcg" to salts. */
export function resolve(name: string, strength: string | null = null): Resolved | null {
  const n = norm(name);
  const full = norm(`${name} ${strength ?? ""}`);
  // Brands first: the longest brand name that the medicine starts with.
  const brands = BRANDS.filter((b) => !b.generic).sort((a, b) => b.name.length - a.name.length);
  for (const b of brands) {
    const bn = norm(b.name);
    const stem = bn.replace(/\s\d+(\.\d+)?$/, "");
    if (n === bn || n.startsWith(bn + " ") || full.startsWith(bn)) return { brand: b, salts: b.salts.map((s) => ({ salt: saltOf(s.salt), amount: s.amount })) };
    // "Thyronorm" with strength "25 mcg"
    if (stem !== bn && (n === stem || n.startsWith(stem + " ")) && numberIn(strength) !== null && bn.endsWith(" " + String(numberIn(strength)))) {
      return { brand: b, salts: b.salts.map((s) => ({ salt: saltOf(s.salt), amount: s.amount })) };
    }
  }
  // A brand without the strength we know: take its salts, strength from the Rx.
  for (const b of brands) {
    const stem = norm(b.name).replace(/\s\d+(\.\d+)?$/, "");
    if (stem.length >= 4 && (n === stem || n.startsWith(stem + " "))) {
      const amt = numberIn(strength) ?? numberIn(name);
      return { brand: null, salts: b.salts.map((s, i) => ({ salt: saltOf(s.salt), amount: b.salts.length === 1 ? amt : i === 0 ? amt : s.amount })) };
    }
  }
  // Generic names, one or more salts: "Ferrous ascorbate", "Amoxicillin + clavulanic acid".
  const parts = name.split(/\+|\bwith\b|\band\b|,/i).map((p) => norm(p)).filter(Boolean);
  const found: Resolved["salts"] = [];
  for (const p of parts) {
    const salt = SALTS.find((s) => [s.name, ...(s.aliases ?? [])].some((a) => p === norm(a) || p.startsWith(norm(a) + " ")));
    if (salt) found.push({ salt, amount: parts.length === 1 ? numberIn(strength) ?? numberIn(p) : numberIn(p) });
  }
  return found.length ? { brand: null, salts: found } : null;
}

// ----------------------------------------------------------------- scoring --

const TITLES: Record<CheckId, string> = {
  salt: "Every salt identified",
  banned: "No banned combinations",
  allergy: "Her allergies",
  interactions: "With her other medicines",
  dose: "Dose for her age and weight",
  duplicate: "Not doubled up",
  conditions: "Her conditions",
  pregnancy: "Pregnancy and breastfeeding",
  reports: "Her reports",
  instructions: "Clear instructions",
};
const ORDER: CheckId[] = ["salt", "banned", "allergy", "interactions", "dose", "duplicate", "conditions", "pregnancy", "reports", "instructions"];
const RANK: Record<Status, number> = { clear: 0, unknown: 1, act: 2, stop: 3 };
const worst = (s: Status[]) => s.reduce<Status>((w, x) => (RANK[x] > RANK[w] ? x : w), "clear");

function ageYears(dob: string | null, today: string): number | null {
  if (!dob) return null;
  const d = new Date(dob), t = new Date(today);
  if (Number.isNaN(d.getTime())) return null;
  return (t.getTime() - d.getTime()) / (365.25 * 86_400_000);
}
const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));
const shortDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
};

function perDay(m: RxMedicine): number | null {
  if (Array.isArray(m.schedule)) return m.schedule.reduce((a, b) => a + (Number(b) || 0), 0) || null;
  if (typeof m.schedule === "string") {
    const parts = m.schedule.split(/[-–]/).map((x) => Number(x));
    if (parts.length >= 3 && parts.every((x) => Number.isFinite(x))) return parts.reduce((a, b) => a + b, 0) || null;
  }
  return null;
}

/** mL per dose for liquids ("0.6 mL"), else tablets per dose ("1 tablet", "half"). */
function unitsPerDose(m: RxMedicine): { n: number; ml: boolean } | null {
  const d = (m.dose ?? "").toLowerCase();
  if (/half|½/.test(d)) return { n: 0.5, ml: false };
  const n = numberIn(d);
  if (n === null) return m.form === "tablet" || m.form === "capsule" ? { n: 1, ml: false } : null;
  return { n, ml: /ml/.test(d) };
}

export function score(input: RxInput): Scorecard {
  const first = firstName(input.person.name);
  const age = ageYears(input.person.dob, input.today);
  const months = age === null ? null : age * 12;
  const female = input.person.sex === "female";
  const breastfeeding = input.person.deliveredDaysAgo !== null && input.person.deliveredDaysAgo <= 365;

  const rx = input.document.medicines.map((m) => ({ m, r: resolve(m.name, m.strength) }));
  const current = input.current.map((c) => ({ c, r: resolve(c.name, c.strength) }));
  const doctor = input.document.doctor;
  const thisRx: Source = { label: doctor ? `Prescription from ${doctor}` : "This prescription", documentId: input.document.id };

  const F: Record<CheckId, Finding[]> = { salt: [], banned: [], allergy: [], interactions: [], dose: [], duplicate: [], conditions: [], pregnancy: [], reports: [], instructions: [] };
  const asks: string[] = [];
  const ask = (t: string) => { if (t && !asks.includes(t)) asks.push(t); };

  for (const { m, r } of rx) {
    const med = m.name;
    // 1. Salt.
    if (!r) {
      F.salt.push({ medicine: med, status: "unknown", text: `I couldn't match ${med} to its salts yet, so the checks below leave it out.` });
      ask(`What is the generic name of ${med}?`);
      continue;
    }
    const liquid = /drop|syrup|suspension|liquid/i.test(`${m.form} ${m.name}`);
    const per = liquid ? "/mL" : "";
    F.salt.push({ medicine: med, status: "clear", text: r.salts.map((s) => `${s.salt.name}${s.amount ? ` ${fmt(s.amount)} ${s.salt.unit ?? "mg"}${per}` : ""}`).join(" + ") });

    // 2. Banned combinations.
    const ids = [...new Set(r.salts.map((s) => s.salt.id))].sort();
    const banned = BANNED.find((b) => b.salts.length === ids.length && b.salts.every((x, i) => x === ids[i]));
    if (banned) {
      F.banned.push({ medicine: med, status: "stop", text: `${banned.label} is a banned combination in India.`, source: { label: "CDSCO notification, June 2023" } });
      ask(`${med} is on the banned combinations list. What should ${first} take instead?`);
    }

    for (const { salt } of r.salts) {
      // 3. Allergy.
      const words = [salt.name, ...(salt.aliases ?? []), salt.cls];
      const hit = input.person.allergies.find((a) => (salt.allergy ? salt.allergy.test(a) : false) || words.some((w) => norm(a).includes(norm(w)) || norm(w).includes(norm(a))));
      if (hit) {
        F.allergy.push({ medicine: med, status: "stop", text: `${first} is allergic to ${hit}, and ${med} has ${salt.name}.`, source: { label: "Health profile" } });
        ask(`${first} is allergic to ${hit}. Is ${med} safe, or is there another option?`);
      }

      // 7. Conditions.
      for (const c of salt.conditions ?? []) {
        const cond = input.person.conditions.find((x) => c.match.test(x));
        if (cond) {
          F.conditions.push({ medicine: med, status: c.status, text: `${cond}: ${c.text}`, source: { label: "Health profile" } });
          ask(fill(c.ask, { first, med }));
        }
      }
      if (salt.kidney) {
        const egfr = input.labs.find((l) => l.key === "egfr");
        if (egfr && egfr.value < salt.kidney.below) {
          F.conditions.push({ medicine: med, status: salt.kidney.status, text: `eGFR ${fmt(egfr.value)}: ${salt.kidney.text}`, source: egfr.source });
          ask(`${first}'s eGFR is ${fmt(egfr.value)}. Is ${med} safe for the kidneys at this dose?`);
        }
      }

      // 8. Pregnancy and breastfeeding.
      if (input.person.pregnancy) {
        const [lvl, why] = salt.pregnancy ?? ["caution", "Not enough known about it in pregnancy."];
        const st: Status = lvl === "avoid" ? "stop" : lvl === "caution" ? "act" : "clear";
        F.pregnancy.push({ medicine: med, status: st, text: `Week ${input.person.pregnancy.weeks}: ${why}`, source: { label: "Pregnancy in memory" } });
        if (st !== "clear") ask(`${first} is ${input.person.pregnancy.weeks} weeks pregnant. Is ${med} the right choice?`);
      } else if (breastfeeding) {
        const [lvl, why] = salt.lactation ?? ["caution", "Not enough known about it while breastfeeding."];
        const st: Status = lvl === "avoid" ? "stop" : lvl === "caution" ? "act" : "clear";
        F.pregnancy.push({ medicine: med, status: st, text: why, source: { label: `Baby born ${Math.round((input.person.deliveredDaysAgo ?? 0) / 7)} weeks ago` } });
        if (st !== "clear") ask(`${first} is breastfeeding. Is ${med} all right for the baby?`);
      }

      // 9. Reports.
      for (const rule of salt.labs ?? []) {
        const lab = input.labs.find((l) => l.key === rule.key);
        if (!lab) continue;
        const ok = rule.when === "high" ? lab.value > (rule.above ?? Infinity) : lab.value < (rule.below ?? -Infinity);
        if (!ok) continue;
        const v = `${fmt(lab.value)}${lab.unit ? ` ${lab.unit}` : ""}`;
        F.reports.push({ medicine: med, status: rule.status, text: fill(rule.text, { value: v }), source: { label: `${lab.name}, ${shortDate(lab.date)}`, documentId: lab.source.documentId } });
        if (rule.ask && rule.status !== "clear") ask(fill(rule.ask, { first, med, value: v }));
      }

      // 5. Dose.
      const amount = r.salts.length === 1 ? (r.salts[0]?.amount ?? numberIn(m.strength)) : r.salts.find((x) => x.salt === salt)?.amount ?? null;
      const n = perDay(m), u = unitsPerDose(m);
      if (amount !== null && u) {
        const perDose = u.ml ? amount * u.n : amount * u.n; // drops: amount is per mL
        const daily = n ? perDose * n : m.asNeeded ? perDose * 4 : null;
        const child = age !== null && age < 12;
        if (child && salt.perKg && input.person.weightKg) {
          const mgkg = perDose / input.person.weightKg;
          const [lo, hi] = salt.perKg;
          const st: Status = mgkg > hi * 1.1 ? "act" : "clear";
          F.dose.push({ medicine: med, status: st, text: `${fmt(perDose)} ${salt.unit ?? "mg"} a dose is ${fmt(mgkg)} mg/kg for ${fmt(input.person.weightKg)} kg (usual ${lo} to ${hi}).`, source: { label: "Weight in health profile" } });
          if (st !== "clear") ask(`${med}: is ${fmt(perDose)} mg a dose right for ${first} at ${fmt(input.person.weightKg)} kg?`);
        } else if (salt.maxDaily && daily !== null && salt === r.salts[0]?.salt) {
          const st: Status = daily > salt.maxDaily ? "act" : "clear";
          const u2 = salt.unit ?? "mg";
          F.dose.push({ medicine: med, status: st, text: `${fmt(daily)} ${u2} a day${m.asNeeded ? " at most" : ""}, ${st === "act" ? "over" : "within"} the ${fmt(salt.maxDaily)} ${u2} adult limit.` });
          if (st !== "clear") ask(`${med} adds up to ${fmt(daily)} ${salt.unit ?? "mg"} a day. Is that intended?`);
        }
      }
      if (months !== null && ((salt.minMonths && months < salt.minMonths) || (salt.minYears && (age ?? 99) < salt.minYears))) {
        F.dose.push({ medicine: med, status: "act", text: `${salt.name} is not usually given under ${salt.minYears ? `${salt.minYears} years` : `${salt.minMonths} months`}.` });
        ask(`${first} is ${age !== null && age < 1 ? `${Math.round(months)} months` : `${Math.floor(age ?? 0)} years`} old. Is ${med} right at this age?`);
      }
      if (salt.id === "paracetamol" && months !== null && months < 3) {
        F.dose.push({ medicine: med, status: "clear", text: "Under 3 months, paracetamol only on a doctor's direct advice. This prescription is that advice: keep to the exact dose." });
      }
    }

    // 10. Instructions.
    const ongoing = r.salts.some((s) => s.salt.ongoing);
    const course = r.salts.some((s) => s.salt.course);
    const missing: string[] = [];
    if (!m.dose && !(m.form === "tablet" || m.form === "capsule")) missing.push("how much");
    if (!perDay(m) && !m.asNeeded) missing.push("how often");
    if (!m.durationDays && !ongoing && !m.asNeeded) missing.push("for how long");
    if (missing.length) {
      F.instructions.push({ medicine: med, status: "act", text: `No ${missing.join(" or ")} written${course ? ", and an antibiotic needs a full course" : ""}.`, source: thisRx });
      ask(`${med}: ${missing.join(", ")}?`);
    } else {
      F.instructions.push({ medicine: med, status: "clear", text: [m.dose, Array.isArray(m.schedule) ? m.schedule.join("-") : m.schedule, m.durationDays ? `${m.durationDays} days` : ongoing ? "ongoing" : m.asNeeded ? "when needed" : null].filter(Boolean).join(" · ") });
    }
  }

  // 4 and 6. Pairs and doubles, across this prescription and what they already take.
  type Item = { label: string; salt: Salt; from: "rx" | "current"; source?: Source };
  const items: Item[] = [
    ...rx.flatMap(({ m, r }) => (r ? r.salts.map((s) => ({ label: m.name, salt: s.salt, from: "rx" as const })) : [])),
    ...current.flatMap(({ c, r }) => (r ? r.salts.map((s) => ({ label: c.name, salt: s.salt, from: "current" as const, source: c.source })) : [])),
  ];
  const matches = (s: Salt, key: string) => s.id === key || s.cls === key;
  const seenPair = new Set<string>();
  // An old medicine with the same salt as a new one is asked about as a double;
  // spacing it from the rest would be advice about something to stop.
  const rxSalts = new Set(items.filter((i) => i.from === "rx").map((i) => i.salt.id));
  for (const x of items.filter((i) => i.from === "rx")) {
    for (const y of items) {
      if (x === y || x.label === y.label) continue;
      if (y.from === "current" && rxSalts.has(y.salt.id)) {
        // still checked below as a double
      } else for (const p of PAIRS) {
        const fwd = matches(x.salt, p.a) && matches(y.salt, p.b), rev = matches(x.salt, p.b) && matches(y.salt, p.a);
        if (!fwd && !rev) continue;
        const key = [x.label, y.label, p.a, p.b].sort().join("|");
        if (seenPair.has(key)) continue;
        seenPair.add(key);
        if (p.status === "clear") continue;
        const [a, b] = fwd ? [x.label, y.label] : [y.label, x.label];
        F.interactions.push({ medicine: x.label, status: p.status, text: `${a} and ${b}: ${p.text}`, source: y.from === "current" ? y.source : thisRx });
        ask(fill(p.ask, { first, x: a, y: b }));
      }
    }
    // Doubles: the same salt twice, or two of a class that should not stack.
    for (const y of items) {
      if (x === y || x.label === y.label) continue;
      const same = x.salt.id === y.salt.id;
      const stack = !same && x.salt.cls === y.salt.cls && ["nsaid", "ppi", "statin", "antihistamine", "arb", "iron"].includes(x.salt.cls);
      if (!same && !stack) continue;
      const key = ["dup", x.label, y.label].sort().join("|");
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      const where = y.from === "current" ? `already taken from ${y.source?.label ?? "another prescription"}` : "also on this prescription";
      F.duplicate.push({ medicine: x.label, status: "act", text: same ? `${x.salt.name} is in ${x.label} and in ${y.label}, ${where}.` : `${x.label} and ${y.label} are both ${clsWord(x.salt.cls)}, ${where}.`, source: y.from === "current" ? y.source : thisRx });
      ask(y.from === "current" ? `Should ${first} stop ${y.label} now that ${x.label} is prescribed?` : `Are both ${x.label} and ${y.label} meant to be taken together?`);
    }
  }

  // Lines for checks with nothing to say.
  const empty: Record<CheckId, string> = {
    salt: "Nothing to identify.",
    banned: "None of the combinations is on India's banned list.",
    allergy: input.person.allergies.length ? `Nothing here matches ${input.person.allergies.join(", ")}.` : "No allergies on file.",
    interactions: input.current.length ? `Nothing here clashes with the ${input.current.length} other ${input.current.length === 1 ? "medicine" : "medicines"} ${first} takes.` : "Nothing here clashes, and no other medicines on file.",
    dose: "Doses are within the usual limits.",
    duplicate: "No salt is doubled up.",
    conditions: input.person.conditions.length ? `Nothing here goes against ${input.person.conditions.join(", ").toLowerCase()}.` : "No conditions on file to check against.",
    pregnancy: input.person.pregnancy || breastfeeding ? "Fine for now." : female && age !== null && age >= 15 && age <= 50 ? "Not pregnant or breastfeeding, from what's on file." : "Not relevant here.",
    reports: input.labs.length ? "Nothing in the reports argues against it." : "No reports on file to read it against.",
    instructions: "Dose, timing and duration are all written.",
  };

  const checks: Check[] = ORDER.map((id, i) => {
    // Worst first, and within that, what touches medicines already being taken.
    const fs = [...F[id]].sort((a, b) => RANK[b.status] - RANK[a.status] || Number(Boolean(b.source && b.source !== thisRx && b.source.label !== "Health profile")) - Number(Boolean(a.source && a.source !== thisRx && a.source.label !== "Health profile")));
    const status = fs.length ? worst(fs.map((f) => f.status)) : id === "dose" && !rx.some((x) => x.r) ? "unknown" : "clear";
    const flagged = fs.filter((f) => f.status !== "clear");
    const line = flagged.length ? (flagged[0]?.text ?? "") : fs.length && (id === "reports" || id === "dose" || id === "salt" || id === "pregnancy") ? (fs[0]?.text ?? empty[id]) : empty[id];
    return { id, n: i + 1, title: TITLES[id], status, line, findings: fs };
  });
  // Name the person in the titles: "Her allergies" becomes "Priya's allergies".
  for (const c of checks) c.title = c.title.replace(/\bher\b/i, `${first}'s`);

  const count = (s: Status) => checks.filter((c) => c.status === s).length;
  const sc = { clear: count("clear"), act: count("act"), stop: count("stop"), unknown: count("unknown"), of: 10 as const };

  const verdict: Verdict = sc.stop
    ? { tone: "stop", title: `Ask before ${first} starts`, line: `${sc.stop === 1 ? "One thing needs" : `${sc.stop} things need`} the doctor's word before the first dose.` }
    : sc.act
      ? { tone: "sort", title: `Fits ${first}, with ${sc.act === 1 ? "one thing" : `${sc.act} things`} to sort`, line: "Nothing here should stop the course. The questions below settle the rest." }
      : sc.unknown
        ? { tone: "partial", title: `Fits ${first}, as far as I can check`, line: "One or more medicines aren't in my list yet, so those checks are left open." }
        : { tone: "fits", title: `Fits ${first}`, line: `All ten checks are clear against ${first}'s records.` };

  const medicines: MedicineCard[] = rx.map(({ m, r }) => {
    const mine = ORDER.flatMap((id) => F[id].filter((f) => f.medicine === m.name).map((f) => f.status));
    return {
      name: m.name,
      salts: r ? r.salts.map((s) => ({ name: s.salt.name, strength: s.amount ? `${fmt(s.amount)} ${s.salt.unit ?? "mg"}${/drop|syrup|suspension|liquid/i.test(`${m.form} ${m.name}`) ? "/mL" : ""}` : null })) : [],
      resolved: Boolean(r),
      how: [m.dose, Array.isArray(m.schedule) ? m.schedule.join("-") : m.schedule, timingWord(m.timing), m.durationDays ? `${m.durationDays} days` : null].filter(Boolean).join(" · ") || null,
      status: r ? worst(mine) : "unknown",
      alternatives: r ? alternatives(m.name, r) : [],
    };
  });

  return {
    version: RX_VERSION,
    documentId: input.document.id,
    profileId: input.person.id,
    person: first,
    doctor,
    scoredAt: new Date().toISOString(),
    score: sc,
    verdict,
    checks,
    medicines,
    questions: asks.slice(0, 6),
    basis: { records: input.records, labs: input.labs.length, medicines: input.current.length },
  };
}

function clsWord(cls: string): string {
  return ({ nsaid: "painkillers of the same kind", ppi: "acid reducers", statin: "statins", antihistamine: "antihistamines", arb: "blood pressure medicines of the same kind", iron: "iron" } as Record<string, string>)[cls] ?? cls;
}
function timingWord(t: string | null): string | null {
  return ({ before_food: "before food", after_food: "after food", with_food: "with food", empty_stomach: "empty stomach", bedtime: "at bedtime" } as Record<string, string>)[t ?? ""] ?? null;
}

/** Same salts at the same strengths, cheapest first. The prescribed one stays in the list. */
function alternatives(name: string, r: Resolved): Alternative[] {
  const sig = (salts: { salt: string; amount: number | null }[]) => salts.map((s) => `${s.salt}:${s.amount ?? "?"}`).sort().join("+");
  const mine = sig(r.salts.map((s) => ({ salt: s.salt.id, amount: s.amount })));
  const same = BRANDS.filter((b) => sig(b.salts) === mine);
  if (same.length < 2 && !r.brand) return [];
  const prescribed = r.brand ?? same[0];
  const per = prescribed?.per ?? "10 tablets";
  const base = r.brand?.price ?? null;
  return same
    .filter((b) => b.per === per)
    .map((b) => ({
      name: b.name,
      price: b.price ?? null,
      per: b.per ?? per,
      note: b === r.brand ? "Prescribed" : b.generic ? "Same salts, government generic" : "Same salts, same strength",
      prescribed: b === r.brand,
      generic: Boolean(b.generic),
      save: base && b.price && b !== r.brand && b.price < base ? Math.round((1 - b.price / base) * 100) : null,
    }))
    .sort((a, b) => Number(b.prescribed) - Number(a.prescribed) || (a.price ?? 1e9) - (b.price ?? 1e9))
    .slice(0, 4);
}

// -------------------------------------------------------------- gathering --
//
// Builds RxInput from the database, as the signed-in person: every read goes
// through PostgREST with their own token, so row-level security decides what
// can be read. Used by the Edge Function and, when the function is not
// deployed yet, by the app with the same token.

export type Rest = (path: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

type Row = Record<string, unknown>;
async function rows(rest: Rest, path: string): Promise<Row[]> {
  const res = await rest(path);
  if (!res.ok) throw new Error(`read ${path.split("?")[0]}: ${res.status}`);
  return (await res.json()) as Row[];
}

const LAB_KEYS: Record<string, string> = {
  tsh: "tsh", ferritin: "ferritin", haemoglobin: "haemoglobin", hemoglobin: "haemoglobin", hb: "haemoglobin", hba1c: "hba1c", ldl: "ldl", ldl_cholesterol: "ldl",
  vitamin_d: "vitamin_d", "25_oh_vitamin_d": "vitamin_d", egfr: "egfr", creatinine: "creatinine", alt: "alt", sgpt: "alt",
};

export async function gather(rest: Rest, documentId: string, today = new Date().toISOString().slice(0, 10)): Promise<RxInput | null> {
  const [doc] = await rows(rest, `/rest/v1/documents?select=id,profile_id,doc_type,event_date,doctor,extraction&id=eq.${encodeURIComponent(documentId)}`);
  if (!doc) return null;
  if (doc.doc_type !== "prescription") throw new Error("not a prescription");
  const details = ((doc.extraction as Row | null)?.details ?? {}) as Row;
  const medicines = (Array.isArray(details.medicines) ? details.medicines : []) as RxMedicine[];
  const doctorName = ((details.doctor as Row | undefined)?.name as string | undefined) ?? (doc.doctor as string | null) ?? null;
  const pid = doc.profile_id as string;

  const [profileRows, docs, ents, pregs] = await Promise.all([
    rows(rest, `/rest/v1/profiles?select=id,name,dob,sex,weight_kg,allergies,conditions,medications&id=eq.${pid}`),
    rows(rest, `/rest/v1/documents?select=id,doc_type,event_date,doctor,extraction&profile_id=eq.${pid}&order=event_date.desc.nullslast&limit=200`),
    rows(rest, `/rest/v1/entities?select=kind,name,canonical_name,value,unit,flag,event_date,document_id&profile_id=eq.${pid}&kind=eq.lab_value&order=event_date.desc.nullslast&limit=500`),
    rows(rest, `/rest/v1/pregnancies?select=status,lmp,edd,delivered_on&profile_id=eq.${pid}&order=created_at.desc&limit=3`).catch(() => [] as Row[]),
  ]);
  const p = profileRows[0];
  if (!p) return null;

  const titleOf = (d: Row) => (((d.extraction as Row | null)?.title as string | undefined) ?? "a record");
  const titles = new Map(docs.map((d) => [d.id as string, titleOf(d)]));

  // What they already take: other prescriptions still running, and their own list.
  const day = (iso: string) => new Date(iso).getTime();
  const current: RxInput["current"] = [];
  for (const d of docs) {
    if (d.id === doc.id || d.doc_type !== "prescription" || !d.event_date) continue;
    const meds = ((((d.extraction as Row | null)?.details as Row | undefined)?.medicines ?? []) as RxMedicine[]);
    for (const m of meds) {
      const r = resolve(m.name, m.strength);
      const ongoing = r?.salts.some((s) => s.salt.ongoing);
      const ends = m.durationDays ? day(d.event_date as string) + m.durationDays * 86_400_000 : ongoing ? Infinity : day(d.event_date as string) + 90 * 86_400_000;
      if (ends >= day(today)) current.push({ name: m.name, strength: m.strength ?? null, source: { label: `${(d.doctor as string | null) ?? titleOf(d)}, ${shortDate(d.event_date as string)}`, documentId: d.id as string } });
    }
  }
  for (const m of (Array.isArray(p.medications) ? p.medications : []) as { name?: string; dose?: string }[]) {
    if (m.name && !current.some((c) => norm(c.name) === norm(m.name as string))) current.push({ name: m.name, strength: m.dose ?? null, source: { label: "Health profile" } });
  }

  const labs: RxInput["labs"] = [];
  for (const e of ents) {
    const key = LAB_KEYS[String(e.canonical_name ?? "").toLowerCase()] ?? LAB_KEYS[norm(String(e.name ?? "")).replace(/\s/g, "_")];
    if (!key || labs.some((l) => l.key === key) || typeof e.value !== "number") continue;
    labs.push({ key, name: String(e.name), value: e.value, unit: (e.unit as string | null) ?? null, flag: (e.flag as string | null) ?? null, date: (e.event_date as string | null) ?? null, source: { label: titles.get(e.document_id as string) ?? "a report", documentId: e.document_id as string } });
  }

  const ongoing = pregs.find((g) => g.status === "ongoing");
  const delivered = pregs.find((g) => g.status === "delivered" && g.delivered_on);
  const weeks = ongoing?.lmp ? Math.floor((day(today) - day(ongoing.lmp as string)) / (7 * 86_400_000)) : ongoing?.edd ? 40 - Math.ceil((day(ongoing.edd as string) - day(today)) / (7 * 86_400_000)) : null;

  return {
    today,
    document: { id: doc.id as string, eventDate: (doc.event_date as string | null) ?? null, doctor: doctorName, medicines },
    person: {
      id: pid,
      name: String(p.name),
      dob: (p.dob as string | null) ?? null,
      sex: (p.sex as string | null) ?? null,
      weightKg: p.weight_kg === null || p.weight_kg === undefined ? null : Number(p.weight_kg),
      allergies: (p.allergies as string[] | null) ?? [],
      conditions: (p.conditions as string[] | null) ?? [],
      pregnancy: weeks !== null && weeks >= 0 && weeks <= 43 ? { weeks } : null,
      deliveredDaysAgo: delivered ? Math.round((day(today) - day(delivered.delivered_on as string)) / 86_400_000) : null,
    },
    current,
    labs,
    records: docs.length,
  };
}

/** Gather, score and keep it. The write is the person's own (RLS), so it can only land on their family. */
export async function scoreAndStore(rest: Rest, documentId: string, today?: string): Promise<Scorecard | null> {
  const input = await gather(rest, documentId, today);
  if (!input) return null;
  const card = score(input);
  const res = await rest(`/rest/v1/rx_scorecards?on_conflict=document_id`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ document_id: documentId, profile_id: input.person.id, version: RX_VERSION, score: card.score.clear, verdict: card.verdict.tone, card }),
  });
  // A missing table (migration not run yet) still returns the card.
  if (!res.ok && res.status !== 404) throw new Error(`store scorecard: ${res.status}`);
  return card;
}

// ------------------------------------------------------------------ index --

// rx-score: the prescription scorecard for one prescription.
//
// The app sends { documentId } and gets back { card }: every medicine read to
// its salts and checked on ten standards against the person's own records
// (rules and formulary in rx.ts, shared with the app). The card is kept in
// rx_scorecards so every phone in the family sees the same one.
//
// AS THE PERSON. Every read and the write go through PostgREST with the
// caller's own token, so row-level security decides what this can see. There
// is no service key in here: a request can never score someone else's record.
//
// PRIVACY. Nothing is logged and nothing leaves Supabase. No model is called;
// the rules are plain code.
//
// Deploy:  supabase functions deploy rx-score
//          (JWT verification stays ON: only signed-in people can call it)
//          From the dashboard instead: paste supabase/manual/0042-rx-score-function-paste.ts
//          (this file and rx.ts joined) into Edge Functions > Via Editor.
// Needs:   migration 0042 (rx_scorecards). Without it the card is still
//          returned, just not kept.


const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}

/** The account that signed this request, or null. Asked of Auth, never read from the body. */
async function caller(authorization: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: authorization } });
  if (!res.ok) return null;
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  return typeof user?.id === "string" ? user.id : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!(await caller(authorization))) return json({ error: "signed_out" }, 401);

  const body = (await req.json().catch(() => null)) as { documentId?: unknown } | null;
  const documentId = typeof body?.documentId === "string" ? body.documentId : "";
  if (!UUID.test(documentId)) return json({ error: "bad_request" }, 400);

  const rest: Rest = (path, init = {}) =>
    fetch(`${SUPABASE_URL}${path}`, {
      method: init.method ?? "GET",
      body: init.body,
      headers: { apikey: ANON_KEY, Authorization: authorization, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(8000),
    });

  try {
    const card = await scoreAndStore(rest, documentId);
    if (!card) return json({ error: "not_found" }, 404);
    return json({ card });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "not a prescription") return json({ error: "not_prescription" }, 422);
    return json({ error: "unavailable" }, 503);
  }
});
