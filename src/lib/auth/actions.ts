"use server";

import { createServerSupabase } from "@/lib/supabase/server";
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
  if (error) return { ok: false, message: GENERIC_CREDENTIALS_ERROR };

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
  if (error) return { ok: false, message: GENERIC_CREDENTIALS_ERROR };

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

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ owner_id: user.id })
    .select("id")
    .single();
  if (familyError || !family) return { ok: false, message: "We couldn't save that. Try again." };

  const { error: profileError } = await supabase.from("profiles").insert({
    family_id: family.id,
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
