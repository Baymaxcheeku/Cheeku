import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueryClient } from "@tanstack/react-query";
import { Directory, File, Paths } from "expo-file-system";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { useAppointments } from "@/lib/booking/appointments";
import { clearOfflineCache, offlineCacheBytes } from "@/lib/offline/cache";
import { clearActiveProfile } from "@/lib/profiles/context";
import { forgetThisDevice } from "@/lib/notifications/push";
import { useServiceRequests } from "@/lib/services/requests";
import { kv } from "@/lib/storage";
import { supabase } from "@/lib/supabase/client";

import { logActivity } from "./activity";
import { keysFor, temporaryPrefixes } from "./storage-registry";

/*
 * What the app leaves on the phone, and how it goes.
 *
 * ┌─ THE BUG THIS EXISTS TO KILL ────────────────────────────────────────────┐
 * │ Sign-out cleared the offline records and the active profile, and        │
 * │ nothing else. The home address saved for lab visits, the list of        │
 * │ appointments with the concern typed into each, scheduled reminders that │
 * │ name a doctor, and photos of prescriptions waiting in the image          │
 * │ picker's cache all survived it. The next person to sign in on the same  │
 * │ phone would have been offered the last person's address.                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Sign-out now goes through ONE function, driven by the storage registry, so
 * a key added later is wiped as soon as it is registered, and the registry
 * test makes sure it is.
 */

/**
 * Files the app put in the cache directory: picked photos, cleaned copies,
 * exports. Only the app's own prefixes, never the whole directory, because the
 * platform keeps things there too (fonts copied from the bundle, for one).
 */
function ownedCacheEntries(): (File | Directory)[] {
  if (Platform.OS === "web") return [];
  try {
    const prefixes = temporaryPrefixes();
    return new Directory(Paths.cache).list().filter((entry) => {
      const name = entry.uri.replace(/\/$/, "").split("/").pop() ?? "";
      return prefixes.some((p) => (p.endsWith("/") ? name === p.slice(0, -1) : name.startsWith(p)));
    });
  } catch {
    return [];
  }
}

function sizeOf(entry: File | Directory): number {
  try {
    if (entry instanceof File) return entry.size ?? 0;
    return entry.list().reduce((sum, e) => sum + sizeOf(e), 0);
  } catch {
    return 0;
  }
}

export type StorageUsage = { offline: number; temporary: number };

export async function storageUsage(): Promise<StorageUsage> {
  const offline = await offlineCacheBytes();
  const temporary = ownedCacheEntries().reduce((sum, e) => sum + sizeOf(e), 0);
  return { offline, temporary };
}

/** Deletes the app's temporary files. Never throws: a file in use is skipped. */
export function clearTemporaryFiles(): number {
  let removed = 0;
  for (const entry of ownedCacheEntries()) {
    try {
      entry.delete();
      removed += 1;
    } catch {
      // In use or already gone. The OS evicts this directory anyway.
    }
  }
  return removed;
}

/**
 * "Clear cache". Removes the offline copy and the temporary files, keeps you
 * signed in and keeps your settings. Records come back from the server on the
 * next screen that needs them.
 */
export async function clearCaches(queryClient: QueryClient): Promise<void> {
  await clearOfflineCache();
  clearTemporaryFiles();
  // In-memory copies too, or the next write would put them straight back.
  queryClient.removeQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && ["records", "records-list", "records-context", "record", "home-context"].includes(q.queryKey[0] as string) });
  void logActivity("cache_cleared");
}

/**
 * Everything sign-out has to do, in the order it has to happen.
 *
 * 1. Things that need the session: the activity row, and removing this
 *    phone's push token from the account.
 * 2. The session itself.
 * 3. Everything on the phone that is about this person.
 *
 * Each step is best effort and the next runs regardless. Leaving someone
 * signed in because a cache would not clear is the worse failure.
 */
export async function signOutAndWipe(queryClient: QueryClient): Promise<void> {
  await logActivity("sign_out").catch(() => undefined);
  await forgetThisDevice().catch(() => undefined);
  await supabase.auth.signOut().catch(() => undefined);
  await wipeAccountData(queryClient);
}

/** The on-device half of sign-out and account deletion. */
export async function wipeAccountData(queryClient: QueryClient): Promise<void> {
  queryClient.clear();
  await clearActiveProfile().catch(() => undefined);
  await clearOfflineCache();
  for (const key of keysFor("account")) {
    await kv.remove(key).catch(() => undefined);
  }
  // The offline cache lives in AsyncStorage on device too; belt and braces.
  await AsyncStorage.removeItem("baymax.offline.v1").catch(() => undefined);
  clearTemporaryFiles();
  // Reminders already scheduled name a doctor and a time; they must not fire
  // for the next account on this phone.
  if (Platform.OS !== "web") await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
  // The in-memory stores were loaded from the keys just removed.
  useAppointments.setState({ items: [], loaded: false });
  useServiceRequests.setState({ items: [], loaded: false });
}

/** Human-readable bytes for the storage screen. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
