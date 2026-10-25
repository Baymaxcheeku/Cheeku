import { supabase } from "@/lib/supabase/client";
import { sessionUser } from "@/lib/supabase/session";
import type { NotificationPrefs } from "./schemas";

/*
 * Reads behind the settings forms.
 *
 * All of it is RLS-scoped to the caller's own account, so these are safe on the
 * client in a way the entitlement WRITES were not — see lib/billing/quota.ts
 * for that distinction. The `.eq("user_id", ...)` filters below are belt and
 * braces on top of the policy, not the thing enforcing it.
 */

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

/** The full row behind a profile — more than `ActiveProfile` carries. */
export async function profileDetail(profileId: string): Promise<ProfileDetail | null> {
  const user = await sessionUser();
  if (!user) return null;

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
 * Every notification off by default, with two exceptions.
 *
 * A medical app that opts people into "tips and reminders" it never asked
 * permission for is one uninstall away from being the app that told a shared
 * home screen someone has a thyroid appointment.
 *
 * These govern PUSH only. The in-app inbox always receives everything, so a
 * switch here can never make something silently disappear. Kept in step with
 * DEFAULTS in supabase/functions/push-dispatch.
 */
export const DEFAULT_PREFS: NotificationPrefs = {
  accountSecurity: true, // this is how a break-in is noticed
  // Someone who booked a call expects to be told when it starts. The text of
  // the reminder is generic ("Your video call starts in 15 minutes").
  appointmentReminders: true,
  // Dose times and refills the person set up themselves; generic on the lock
  // screen ("Time for your morning medicines"), never a medicine's name.
  medicineReminders: true,
  // The day's few nudges, planned on the phone (engage.ts): at most four a
  // day, never between 10 pm and 7:30 am, each only while it still matters.
  dailyNudges: true,
  // When a family member's doses go unticked, a strip runs low or a test is
  // overdue (migration 0038). Names the member, never the medicine.
  caregiverAlerts: true,
  productUpdates: false,
  tipsReminders: false,
  checkinReminders: false,
  healthInsights: false,
  reportNotifications: false,
  familyActivity: false,
  invitations: false,
  promotions: false,
};

/** The signed-in user's own family row, with its stored notification prefs. */
export async function ownFamily(): Promise<{ id: string; prefs: NotificationPrefs } | null> {
  const user = await sessionUser();
  if (!user) return null;

  const { data } = await supabase
    .from("families")
    .select("id, notification_prefs")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data) return null;

  const stored = (data.notification_prefs ?? {}) as Partial<NotificationPrefs>;
  // Merged over the defaults rather than trusted whole: a row written by an
  // older build is missing whichever keys were added since, and a missing
  // boolean read as `undefined` renders a switch that is neither on nor off.
  return { id: data.id as string, prefs: { ...DEFAULT_PREFS, ...stored } };
}

/** The account's sign-in address, shown on the Personal information screen. */
export async function accountEmail(): Promise<string | null> {
  return (await sessionUser())?.email ?? null;
}
