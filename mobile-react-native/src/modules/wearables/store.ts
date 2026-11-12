import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/lib/supabase/client";

import type { Connection, DaySummary, SourceId } from "./types";

/*
 * What the layer remembers on the phone: which sources are connected, and the
 * last few weeks of daily summaries so the charts draw without a network.
 *
 * Keyed by the signed-in account, and wiped on sign-out (register.ts), so the
 * next person to hold the phone never sees someone else's nights.
 *
 * AsyncStorage, not SecureStore: SecureStore caps a value at about 2 KB and a
 * month of summaries is larger. The offline records cache makes the same
 * choice for the same reason.
 */

export type WearableState = {
  /** The profile these numbers belong to: the account holder's own. */
  profileId: string | null;
  connections: Connection[];
  days: DaySummary[];
  lastSyncAt: string | null;
  /** The last step count written into today's plan, so it is not written twice. */
  stepsLogged: { day: string; value: number; at: string } | null;
  /** The "connect your watch" card on Home was dismissed. */
  promptDismissed: boolean;
};

const EMPTY: WearableState = { profileId: null, connections: [], days: [], lastSyncAt: null, stepsLogged: null, promptDismissed: false };
const PREFIX = "cheeku.wearables.v1:";

export async function accountId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function loadState(): Promise<WearableState> {
  const id = await accountId();
  if (!id) return EMPTY;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + id);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<WearableState>;
    return { ...EMPTY, ...parsed, connections: parsed.connections ?? [], days: parsed.days ?? [] };
  } catch {
    return EMPTY;
  }
}

export async function saveState(next: WearableState): Promise<void> {
  const id = await accountId();
  if (!id) return;
  try {
    await AsyncStorage.setItem(PREFIX + id, JSON.stringify(next));
  } catch {
    // A full disk loses the cache, not the feature: the next sync rebuilds it.
  }
}

export async function updateState(change: (s: WearableState) => WearableState): Promise<WearableState> {
  const next = change(await loadState());
  await saveState(next);
  return next;
}

/** Everything this layer wrote to the phone, for every account. Called on sign-out. */
export async function wipeState(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {
    // Nothing to remove.
  }
}

export function isConnected(s: WearableState, source: SourceId): boolean {
  return s.connections.some((c) => c.source === source);
}

/** True when the only thing connected is sample data. */
export function demoOnly(s: WearableState): boolean {
  return s.connections.length > 0 && s.connections.every((c) => c.source === "demo");
}
