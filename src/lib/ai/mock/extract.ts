import { createHash } from "node:crypto";

import {
  LOW_CONFIDENCE as THRESHOLD,
  type Extraction,
  type ExtractedField,
  type ExtractedValue,
} from "./extract-types";

/*
 * The mock extraction adapter.
 *
 * V1 ships no OCR provider, so this stands in for one. It exists behind the
 * same shape a real extractor would return, which is what makes the confidence
 * routing on C1/C2 real rather than theatre: the review screen is driven by
 * per-field confidence, and swapping this for a live provider should not
 * require touching a screen.
 *
 * Output is DETERMINISTIC on the file's name and size. A random mock makes
 * "upload the same file twice and get a different answer" a feature, which
 * makes every bug report about extraction unreproducible.
 */

export type {
  Extraction,
  ExtractedField,
  ExtractedValue,
} from "./extract-types";
export { LOW_CONFIDENCE } from "./extract-types";

/** A stable 0–1 number from a seed, so the same file always scores the same. */
function seeded(seed: string, index: number): number {
  const hash = createHash("sha256").update(`${seed}:${index}`).digest();
  return (hash.readUInt16BE(0) % 1000) / 1000;
}

/*
 * Confidence is drawn from a plausible band rather than a flat random: real OCR
 * is confident about printed headers and much less so about handwriting and
 * decimal points, and the review screen is only worth testing against a
 * distribution that has that shape.
 */
function confidenceFor(seed: string, index: number, floor: number, ceiling: number): number {
  return Number((floor + seeded(seed, index) * (ceiling - floor)).toFixed(2));
}

const SAMPLE_TEXT = `LUCID MEDICAL DIAGNOSTICS
Complete Blood Count (CBC)

Patient      : -
Collected on : -

Haemoglobin        10.4 g/dL     (12.0-15.0)
MCV                78 fL         (80-100)
Platelet count     2.4 lakh/uL   (1.5-4.1)

*Synthetic sample text produced by the mock extraction adapter.`;

/**
 * Extract from an uploaded file.
 *
 * Handwriting is detected the only way a mock honestly can — from the filename —
 * and scores lower across the board, which is what routes it to review.
 */
export function extractFromFile(fileName: string, fileSize: number): Extraction {
  const seed = `${fileName}:${fileSize}`;
  const handwritten = /hand|scan|photo|img|jpe?g/i.test(fileName);

  // Printed headers read well; a handwritten page does not.
  const hi: [number, number] = handwritten ? [0.62, 0.82] : [0.88, 0.98];
  const mid: [number, number] = handwritten ? [0.5, 0.75] : [0.82, 0.96];

  const fields: ExtractedField[] = [
    {
      key: "patientName",
      label: "Patient name",
      value: "-",
      confidence: confidenceFor(seed, 1, ...hi),
    },
    {
      key: "eventDate",
      label: "Date of test",
      value: new Date().toISOString().slice(0, 10),
      confidence: confidenceFor(seed, 2, ...hi),
    },
    {
      key: "facility",
      label: "Lab name",
      value: "Lucid Medical Diagnostics",
      confidence: confidenceFor(seed, 3, ...mid),
    },
  ];

  const values: ExtractedValue[] = [
    {
      key: "haemoglobin",
      label: "Haemoglobin",
      value: "10.4",
      unit: "g/dL",
      refRange: "12.0-15.0",
      flag: "low",
      confidence: confidenceFor(seed, 4, ...mid),
    },
    {
      key: "mcv",
      label: "MCV",
      value: "78",
      unit: "fL",
      refRange: "80-100",
      flag: "low",
      confidence: confidenceFor(seed, 5, ...mid),
    },
    {
      key: "platelets",
      label: "Platelet count",
      value: "2.4",
      unit: "lakh/uL",
      refRange: "1.5-4.1",
      flag: "normal",
      confidence: confidenceFor(seed, 6, ...mid),
    },
  ];

  const all = [...fields, ...values];
  const confidence = Number(
    (all.reduce((sum, f) => sum + f.confidence, 0) / all.length).toFixed(2),
  );

  return {
    title: handwritten ? "Scanned report" : "Complete blood count",
    docType: "lab_report",
    eventDate: fields.find((f) => f.key === "eventDate")?.value ?? null,
    facility: "Lucid Medical Diagnostics",
    fields,
    values,
    rawText: SAMPLE_TEXT,
    confidence,
  };
}

/** Fields the reviewer must look at before this can be filed. */
export function lowConfidenceFields(extraction: Extraction): (ExtractedField | ExtractedValue)[] {
  return [...extraction.fields, ...extraction.values].filter((f) => f.confidence < THRESHOLD);
}

/**
 * Where an extraction should land.
 *
 * `needs_review` is not a soft warning: it is the document's status in the
 * database, so a low-confidence read stays visibly unverified in the list until
 * a human confirms it rather than quietly joining the filed records.
 */
export function routeFor(extraction: Extraction): "needs_review" | "filed" {
  return lowConfidenceFields(extraction).length > 0 ? "needs_review" : "filed";
}
