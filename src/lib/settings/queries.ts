import "server-only";

import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import type { NotificationPrefs } from "./schemas";

export type ProfileDetail = {
  id: string;
  name: string;
  dob: string | null;
  sex: string | null;
  relationship: string | null;
  isPrimary: boolean;
  conditions: string[];
  medications: { name: string; dose: string; frequency: string }[];
  heightCm: number | null;
  weightKg: number | null;
  bloodGroup: string | null;
};

/** The full row behind a profile, for the edit forms — more than `ActiveProfile` carries. */
export async function profileDetail(profileId: string): Promise<ProfileDetail | null> {
  const user = await requireUser();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, dob, sex, relationship, is_primary, conditions, medications, height_cm, weight_kg, blood_group",
    )
    .eq("id", profileId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    dob: data.dob as string | null,
    sex: data.sex as string | null,
    relationship: data.relationship as string | null,
    isPrimary: Boolean(data.is_primary),
    conditions: (data.conditions as string[] | null) ?? [],
    medications:
      (data.medications as { name: string; dose: string; frequency: string }[] | null) ?? [],
    heightCm: data.height_cm as number | null,
    weightKg: data.weight_kg as number | null,
    bloodGroup: data.blood_group as string | null,
  };
}

/**
 * The signed-in user's own family row.
 *
 * `saveProfile` (A5) always creates exactly one family per user before any
 * profile, so a user with a profile always has one — `maybeSingle` returns
 * null rather than throwing for the edge case of an account with none yet.
 */
export async function ownFamily(): Promise<{ id: string; prefs: NotificationPrefs } | null> {
  const user = await requireUser();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("families")
    .select("id, notification_prefs")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id as string, prefs: data.notification_prefs as NotificationPrefs };
}
