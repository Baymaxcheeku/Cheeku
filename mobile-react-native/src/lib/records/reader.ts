import type { ExtractedField, ExtractedValue, Extraction } from "@/lib/ai/mock/extract-types";
import type { PlateTag } from "@/lib/home/meals";
import { supabase } from "@/lib/supabase/client";

import type { DocType } from "./types";

/*
 * THE REAL READER for the "+" upload (2026-11-21).
 *
 * The file is already in the person's private storage folder. This asks the
 * cheeku-chat function (op "read") to fetch it back as them and have Gemini
 * say what it is and what it says. Before this, the screen used a stand-in
 * that never looked at the file: it guessed from the file name, so a phone
 * photo ("photo.jpg") of dinner was filed as a prescription full of sample
 * medicines.
 *
 * WHAT IT IS comes first. A meal or a picture that isn't health paperwork is
 * not filed as a record: the screen offers to log the meal or ask Cheeku.
 *
 * NO MADE-UP DATA. When the reader can't be reached the record still saves,
 * but blank and marked for review, never with sample values.
 */

export type ReadKind = DocType | "other_health" | "meal" | "not_health";

export type ReadResult = {
  kind: ReadKind;
  title: string;
  eventDate: string | null;
  facility: string | null;
  doctor: string | null;
  patientName: string | null;
  values: { name: string; value: string; unit: string | null; refRange: string | null; flag: "normal" | "high" | "low" | null }[];
  medicines: { name: string; strength: string | null; form: string | null; dose: string | null; schedule: number[]; timing: string | null; durationDays: number | null; asNeeded: boolean }[];
  foods: string[];
  summary: string;
  confidence: number;
  rawText: string;
};

/** Reads an uploaded file. Null when the reader isn't set up or didn't answer. */
export async function readUpload(path: string, mimeType: string, hint?: DocType): Promise<ReadResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("cheeku-chat", { body: { op: "read", path, mimeType, hint: hint ?? null } });
    if (error || !data || typeof data !== "object" || typeof (data as ReadResult).kind !== "string") return null;
    return data as ReadResult;
  } catch {
    return null;
  }
}

/** The reader's kind as a record type. Meals and non-health pictures have none. */
export function docTypeOf(kind: ReadKind): DocType | null {
  if (kind === "meal" || kind === "not_health") return null;
  if (kind === "other_health") return "other";
  return kind;
}

const FORMS = ["tablet", "capsule", "syrup", "injection", "drops", "inhaler", "cream", "sachet", "other"];
const TIMINGS = ["before_food", "after_food", "with_food", "empty_stomach", "bedtime", "any"];

/** A read file as the Extraction the confirm screen and filing already use. */
export function toExtraction(r: ReadResult, type: DocType): Extraction {
  // One confidence for the whole read; the confirm screen highlights anything below its line.
  const c = Math.max(0, Math.min(1, r.confidence));
  const fields: ExtractedField[] = [];
  if (r.patientName) fields.push({ key: "patientName", label: "Patient name", value: r.patientName, confidence: c });
  fields.push({ key: "eventDate", label: "Date on the document", value: r.eventDate ?? "", confidence: r.eventDate ? c : 0.3 });
  if (r.facility) fields.push({ key: "facility", label: type === "prescription" ? "Clinic" : "Lab or hospital", value: r.facility, confidence: c });
  if (r.doctor) fields.push({ key: "doctor", label: "Doctor", value: r.doctor, confidence: c });

  const values: ExtractedValue[] = r.values.map((v, i) => ({
    key: `v${i}`,
    label: v.name,
    value: v.value,
    unit: v.unit,
    refRange: v.refRange,
    flag: v.flag,
    confidence: c,
  }));

  const medicines = r.medicines.map((m) => ({
    name: m.name,
    strength: m.strength,
    form: m.form && FORMS.includes(m.form) ? m.form : "tablet",
    dose: m.dose,
    schedule: m.schedule.length === 3 ? m.schedule : [0, 0, 0],
    timing: m.timing && TIMINGS.includes(m.timing) ? m.timing : "any",
    durationDays: m.durationDays,
    asNeeded: m.asNeeded,
    note: null,
  }));
  const details: Record<string, unknown> =
    type === "prescription" ? { doctor: { name: r.doctor }, medicines } : type === "medication" || type === "bill" ? (medicines.length ? { medicines } : {}) : {};

  const all = [...fields, ...values];
  return {
    title: r.title,
    docType: type,
    eventDate: r.eventDate,
    facility: r.facility,
    doctor: r.doctor,
    details,
    fields,
    values,
    rawText: r.rawText,
    confidence: all.length ? Number((all.reduce((s, f) => s + f.confidence, 0) / all.length).toFixed(2)) : c,
  };
}

/** Nothing read: an honest empty record for the person to fill in. */
export function blankExtraction(type: DocType): Extraction {
  return {
    title: "Document",
    docType: type,
    eventDate: null,
    facility: null,
    doctor: null,
    details: {},
    fields: [{ key: "eventDate", label: "Date on the document", value: "", confidence: 0 }],
    values: [],
    rawText: "",
    confidence: 0,
  };
}

/** Plate words the reader used, as the meal sheet's chips. */
const FOOD_TAGS: [RegExp, PlateTag][] = [
  [/roti|chapati|phulka|paratha|naan|bhakri/, "roti"],
  [/rice|biryani|pulao|khichdi/, "rice"],
  [/millet|ragi|jowar|bajra/, "millet"],
  [/dal|lentil|sambar|rajma|chole|chana/, "dal"],
  [/sabzi|sabji|vegetable|curry|bhaji|palak|aloo|gobi|bhindi/, "sabzi"],
  [/salad|cucumber|sprout/, "salad"],
  [/curd|dahi|raita|yogurt|buttermilk|chaas/, "curd"],
  [/paneer/, "paneer"],
  [/egg|omelet/, "egg"],
  [/chicken|fish|mutton|prawn|meat/, "chicken_fish"],
  [/fruit|banana|apple|papaya|orange|guava|mango/, "fruit"],
  [/nut|almond|walnut|peanut/, "nuts"],
  [/fried|pakora|samosa|puri|bhatura|vada|fries/, "fried"],
  [/sweet|mithai|halwa|gulab|dessert|cake|ice cream|kheer/, "sweet"],
  [/bread|biscuit|toast|bun/, "bakery"],
  [/chips|namkeen|packaged|noodle/, "packaged"],
  [/cola|soda|soft drink|juice/, "sugary_drink"],
  [/chai|tea/, "chai_sugar"],
  [/pickle|achar|papad/, "pickle_papad"],
];

export function plateTagsFrom(foods: readonly string[]): PlateTag[] {
  const out = new Set<PlateTag>();
  for (const f of foods) {
    const t = f.toLowerCase();
    for (const [re, tag] of FOOD_TAGS) if (re.test(t)) out.add(tag);
  }
  return [...out];
}

/** Which meal of the day it is now, for logging a meal photo. */
export function mealSlotNow(now = new Date()): "breakfast" | "lunch" | "snacks" | "dinner" {
  const h = now.getHours();
  return h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 19 ? "snacks" : "dinner";
}
