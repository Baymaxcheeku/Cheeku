import { kv } from "@/lib/storage";

/*
 * The person's say over the offline copy.
 *
 * Offline reading is a real benefit (records in a waiting room with no
 * signal) and a real cost (a copy of medical history on the phone). Some
 * people will want the first, some will not want the second, so it is a
 * setting rather than a decision made for them.
 *
 * Held in memory as well as storage: the persister asks on every write and
 * restore, and a keychain read on each of those would be slow and async in a
 * place that has to answer synchronously.
 */

const KEY = "cheeku.offline.prefs";

export const OFFLINE_WINDOWS = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days" },
] as const;

export type OfflinePrefs = { enabled: boolean; days: 1 | 3 | 7 };

export const DEFAULT_OFFLINE: OfflinePrefs = { enabled: true, days: 7 };

let current: OfflinePrefs = DEFAULT_OFFLINE;
let loaded = false;

export function parseOfflinePrefs(raw: string | null): OfflinePrefs {
  if (!raw) return DEFAULT_OFFLINE;
  try {
    const v = JSON.parse(raw) as Partial<OfflinePrefs>;
    const days = v.days === 1 || v.days === 3 || v.days === 7 ? v.days : DEFAULT_OFFLINE.days;
    return { enabled: v.enabled !== false, days };
  } catch {
    return DEFAULT_OFFLINE;
  }
}

export async function loadOfflinePrefs(): Promise<OfflinePrefs> {
  if (loaded) return current;
  try {
    current = parseOfflinePrefs(await kv.get(KEY));
  } catch {
    current = DEFAULT_OFFLINE;
  }
  loaded = true;
  return current;
}

export function offlinePrefs(): OfflinePrefs {
  return current;
}

export async function saveOfflinePrefs(next: OfflinePrefs): Promise<void> {
  current = next;
  loaded = true;
  await kv.set(KEY, JSON.stringify(next));
}

/**
 * True when a snapshot written at `writtenAt` is still within the window.
 *
 * A snapshot from the future means the phone's clock was moved back, and its
 * age cannot be known. It is dropped: the cost is one refetch, where keeping
 * it would keep it indefinitely.
 */
export function withinWindow(writtenAt: number, prefs: OfflinePrefs, now = Date.now()): boolean {
  const age = now - writtenAt;
  return prefs.enabled && Number.isFinite(age) && age >= 0 && age <= prefs.days * 24 * 60 * 60 * 1000;
}
