import { useQuery, type QueryClient } from "@tanstack/react-query";

import { todayIso } from "@/lib/memory/clock";
import { kv } from "@/lib/storage";
import { supabase } from "@/lib/supabase/client";
import { sessionUser } from "@/lib/supabase/session";

import { decideStage, forward, readHomeState, type HomeStage, type HomeState } from "./rules";
import type { TodayAction } from "./today";

/*
 * HOME'S STAGE, ON THE PHONE.
 *
 * One call, `home_state()` (migration 0033), says which Home to draw and
 * carries everything Today needs that is family-wide. The answer is also kept
 * on the phone (CACHE_KEY) so the next launch draws the right Home at once,
 * instead of flashing the starter screen at someone who unlocked Today weeks
 * ago and then swapping it out.
 *
 * BEFORE 0033 IS APPLIED the call does not exist. The app then works the
 * stage out itself from a few row-level-secured reads, with the same rule
 * (rules.ts mirrors the SQL), and still never moves a family backwards. The
 * daily log falls back to memory for the session, so Done still works, it is
 * just not kept.
 */

export const homeStateKey = ["home-state"] as const;
export const todayLogKey = ["today-log"] as const;
const cacheKey = ["home-cache"] as const;

const CACHE_KEY = "cheeku.home";

type Cache = { uid: string; stage: HomeStage; seen: boolean };

const missing = (message: string | undefined) => Boolean(message && /could not find the function|function .* does not exist|relation .* does not exist|could not find the table/i.test(message));

async function readCache(): Promise<Cache | null> {
  const raw = await kv.get(CACHE_KEY).catch(() => null);
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Cache;
    const me = await sessionUser();
    // Another account's stage is never used, even for a frame.
    return me && c.uid === me.id ? c : null;
  } catch {
    return null;
  }
}

async function writeCache(next: Omit<Cache, "uid">): Promise<void> {
  const me = await sessionUser();
  if (!me) return;
  await kv.set(CACHE_KEY, JSON.stringify({ uid: me.id, ...next })).catch(() => undefined);
}

/** Works the stage out on the phone, for a database without 0033. */
async function localState(cached: HomeStage | null): Promise<HomeState> {
  const [docs, profiles, asked] = await Promise.all([
    supabase.from("documents").select("doc_type").limit(200),
    supabase.from("profiles").select("id, medications"),
    supabase.from("messages").select("id").eq("role", "user").limit(1),
  ]);
  const types = new Set((docs.data ?? []).map((d) => String(d.doc_type)));
  const people = profiles.data ?? [];
  const signals = {
    report: types.has("lab_report") || types.has("discharge"),
    prescription: types.has("prescription") || types.has("medication"),
    medicines: people.some((p) => Array.isArray(p.medications) && p.medications.length > 0),
    due: false,
    lab: false,
    family: people.length > 1,
    asked: (asked.data ?? []).length > 0,
  };
  const decided = decideStage(signals);
  const stage = forward(cached, decided.stage);
  return { stage, stageAt: null, via: decided.via, signals: stage === "today" ? {} : signals, unlockItems: 1, today: todayIso(), due: [], doneDays: [], fromServer: false };
}

export async function fetchHomeState(): Promise<HomeState> {
  const cached = await readCache();
  const { data, error } = await supabase.rpc("home_state");
  const state = error ? (missing(error.message) ? await localState(cached?.stage ?? null) : null) : readHomeState(data);
  if (!state) throw new Error(`home: ${error?.message ?? "no answer"}`);
  // The phone's copy only moves forward too, so a slow or odd answer can't
  // take someone back to the starter screen.
  const stage = forward(cached?.stage ?? null, state.stage);
  await writeCache({ stage, seen: cached?.seen ?? false });
  return { ...state, stage };
}

/**
 * The stage to draw, and whether the unlock moment is owed.
 *
 * `stage` is the server's answer once it is in, the phone's remembered one
 * until then, and null only on the very first launch (draw a loader).
 */
export function useHomeStage() {
  const cache = useQuery({ queryKey: cacheKey, queryFn: readCache, staleTime: Infinity });
  const state = useQuery({ queryKey: homeStateKey, queryFn: fetchHomeState, staleTime: 60_000, retry: 1 });

  const remembered = cache.data?.stage ?? null;
  const stage: HomeStage | null = state.data?.stage ?? remembered ?? (state.isError ? "starter" : null);

  // Owed once: the first time this phone sees Today for this account.
  const unlockOwed = state.data?.stage === "today" && cache.isFetched && !(cache.data?.seen ?? false);

  return { state: state.data ?? null, stage, unlockOwed, isError: state.isError, refetch: state.refetch };
}

export async function markUnlockSeen(qc: QueryClient): Promise<void> {
  await writeCache({ stage: "today", seen: true });
  qc.setQueryData(cacheKey, (c: Cache | null | undefined) => (c ? { ...c, stage: "today", seen: true } : c));
  await qc.invalidateQueries({ queryKey: cacheKey });
}

/** After a record, a medicine or a family member is saved: is Today unlocked now? */
export function recheckHomeStage(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: homeStateKey });
}

// --------------------------------------------------------- the daily log --

let memoryLog: TodayAction[] = [];

/** The last five weeks of steps, every member. Small: a few rows a day at most. */
export async function fetchTodayLog(): Promise<TodayAction[]> {
  const since = new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase.from("today_actions").select("profile_id, day, step_key, status").gte("day", since).order("day", { ascending: false }).limit(500);
  if (error) {
    if (missing(error.message)) return memoryLog;
    throw new Error(`today: ${error.message}`);
  }
  return (data ?? []).map((r) => ({ profileId: String(r.profile_id), day: String(r.day).slice(0, 10), stepKey: String(r.step_key), status: r.status === "later" ? "later" : "done" }));
}

export function useTodayLog(enabled: boolean) {
  return useQuery({ queryKey: todayLogKey, queryFn: fetchTodayLog, enabled, staleTime: 30_000, placeholderData: (p) => p });
}

/**
 * Marks a step done or later for today. The screen moves first; the write
 * follows. A failed write puts the step back and says so through the
 * returned message.
 */
export async function logStep(qc: QueryClient, a: Omit<TodayAction, "day"> & { day?: string }): Promise<{ ok: true } | { ok: false; message: string }> {
  const row: TodayAction = { ...a, day: a.day ?? todayIso() };
  const before = qc.getQueryData<TodayAction[]>(todayLogKey) ?? [];
  const next = [row, ...before.filter((x) => !(x.profileId === row.profileId && x.day === row.day && x.stepKey === row.stepKey))];
  qc.setQueryData(todayLogKey, next);

  const me = await sessionUser();
  if (!me) {
    qc.setQueryData(todayLogKey, before);
    return { ok: false, message: "Your session expired. Please sign in again." };
  }
  const { error } = await supabase
    .from("today_actions")
    .upsert({ user_id: me.id, profile_id: row.profileId, day: row.day, step_key: row.stepKey, status: row.status }, { onConflict: "profile_id,day,step_key" });
  if (error) {
    if (missing(error.message)) {
      memoryLog = next;
      return { ok: true };
    }
    qc.setQueryData(todayLogKey, before);
    return { ok: false, message: "Couldn't save that. Check your connection and try again." };
  }
  return { ok: true };
}

/** Several steps done at once, in one write: "Take all" on a dose card. */
export async function logSteps(qc: QueryClient, profileId: string, stepKeys: readonly string[]): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!stepKeys.length) return { ok: true };
  const day = todayIso();
  const rows: TodayAction[] = stepKeys.map((stepKey) => ({ profileId, day, stepKey, status: "done" }));
  const before = qc.getQueryData<TodayAction[]>(todayLogKey) ?? [];
  const keys = new Set(stepKeys);
  const next = [...rows, ...before.filter((x) => !(x.profileId === profileId && x.day === day && keys.has(x.stepKey)))];
  qc.setQueryData(todayLogKey, next);

  const me = await sessionUser();
  if (!me) {
    qc.setQueryData(todayLogKey, before);
    return { ok: false, message: "Your session expired. Please sign in again." };
  }
  const { error } = await supabase
    .from("today_actions")
    .upsert(rows.map((r) => ({ user_id: me.id, profile_id: r.profileId, day: r.day, step_key: r.stepKey, status: r.status })), { onConflict: "profile_id,day,step_key" });
  if (error) {
    if (missing(error.message)) {
      memoryLog = next;
      return { ok: true };
    }
    qc.setQueryData(todayLogKey, before);
    return { ok: false, message: "Couldn't save that. Check your connection and try again." };
  }
  return { ok: true };
}

/** Takes a mark back ("Undo"). */
export async function unlogStep(qc: QueryClient, a: { profileId: string; stepKey: string; day?: string }): Promise<void> {
  const day = a.day ?? todayIso();
  const before = qc.getQueryData<TodayAction[]>(todayLogKey) ?? [];
  const next = before.filter((x) => !(x.profileId === a.profileId && x.day === day && x.stepKey === a.stepKey));
  qc.setQueryData(todayLogKey, next);
  memoryLog = memoryLog.filter((x) => !(x.profileId === a.profileId && x.day === day && x.stepKey === a.stepKey));
  const { error } = await supabase.from("today_actions").delete().eq("profile_id", a.profileId).eq("day", day).eq("step_key", a.stepKey);
  if (error && !missing(error.message)) qc.setQueryData(todayLogKey, before);
}
