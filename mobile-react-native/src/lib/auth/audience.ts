import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

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
 * SecureStore rather than AsyncStorage for consistency with the session, not
 * because "me" or "family" is a secret. It is one small write on a screen that
 * is already waiting on a navigation.
 *
 * The web branch exists only so the app runs in Expo's web preview during
 * development: `expo-secure-store` ships an empty module for web, so every call
 * there is a no-op that would silently lose the answer. Same fallback, and same
 * reason, as the session storage in lib/supabase/client.ts.
 */

const store = {
  get: (key: string) =>
    Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === "web"
      ? AsyncStorage.setItem(key, value)
      : SecureStore.setItemAsync(key, value),
  remove: (key: string) =>
    Platform.OS === "web" ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

const KEY = "baymax_audience";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type Audience = "me" | "family";

type Stored = { audience: Audience; at: number };

export async function setAudience(audience: Audience): Promise<void> {
  const value: Stored = { audience, at: Date.now() };
  await store.set(KEY, JSON.stringify(value));
}

export async function readAudience(): Promise<Audience | null> {
  const raw = await store.get(KEY);
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
  await store.remove(KEY);
}
