import type { Area } from "./content";

/*
 * WHAT'S ON THE PLATE, AND WHAT IT MEANS FOR THIS PERSON.
 *
 * Version one reads the plate from a few taps, not from the photo: the
 * photo is kept (the person's food diary, and the input a model will read
 * later into daily_logs.analysis), the taps are what the feedback runs on.
 * That keeps every line Cheeku says here explainable and testable.
 *
 * The feedback is about patterns, never a verdict on a person. One line on
 * the plate, at most two tips, each tied to a reading or condition they have
 * when there is one. No calorie counting, no "bad food".
 */

export type PlateTag =
  | "roti"
  | "rice"
  | "millet"
  | "dal"
  | "sabzi"
  | "salad"
  | "curd"
  | "paneer"
  | "egg"
  | "chicken_fish"
  | "fruit"
  | "nuts"
  | "fried"
  | "sweet"
  | "bakery"
  | "packaged"
  | "sugary_drink"
  | "chai_sugar"
  | "pickle_papad"
  | "outside";

export const PLATE_TAGS: { key: PlateTag; label: string; group: "base" | "protein" | "plants" | "extras" }[] = [
  { key: "roti", label: "Roti", group: "base" },
  { key: "rice", label: "Rice", group: "base" },
  { key: "millet", label: "Millets", group: "base" },
  { key: "dal", label: "Dal", group: "protein" },
  { key: "curd", label: "Curd", group: "protein" },
  { key: "paneer", label: "Paneer", group: "protein" },
  { key: "egg", label: "Egg", group: "protein" },
  { key: "chicken_fish", label: "Chicken or fish", group: "protein" },
  { key: "sabzi", label: "Sabzi", group: "plants" },
  { key: "salad", label: "Salad", group: "plants" },
  { key: "fruit", label: "Fruit", group: "plants" },
  { key: "nuts", label: "Nuts", group: "plants" },
  { key: "fried", label: "Fried", group: "extras" },
  { key: "sweet", label: "Sweet", group: "extras" },
  { key: "bakery", label: "Bread or biscuits", group: "extras" },
  { key: "packaged", label: "Packaged snack", group: "extras" },
  { key: "sugary_drink", label: "Sugary drink", group: "extras" },
  { key: "chai_sugar", label: "Chai with sugar", group: "extras" },
  { key: "pickle_papad", label: "Pickle or papad", group: "extras" },
  { key: "outside", label: "Eaten out", group: "extras" },
];

const PROTEIN: PlateTag[] = ["dal", "curd", "paneer", "egg", "chicken_fish"];
const PLANTS: PlateTag[] = ["sabzi", "salad", "fruit"];

/** Tags that matter more for someone with this area, and what to say. */
const WATCH: { area: Area; tags: PlateTag[]; tip: string }[] = [
  { area: "sugar", tags: ["rice", "sweet", "bakery", "sugary_drink", "chai_sugar"], tip: "With your sugar running high, this plate leans on fast carbs. More sabzi and dal next time slows the spike." },
  { area: "bp", tags: ["pickle_papad", "packaged", "outside"], tip: "Pickle, papad, packaged and restaurant food carry most of the day's salt. Your BP notices." },
  { area: "lipids", tags: ["fried", "bakery", "sweet"], tip: "Fried food and bakery fats are what push LDL up. Swap one of them out tomorrow." },
  { area: "liver", tags: ["fried", "sweet", "sugary_drink"], tip: "Fried food and sugar are what build fat in the liver. Lighter on these helps SGPT come down." },
  { area: "weight", tags: ["fried", "sweet", "sugary_drink", "packaged"], tip: "These add a lot of energy without filling you up. A bigger share of sabzi does the opposite." },
  { area: "kidney", tags: ["pickle_papad", "packaged", "outside"], tip: "Salt is extra work for the kidneys. Home food with less salt is the easy win." },
];

export type MealRead = { tone: "great" | "good" | "watch"; line: string; tips: string[] };

export function readPlate(tags: readonly PlateTag[], areas: readonly Area[]): MealRead {
  const has = (t: PlateTag) => tags.includes(t);
  const protein = PROTEIN.some(has);
  const plants = PLANTS.some(has);
  const tips: string[] = [];

  for (const w of WATCH) {
    if (areas.includes(w.area) && w.tags.some(has)) tips.push(w.tip);
  }
  if (areas.includes("iron") && (has("dal") || has("sabzi")) && !tips.length) tips.push("Squeeze lemon on the dal or sabzi: the vitamin C helps your body take up the iron.");
  if (!protein) tips.push("No protein on this plate. Dal, curd, paneer or an egg would make it last longer.");
  if (!plants) tips.push("No vegetables or fruit here. Half the plate as sabzi or salad is the simplest upgrade.");

  const extras = (["fried", "sweet", "bakery", "packaged", "sugary_drink"] as PlateTag[]).filter(has).length;
  const tone: MealRead["tone"] =
    protein && plants && extras === 0 && tips.length === 0 ? "great" : extras >= 2 || (!protein && !plants) || (tips.length >= 2 && (!protein || !plants)) ? "watch" : "good";

  const line =
    tone === "great"
      ? "A balanced plate: protein, vegetables and nothing fried. This is the one to repeat."
      : tone === "good"
        ? protein && plants
          ? "A good plate, with one thing worth a look."
          : "Not bad. One small change would make it a lot better."
        : "A couple of swaps would make this plate work harder for you.";

  return { tone, line, tips: tips.slice(0, 2) };
}

export type DayPlate = { meals: number; withProtein: number; withPlants: number; extras: number; line: string };

/** The day's food in one line, once at least one meal is in. */
export function dayPlate(meals: readonly (readonly PlateTag[])[]): DayPlate | null {
  if (!meals.length) return null;
  const withProtein = meals.filter((m) => PROTEIN.some((t) => m.includes(t))).length;
  const withPlants = meals.filter((m) => PLANTS.some((t) => m.includes(t))).length;
  const extras = meals.reduce((n, m) => n + m.filter((t) => ["fried", "sweet", "bakery", "packaged", "sugary_drink"].includes(t)).length, 0);
  const line =
    withProtein === meals.length && withPlants === meals.length
      ? extras
        ? `Protein and vegetables at every meal so far. ${extras === 1 ? "One extra" : `${extras} extras`} (fried, sweet or packaged) to keep an eye on.`
        : "Protein and vegetables at every meal so far. That's the whole trick."
      : withProtein < meals.length
        ? `Protein at ${withProtein} of ${meals.length} meals. Add it to the next one.`
        : `Vegetables at ${withPlants} of ${meals.length} meals. Add them to the next one.`;
  return { meals: meals.length, withProtein, withPlants, extras, line };
}
