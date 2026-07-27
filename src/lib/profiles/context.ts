import "server-only";

import { cookies } from "next/headers";

import { createServerSupabase } from "@/lib/supabase/server";

/*
 * Which family member the app is currently showing.
 *
 * This is the isolation boundary made visible. Rule 3 says one member's data
 * must never surface in another's context, enforced at the database layer — RLS
 * already does that between *accounts*. Within one account the family shares a
 * user_id, so this selection is what scopes every screen and, critically, what
 * scopes the records handed to the chat as grounding.
 *
 * It lives in a cookie rather than component state so the server components
 * that fetch data can read it, and so switching member survives a reload. The
 * value is always re-checked against the caller's own profiles before use: a
 * cookie is client-supplied, and a client-supplied profile id must never be
 * trusted to name a row.
 */

const COOKIE = "baymax_profile";

export type ActiveProfile = {
  id: string;
  name: string;
  relationship: string | null;
  isPrimary: boolean;
  avatarRing: string | null;
};

/**
 * The profiles this user owns, primary first. Used by the switcher and to
 * validate the cookie.
 */
export async function familyProfiles(): Promise<ActiveProfile[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, relationship, is_primary, avatar_ring")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`familyProfiles: ${error.message}`);

  return (data ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    relationship: p.relationship as string | null,
    isPrimary: Boolean(p.is_primary),
    avatarRing: p.avatar_ring as string | null,
  }));
}

/**
 * The active profile, or null when the account has none yet.
 *
 * Falls back to the primary profile rather than erroring: a stale or forged
 * cookie should degrade to "your own records", never to someone else's and
 * never to a crash.
 */
export async function activeProfile(): Promise<ActiveProfile | null> {
  const profiles = await familyProfiles();
  if (profiles.length === 0) return null;

  const store = await cookies();
  const requested = store.get(COOKIE)?.value;

  const match = requested ? profiles.find((p) => p.id === requested) : undefined;
  return match ?? profiles[0] ?? null;
}

/** Name of the cookie, shared with the Server Action that sets it. */
export const PROFILE_COOKIE = COOKIE;
