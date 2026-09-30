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

import type { DocType } from "@/lib/records/types";

import { fixtureFor, guessDocType } from "./fixtures/records";

/**
 * A stable 0–1 number from a seed, so the same file always scores the same.
 *
 * PORT NOTE. The web build used `createHash("sha256")` from `node:crypto`.
 * React Native has neither that module nor `Buffer.readUInt16BE`, and because
 * this module is imported by the upload path, the crash was not confined to
 * the feature — it took the screen down on import:
 *
 *   Unable to resolve module node:crypto
 *
 * FNV-1a instead: a few lines, synchronous, dependency-free, and deterministic,
 * which is the only property this actually needs. `expo-crypto` would be the
 * cryptographic equivalent but its digest is async, and this is called inline
 * while building a plain object.
 *
 * The numbers differ from the web build's for the same file. That is fine and
 * deliberate: these are mock OCR confidences, and what matters is that one
 * device scores one file the same way every time, not that two platforms agree
 * on a fabricated number.
 */
function seeded(seed: string, index: number): number {
  const input = `${seed}:${index}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // `Math.imul` keeps the multiply in 32-bit range; a plain `*` overflows
    // into a float and stops being a hash.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash % 1000) / 1000;
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

/**
 * Extract from an uploaded file.
 *
 * `docType` is what the person said it is on the upload screen; without it
 * the type is guessed from the file's name. Handwriting is detected the only
 * way a mock honestly can, also from the name, and scores lower across the
 * board, which is what routes it to review.
 */
export function extractFromFile(fileName: string, fileSize: number, docType?: DocType, today: string = new Date().toISOString().slice(0, 10)): Extraction {
  const seed = `${fileName}:${fileSize}`;
  const type = docType ?? guessDocType(fileName);
  const handwritten = /hand|photo|img|jpe?g/i.test(fileName) || type === "prescription";
  const fixture = fixtureFor(type, today);

  // Printed headers read well; a handwritten page does not.
  const hi: [number, number] = handwritten ? [0.62, 0.82] : [0.88, 0.98];
  const mid: [number, number] = handwritten ? [0.5, 0.75] : [0.82, 0.96];

  const fields: ExtractedField[] = [
    { key: "patientName", label: "Patient name", value: "-", confidence: confidenceFor(seed, 1, ...hi) },
    { key: "eventDate", label: "Date on the document", value: fixture.eventDate, confidence: confidenceFor(seed, 2, ...hi) },
  ];
  if (fixture.facility) {
    fields.push({ key: "facility", label: FACILITY_LABEL[type], value: fixture.facility, confidence: confidenceFor(seed, 3, ...mid) });
  }
  if (fixture.doctor) {
    fields.push({ key: "doctor", label: "Doctor", value: fixture.doctor, confidence: confidenceFor(seed, 7, ...mid) });
  }

  const values: ExtractedValue[] = fixture.values.map((v, i) => ({ ...v, confidence: confidenceFor(seed, 10 + i, ...mid) }));

  const all = [...fields, ...values];
  const confidence = Number((all.reduce((sum, f) => sum + f.confidence, 0) / all.length).toFixed(2));

  return {
    title: fixture.title,
    docType: type,
    eventDate: fixture.eventDate,
    facility: fixture.facility,
    doctor: fixture.doctor,
    details: fixture.details,
    fields,
    values,
    rawText: `${fixture.rawText}\n\n*Sample text from the preview reader.`,
    confidence,
  };
}

const FACILITY_LABEL: Record<DocType, string> = {
  lab_report: "Lab name",
  prescription: "Clinic",
  scan: "Imaging centre",
  discharge: "Hospital",
  bill: "Billed by",
  consultation_invoice: "Clinic",
  booking_invoice: "Lab partner",
  vaccination: "Given at",
  insurance: "Insurer",
  medication: "Pharmacy",
  other: "From",
};

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
