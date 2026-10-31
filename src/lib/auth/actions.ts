"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { setAudience } from "./audience";
import { isDevAuthActive, isSupabaseConfigured, writeDevSession } from "./dev-session";
import {
  audienceSchema,
  createAccountSchema,
  profileSchema,
  signInSchema,
  CONSENT_VERSION,
  type ActionResult,
} from "./schemas";
import type { ZodError } from "zod";

/*
 * Server actions are a public HTTP surface. Every one of these re-validates its
 * input with Zod and never trusts that the client rendered the right controls.
 */

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

/*
 * Sign-in and sign-up failures are reported with the same wording on purpose.
 * A message that distinguishes "no such account" from "wrong password" turns
 * the form into an oracle for which emails are registered — and in a health
 * app, membership alone is sensitive.
 */
const GENERIC_CREDENTIALS_ERROR = "That email and password combination didn't work.";

/*
 * ...but not every failure is a credentials failure, and reporting the ones
 * that aren't as "wrong password" sends people to re-type a password that was
 * always correct. A rate limit or a rejected address says nothing about
 * whether an account exists, so surfacing those leaks nothing and is the
 * difference between a fixable problem and a mystery.
 *
 * Anything not listed here falls through to the generic message deliberately:
 * the default has to be the safe one, or a new Supabase error code becomes an
 * accidental enumeration oracle.
 */
function authFailureMessage(error: { code?: string; status?: number }): string {
  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts right now. Please wait a few minutes and try again.";
    case "email_address_invalid":
      return "That email address wasn't accepted. Try a different one.";
    case "signup_disabled":
      return "New accounts are currently disabled.";
    case "weak_password":
      return "Please choose a stronger password.";
    default:
      return error.status === 429
        ? "Too many attempts right now. Please wait a few minutes and try again."
        : GENERIC_CREDENTIALS_ERROR;
  }
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  if (isDevAuthActive()) {
    await writeDevSession({ email: parsed.data.email });
    return { ok: true, redirectTo: "/who" };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: authFailureMessage(error) };

  return { ok: true, redirectTo: "/who" };
}

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const parsed = createAccountSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  if (isDevAuthActive()) {
    await writeDevSession({ email: parsed.data.email });
    return { ok: true, redirectTo: "/who" };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, message: authFailureMessage(error) };

  /*
   * With "Confirm email" on, signUp returns a user but no session — the account
   * exists and nothing else can happen until a link is clicked. Sending someone
   * onward to /who in that state lands them on a screen that cannot save
   * anything, so say what happened instead.
   */
  if (data.user && !data.session) {
    return {
      ok: false,
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  // DPDP: consent is logged with its version and a timestamp, in the same
  // request that created the account, so the two can never drift apart.
  if (data.user) {
    await supabase.from("consent_log").insert({
      user_id: data.user.id,
      consent_type: "dpdp_processing",
      version: CONSENT_VERSION,
      granted: true,
    });
  }

  return { ok: true, redirectTo: "/who" };
}

export async function chooseAudience(formData: FormData): Promise<ActionResult> {
  const parsed = audienceSchema.safeParse({ audience: formData.get("audience") });
  if (!parsed.success) return { ok: false, message: "Choose an option to continue." };

  if (isDevAuthActive()) await writeDevSession({ audience: parsed.data.audience });

  // Remembered so the end of onboarding knows whether to offer family access.
  // It is a routing hint only — see lib/auth/audience.ts.
  await setAudience(parsed.data.audience);

  return { ok: true, redirectTo: "/profile" };
}

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Check the fields below.", fieldErrors: fieldErrors(parsed.error) };
  }

  if (isDevAuthActive()) {
    await writeDevSession({ profileName: parsed.data.fullName });
    return { ok: true, redirectTo: "/first-upload" };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Your session expired. Please sign in again." };

  /*
   * REUSE the family when this account already has one.
   *
   * This used to insert unconditionally, so running onboarding a second time
   * created a SECOND family for the same owner, and nothing said which was the
   * account's. `getEntitlement` resolves it with `.maybeSingle()`, which errors
   * on two rows and falls through to the free entitlement, so a paying account
   * displayed "Free Plan". Migration 0014 merged the duplicates and added a
   * unique index; this is the other half of the fix. The mobile build had the
   * identical bug in `app/profile.tsx`.
   */
  const { data: existing } = await supabase
    .from("families")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  let familyId = existing?.id as string | undefined;
  if (!familyId) {
    const { data: created, error: familyError } = await supabase
      .from("families")
      .insert({ owner_id: user.id })
      .select("id")
      .single();
    if (familyError || !created) return { ok: false, message: "We couldn't save that. Try again." };
    familyId = created.id as string;
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    family_id: familyId,
    user_id: user.id,
    name: parsed.data.fullName,
    dob: parsed.data.dob || null,
    sex: parsed.data.sex || null,
    relationship: "self",
    is_primary: true,
    conditions: parsed.data.conditions ? parsed.data.conditions.split(",").map((c) => c.trim()) : [],
  });
  if (profileError) return { ok: false, message: "We couldn't save that. Try again." };

  return { ok: true, redirectTo: "/first-upload" };
}

/** Surfaced in the UI so nobody mistakes the local stand-in for real auth. */
export async function authMode(): Promise<"supabase" | "development-stand-in"> {
  return isSupabaseConfigured() ? "supabase" : "development-stand-in";
}
