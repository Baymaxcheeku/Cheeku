/*
 * General-knowledge answers — the half of Ask Cheeku that isn't grounded in a
 * document.
 *
 * Rule 4 used to be "grounded or silent": nothing outside the user's own
 * records, full stop. Athar asked for Ask Cheeku to work both ways — general
 * questions get a general answer, and when the reader's own health profile
 * says something relevant, that gets folded in too. Rule 1 didn't move: this
 * file names no condition on the reader, gives no dose, and prescribes
 * nothing. It answers the way a careful pamphlet would, not the way a doctor
 * would — general population guidance, always closed out with "talk to your
 * doctor" for anything that turns on the reader's own situation.
 *
 * Content is hand-authored and keyword-matched, the same "mock but honest"
 * approach as the rest of the AI layer: there is no real model behind this,
 * so nothing here is generated, only selected.
 */

export type KnowledgeTopic = {
  id: string;
  /** Any of these appearing in the question is enough to match. */
  keywords: string[];
  paragraphs: string[];
  /**
   * Adds a paragraph when the reader's own declared conditions (Health
   * profile, not an inference) overlap with this topic — never invents a
   * condition, only notices one the reader already told the app about.
   */
  personalize?: (conditions: string[]) => string | null;
  followUps: string[];
};

function has(conditions: string[], ...needles: string[]): boolean {
  const lower = conditions.map((c) => c.toLowerCase());
  return needles.some((n) => lower.some((c) => c.includes(n)));
}

export const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  {
    id: "exercise-pregnancy",
    keywords: ["exercise", "workout", "hiit", "running", "jog", "gym", "yoga"],
    paragraphs: [
      "For most pregnancies, moderate exercise most days of the week is generally considered safe and is commonly recommended: brisk walking, swimming and prenatal yoga are frequently suggested starting points.",
      "High-intensity training, contact sports and anything with a real fall risk are usually approached with more caution, especially as pregnancy progresses.",
      "Every pregnancy is different, so the right level of activity depends on things a general answer cannot see: how the pregnancy is progressing, and any conditions already being monitored. Your doctor is the one who can weigh those.",
    ],
    personalize: (conditions) => {
      if (has(conditions, "pregnan")) {
        return "Your health profile already notes a pregnancy. Worth raising exercise intensity specifically at your next check-in, rather than assuming general guidance covers it.";
      }
      if (has(conditions, "hypertension", "blood pressure")) {
        return "Your health profile lists a blood pressure condition, and that's exactly the kind of thing that changes what's advisable here, so it's worth confirming with your doctor before increasing intensity.";
      }
      return null;
    },
    followUps: ["Is walking enough?", "What about swimming?"],
  },
  {
    id: "hemoglobin-thresholds",
    keywords: ["hemoglobin", "haemoglobin", "hb", "iron", "anemia", "anaemia"],
    paragraphs: [
      "Labs commonly print a reference range for haemoglobin, and pregnancy has its own lower range than the general population, so a value that would be unremarkable outside pregnancy is often flagged during it.",
      "Fatigue alongside a lower reading is a common combination worth mentioning to whoever is monitoring the pregnancy, since it's one of several things they may want to look at together.",
      "This is general information about how labs are read, not a reading of any specific report. If you have the actual report in Cheeku AI, ask about it directly and I'll read the exact number and range that were printed.",
    ],
    followUps: ["Upload the report", "What foods are iron-rich?"],
  },
  {
    id: "vitamin-d",
    keywords: ["vitamin d", "sunlight", "sun exposure"],
    paragraphs: [
      "Vitamin D is made in the skin from sunlight and is also found in a small number of foods: fatty fish, egg yolks and fortified milk among them.",
      "Labs generally consider a range of values sufficient, with lower readings flagged for follow-up. What to do about a specific reading is something a doctor decides after seeing the actual report, not something a general answer can responsibly cover.",
    ],
    followUps: ["Upload my report", "What foods have vitamin D?"],
  },
  {
    id: "herbal-sleep",
    keywords: ["herbal tea", "chamomile", "valerian", "sleep aid", "melatonin"],
    paragraphs: [
      "Herbal ingredients marketed for sleep, such as chamomile and valerian root, are generally considered mild for most adults, though quality and concentration vary a lot between products.",
      "Pregnancy, breastfeeding and any existing medication are the situations where 'herbal' stops meaning 'automatically fine'. Several common sleep-support herbs are usually advised against or approached with caution in those cases. Your doctor or pharmacist is the one who can say what's fine for you specifically.",
    ],
    personalize: (conditions) => {
      if (has(conditions, "pregnan")) {
        return "Your health profile notes a pregnancy. Worth checking with your doctor or pharmacist before trying an herbal sleep product, rather than assuming 'herbal' means it's automatically fine.";
      }
      return null;
    },
    followUps: ["Is this safe while pregnant?", "What helps with sleep generally?"],
  },
];

export type KnowledgeAnswer = {
  paragraphs: string[];
  followUps: string[];
};

/** Keyword match against the question text. First match wins — topics are ordered by specificity. */
export function matchKnowledge(question: string): KnowledgeTopic | null {
  const q = question.toLowerCase();
  return KNOWLEDGE_TOPICS.find((topic) => topic.keywords.some((k) => q.includes(k))) ?? null;
}

export function answerFromKnowledge(topic: KnowledgeTopic, conditions: string[]): KnowledgeAnswer {
  const paragraphs = [...topic.paragraphs];
  const personal = topic.personalize?.(conditions);
  if (personal) paragraphs.push(personal);
  return { paragraphs, followUps: topic.followUps };
}
