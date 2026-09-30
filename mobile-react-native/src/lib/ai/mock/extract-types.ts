/*
 * The extraction contract, kept apart from the extractor itself.
 *
 * C2 is a client component and needs the field shapes and the review threshold.
 * The extractor uses node:crypto to stay deterministic, and importing it from
 * the client pulled that into the browser bundle — webpack cannot resolve
 * `node:crypto` and the build failed.
 *
 * Types alone would have been fine (they erase), but LOW_CONFIDENCE is a real
 * runtime value, and one runtime import is enough to drag the whole module
 * across. So the contract lives here, with no runtime dependencies at all
 * (the one import below is a type, and erases).
 */

import type { DocType } from "@/lib/records/types";

export type ExtractedField = {
  key: string;
  label: string;
  value: string;
  /** 0–1. Below LOW_CONFIDENCE the field is surfaced for review. */
  confidence: number;
};

export type ExtractedValue = ExtractedField & {
  unit: string | null;
  refRange: string | null;
  flag: "normal" | "high" | "low" | "caution" | null;
};

export type Extraction = {
  title: string;
  docType: DocType;
  eventDate: string | null;
  facility: string | null;
  doctor: string | null;
  /** The type's own details (lib/records/details.ts reads them). */
  details: Record<string, unknown>;
  fields: ExtractedField[];
  values: ExtractedValue[];
  rawText: string;
  /** Mean of every field's confidence — what the review screen shows overall. */
  confidence: number;
};

/** Fields at or under this are highlighted on C2 and block a silent save. */
export const LOW_CONFIDENCE = 0.7;
