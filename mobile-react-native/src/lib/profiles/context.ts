import { seatsFor } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { kv } from "@/lib/storage";
import { supabase } from "@/lib/supabase/client";
import { generatedAvatar } from "./avatar";

/*
 * Which family member the app is currently showing.
 *
 * This is the isolation boundary made visible. Rule 3 says one member's data
 * must never surface in another's context. RLS already does that between
 * ACCOUNTS — but within one account the family shares a user_id, so RLS cannot
 * separate them and this selection is what scopes every screen and, critically,
 * what scopes the records handed to the chat as grounding.
 *
 * A NOTE ON WHERE THIS RUNS. On web these were server functions and the
 * selection lived in an httpOnly cookie the client could not forge. Here it is
 * device storage that the app itself writes, so this file is no longer a
 * security boundary in the way its web counterpart was: a rooted phone can edit
 * the stored id.
 *
 * That is survivable only because of what the stored id can and cannot do. It
 * is always re-checked against the profiles the account actually owns and the
 * seats the plan actually covers, so the worst a forged value achieves is
 * naming a profile the same user could reach anyway, or being discarded. It can
 * never widen RLS. What it must never become is the sole gate on a WRITE, or on
 * anything a server later trusts — those decisions belong to the database and
 * to Phase 3's Edge Function, not to this file.
 */

const KEY = "baymax_profile";

export type ActiveProfile = {
  id: string;
  name: string;
  relationship: string | null;
  isPrimary: boolean;
  avatarRing: string | null;
  dob: string | null;
  sex: string | null;
  /** The chosen face's catalogue id, or null when the face is derived. */
  avatarSeed: string | null;
  /** Generated from the id. Raw SVG markup for SvgXml, not a data URI. */
  avatar: string;
  avatarBackground: string;
};

/**
 * The profiles this user owns, primary first. Used by the switcher and to
 * validate the stored id.
 */
export async function familyProfiles(): Promise<ActiveProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, relationship, is_primary, avatar_ring, avatar_seed, dob, sex")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`familyProfiles: ${error.message}`);

  return (data ?? []).map((p, i) => {
    /*
     * A chosen face beats a derived one. `avatar_seed` is null for anyone who
     * never picked — every family member added in a hurry, and every profile
     * that predates the picker — and those keep deriving from the id exactly
     * as before.
     */
    const generated = generatedAvatar((p.avatar_seed as string | null) ?? (p.id as string), i);
    return {
      id: p.id as string,
      name: p.name as string,
      relationship: p.relationship as string | null,
      isPrimary: Boolean(p.is_primary),
      avatarRing: p.avatar_ring as string | null,
      dob: p.dob as string | null,
      sex: p.sex as string | null,
      avatarSeed: (p.avatar_seed as string | null) ?? null,
      avatar: generated.svg,
      avatarBackground: generated.background,
    };
  });
}

/**
 * The profiles the CURRENT PLAN allows the reader to open, primary first.
 *
 * `familyProfiles` answers "which profiles exist on this account". This answers
 * "which of them may be viewed right now", and they stop being the same
 * question the moment a plan is downgraded or a Family trial ends. The seats a
 * plan covers is already the number the paywall advertises, so it is the number
 * used here rather than a second, parallel rule.
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
 * all. One call, so no screen re-derives the rule and gets it slightly
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
 * That matters on a downgrade: the stored id still names whoever was last
 * chosen, so without this a Family subscriber who dropped to Solo would keep
 * landing on their mother's records — reading her history, and grounding Ask
 * Cheeku in it, on a plan that no longer covers her. Falling back to the
 * primary profile is also how a stale or tampered value degrades: to "your own
 * records", never to someone else's and never to a crash.
 */
export async function activeProfile(): Promise<ActiveProfile | null> {
  const profiles = await selectableProfiles();
  if (profiles.length === 0) return null;

  const requested = await kv.get(KEY);
  const match = requested ? profiles.find((p) => p.id === requested) : undefined;
  return match ?? profiles[0] ?? null;
}

/**
 * Switch member.
 *
 * Validated against `selectableProfiles` before it is written, not after it is
 * read, so an id the plan does not cover never reaches storage in the first
 * place. Returns false rather than throwing: a switcher that cannot switch
 * should say so, not crash the screen it lives on.
 */
export async function switchProfile(profileId: string, known?: readonly ActiveProfile[]): Promise<boolean> {
  // `known` is the selectable list a screen already holds (the cached family
  // context). Trusting it skips two network reads, which is what makes a
  // switch feel instant; it is the same list this would have fetched, and the
  // stored id is re-checked against the plan on every read regardless.
  const profiles = known ?? (await selectableProfiles());
  if (!profiles.some((p) => p.id === profileId)) return false;
  await kv.set(KEY, profileId);
  return true;
}

/** Cleared on sign-out, so the next account does not inherit a selection. */
export async function clearActiveProfile(): Promise<void> {
  await kv.remove(KEY);
}
