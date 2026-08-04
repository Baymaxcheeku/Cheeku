/*
 * Product-safety scenarios — the photo half of Ask Baymax.
 *
 * There is no vision model wired into this app. Rather than fake one (a text
 * box that pretends to "read" any photo but actually pattern-matches a
 * filename), this is honest about being a demo: a fixed set of products, each
 * with a hand-written assessment, selected from a picker rather than
 * recognised from an arbitrary upload. Real recognition is a different, much
 * larger piece of work — wiring a vision-capable provider — and shouldn't be
 * faked in the meantime.
 *
 * Product names are invented, not real brands — this evaluates ingredient
 * categories a shopper would recognise, not a specific manufacturer's claims.
 *
 * Same rule-1 boundary as everywhere else: a verdict here is about the
 * PRODUCT, not a diagnosis of the reader. "Avoid during pregnancy" is
 * consumer safety information available on any ingredient label; it is not a
 * clinical judgement about anyone's body.
 */

export type SafetyLevel = "safe" | "caution" | "avoid";

export type Persona = {
  key: string;
  label: string;
  status: SafetyLevel;
  note: string;
};

export type Ingredient = {
  name: string;
  status: SafetyLevel;
  note: string;
};

export type ProductScenario = {
  id: string;
  category: "beauty" | "food" | "fitness";
  title: string;
  subtitle: string;
  /** Self-contained inline SVG data URI — no shared `<defs>`, so it renders standalone in a chat bubble. */
  thumbnail: string;
  sampleQuestion: string;
  verdict: SafetyLevel;
  verdictNote: string;
  personas: Persona[];
  ingredients: Ingredient[];
  /**
   * Fires when the reader's own declared Health profile conditions overlap
   * with something specific to this product — an allergen most often. Returns
   * a replacement verdict/note plus why, or null when nothing overlaps.
   * Never infers an allergy that wasn't declared; only matches against it.
   */
  personalize?: (conditions: string[]) => { verdict: SafetyLevel; note: string } | null;
};

function has(conditions: string[], ...needles: string[]): boolean {
  const lower = conditions.map((c) => c.toLowerCase());
  return needles.some((n) => lower.some((c) => c.includes(n)));
}

function icon(bg: string, fg: string, shape: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <rect width="96" height="96" rx="20" fill="${bg}"/>
    ${shape}
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export const PRODUCT_SCENARIOS: ProductScenario[] = [
  {
    id: "daily-lotion",
    category: "beauty",
    title: "Daily Moisturizing Lotion",
    subtitle: "Body lotion · 400ml",
    thumbnail: icon(
      "#EFEDFC",
      "#4A2ADE",
      '<rect x="34" y="20" width="28" height="56" rx="8" fill="#fff"/><rect x="40" y="14" width="16" height="12" rx="4" fill="#4A2ADE"/><rect x="38" y="34" width="20" height="4" rx="2" fill="#c6c6f6"/>',
    ),
    sampleQuestion: "Is this body lotion safe for my pregnant wife and our toddler?",
    verdict: "safe",
    verdictNote: "Generally considered safe for use during pregnancy and for children.",
    personas: [
      { key: "pregnancy", label: "Pregnancy", status: "safe", note: "No commonly flagged ingredients." },
      { key: "children", label: "Children (3+ months)", status: "safe", note: "Fragrance-light formula." },
    ],
    ingredients: [
      { name: "Aqua (Water)", status: "safe", note: "Base ingredient" },
      { name: "Glycerin", status: "safe", note: "Hydrating, skin-identical" },
      { name: "Caprylic/Capric Triglyceride", status: "safe", note: "Emollient, helps lock in moisture" },
      { name: "Dimethicone", status: "safe", note: "Skin-protectant, prevents moisture loss" },
      { name: "Avena Sativa (Oat) Kernel Extract", status: "safe", note: "Soothing, anti-irritant" },
      { name: "Phenoxyethanol", status: "caution", note: "Preservative, low concentration" },
    ],
    personalize: (conditions) =>
      has(conditions, "eczema", "sensitive skin", "dermatitis")
        ? {
            verdict: "caution",
            note: "Your health profile notes a skin condition, so patch test on a small area first, since even mild formulas can vary person to person.",
          }
        : null,
  },
  {
    id: "protein-bar",
    category: "food",
    title: "Peanut Crunch Protein Bar",
    subtitle: "Snack bar · 45g",
    thumbnail: icon(
      "#FFF4E0",
      "#8F5400",
      '<rect x="18" y="34" width="60" height="30" rx="10" fill="#fff"/><rect x="24" y="42" width="48" height="6" rx="3" fill="#ffaf23"/><rect x="24" y="52" width="30" height="5" rx="2.5" fill="#f0d9a8"/>',
    ),
    sampleQuestion: "Can I eat this protein bar? I have a peanut allergy.",
    verdict: "safe",
    verdictNote: "No commonly flagged ingredients for most people.",
    personas: [
      { key: "pregnancy", label: "Pregnancy", status: "safe", note: "Standard snack ingredients." },
      { key: "allergen", label: "Peanut allergy", status: "avoid", note: "Contains peanuts directly." },
    ],
    ingredients: [
      { name: "Peanuts", status: "avoid", note: "Common allergen, present as a main ingredient" },
      { name: "Whey protein isolate", status: "safe", note: "Dairy-derived protein" },
      { name: "Dates", status: "safe", note: "Whole-food sweetener" },
      { name: "Oats", status: "safe", note: "Whole grain, may carry cross-contact traces" },
      { name: "Sea salt", status: "safe", note: "Flavouring" },
    ],
    personalize: (conditions) =>
      has(conditions, "peanut allerg", "nut allerg")
        ? {
            verdict: "avoid",
            note: "Your health profile lists a peanut allergy, and this product contains peanuts directly, so worth skipping this one specifically.",
          }
        : null,
  },
  {
    id: "mineral-sunscreen",
    category: "beauty",
    title: "Mineral Sunscreen SPF 50",
    subtitle: "Sunscreen · 100ml",
    thumbnail: icon(
      "#E7F7EE",
      "#0F7538",
      '<rect x="30" y="22" width="36" height="52" rx="10" fill="#fff"/><circle cx="48" cy="40" r="10" fill="#ffaf23"/><rect x="38" y="56" width="20" height="5" rx="2.5" fill="#bfe8cf"/>',
    ),
    sampleQuestion: "Is this mineral sunscreen okay for daily use while pregnant?",
    verdict: "safe",
    verdictNote: "Mineral (zinc/titanium-based) formulas are generally the preferred choice during pregnancy.",
    personas: [
      { key: "pregnancy", label: "Pregnancy", status: "safe", note: "Mineral filters, not chemical." },
      { key: "children", label: "Children (6+ months)", status: "safe", note: "Fragrance-free." },
    ],
    ingredients: [
      { name: "Zinc Oxide", status: "safe", note: "Mineral UV filter" },
      { name: "Titanium Dioxide", status: "safe", note: "Mineral UV filter" },
      { name: "Caprylic/Capric Triglyceride", status: "safe", note: "Emollient" },
      { name: "Beeswax", status: "safe", note: "Texture, water resistance" },
      { name: "Vitamin E (Tocopherol)", status: "safe", note: "Antioxidant" },
    ],
    personalize: (conditions) =>
      has(conditions, "eczema", "sensitive skin")
        ? {
            verdict: "safe",
            note: "Mineral filters like this one are usually the better-tolerated choice with sensitive skin, but patch testing is still worth doing with anything new.",
          }
        : null,
  },
  {
    id: "herbal-sleep-tea",
    category: "food",
    title: "Sleep Support Herbal Tea",
    subtitle: "Herbal tea · 20 bags",
    thumbnail: icon(
      "#F1F0FE",
      "#5B4EF0",
      '<rect x="26" y="30" width="44" height="38" rx="6" fill="#fff"/><path d="M70 40 q12 0 12 12 t-12 12" stroke="#5B4EF0" stroke-width="4" fill="none"/><rect x="34" y="40" width="28" height="4" rx="2" fill="#c6c6f6"/>',
    ),
    sampleQuestion: "Is this sleep tea safe to drink every night?",
    verdict: "caution",
    verdictNote: "Generally mild, but one ingredient is usually approached with more caution in pregnancy.",
    personas: [
      { key: "pregnancy", label: "Pregnancy", status: "caution", note: "Valerian root is commonly advised against." },
      { key: "general", label: "General adult use", status: "safe", note: "Mild for most people." },
    ],
    ingredients: [
      { name: "Chamomile flower", status: "safe", note: "Widely used, generally mild" },
      { name: "Valerian root", status: "caution", note: "Usually advised against in pregnancy" },
      { name: "Lemon balm", status: "safe", note: "Mild, commonly used" },
      { name: "Lavender", status: "safe", note: "Flavouring, aromatic" },
    ],
    personalize: (conditions) =>
      has(conditions, "pregnan")
        ? {
            verdict: "caution",
            note: "Your health profile notes a pregnancy. Worth checking with your doctor before this one specifically, since it contains valerian root.",
          }
        : null,
  },
  {
    id: "energy-drink",
    category: "fitness",
    title: "Citrus Energy Drink",
    subtitle: "Energy drink · 250ml",
    thumbnail: icon(
      "#FEF1F3",
      "#C00A1C",
      '<rect x="36" y="18" width="24" height="58" rx="6" fill="#fff"/><rect x="36" y="18" width="24" height="16" rx="6" fill="#ea2a36"/><rect x="42" y="46" width="12" height="4" rx="2" fill="#f7c2c8"/>',
    ),
    sampleQuestion: "I train in the mornings. Is this energy drink okay before a workout?",
    verdict: "caution",
    verdictNote: "High-caffeine drinks are usually fine for most adults in moderation, with caution advised during pregnancy or with a heart condition.",
    personas: [
      { key: "pregnancy", label: "Pregnancy", status: "avoid", note: "High caffeine content." },
      { key: "general", label: "General adult use", status: "caution", note: "Moderation, not daily use." },
    ],
    ingredients: [
      { name: "Caffeine", status: "caution", note: "A high dose per can, roughly a strong coffee's worth" },
      { name: "Taurine", status: "safe", note: "Amino acid, commonly used" },
      { name: "B-vitamins", status: "safe", note: "Water-soluble, excess is excreted" },
      { name: "Citric acid", status: "safe", note: "Flavouring" },
    ],
    personalize: (conditions) =>
      has(conditions, "pregnan")
        ? {
            verdict: "avoid",
            note: "Your health profile notes a pregnancy, and caffeine at this level is usually advised against, so this one is worth skipping.",
          }
        : has(conditions, "hypertension", "blood pressure", "heart")
          ? {
              verdict: "avoid",
              note: "Your health profile lists a blood pressure or heart-related condition, and high-caffeine drinks like this are usually the ones doctors ask about first, so worth checking before use.",
            }
          : null,
  },
];

export function findScenario(id: string): ProductScenario | undefined {
  return PRODUCT_SCENARIOS.find((s) => s.id === id);
}

export type ProductAssessment = {
  scenarioId: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  verdict: SafetyLevel;
  verdictNote: string;
  personas: Persona[];
  ingredients: Ingredient[];
  /** Present only when the reader's own declared conditions changed the verdict. */
  personalNote: string | null;
  disclaimer: string;
};

/**
 * Builds the assessment shown for a scenario, folding in a personal note when
 * the active profile's own declared conditions (never an inference) overlap.
 */
export function assessProduct(scenarioId: string, conditions: readonly string[]): ProductAssessment | null {
  const scenario = findScenario(scenarioId);
  if (!scenario) return null;

  const personal = scenario.personalize?.([...conditions]) ?? null;

  return {
    scenarioId: scenario.id,
    title: scenario.title,
    subtitle: scenario.subtitle,
    thumbnail: scenario.thumbnail,
    verdict: personal?.verdict ?? scenario.verdict,
    verdictNote: personal?.note ?? scenario.verdictNote,
    personas: scenario.personas,
    ingredients: scenario.ingredients,
    personalNote: personal?.note ?? null,
    disclaimer:
      "General product information, not a medical evaluation of you personally. Always patch test new skincare, and check labels yourself, since formulas change.",
  };
}
