import type { ZodError } from "zod";

import { APP_VERSION } from "@/lib/app-meta";
import { allowsFamily, seatsFor } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { supabase } from "@/lib/supabase/client";
import { ownFamily } from "./queries";
import {
  addMemberSchema,
  changePasswordSchema,
  healthProfileSchema,
  notificationPrefsSchema,
  personalInfoSchema,
  supportTicketSchema,
  type AddMemberInput,
  type ChangePasswordInput,
  type HealthProfileInput,
  type NotificationPrefs,
  type PersonalInfoInput,
  type SupportTicketInput,
} from "./schemas";

/*
 * The settings writes.
 *
 * These were server actions on web. Here they run on the device, and that is
 * SAFE FOR THESE PARTICULAR WRITES in a way it was not for the entitlement
 * ones: every statement below is bounded by RLS to the caller's own account.
 * A patched client can lie about its own name and blood group, which is a
 * thing it could always do by typing.
 *
 * THE ONE EXCEPTION IS `addFamilyMember`, whose plan gate is a paywall
 * decision. See the note there.
 */

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

/** "Folic acid | 5 mg | once daily" per line, matching the fixture shape. */
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

async function currentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function updatePersonalInfo(input: PersonalInfoInput): Promise<SettingsResult> {
  const parsed = personalInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Your session expired. Please sign in again." };

  const { profileId, ...rest } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      name: rest.name,
      // Empty string is not "no answer" to Postgres, it is an invalid date.
      // Every optional field here collapses to null rather than "".
      dob: rest.dob || null,
      sex: rest.sex || null,
      relationship: rest.relationship || null,
    })
    .eq("id", profileId)
    .eq("user_id", userId);

  if (error) return { ok: false, message: "We couldn't save that. Try again." };
  return { ok: true };
}

export async function updateHealthProfile(input: HealthProfileInput): Promise<SettingsResult> {
  const parsed = healthProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Your session expired. Please sign in again." };

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
    .eq("user_id", userId);

  if (error) return { ok: false, message: "We couldn't save that. Try again." };
  return { ok: true };
}

/**
 * Files a support ticket.
 *
 * Writes to `support_tickets` rather than opening a mail client. A form that
 * discards what someone typed is worse than no form: they come away believing
 * help is on the way.
 *
 * Deliberately stores no health data — a category, a title, the description
 * the reader chose to write, and the app version. Support staff diagnosing a
 * crash have no business reading lab values.
 */
export async function submitSupportTicket(
  input: SupportTicketInput,
): Promise<SettingsResult & { ticketId?: string }> {
  const parsed = supportTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Your session expired. Please sign in again." };

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: userId,
      category: parsed.data.category,
      subject: parsed.data.subject,
      body: parsed.data.body,
      app_version: APP_VERSION,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: "We couldn't send that. Please try again." };
  return { ok: true, ticketId: data.id as string };
}

/**
 * Adds a family member.
 *
 * THE SEAT CHECK BELOW IS A MESSAGE, NOT A GATE. It runs on the device, so a
 * patched client can skip it — the same limit the paywall work in migration
 * 0011 had to move into the database for uploads and chats.
 *
 * What still holds without it: migration 0001's trigger caps any family at six
 * profiles, and RLS binds the insert to the caller's own account. So the
 * exposure is a free account creating profiles its plan does not cover, and
 * then finding it cannot open them, because `selectableProfiles()` slices by
 * seats on every read. They would be paying nothing for rows they cannot see.
 *
 * Worth closing with a trigger like the other two, and worth doing when the
 * add-member UI is not brand new. Tracked in PLAN.md under Phase 4.
 */
export async function addFamilyMember(
  input: AddMemberInput,
): Promise<SettingsResult & { needsUpgrade?: true }> {
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Your session expired. Please sign in again." };

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

  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
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
    user_id: userId,
    name: parsed.data.name,
    relationship: parsed.data.relationship,
    dob: parsed.data.dob || null,
    sex: parsed.data.sex || null,
    is_primary: false,
  });

  if (error) {
    // The 6-profile trigger from migration 0001 surfaces here as a raw
    // exception. Say the limit rather than the database's wording.
    if (error.message.includes("at most 6 profiles")) {
      return { ok: false, message: "A family can hold six profiles. Remove someone first." };
    }
    return { ok: false, message: "We couldn't add that member. Try again." };
  }
  return { ok: true };
}

/**
 * Merges rather than replaces.
 *
 * The screen only ever sends the toggle that moved, and a stray write of `{}`
 * from a stale client must not blank out every other preference.
 */
export async function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<SettingsResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Your session expired. Please sign in again." };

  const family = await ownFamily();
  if (!family) return { ok: false, message: "No account found." };

  const parsed = notificationPrefsSchema.safeParse({ ...family.prefs, ...patch });
  if (!parsed.success) return { ok: false, message: "Couldn't save that preference." };

  const { error } = await supabase
    .from("families")
    .update({ notification_prefs: parsed.data })
    .eq("id", family.id)
    .eq("owner_id", userId);

  if (error) return { ok: false, message: "Couldn't save that preference." };
  return { ok: true };
}

/**
 * Requires the current password rather than trusting the session alone.
 *
 * Supabase's `updateUser` will happily change a password for anyone holding a
 * live session, and a device left unlocked on a table is not consent to change
 * the account's credential. Re-authenticating is what makes this a password
 * change rather than an account takeover with extra steps.
 */
export async function changePassword(input: ChangePasswordInput): Promise<SettingsResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, message: "This account has no password sign-in." };

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) return { ok: false, message: "Your current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { ok: false, message: "Couldn't update your password. Try again." };

  return { ok: true };
}
