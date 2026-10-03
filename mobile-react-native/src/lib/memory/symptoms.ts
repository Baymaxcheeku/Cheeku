import type { ResolvedClock } from "./clock";
import type { Tier } from "./types";

/*
 * GENERAL HEALTH MODELS FOR COMMON SYMPTOMS.
 *
 * Cheeku does not diagnose. What it does is what a sensible nurse on the phone
 * does: understand the symptom to a point, separate the expected from the
 * worrying, read it against this person's clock and their own numbers, and say
 * how urgent it looks and what would change that.
 *
 * Each model gives:
 *   base        the starting tier for each kind of person. A fever is a
 *               "monitor" for an adult and a "go now" for a 3-week-old.
 *   mechanism   why it happens, in general, in plain words
 *   homeCare    what usually helps, never a dose
 *   watchFor    the specific signs that would move it up a tier
 *   analytes    which of their own measurements to look at
 *   askDoctor   what to ask if they call
 *
 * The fine-tuned model will replace the wording; it will not replace the
 * tiers. Those are floors the rules set and the model can only raise.
 */

export type Population = "neonate" | "infant" | "child" | "adult" | "older_adult" | "pregnant" | "postpartum";

export function populationOf(clock: ResolvedClock): Population {
  if (clock.modifiers.includes("pregnant")) return "pregnant";
  if (clock.modifiers.includes("postpartum")) return "postpartum";
  if (clock.stage === "neonate") return "neonate";
  if (clock.stage === "infant") return "infant";
  if (clock.stage === "toddler" || clock.stage === "child" || clock.stage === "teen") return "child";
  if (clock.stage === "older_adult") return "older_adult";
  return "adult";
}

export type SymptomModel = {
  id: string;
  label: string;
  patterns: RegExp[];
  base: Partial<Record<Population, Tier>> & { default: Tier };
  analytes: string[];
  mechanism: Partial<Record<Population, string>> & { default: string };
  homeCare: string[];
  /** Home care that differs by age: what helps a 3-week-old is not what helps an adult. */
  homeCareBy?: Partial<Record<Population, string[]>>;
  watchFor: Partial<Record<Population, string[]>> & { default: string[] };
  askDoctor: string[];
  /** How far back a reading still bears on it. A fever is about this week; tiredness about this year. */
  windowDays: number;
  /** What to measure, when nothing recent is on file. */
  askForReading?: string;
};

export const SYMPTOMS: readonly SymptomModel[] = [
  {
    id: "jaundice",
    windowDays: 7,
    askForReading: "If there's a recent bilirubin result, tell me the number and the day it was taken.",

    label: "Yellow skin or eyes",
    patterns: [/\byellow(ish|ness)?\b/i, /\bjaundice/i, /\bpee?liya\b/i, /\bbilirubin\b/i],
    base: { default: "contact_today", neonate: "contact_today" },
    analytes: ["bilirubin_total"],
    mechanism: {
      neonate:
        "Most newborns turn a little yellow in the first week. The liver is still catching up with clearing bilirubin, the yellow pigment left over as a baby's extra red cells break down. It usually peaks around day 3 to 5 and fades by two weeks. What decides how much it matters is the number against the day of life, not the colour on its own.",
      default:
        "Yellow eyes or skin in an older child or adult means bilirubin is building up, and that is never a wait-and-see sign. The cause can be the liver, the gallbladder or the blood, and only tests can tell which.",
    },
    homeCare: ["Keep feeds frequent, every 2 to 3 hours, because feeding is how bilirubin leaves the body.", "Look at the colour in daylight, pressing gently on the skin of the nose or chest."],
    watchFor: {
      neonate: ["Yellow spreading to the tummy, legs, palms or soles", "Sleepy and hard to wake for feeds, or feeding less", "Pale or chalky stools, or dark urine", "Still yellow after two weeks"],
      default: ["Pain in the upper right of the tummy", "Fever with the yellowing", "Pale stools or dark urine"],
    },
    askDoctor: ["Do you want a repeat bilirubin, and when?", "Which chart are you reading it against?"],
  },
  {
    id: "fever",
    windowDays: 7,
    askForReading: "Take a temperature and tell me the number. I'll keep it with the rest.",

    label: "Fever",
    patterns: [/\bfever(ish)?\b/i, /\btemp(erature)?\b/i, /\bbukhar\b/i, /\bhigh temp/i],
    base: { default: "monitor", adult: "monitor", infant: "contact_today", neonate: "go_now", pregnant: "contact_today", postpartum: "contact_today" },
    analytes: ["temperature", "wbc"],
    mechanism: {
      default:
        "A fever is the body turning its own thermostat up to fight something, most often a virus. The number on the thermometer matters less than how the person is between fevers: drinking, passing urine, and alert.",
      pregnant: "A fever in pregnancy is worth a call the same day. Most are ordinary infections, but a high temperature is something the doctor wants to know about and treat early.",
      infant: "In a young baby a fever is taken more seriously than in an older child, because babies show illness less clearly. A doctor should see any fever in the first six months.",
    },
    homeCare: ["Plenty of fluids, little and often.", "Light clothing, a room that is not too warm.", "Paracetamol is what most doctors suggest for comfort. For a child the amount goes by weight, so use what the doctor or the pack says."],
    watchFor: {
      default: ["Fever lasting more than 3 days", "A rash that does not fade when a glass is pressed on it", "Drowsy or hard to wake", "Breathing fast or working hard to breathe", "No urine in 8 hours, or not drinking", "Stiff neck or a bad headache with the fever"],
    },
    askDoctor: ["Does this need to be seen today?", "Is a blood test worth doing now?"],
  },
  {
    id: "cough_cold",
    windowDays: 7,

    label: "Cough or cold",
    patterns: [/\bcough/i, /\bcold\b/i, /runny nose/i, /\bsneez/i, /\bkhansi\b/i, /\bzuka?am\b/i, /\bblocked nose|congest/i],
    base: { default: "reassure", child: "monitor", infant: "monitor", neonate: "contact_today", older_adult: "monitor" },
    analytes: ["wbc", "eosinophils"],
    mechanism: {
      default: "Most coughs and colds are viral. A cold usually runs 7 to 10 days, and the cough can hang on for up to three weeks after the rest has cleared. Antibiotics do not shorten a viral cold.",
      neonate: "A newborn with a cold needs watching closely, because they breathe through the nose and a blocked nose can make feeding hard.",
    },
    homeCare: ["Rest and fluids.", "Saline drops or steam help a blocked nose.", "Honey in warm water soothes a cough for anyone over 1 year old. Never honey under 1."],
    watchFor: {
      default: ["Breathing fast, or the ribs pulling in with each breath", "Noisy or whistling breathing", "Fever lasting more than 3 days", "Cough lasting more than 3 weeks, or bringing up blood"],
      neonate: ["Struggling to feed because of the blocked nose", "Breathing fast or pauses in breathing", "Any fever"],
    },
    askDoctor: ["Is this still viral, or does it need examining?"],
  },
  {
    id: "headache",
    windowDays: 7,
    askForReading: "If there's a blood pressure machine at home, take a reading and tell me the numbers.",

    label: "Headache",
    patterns: [/\bheadache/i, /\bhead (pain|hurts|ache)/i, /\bsir dard\b|\bsar dard\b/i, /\bmigraine/i],
    base: { default: "reassure", pregnant: "contact_today", postpartum: "contact_today", child: "monitor" },
    analytes: ["bp_systolic", "bp_diastolic"],
    mechanism: {
      default: "Most headaches come from tension, poor sleep, too little water or too long at a screen, and settle with rest. What matters is a headache that is new, different, or comes with other signs.",
      pregnant: "From the middle of pregnancy a headache that will not settle is something the doctor wants to hear about the same day, because it can be linked to blood pressure. Checking blood pressure is the quickest way to know.",
    },
    homeCare: ["Water, food and rest in a darker room.", "If there is a home blood pressure monitor, take a reading and tell me the numbers."],
    watchFor: {
      default: ["The worst headache ever, or one that comes on suddenly", "Headache with weakness, confusion or trouble speaking", "Headache after a knock to the head", "Headache with a stiff neck and fever"],
      pregnant: ["Blurred vision, flashing lights or spots", "Pain under the ribs on the right", "Sudden swelling of the face or hands", "Blood pressure of 140/90 or more"],
    },
    askDoctor: ["Should blood pressure be checked today?"],
  },
  {
    id: "tired",
    windowDays: 400,

    label: "Tiredness",
    patterns: [/\btired/i, /\bfatigue/i, /\bexhausted/i, /\bweak(ness)?\b/i, /\bthakan\b/i, /\blow energy/i, /no energy/i],
    base: { default: "reassure", older_adult: "monitor", pregnant: "reassure" },
    analytes: ["haemoglobin", "tsh", "ferritin", "vitamin_d", "glucose_fasting", "hba1c"],
    mechanism: {
      default: "Tiredness has a long list of ordinary causes, like sleep, stress or a recent illness, and a short list that blood tests can see: low haemoglobin, thyroid, low iron or vitamin D, and blood sugar. The useful thing is to check that short list against the numbers already on file.",
      pregnant: "Tiredness is expected in the first and last parts of pregnancy. The part worth checking is haemoglobin, because the amount needed goes up as the pregnancy goes on.",
    },
    homeCare: ["Regular sleep and meals.", "A short daily walk helps more than rest alone for most people."],
    watchFor: { default: ["Breathless on stairs or with little effort", "Weight loss without trying", "Tiredness lasting more than a few weeks"] },
    askDoctor: ["Are any of my recent results enough to explain this?", "Is it worth repeating haemoglobin or thyroid?"],
  },
  {
    id: "dizzy",
    windowDays: 14,
    askForReading: "If there's a blood pressure machine at home, take a reading sitting down and tell me the numbers.",

    label: "Dizziness",
    patterns: [/\bdizz/i, /light-?headed/i, /\bchakk?ar\b/i, /\bfaint(ish|ing)? feeling/i, /\bwoozy\b/i, /\blow bp\b/i, /\bbp (is )?low\b/i],
    base: { default: "monitor", older_adult: "monitor", pregnant: "monitor" },
    analytes: ["bp_systolic", "bp_diastolic", "haemoglobin", "glucose_fasting"],
    mechanism: {
      default: "Feeling light-headed often comes from blood pressure dipping, not drinking enough, standing up quickly, or low blood sugar. A drop from someone's usual pressure tells more than the number alone.",
      pregnant: "Pregnancy lowers blood pressure in the middle months, and standing quickly or lying flat on the back can bring on a light-headed spell. Lying on the left side usually helps.",
    },
    homeCare: ["Sit or lie down until it passes.", "Drink some water and eat something.", "Stand up slowly."],
    watchFor: { default: ["Fainting", "Dizziness with chest pain or a racing heart", "A new weakness on one side or trouble speaking"] },
    askDoctor: ["Could any of the current medicines be lowering the pressure?", "Is it worth checking haemoglobin?"],
  },
  {
    id: "stomach",
    windowDays: 7,

    label: "Vomiting or loose motions",
    patterns: [/\bvomit/i, /\bthrow(ing)? up\b/i, /\bdiarr?h/i, /loose motion/i, /\bulti\b/i, /\bdast\b/i, /\bupset stomach/i],
    base: { default: "monitor", adult: "reassure", infant: "contact_today", neonate: "contact_today", older_adult: "monitor" },
    analytes: [],
    mechanism: { default: "Most tummy bugs are viral and clear in two or three days. The risk is losing more fluid than goes back in, which happens faster in babies and older people." },
    homeCare: ["Small sips of fluid often, an oral rehydration solution if there is one.", "Keep breastfeeding or feeding as normal for a baby."],
    watchFor: {
      default: ["No urine in 8 hours, a dry mouth or no tears", "Blood in the vomit or stools", "Green vomit", "Unable to keep any fluid down for 6 hours", "Very drowsy"],
    },
    askDoctor: ["Does this need checking for dehydration today?"],
  },
  {
    id: "rash",
    windowDays: 7,

    label: "Rash",
    patterns: [/\brash/i, /\bspots\b/i, /\bhives\b/i, /\bitch(y|ing)\b/i, /\bkhujli\b/i, /\beczema/i, /\bnappy rash|diaper rash/i],
    base: { default: "reassure", neonate: "monitor" },
    analytes: [],
    mechanism: { default: "Most rashes are from heat, skin irritation or a virus and fade on their own. The ones that matter come with fever, or do not fade when pressed." },
    homeCare: ["Keep the skin cool and dry, loose cotton clothing.", "A plain moisturiser for dry patches."],
    watchFor: { default: ["A rash that does not fade when a glass is pressed on it", "Rash with fever or the person seeming unwell", "Swelling of the lips, face or tongue", "Blisters or skin peeling"] },
    askDoctor: ["Does this need to be seen, or can it wait for the next visit?"],
  },
  {
    id: "swelling",
    windowDays: 14,
    askForReading: "If there's a blood pressure machine at home, take a reading and tell me the numbers.",

    label: "Swelling",
    patterns: [/\bswell/i, /\bswollen/i, /\bpuffy\b/i, /\boede?ma\b|\bedema\b/i, /\bsoojan\b/i],
    base: { default: "monitor", pregnant: "monitor" },
    analytes: ["bp_systolic", "bp_diastolic"],
    mechanism: {
      default: "Swelling of the feet and ankles by the evening is common and often from heat or standing. Swelling in one leg only, or with pain, is different.",
      pregnant: "Swollen feet and ankles are very common late in pregnancy. Sudden swelling of the face or hands is not the same thing and is worth a call today, because it can go with high blood pressure.",
    },
    homeCare: ["Feet up when sitting.", "Comfortable shoes, short walks."],
    watchFor: {
      default: ["Swelling in one leg with pain or warmth", "Breathless with the swelling"],
      pregnant: ["Sudden swelling of the face, hands or around the eyes", "A headache that will not settle, or changes in vision", "Blood pressure of 140/90 or more"],
    },
    askDoctor: ["Should blood pressure and urine be checked?"],
  },
  {
    id: "tummy_pain",
    windowDays: 7,

    label: "Tummy pain",
    patterns: [/\b(stomach|tummy|belly|abdominal|abdomen) (pain|ache|cramp)/i, /\bpet (me |mein )?dard\b/i, /\bcramps?\b/i],
    base: { default: "monitor", pregnant: "contact_today" },
    analytes: [],
    mechanism: {
      default: "Tummy pain is often wind, constipation or a mild bug. Pain that is getting worse, settles in one place, or comes with fever is the kind to have looked at.",
      pregnant: "Mild stretching aches are common as the womb grows. Pain that is regular, getting stronger, or comes with bleeding or leaking fluid needs a call today.",
    },
    homeCare: ["Rest, small meals, water."],
    watchFor: { default: ["Pain moving to the lower right side", "Pain with fever or vomiting", "A hard, tender tummy"], pregnant: ["Pain coming in waves", "Any bleeding or fluid", "Fewer movements from the baby"] },
    askDoctor: ["Does this need examining today?"],
  },
  {
    id: "feeding",
    windowDays: 21,
    askForReading: "Tell me the latest weight and the day it was taken.",

    label: "Feeding and weight",
    patterns: [/\bfeed(ing|s)?\b/i, /\blatch/i, /\bweight (loss|drop|down|gain)/i, /\blost weight\b/i, /\bnot drinking milk/i, /\bwet nappies|wet diapers/i],
    base: { default: "reassure", neonate: "monitor", infant: "monitor" },
    analytes: ["weight"],
    mechanism: {
      neonate: "Newborns lose some weight in the first days, often 5 to 7 percent, and most turn the corner by day 4 or 5 and are back to their birth weight by about two weeks. Wet nappies are the best day-to-day sign that feeding is working: around six a day once milk is in.",
      default: "Appetite and weight move with illness, growth and routine. A trend over weeks says more than one weighing.",
    },
    homeCare: ["Feed on demand, at least 8 times a day for a newborn.", "Count wet nappies for a day."],
    watchFor: { neonate: ["Fewer than 6 wet nappies a day after day 5", "Weight down more than 10% from birth", "Sleepy and hard to wake for feeds", "Not back to birth weight by two weeks"], default: ["Weight loss without trying"] },
    askDoctor: ["Should the baby be weighed again, and when?", "Is it worth seeing a lactation consultant?"],
  },
  {
    id: "movement",
    windowDays: 1,

    label: "Baby's movements",
    patterns: [/\b(baby|fetal|foetal)('?s)? movement/i, /\bkicks?\b/i, /\bnot moving\b/i],
    base: { default: "monitor", pregnant: "monitor" },
    analytes: [],
    mechanism: { default: "From around 24 weeks a baby settles into its own pattern of movements. It is a change in that pattern that matters, not a count." },
    homeCare: ["Lie on the left side and focus on movements for a couple of hours."],
    watchFor: { default: ["Fewer movements than usual, or a change in the pattern", "No movements at all"] },
    askDoctor: ["Do you want me to come in for monitoring?"],
  },
  // ------------------------------------------------- babies' everyday worries
  {
    id: "gas",
    label: "Gas and colic",
    windowDays: 7,
    patterns: [/\bfart(s|ing|y)?\b/i, /\bgas(sy)?\b/i, /\bwindy?\b/i, /\bbloat(ed|ing)?\b/i, /\bcolic(ky)?\b/i, /\bburp(s|ing)?\b/i, /\bhawa\b/i],
    base: { default: "reassure", neonate: "reassure", infant: "reassure" },
    analytes: [],
    mechanism: {
      neonate:
        "At {age}, gas is one of the most common things parents notice. Babies swallow air while feeding and crying, and their gut is still learning to move things along, so a lot of farting is usually a sign the gut is working, not that something is wrong. Gassiness and fussy spells often pick up from around 2 to 3 weeks, which is also when colic (long bouts of crying in a baby who is otherwise feeding and growing well) can start. It usually peaks around 6 weeks and eases by 3 to 4 months.",
      infant:
        "At {age}, gas is very common. Babies swallow air while feeding and crying, and their gut is still maturing. Colic, if it was there, usually eases by 3 to 4 months. New foods, once solids start, can also bring more gas for a while.",
      default: "Gas usually comes from swallowed air and from how food is broken down in the gut. Beans, onions, fizzy drinks and eating quickly are the usual culprits, and it settles on its own.",
    },
    homeCare: ["Eat slowly, and go easy on fizzy drinks and beans for a few days.", "A short walk after meals helps things move along."],
    homeCareBy: {
      neonate: [
        "Burp {him} during and after every feed: upright on your shoulder, or sitting on your lap with a hand supporting the chin.",
        "Bicycle legs: with {him} on {his} back, gently move the legs in a slow cycling motion for a minute or two.",
        "Knees to tummy: gently fold both knees up towards the tummy, hold for a few seconds, release, and repeat a few times.",
        "Tummy massage: warm hands, slow clockwise circles around the belly button, a few minutes at a time.",
        "Tummy time while {he}'s awake and you're watching, a few minutes several times a day.",
        "Keep {him} upright for 15 to 20 minutes after feeds.",
        "If bottle feeding, keep the bottle tilted so the teat stays full of milk, and check the teat isn't flowing too fast.",
      ],
      infant: [
        "Burp {him} during and after feeds.",
        "Bicycle legs and knees-to-tummy, a minute or two at a time.",
        "Gentle clockwise tummy massage with warm hands.",
        "Plenty of tummy time while awake and watched.",
        "Keep {him} upright for a little while after feeds.",
      ],
    },
    watchFor: {
      neonate: ["Hard to wake for feeds, or feeding much less than usual", "A swollen, hard or tender tummy", "Green vomit, or vomiting after every feed", "Blood in the poo", "Fewer than 6 wet nappies a day", "A temperature of 38°C or more", "Crying that sounds different (high-pitched) or won't settle at all"],
      infant: ["A swollen, hard tummy", "Green vomit, or blood in the poo", "Fever", "Not feeding, or far fewer wet nappies"],
      default: ["Severe or constant tummy pain", "Blood in the stool", "Weight loss without trying"],
    },
    askDoctor: ["Is this ordinary gas or colic, or worth examining?", "Is the feeding (latch or bottle flow) worth checking?"],
  },
  {
    id: "sleepy",
    label: "Sleepiness",
    windowDays: 7,
    patterns: [/\bsleepy\b/i, /\bsleeping (a lot|more|all day|too much)\b/i, /\bdrowsy\b/i, /\blethargic\b/i, /\bneend\b/i],
    base: { default: "reassure", neonate: "monitor", infant: "monitor", child: "monitor" },
    analytes: ["temperature", "weight", "bilirubin_total"],
    mechanism: {
      neonate:
        "At {age}, babies sleep most of the day, often 14 to 17 hours, in short stretches. A sleepier day can follow a growth spurt, a busy day or a vaccine. What matters is not how much {he} sleeps but that {he} still wakes for feeds, feeds well, and has plenty of wet nappies.",
      infant: "At {age}, sleep needs are still high and patterns change week to week. A sleepier day is usually fine if {he} wakes for feeds, is alert in between and has the usual wet nappies.",
      default: "Feeling sleepier than usual mostly comes down to sleep itself, a recent illness, stress or a new medicine. It is worth paying attention to if it goes on for weeks.",
    },
    homeCare: ["Keep a regular bedtime and wake time for a week.", "Check whether any new medicine started around the same time."],
    homeCareBy: {
      neonate: ["Don't let a daytime gap between feeds go much past 3 hours: wake {him} gently for a feed.", "To help {him} wake: unwrap, change the nappy, or hold {him} skin-to-skin.", "Count today's wet nappies. Around 6 or more is reassuring."],
      infant: ["Offer feeds at the usual times, even if {he} seems happy to sleep through.", "Count today's wet nappies."],
    },
    watchFor: {
      neonate: ["Hard to wake, or too sleepy to feed", "Floppy or limp when you pick {him} up", "Skin or eyes getting more yellow", "A temperature of 38°C or more, or feeling cold to touch", "Fewer wet nappies than usual"],
      infant: ["Hard to wake, or floppy", "Fever", "Not feeding, or far fewer wet nappies"],
      default: ["Sleepiness that makes it hard to stay awake in the day", "Confusion, or new weakness"],
    },
    askDoctor: ["Is this much sleep normal for {his} age?"],
  },
  {
    id: "crying",
    label: "Crying and fussiness",
    windowDays: 7,
    patterns: [/\bcry(ing)?\b|\bcries\b/i, /\bfussy\b|\bfussing\b/i, /\birritable\b/i, /\bwon'?t settle\b|\bnot settling\b/i, /\brona\b|\bro raha\b/i],
    base: { default: "reassure", neonate: "monitor", infant: "reassure" },
    analytes: ["temperature"],
    mechanism: {
      neonate: "At {age}, crying is how babies say almost everything: hungry, tired, wet, too warm, wants holding, or gas. Crying often builds from about 2 weeks and peaks around 6 weeks, usually more in the evenings, then eases.",
      infant: "At {age}, crying usually has an ordinary cause: hunger, tiredness, teething later on, or wanting company. Evening fussiness is common.",
      default: "Being irritable or tearful often follows poor sleep, stress or feeling unwell.",
    },
    homeCare: ["Rest, food and a calmer evening."],
    homeCareBy: {
      neonate: ["Go through the basics: hungry, wet nappy, too warm or too cold, needs a burp.", "Hold {him} close, skin-to-skin or in a sling, and walk or rock gently.", "Steady 'shushing' or white noise, and a dim, quiet room.", "A warm bath can help on fussy evenings.", "If you feel overwhelmed, put {him} down safely on {his} back and take a few minutes. It's okay."],
      infant: ["Check the basics: hungry, tired, nappy, temperature.", "Gentle rocking, a walk, or white noise.", "A regular wind-down routine in the evening."],
    },
    watchFor: { neonate: ["A high-pitched or weak cry that sounds different", "Crying that won't settle with anything for hours", "Fever, vomiting or feeding poorly with it"], default: ["Crying with fever, vomiting or a rash", "Crying that sounds different, or won't settle at all"] },
    askDoctor: ["Could this be colic, or reflux, or something else?"],
  },
  {
    id: "spit_up",
    label: "Spitting up",
    windowDays: 7,
    patterns: [/\bspit(ting|s)? up\b/i, /\bposset/i, /\breflux\b/i, /\bmilk (comes|coming) (back|out)\b/i],
    base: { default: "reassure", neonate: "reassure", infant: "reassure" },
    analytes: ["weight"],
    mechanism: {
      default: "At {age}, small spit-ups after feeds are very common. The valve at the top of a baby's stomach is still loose, so a little milk comes back up, especially with wind. Most babies grow out of it by around a year.",
    },
    homeCare: ["Keep {him} upright for 20 to 30 minutes after feeds.", "Smaller, more frequent feeds rather than big ones.", "Burp {him} partway through and after each feed.", "Always put {him} down to sleep flat on {his} back, even with reflux."],
    watchFor: { default: ["Forceful (projectile) vomiting", "Green or yellow vomit, or blood in it", "Not gaining weight, or fewer wet nappies", "Arching and screaming during every feed"] },
    askDoctor: ["Is the weight gain on track for this much spit-up?"],
  },
  {
    id: "constipation",
    label: "Constipation",
    windowDays: 7,
    patterns: [/\bconstipat/i, /\bhard (stool|poo|potty)/i, /\bnot (pooed|pooped|passed (stool|motion))\b/i, /\bno (poo|potty|motion)\b/i, /\bstraining\b/i],
    base: { default: "reassure", neonate: "monitor", infant: "reassure" },
    analytes: [],
    mechanism: {
      neonate: "At {age}, poo patterns vary a lot. Breastfed babies can go several days without a poo and still be fine, as long as it is soft when it comes. Going red in the face and straining is normal too; it's hard, pellet-like poo that points to constipation.",
      infant: "At {age}, how often a baby poos varies a lot. Soft poo every few days is normal; hard, dry pellets are what counts as constipation, and it often shows up with starting solids.",
      default: "Constipation usually comes from too little water or fibre, less movement, or some medicines (iron tablets are a common one).",
    },
    homeCare: ["More water, fruit, vegetables and whole grains.", "A daily walk.", "Check whether a new medicine, like iron, started recently."],
    homeCareBy: {
      neonate: ["Bicycle legs and a gentle clockwise tummy massage.", "A warm bath to relax {his} tummy.", "If formula feeding, make sure it's mixed exactly as the tin says."],
      infant: ["Bicycle legs and tummy massage.", "A warm bath.", "If {he} has started solids, offer more fruit purées and sips of water."],
    },
    watchFor: { neonate: ["No poo at all in the first days, or a swollen tummy", "Vomiting, especially green", "Blood in the poo", "Feeding poorly"], default: ["Blood in the stool", "Severe tummy pain or a swollen tummy", "Vomiting", "Going on for more than two weeks"] },
    askDoctor: ["Is this pattern normal for {his} age and feeding?"],
  },

];

export type SymptomMatch = {
  model: SymptomModel;
  population: Population;
  tier: Tier;
  mechanism: string;
  homeCare: string[];
  watchFor: string[];
  askDoctor: string[];
};

/** "22 days old", "7 weeks old", "4 months old": how old, said the way parents say it. */
export function ageWords(clock: ResolvedClock): string {
  if (clock.relative?.kind === "day_of_life") return `${clock.relative.day} days old`;
  const d = clock.ageDays;
  if (d === null) return "this age";
  if (d < 7 * 13) return `${Math.floor(d / 7)} weeks old`;
  if (d < 730) return `${Math.floor(d / 30.44)} months old`;
  return clock.ageYears !== null ? `${clock.ageYears}` : "this age";
}

/*
 * {he} {him} {his} follow the sex on the profile; "they" when it is not set,
 * never a guess. {age} is ageWords().
 */
function fill(text: string, clock: ResolvedClock): string {
  const male = clock.modifiers.includes("male");
  const female = clock.modifiers.includes("female");
  const he = male ? "he" : female ? "she" : "they";
  const him = male ? "him" : female ? "her" : "them";
  const his = male ? "his" : female ? "her" : "their";
  return text
    .replace(/\{age\}/g, ageWords(clock))
    .replace(/\{he\}'s/g, male || female ? `${he}'s` : "they're")
    .replace(/\{he\}/g, he)
    .replace(/\{him\}/g, him)
    .replace(/\{his\}/g, his);
}

/** Every symptom a message mentions, read for this person. */
export function matchSymptoms(text: string, clock: ResolvedClock): SymptomMatch[] {
  const population = populationOf(clock);
  return SYMPTOMS.filter((s) => s.patterns.some((p) => p.test(text))).map((model) => ({
    model,
    population,
    tier: model.base[population] ?? model.base.default,
    mechanism: fill(model.mechanism[population] ?? model.mechanism.default, clock),
    homeCare: (model.homeCareBy?.[population] ?? model.homeCare).map((t) => fill(t, clock)),
    watchFor: (model.watchFor[population] ?? model.watchFor.default).map((t) => fill(t, clock)),
    askDoctor: model.askDoctor.map((t) => fill(t, clock)),
  }));
}
