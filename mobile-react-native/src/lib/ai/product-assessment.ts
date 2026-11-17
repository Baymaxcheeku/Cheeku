/*
 * The shape of an old product-check answer (messages.product_assessment).
 *
 * The demo picker that wrote these was removed on 2026-11-17 (a photo in chat
 * now goes to the model). Rows it wrote stay in people's threads, so the card
 * that renders them, and this type, stay too.
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
