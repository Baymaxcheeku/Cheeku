/*
 * Which faces the app may pick on someone's behalf.
 *
 * When a person skips the face picker, or taps "Surprise me", the app picks.
 * Handing a grandmother the toddler, or a six-year-old the grey beard, reads
 * as the app not listening, so the pick stays inside the right age band:
 *
 *   under 13   the five children (f40 to f44)
 *   13 and up  the fifteen grown-ups (f25 to f39)
 *
 * Age comes from the date of birth when there is one. Without it, a
 * relationship that plainly names a child (son, daughter, baby, grandchild)
 * counts as one. Anyone can still pick any face by hand; this only governs
 * what the app chooses for them.
 *
 * Kept free of image imports so it can be unit tested.
 */

export const ADULT_FACE_IDS = Array.from({ length: 15 }, (_, i) => `f${25 + i}`);
export const KID_FACE_IDS = Array.from({ length: 5 }, (_, i) => `f${40 + i}`);

const CHILD_WORDS = /\b(son|daughter|child|kid|baby|grandson|granddaughter|grandchild)\b/i;

export function isChild(age: number | null, relationship: string): boolean {
  if (age !== null) return age < 13;
  return CHILD_WORDS.test(relationship);
}

export function facePool(age: number | null, relationship: string): string[] {
  return isChild(age, relationship) ? KID_FACE_IDS : ADULT_FACE_IDS;
}
