"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { IS_PRODUCTION } from "@/lib/env";
import { selectableProfiles, PROFILE_COOKIE } from "./context";

/**
 * Switches the active family member.
 *
 * TWO checks, and the second is the one that matters.
 *
 * The id is validated against the caller's own profiles, because skipping that
 * would let anyone set the cookie to an arbitrary uuid; RLS would still return
 * no rows, but the app would render a screen headed with someone else's profile
 * id and an empty list, which is a confusing way to fail.
 *
 * It is then validated against what the PLAN allows, which the UI alone must
 * never be trusted to enforce. Hiding a locked member from the switcher stops
 * the tap, not the request — this action is a public endpoint, and a Solo
 * subscriber posting a family member's id to it would otherwise have their
 * whole session rescoped to a person they are not paying to see, including the
 * records handed to Ask Baymax as grounding. `selectableProfiles` is the same
 * rule the screens draw from, so the button and the gate cannot drift.
 */
export async function switchProfile(profileId: string): Promise<{ ok: boolean }> {
  const profiles = await selectableProfiles();
  if (!profiles.some((p) => p.id === profileId)) return { ok: false };

  const store = await cookies();
  store.set(PROFILE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  /*
   * Every screen is scoped by this, so the whole signed-in tree is revalidated
   * rather than just the caller. Switching member on Home and then finding the
   * records list still showing the previous one is precisely the leak rule 3
   * exists to prevent people experiencing.
   */
  revalidatePath("/", "layout");
  return { ok: true };
}
