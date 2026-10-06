import { supabase } from "./client";

/*
 * FEWER ROUND TRIPS, SAME ANSWERS.
 *
 * `supabase.auth.getUser()` asks the auth server who is signed in, every time.
 * On read paths that only need the user's id (to choose which rows to ask
 * for), the session already on the phone says the same thing with no network
 * call. It grants nothing: row level security checks the token on every query
 * regardless of what the app believes. Writes and launch-time checks keep
 * getUser where a revoked session must be caught.
 */
export async function sessionUser(): Promise<{ id: string; email: string | null } | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { id: session.user.id, email: session.user.email ?? null } : null;
}

/*
 * One request for identical concurrent asks. Home, the tab bar and a screen
 * often ask for the family and the plan in the same instant; they now share
 * the one request in flight. Nothing is kept once it settles, so this never
 * serves stale data: it only stops the same question being asked twice at
 * once. Keys carry the user id so two accounts can never share an answer.
 */
const inflight = new Map<string, Promise<unknown>>();

export function shared<T>(key: string, run: () => Promise<T>): Promise<T> {
  const hit = inflight.get(key);
  if (hit) return hit as Promise<T>;
  const p = run().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
