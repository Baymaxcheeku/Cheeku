/*
 * Small wording helpers shared by screens that build sentences from data.
 */

/**
 * Lowercases a label for use mid-sentence without breaking names and units.
 *
 * Only plain capitalised words are lowered ("Fasting glucose" becomes
 * "fasting glucose"); anything carrying its own capitals keeps them
 * ("HbA1c", "LDL cholesterol", "Vitamin D" becomes "vitamin D").
 */
export function softLower(label: string): string {
  return label
    .split(" ")
    .map((w) => (/^[A-Z][a-z]+$/.test(w) ? w.toLowerCase() : w))
    .join(" ");
}

/** "a", "a and b", "a, b and c". */
export function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
