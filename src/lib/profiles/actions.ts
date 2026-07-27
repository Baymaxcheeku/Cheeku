"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { IS_PRODUCTION } from "@/lib/env";
import { familyProfiles, PROFILE_COOKIE } from "./context";

/**
 * Switches the active family member.
 *
 * The id is validated against the caller's own profiles before it is written.
 * Skipping that would let anyone set the cookie to an arbitrary uuid; RLS would
 * still return no rows, but the app would then render a screen headed with
 * someone else's profile id and an empty record list, which is a confusing way
 * to fail and a bad thing to have to reason about later.
 */
export async function switchProfile(profileId: string): Promise<{ ok: boolean }> {
  const profiles = await familyProfiles();
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
