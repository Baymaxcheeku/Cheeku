import "server-only";

import { cookies } from "next/headers";

import { seatsFor } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { createServerSupabase } from "@/lib/supabase/server";
import { generatedAvatar } from "./avatar";

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
  dob: string | null;
  sex: string | null;
  /** Generated from the id, or the custom picture once one is uploaded. */
  avatar: string;
  avatarBackground: string;
};

/**
 * The profiles this user owns, primary first. Used by the switcher and to
 * validate the cookie.
 */
export async function familyProfiles(): Promise<ActiveProfile[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, relationship, is_primary, avatar_ring, dob, sex")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`familyProfiles: ${error.message}`);

  return (data ?? []).map((p, i) => {
    const generated = generatedAvatar(p.id as string, i);
    return {
      id: p.id as string,
      name: p.name as string,
      relationship: p.relationship as string | null,
      isPrimary: Boolean(p.is_primary),
      avatarRing: p.avatar_ring as string | null,
      dob: p.dob as string | null,
      sex: p.sex as string | null,
      avatar: generated.dataUri,
      avatarBackground: generated.background,
    };
  });
}

/**
 * The profiles the CURRENT PLAN allows the reader to open, primary first.
 *
 * `familyProfiles` answers "which profiles exist on this account". This
 * answers "which of them may be viewed right now", and they are not the same
 * question the moment a plan is downgraded or a Family-plan trial ends. The
 * seats a plan covers is already the number the paywall advertises, so it is
 * the number used here rather than a second, parallel rule.
 *
 * Profiles beyond the seat count are NOT deleted and NOT hidden from the
 * account — the reader's data is theirs and upgrading brings it straight back.
 * They are only unreachable, which is what the plan actually gates.
 */
export async function selectableProfiles(): Promise<ActiveProfile[]> {
  const [profiles, entitlement] = await Promise.all([familyProfiles(), getEntitlement()]);
  return profiles.slice(0, seatsFor(entitlement.tier));
}

/**
 * Everything a screen needs to draw the switcher honestly: what is reachable,
 * how many are locked behind the plan, and whether switching is possible at
 * all. One call so no screen has to re-derive the rule and get it slightly
 * different from the next one.
 */
export async function profileAccess(): Promise<{
  all: ActiveProfile[];
  selectable: ActiveProfile[];
  lockedCount: number;
  canSwitch: boolean;
}> {
  const [all, entitlement] = await Promise.all([familyProfiles(), getEntitlement()]);
  const seats = seatsFor(entitlement.tier);
  const selectable = all.slice(0, seats);
  return {
    all,
    selectable,
    lockedCount: Math.max(0, all.length - selectable.length),
    canSwitch: seats > 1,
  };
}

/**
 * The active profile, or null when the account has none yet.
 *
 * Resolved against the SELECTABLE list, not every profile the account owns.
 * That matters on a downgrade: the cookie still names whoever was last chosen,
 * so without this a Family subscriber who dropped to Solo would keep landing on
 * their mother's records — reading her history, and grounding Ask Cheeku in it,
 * on a plan that no longer covers her. Falling back to the primary profile is
 * also how a stale or forged cookie degrades: to "your own records", never to
 * someone else's and never to a crash.
 */
export async function activeProfile(): Promise<ActiveProfile | null> {
  const profiles = await selectableProfiles();
  if (profiles.length === 0) return null;

  const store = await cookies();
  const requested = store.get(COOKIE)?.value;

  const match = requested ? profiles.find((p) => p.id === requested) : undefined;
  return match ?? profiles[0] ?? null;
}

/** Name of the cookie, shared with the Server Action that sets it. */
export const PROFILE_COOKIE = COOKIE;
