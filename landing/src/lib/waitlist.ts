/*
 * Early access signups.
 *
 * With NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set, a
 * signup is one insert into the `waitlist` table (SQL in landing/README.md;
 * insert-only for the public key, nobody can read the list from a browser).
 *
 * Without them the form still completes so the page can be reviewed, and it
 * says "preview" on the confirmation: nothing is saved anywhere.
 */

export type Audience = "family" | "business" | "investor";

export type SignupResult = { ok: true; saved: boolean } | { ok: false; message: string };

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const signupsLive = Boolean(URL && KEY);

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export async function joinWaitlist(email: string, audience: Audience, source: string): Promise<SignupResult> {
  const clean = email.trim().toLowerCase();
  if (!validEmail(clean)) return { ok: false, message: "That email doesn't look right. Check it and try again." };
  if (!URL || !KEY) {
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, saved: false };
  }
  try {
    const res = await fetch(`${URL}/rest/v1/waitlist`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ email: clean, audience, source }),
    });
    // 409: already on the list. That is a success as far as the person cares.
    if (res.ok || res.status === 409) return { ok: true, saved: true };
    return { ok: false, message: "Couldn't add you just now. Please try again in a minute." };
  } catch {
    return { ok: false, message: "You seem to be offline. Check your connection and try again." };
  }
}
