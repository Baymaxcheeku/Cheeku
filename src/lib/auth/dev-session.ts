import "server-only";

import { cookies } from "next/headers";

import { clientEnv, IS_PRODUCTION } from "@/lib/env";

/*
 * A stand-in session for local development ONLY, so the onboarding flow is
 * clickable before a Supabase project exists.
 *
 * This is not authentication. It proves nothing and verifies nothing — it is a
 * cookie holding whatever was typed into the form. It is quarantined behind two
 * conditions that cannot both be true in a deployed app, and `assertDevOnly()`
 * throws rather than degrades if that ever stops holding.
 *
 * Delete this file the moment real credentials land.
 */

const COOKIE = "baymax_dev_session";

export type DevSession = {
  email: string;
  audience?: "me" | "family";
  profileName?: string;
};

/** True when a real Supabase project is wired up. */
export function isSupabaseConfigured(): boolean {
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  return !url.includes("placeholder") && !url.includes("example");
}

/** True when the dev stand-in is permitted to act. */
export function isDevAuthActive(): boolean {
  return !IS_PRODUCTION && !isSupabaseConfigured();
}

function assertDevOnly() {
  if (!isDevAuthActive()) {
    throw new Error(
      "The development session stand-in was reached outside development. " +
        "This would accept an unverified identity. Refusing.",
    );
  }
}

export async function readDevSession(): Promise<DevSession | null> {
  if (!isDevAuthActive()) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString()) as DevSession;
  } catch {
    return null;
  }
}

export async function writeDevSession(patch: Partial<DevSession>): Promise<void> {
  assertDevOnly();
  const current = (await readDevSession()) ?? { email: "" };
  const next = { ...current, ...patch };
  (await cookies()).set(COOKIE, Buffer.from(JSON.stringify(next)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearDevSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
