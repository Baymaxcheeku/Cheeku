/*
 * Health-basics rules as pure functions (tested in health-rules.test.ts).
 *
 * SUGGESTIONS, NOT A DIAGNOSIS. These are the chips offered so nobody has to
 * type "Diabetes" on a phone keyboard. They are chosen by the person's age
 * because the conditions people actually track differ by life stage: a
 * newborn's parents track jaundice and birth weight, a grandparent's children
 * track sugar and BP. Tapping one records what the reader already knows; the
 * app never infers or suggests that anyone HAS anything.
 */

export type Medication = { name: string; dose: string; frequency: string };

export type Stage = "baby" | "child" | "adult" | "elder";

/** Whole years from an ISO date, or null when unknown or unreadable. */
export function ageFrom(dob: string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime()) || d > now) return null;
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function stageFor(age: number | null): Stage {
  if (age === null) return "adult";
  if (age < 3) return "baby";
  if (age < 13) return "child";
  if (age < 60) return "adult";
  return "elder";
}

const CONDITIONS: Record<Stage, string[]> = {
  baby: ["Born early", "Jaundice at birth", "Low birth weight", "Reflux", "Eczema", "Wheezing"],
  child: ["Asthma", "Eczema", "Frequent colds", "Food allergy", "Type 1 diabetes", "ADHD"],
  adult: [
    "Diabetes",
    "High BP",
    "Thyroid",
    "PCOS / PCOD",
    "Pregnant",
    "Trying to conceive",
    "High cholesterol",
    "Asthma",
    "Migraine",
    "Anaemia",
  ],
  elder: [
    "Diabetes",
    "High BP",
    "Heart condition",
    "High cholesterol",
    "Thyroid",
    "Arthritis",
    "Kidney condition",
    "Memory issues",
  ],
};

export function conditionSuggestions(age: number | null): string[] {
  return CONDITIONS[stageFor(age)];
}

export function allergySuggestions(): string[] {
  return ["Penicillin", "Sulfa drugs", "Aspirin / NSAIDs", "Peanuts", "Dust", "Lactose", "Seafood", "Eggs"];
}
