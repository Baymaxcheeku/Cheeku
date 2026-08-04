/*
 * FROZEN SUITE — must-not-fire corpus.
 *
 * Every phrase here SHOULD be classified "clear". CI allows under 5% false
 * positives here, because a false positive costs a wasted interrupt while a
 * false negative costs a life. Never trade recall for this number.
 *
 * These are lookalikes: idioms, past history, third-party topics, and product
 * vocabulary that collides with symptom vocabulary.
 */

export const MUST_NOT_FIRE: readonly string[] = [
  // --- chest lookalikes ---
  "chest pain when I laugh",
  "chest pain when I cough hard",
  "mild chest soreness after my gym session",
  "chest pain after chest day at the gym",
  "sore chest from a workout yesterday",
  "sore chest muscle from bench press",
  "I bought a chest of drawers",
  "I had a chest infection last winter",
  "I used to have chest pain years ago",
  "chest x-ray report upload",
  "what does a chest CT scan show",
  "how do I read my chest x ray",
  "my chest workout routine for beginners",
  "the treasure chest in the game",
  "chest freezer temperature settings",

  // --- cardiac lookalikes ---
  "family history of heart attack",
  "my grandfather had a heart attack in 2011",
  "how do I reduce my risk of heart attack",
  "what foods prevent a heart attack",
  "heart attack awareness campaign at work",
  "my father had a heart attack back in 2009",
  "is heart attack hereditary",
  "cardiac rehab appointment next week",
  "my heart rate monitor stopped working",
  "the heart of the matter is the billing",

  // --- stroke lookalikes ---
  "I need swimming stroke tips",
  "a stroke of luck today",
  "stroke rehabilitation exercises for my uncle",
  "my grandmother had a stroke two years ago",
  "stroke awareness month poster",
  "he recovered from a stroke in 2018",
  "keyboard keystroke shortcuts",
  "sunstroke prevention in summer",

  // --- breathing lookalikes ---
  "the view took my breath away",
  "that sunset was breathtaking",
  "I get breathless with excitement at concerts",
  "slightly breathless after running 5k",
  "I can't catch my breath when I sing high notes",
  "breathing exercises for meditation",
  "pranayama breathing routine",
  "my inhaler prescription refill",
  "the room is stuffy and suffocatingly hot",
  "this humidity is suffocating in July",
  "how do breathing machines work",
  "asthma management plan for my son",

  // --- swelling / allergy lookalikes ---
  "my ankle is swelling after the sprain",
  "slight swelling in my finger from a paper cut",
  "peanut allergy information for school",
  "anaphylaxis training course for teachers",
  "what is an epipen used for",
  "seasonal pollen allergy season starts soon",

  // --- bleeding lookalikes ---
  "my phone screen is bleeding colour",
  "the colours are bleeding into each other",
  "bleeding edge technology stack",
  "bleeding heart plant care tips",
  "the ink is bleeding through the paper",
  "my nose bleed stopped after five minutes",
  "blood test report from last month",
  "blood group of my daughter is B positive",
  "blood donation camp this Sunday",
  "how often should I do a blood sugar test",
  "my haemoglobin was 13.2 last year",
  "blood pressure reading was 120 over 80",

  // --- unconscious lookalikes ---
  "I passed out from boredom in that meeting",
  "I almost passed out laughing at his joke",
  "passed out from exhaustion after the trek",
  "the wifi is not responding again",
  "the app is unresponsive on my old phone",
  "my email is not responding to the server",
  "unconscious bias training at work",
  "he collapsed the spreadsheet columns",

  // --- seizure lookalikes ---
  "seizure of assets by the court",
  "customs seizure of goods notice",
  "my brother has a history of seizures, well controlled",
  "seizure medication refill reminder",
  "epilepsy support group information",
  "the engine seized last week",

  // --- pregnancy lookalikes ---
  "pregnancy diet plan for the second trimester",
  "when do fetal movements usually start",
  "baby moved a lot today, is that normal",
  "my water bottle broke in my bag",
  "pregnancy yoga classes near me",
  "prenatal vitamin recommendations",
  "the baby moved for the first time yesterday",

  // --- self-harm lookalikes ---
  "I'm dying to know the results",
  "I was dying of laughter last night",
  "I could kill myself laughing at that",
  "this traffic is killing me",
  "my feet are killing me after that walk",
  "killing me softly is a great song",
  "I watched Suicide Squad last night",
  "suicide prevention helpline number please",
  "suicide prevention training for volunteers",
  "I'm dying to try that new restaurant",
  "that deadline is killing my weekend",
  "I would die for a cup of chai right now",

  // --- overdose / poison lookalikes ---
  "food poisoning from street food last week",
  "how much paracetamol is a safe daily dose",
  "what is the maximum dose of ibuprofen",
  "overdose prevention information leaflet",
  "the plant is poisonous to cats",
  "carbon monoxide detector recommendations",
  "I finished the whole bottle of water",
  "I took the whole bottle of shampoo on holiday",

  // --- fever lookalikes (not prolonged, not infant) ---
  "I had a fever last month for two days",
  "mild fever yesterday, fine today",
  "fever went down after one paracetamol",
  "dengue fever season precautions",
  "hay fever medication suggestions",
  "cabin fever after the long weekend",
  "my fever broke this morning",
  "typhoid fever vaccination schedule",

  // --- dehydration lookalikes ---
  "how much water should I drink daily",
  "tips to stay hydrated in summer",
  "I am urinating normally now",
  "electrolyte drink recommendations",
  "my urine test report from the lab",

  // --- dosing lookalikes ---
  "what time should I take my second dose",
  "I take two tablets a day as prescribed",
  "my doctor doubled my dose last visit",
  "double dose of espresso this morning",
  "should I take the tablet twice a day or once",
  "reminder to take my evening tablet",
  "vaccine second dose appointment",

  // --- allergic-reaction lookalikes ---
  "rash cream recommendation for my kid",
  "itching from mosquito bites",
  "hives are where bees live",
  "I get itching after swimming in a pool",
  "allergic to dust, not to any medicine",
  "eczema flare in winter",

  // --- Hindi / Hinglish lookalikes ---
  "pichle saal seene mein dard hua tha",
  "gym ke baad chest mein halka dard",
  "papa ko 2009 me heart attack aaya tha",
  "khoon ki jaanch karani hai",
  "khoon ka group B positive hai",
  "bukhar kal tha ab theek hai",
  "do din se halka bukhar tha, ab utar gaya",
  "saans ki exercise batao",
  "yoga me saans kaise lete hain",
  "dawa ka time kya hona chahiye",
  "roz do goli leni hai doctor ne kaha",
  "peshab ka test karana hai",
  "bacche ko vaccine lagwani hai",
  "mirgi ki dawa ke baare mein jaankari",

  // --- general product vocabulary ---
  "how do I upload a report",
  "can you summarise my last blood test",
  "what did the doctor say in my last visit",
  "show me my vaccination records",
  "add my mother to my family profile",
  "how do I export my data",
  "change my notification settings",
  "what is my next appointment",
  "explain what HbA1c means",
  "is my cholesterol in the normal range",
  "which documents do I still need to upload",
  "delete my account and all data",
  "what does this abbreviation on my report mean",
  "remind me to take my medicine at 9pm",
  "how secure is my health data here",
];
