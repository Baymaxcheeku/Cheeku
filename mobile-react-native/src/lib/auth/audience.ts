import { kv } from "@/lib/storage";

/*
 * Which audience the reader picked on A4 ("just me" or "my family").
 *
 * The web build kept this in a short-lived httpOnly cookie. There is no cookie
 * jar here, and the reason it was short-lived matters more than the mechanism:
 * it is a ROUTING HINT for the rest of onboarding, not a fact about the
 * account. What the account can actually do is decided by the subscription
 * tier — someone who picks "family" and then skips the plan step is a free
 * single-profile user like any other, and nothing may later read this and
 * believe otherwise.
 *
 * So it is stored with its own timestamp and read back as null once a day has
 * passed, reproducing the cookie's `maxAge`. A stale value here is worse than
 * no value: it would offer family access to someone who long since decided
 * against it.
 *
 * Storage mechanics, including why web is different, live in lib/storage.ts.
 */

const KEY = "baymax_audience";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type Audience = "me" | "family";

type Stored = { audience: Audience; at: number };

export async function setAudience(audience: Audience): Promise<void> {
  const value: Stored = { audience, at: Date.now() };
  await kv.set(KEY, JSON.stringify(value));
}

export async function readAudience(): Promise<Audience | null> {
  const raw = await kv.get(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Stored>;
    const fresh = typeof parsed.at === "number" && Date.now() - parsed.at < MAX_AGE_MS;
    if (!fresh) return null;
    return parsed.audience === "me" || parsed.audience === "family" ? parsed.audience : null;
  } catch {
    // Unparseable means written by an older build or corrupted. Either way it
    // describes nothing, so it is treated as absent rather than guessed at.
    return null;
  }
}

/** Called once the plan step has been answered, either way. */
export async function clearAudience(): Promise<void> {
  await kv.remove(KEY);
}
