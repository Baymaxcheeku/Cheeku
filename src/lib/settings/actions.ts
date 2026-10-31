"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { clearDevSession, isDevAuthActive } from "@/lib/auth/dev-session";
import { createServerSupabase, requireUser } from "@/lib/supabase/server";
import { PROFILE_COOKIE } from "@/lib/profiles/context";
import { APP_VERSION } from "@/lib/app-meta";
import { allowsFamily, seatsFor } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import {
  addMemberSchema,
  changePasswordSchema,
  healthProfileSchema,
  notificationPrefsSchema,
  personalInfoSchema,
  supportTicketSchema,
  type NotificationPrefs,
} from "./schemas";
import { ownFamily } from "./queries";

export type SettingsResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** "Folic acid | 5 mg | once daily" per line, matching the fixture shape. Blank lines are skipped. */
function parseMedications(raw: string): { name: string; dose: string; frequency: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", dose = "", frequency = ""] = line.split("|").map((s) => s.trim());
      return { name, dose, frequency };
    })
    .filter((m) => m.name.length > 0);
}

export async function updatePersonalInfo(formData: FormData): Promise<SettingsResult> {
  const parsed = personalInfoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const user = await requireUser();
  const supabase = await createServerSupabase();
  const { profileId, ...rest } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      name: rest.name,
      dob: rest.dob || null,
      sex: rest.sex || null,
      relationship: rest.relationship || null,
    })
    .eq("id", profileId)
    .eq("user_id", user.id);

  if (error) return { ok: false, message: "We couldn't save that. Try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateHealthProfile(formData: FormData): Promise<SettingsResult> {
  const parsed = healthProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const user = await requireUser();
  const supabase = await createServerSupabase();
  const { profileId, conditions, heightCm, weightKg, bloodGroup, medications } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      conditions: conditions
        ? conditions
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : [],
      medications: medications ? parseMedications(medications) : [],
      height_cm: heightCm || null,
      weight_kg: weightKg || null,
      blood_group: bloodGroup || null,
    })
    .eq("id", profileId)
    .eq("user_id", user.id);

  if (error) return { ok: false, message: "We couldn't save that. Try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Files a support ticket.
 *
 * Writes to `support_tickets` (migration 0010) rather than opening a mailto:.
 * A form that discards what someone typed is worse than no form at all — they
 * come away believing help is on the way.
 *
 * Deliberately stores no health data: a category, a title, a description the
 * user chose to write, and the app version. Support staff diagnosing a crash
 * have no business reading lab values.
 */
export async function submitSupportTicket(
  formData: FormData,
): Promise<SettingsResult & { ticketId?: string }> {
  const parsed = supportTicketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const user = await requireUser();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      body: parsed.data.body,
      app_version: APP_VERSION,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: "We couldn't send that. Please try again." };
  }

  revalidatePath("/settings/help");
  return { ok: true, ticketId: data.id as string };
}

/**
 * Adds a family member.
 *
 * Gated on the SERVER against the entitlement read from the database, not
 * against anything the sheet sent — the add-member form is only drawn for
 * family-tier accounts, but "only drawn for" is not a limit for anyone who can
 * post a form. The seat count is re-derived here too.
 *
 * The database has its own 6-profile trigger from migration 0001; that stays
 * the backstop. This returns a message a human can act on instead of letting a
 * raw trigger exception surface.
 */
export async function addFamilyMember(
  formData: FormData,
): Promise<SettingsResult & { needsUpgrade?: true }> {
  const parsed = addMemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const user = await requireUser();
  const entitlement = await getEntitlement();

  if (!allowsFamily(entitlement.tier)) {
    return {
      ok: false,
      needsUpgrade: true,
      message: "Adding family members is part of the Family plan.",
    };
  }

  const family = await ownFamily();
  if (!family) return { ok: false, message: "No account found." };

  const supabase = await createServerSupabase();
  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return { ok: false, message: "We couldn't add that member. Try again." };

  const seats = seatsFor(entitlement.tier);
  if ((count ?? 0) >= seats) {
    return {
      ok: false,
      message: `Your plan covers ${seats} members. Remove someone first, or contact support.`,
    };
  }

  const { error } = await supabase.from("profiles").insert({
    family_id: family.id,
    user_id: user.id,
    name: parsed.data.name,
    relationship: parsed.data.relationship,
    dob: parsed.data.dob || null,
    sex: parsed.data.sex || null,
    is_primary: false,
  });
  if (error) return { ok: false, message: "We couldn't add that member. Try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Merges rather than replaces: the form only ever submits the toggles it
 * rendered, and a stray write of `{}` from a stale client must not blank out
 * every other preference.
 */
export async function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<SettingsResult> {
  const user = await requireUser();
  const family = await ownFamily();
  if (!family) return { ok: false, message: "No account found." };

  const next = { ...family.prefs, ...patch };
  const parsed = notificationPrefsSchema.safeParse(next);
  if (!parsed.success) return { ok: false, message: "Couldn't save that preference." };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("families")
    .update({ notification_prefs: parsed.data })
    .eq("id", family.id)
    .eq("owner_id", user.id);

  if (error) return { ok: false, message: "Couldn't save that preference." };

  revalidatePath("/settings/notifications");
  return { ok: true };
}

/**
 * Requires the current password rather than trusting the session alone —
 * Supabase's `updateUser` will happily change a password for anyone with a
 * live session, and a device left unlocked is not the same thing as consent
 * to change the account's credential.
 */
export async function changePassword(formData: FormData): Promise<SettingsResult> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  if (isDevAuthActive()) {
    return { ok: false, message: "Password changes need a real account, not the dev stand-in." };
  }

  const user = await requireUser();
  if (!user.email) return { ok: false, message: "This account has no password sign-in." };

  const supabase = await createServerSupabase();
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) return { ok: false, message: "Your current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { ok: false, message: "Couldn't update your password. Try again." };

  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  if (isDevAuthActive()) {
    await clearDevSession();
  } else {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }

  // The active-profile cookie names a member of an account that is about to be
  // signed out of — leaving it set would hand the next signed-in session
  // someone else's selection.
  (await cookies()).delete(PROFILE_COOKIE);

  redirect("/sign-in");
}
