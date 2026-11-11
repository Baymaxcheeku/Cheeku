import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";

import { loadOfflinePrefs, offlinePrefs, withinWindow } from "./prefs";

/*
 * Offline reads. Phase 5 item 4.
 *
 * ┌─ WHAT IS BEING WRITTEN TO DISK, AND WHY THAT IS A DECISION ──────────────┐
 * │                                                                          │
 * │ This caches health data on the device: record titles, lab values,        │
 * │ facilities, dates. Until now nothing of the sort was stored locally —    │
 * │ every screen fetched, and an app opened on the underground was blank.    │
 * │ For a medical record that is not merely annoying, it is the failure      │
 * │ case that matters: people look these up in waiting rooms, in taxis, at   │
 * │ reception desks with no signal.                                          │
 * │                                                                          │
 * │ WHAT PROTECTS IT. The app's own container, which on iOS is encrypted     │
 * │ under the device passcode and unreadable until first unlock after boot,  │
 * │ and on Android sits behind full-disk encryption and app sandboxing. Not  │
 * │ nothing, and the same protection the OS gives Health and Notes.          │
 * │                                                                          │
 * │ WHAT DOES NOT PROTECT IT. The biometric app lock. That guards the        │
 * │ RUNNING APP, not the filesystem — anyone with root, a jailbreak, or an   │
 * │ unlocked device and a backup extractor reads this regardless. Saying     │
 * │ otherwise anywhere in the UI would be a lie.                             │
 * │                                                                          │
 * │ SO: it is purged on sign-out and on account deletion, both of which are  │
 * │ moments a device may change hands. See `clearOfflineCache`.              │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

const CACHE_KEY = "baymax.offline.v1";

/** A week. Long enough for a holiday, short enough that a stale record expires. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const base = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_KEY,
  // Written at most every 2s rather than on every keystroke-driven refetch.
  throttleTime: 2000,
});

/*
 * The person's offline setting, applied at the persister.
 *
 * Switched off: nothing is written, and nothing is restored even if an old
 * snapshot survived. A shorter window: a snapshot older than it is ignored on
 * the next launch, whatever the 7-day `maxAge` below would allow. Checked on
 * every write and restore, so changing the setting takes effect at once
 * without restarting the app.
 */
export const persister: Persister = {
  persistClient: async (client) => {
    if (!offlinePrefs().enabled) return;
    await base.persistClient(client);
  },
  restoreClient: async () => {
    const prefs = await loadOfflinePrefs();
    if (!prefs.enabled) return undefined;
    const client = await base.restoreClient();
    if (client && !withinWindow(client.timestamp, prefs)) return undefined;
    return client;
  },
  removeClient: () => base.removeClient(),
};

/**
 * WHICH QUERIES ARE ALLOWED TO PERSIST.
 *
 * An allowlist, not a blocklist. A blocklist means every query added later is
 * cached to disk by default, and the day somebody adds one holding a chat
 * transcript nobody will notice.
 *
 * Records and their detail are here because they are what someone needs
 * without signal. Deliberately ABSENT:
 *
 *   `ask-context`   — the chat. A transcript is a conversation about symptoms,
 *                     which is more revealing than the records it cites, and
 *                     nobody needs to re-read one in a lift.
 *   `entitlement`   — the standalone billing query.
 *   `app-lock`      — a security setting read from SecureStore. Caching a
 *                     "locked: false" would be worth an attacker's time.
 *   `settings-*`    — forms. Editing against a stale copy overwrites whatever
 *                     was saved elsewhere in the meantime.
 *   `own-family`    — notification preferences, same reason as the forms.
 *   `notifications` — the inbox. Titles name reports and doctors, and the
 *                     bell refetches it in well under a second anyway.
 *
 * ONE HONEST QUALIFICATION on entitlement. Excluding the `entitlement` key does
 * NOT keep the tier off the disk: `home-context` fetches the access list, the
 * profile and the entitlement together, so a cached home carries the plan with
 * it. That is checked and accepted rather than overlooked. A stale tier cannot
 * grant anything, because all three entitlement gates are database triggers
 * (migrations 0011 and 0013) and every write is refused server-side regardless
 * of what the client believes. What it affects is the plan NAME on a screen
 * with no signal, and showing the last known plan there is better than showing
 * nothing. If home-context is ever split, do not "fix" this by adding
 * entitlement to the allowlist.
 */
const PERSISTED = new Set(["records", "records-list", "records-context", "record", "home-context"]);

export function shouldPersistQuery(query: Query): boolean {
  /*
   * Only a query that FINISHED, successfully. Passing our own filter replaces
   * the library's default, which is exactly this check, so without it a query
   * still in flight was written out with its promise attached. Signing out
   * rejects home-context mid-flight ("signed out"), and the persister then
   * logged "A query that was dehydrated as pending ended up rejecting" on the
   * phone (owner, 2026-11-11). A pending or failed read is not worth keeping
   * anyway: there is nothing in it to show offline.
   */
  if (query.state?.status !== "success") return false;
  const root = query.queryKey[0];
  return typeof root === "string" && PERSISTED.has(root);
}

export const persistOptions = {
  persister,
  maxAge: MAX_AGE_MS,
  /*
   * Bumping this string throws away every cached entry on the next launch.
   * Change it whenever a record's shape changes, or an old cache will be
   * rendered by new code that expects fields it does not have.
   */
  // v2 (2026-10-06): drops caches that saved a signed-out "no profile" as the
  // family, which made sign-in flash "Set up a profile first".
  buster: "v2",
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
} as const;

/**
 * Erases the cache.
 *
 * Called on sign-out and on account deletion. Both are moments when the next
 * person to hold the phone may not be the person whose records these are, and
 * a cache that outlives the session is a copy of someone's medical history
 * sitting on a device they have logged out of.
 */
/** Bytes the offline copy takes, for the Storage and cache screen. */
export async function offlineCacheBytes(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    // UTF-16 in memory, but stored as UTF-8: the string length is a fair floor.
    return raw ? raw.length : 0;
  } catch {
    return 0;
  }
}

export async function clearOfflineCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Best effort. A failure here must not block the sign-out itself: leaving
    // someone signed in because a cache would not clear is the worse outcome.
  }
}
