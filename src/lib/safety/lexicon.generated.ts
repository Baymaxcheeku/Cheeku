// GENERATED FILE — do not edit.
// Source: src/lib/safety/lexicon.yaml (v1.0.0, 2026-07-26)
// Regenerate with: pnpm safety:build

export const LEXICON_VERSION = "1.0.0";
export const LEXICON_HASH = "aa9f23851b443f7f";

export type SafetyRule = {
  readonly id: string;
  readonly patterns: readonly RegExp[];
  readonly unless: readonly RegExp[];
};

export const ESCALATE_RULES: readonly SafetyRule[] = [
  { id: "chest-pain", patterns: [/chest (pain|pressure|tightness|tightening|heaviness|discomfort)/, /(pain|pressure|tightness|tightening|heaviness|discomfort) in (my |the )?chest/, /chest (feels|is) (heavy|tight|sore and)/, /crushing (pain|feeling) in (my )?chest/, /elephant (sitting|sat) on my chest/, /seene me dard/, /chest me dard/], unless: [/when i laugh/, /when i cough/, /after (my )?(gym|workout|exercise|bench press|chest day)/, /from (a |the )?(gym|workout|muscle)/, /chest (day|workout|press|fly|exercise)/, /chest of drawers/, /chest infection last/, /used to (have|get)/, /years ago/] },
  { id: "cardiac-arrest", patterns: [/heart attack/, /cardiac arrest/, /my heart (stopped|is stopping)/, /dil ka daura/, /heart attack aa raha/], unless: [/history of/, /had a heart attack (in|last|back in|years)/, /heart attack (aaya|aya|hua) tha/, /risk of/, /prevent/, /hereditary|genetic/, /awareness|campaign|leaflet|training|course/] },
  { id: "stroke", patterns: [/face (is )?drooping/, /one side of (my|his|her) (face|body) (is )?(numb|droop|weak|paralys)/, /slurred speech/, /cannot speak properly/, /sudden(ly)? numb on one side/, /arm (went|is) numb and (my )?(face|speech)/, /having a stroke/, /lakwa/, /falij/, /bolne me dikkat aur chehra/], unless: [/swimming stroke/, /stroke of luck/, /stroke (rehabilitation|rehab|awareness|recovery)/, /had a stroke (in|last|back in|years|two|three)/, /recovered from a stroke/, /keystroke/, /sunstroke/] },
  { id: "breathing", patterns: [/(can'?t|cannot|unable to) breathe/, /(can'?t|cannot) catch (my )?breath/, /struggling to breathe/, /gasping for (air|breath)/, /stopped breathing/, /lips (are )?(turning )?blue/, /turning blue/, /suffocating/, /saans nahi aa raha/, /saans lene me (bahut )?(dikkat|takleef)/, /dam ghut raha/], unless: [/took my breath away/, /breathtaking/, /breathless with excitement/, /after running/, /when i sing/, /(humidity|stuffy|heat|traffic|crowd|weather) /, /suffocatingly/] },
  { id: "anaphylaxis", patterns: [/throat (is )?(closing|swelling|tightening)/, /tongue (is )?swelling/, /face (is )?swelling up/, /anaphyla/, /gala band ho raha/, /jeebh soojh/], unless: [/training|course|awareness|leaflet|poster/] },
  { id: "heavy-bleeding", patterns: [/bleeding (heavily|a lot|badly|non ?stop|won'?t stop)/, /blood (won'?t|will not|doesn'?t) stop/, /losing a lot of blood/, /vomiting blood/, /coughing (up )?blood/, /blood in (my )?vomit/, /haemorrhag|hemorrhag/, /khoon (bahut )?(aa|beh) raha/, /khoon band nahi ho raha/, /ulti me khoon/], unless: [/bleeding (colour|color|edge|heart plant)/, /screen is bleeding/, /bleeding into (each other|the design)/, /nose bleed stopped/] },
  { id: "unconscious", patterns: [/(is |has )?unconscious/, /passed out and (won'?t|will not|hasn'?t) (wake|woken)/, /not (waking|responding|responsive)/, /unresponsive/, /collapsed and/, /behosh/, /hosh nahi aa raha/], unless: [/passed out from (boredom|laughing|exhaustion)/, /almost passed out laughing/, /unconscious bias/, /(wifi|app|email|server|website|browser|screen|page|laptop) (is |was )?(not respond|unrespons)/, /collapsed the/] },
  { id: "seizure", patterns: [/having a (seizure|fit|convulsion)/, /convulsing/, /seizure (right )?now/, /shaking uncontrollably and unresponsive/, /mirgi ka daura/, /jhatke aa rahe/], unless: [/seizure of (assets|property|goods)/, /history of seizures/, /seizure medication refill/] },
  { id: "pregnancy-red-flag", patterns: [/bleeding (and|while|during) pregnan/, /pregnant and bleeding/, /no (fetal|foetal|baby) movement/, /baby (hasn'?t|has not|not) moved/, /severe headache (and|with) (blurred |blurry )?vision/, /seeing spots and (severe )?headache/, /water broke (early|at 2[0-9] weeks|too early)/, /bacha hil nahi raha/, /pregnancy me khoon/], unless: [] },
  { id: "self-harm", patterns: [/want to (die|end it|end my life|kill myself)/, /kill(ing)? myself/, /end my life/, /suicid/, /hurt myself/, /harm myself/, /no reason to live/, /better off without me/, /marna chahta/, /jaan dena chahta/, /atmahatya/], unless: [/dying (of|to) (laughter|laugh|know|try|see)/, /kill(ing)? myself laughing/, /this traffic is killing me/, /my feet are killing me/, /killing me softly/, /suicide squad/, /suicide prevention (helpline|resources|training)/] },
  { id: "overdose", patterns: [/overdose/, /(took|swallowed) (the )?(whole|entire) (bottle|strip|pack)/, /swallowed (poison|bleach|phenyl|rat poison)/, /poisoned/, /zehar (kha|pee) liya/], unless: [/overdose (prevention|awareness|information|helpline)/, /bottle of (water|shampoo|juice|milk|wine|oil|soda)/, /food poisoning/] },
];

export const TIER2_RULES: readonly SafetyRule[] = [
  { id: "prolonged-fever", patterns: [/fever (for|since) (more than )?(3|4|5|6|7|three|four|five|six|seven) days/, /fever (that )?won'?t (go|come) down/, /bukhar (3|4|5|तीन|teen) din se/, /tez bukhar (nahi utar|utar nahi)/], unless: [] },
  { id: "infant-fever", patterns: [/(baby|newborn|infant|1 month old|2 month old|3 month old) (has|with|is running) (a )?fever/, /bacche ko bukhar/], unless: [] },
  { id: "dehydration", patterns: [/(not been|hasn'?t been|haven'?t been|not) (urinating|peeing|passing urine)/, /no urine (for|since)/, /severely dehydrated/, /can'?t keep (any )?(water|fluids) down/, /sunken eyes/, /peshab nahi (aa rah|ho rah)/], unless: [] },
  { id: "double-dose", patterns: [/took (two|2|double|twice the) dose/, /double dose/, /took (it|the tablet|the medicine) twice/, /took an extra (tablet|pill|dose)/, /do baar (dawa|goli) le li/], unless: [/espresso|coffee|caffeine/, /as prescribed/] },
  { id: "allergic-reaction", patterns: [/(rash|hives|itching) after (taking|starting) /, /allergic reaction to (the )?(medicine|tablet|antibiotic)/, /broke out in hives/, /dawa se (rash|khujli|allergy)/], unless: [/throat/, /swelling/, /breathe/] },
];
