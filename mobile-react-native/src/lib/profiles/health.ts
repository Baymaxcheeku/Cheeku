import { supabase } from "@/lib/supabase/client";

import type { Medication } from "./health-rules";

export { ageFrom, conditionSuggestions, allergySuggestions, stageFor, type Medication } from "./health-rules";

/*
 * One member's health basics, read and written in one place.
 *
 * Used by the add-member flow, the member screen and Health profile, so the
 * three can never disagree about what a condition list or a medicine looks
 * like. Everything is the reader's own words; nothing is inferred.
 */

export type MemberHealth = {
  conditions: string[];
  allergies: string[];
  medications: Medication[];
  bloodGroup: string;
  heightCm: string;
  weightKg: string;
};

export const EMPTY_HEALTH: MemberHealth = {
  conditions: [],
  allergies: [],
  medications: [],
  bloodGroup: "",
  heightCm: "",
  weightKg: "",
};

export const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

type Row = {
  conditions: string[] | null;
  allergies?: string[] | null;
  medications: Medication[] | null;
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
};

// `allergies` arrived in migration 0026. Until that has run, reads and writes
// fall back to the columns that exist, rather than breaking the whole screen.
function missingColumn(message: string | undefined) {
  return Boolean(message && /allergies/.test(message));
}

export async function loadMemberHealth(profileId: string): Promise<MemberHealth> {
  const base = "conditions, medications, blood_group, height_cm, weight_kg";
  let res = await supabase.from("profiles").select(`${base}, allergies`).eq("id", profileId).maybeSingle();
  if (res.error && missingColumn(res.error.message)) {
    res = await supabase.from("profiles").select(base).eq("id", profileId).maybeSingle();
  }
  if (res.error) throw new Error(`loadMemberHealth: ${res.error.message}`);
  const r = (res.data ?? {}) as Row;
  return {
    conditions: r.conditions ?? [],
    allergies: r.allergies ?? [],
    medications: r.medications ?? [],
    bloodGroup: r.blood_group ?? "",
    heightCm: r.height_cm ? String(r.height_cm) : "",
    weightKg: r.weight_kg ? String(r.weight_kg) : "",
  };
}

export type HealthResult = { ok: true } | { ok: false; message: string; field?: "heightCm" | "weightKg" };

/** Validates the two numbers, then writes everything in one update. */
/** The checks a save makes before it writes, so a screen can run them first. */
export function checkMemberHealth(h: MemberHealth): Extract<HealthResult, { ok: false }> | null {
  const height = h.heightCm.trim() ? Number(h.heightCm) : null;
  const weight = h.weightKg.trim() ? Number(h.weightKg) : null;
  if (height !== null && (!Number.isFinite(height) || height < 30 || height > 260)) {
    return { ok: false, message: "Height should be in centimetres, between 30 and 260.", field: "heightCm" };
  }
  if (weight !== null && (!Number.isFinite(weight) || weight < 1 || weight > 400)) {
    return { ok: false, message: "Weight should be in kilograms, between 1 and 400.", field: "weightKg" };
  }
  return null;
}

export async function saveMemberHealth(profileId: string, h: MemberHealth): Promise<HealthResult> {
  const invalid = checkMemberHealth(h);
  if (invalid) return invalid;
  const height = h.heightCm.trim() ? Number(h.heightCm) : null;
  const weight = h.weightKg.trim() ? Number(h.weightKg) : null;

  const clean = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))].slice(0, 30);
  const patch = {
    conditions: clean(h.conditions),
    medications: h.medications
      .map((m) => ({ name: m.name.trim(), dose: m.dose.trim(), frequency: m.frequency.trim() }))
      .filter((m) => m.name)
      .slice(0, 30),
    blood_group: h.bloodGroup || null,
    height_cm: height === null ? null : Math.round(height),
    weight_kg: weight,
  };

  let { error } = await supabase
    .from("profiles")
    .update({ ...patch, allergies: clean(h.allergies) })
    .eq("id", profileId);
  if (error && missingColumn(error.message)) {
    ({ error } = await supabase.from("profiles").update(patch).eq("id", profileId));
  }
  if (error) return { ok: false, message: "That didn't save. Check your connection and try again." };
  return { ok: true };
}

/** True when there is anything worth saving, so an untouched step writes nothing. */
export function hasHealth(h: MemberHealth): boolean {
  return Boolean(
    h.conditions.length || h.allergies.length || h.medications.length || h.bloodGroup || h.heightCm || h.weightKg,
  );
}

