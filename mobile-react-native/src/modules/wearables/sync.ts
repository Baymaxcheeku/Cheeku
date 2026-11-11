import type { QueryClient } from "@tanstack/react-query";

import { dailyLogsKey } from "@/lib/home/logs";
import { supabase } from "@/lib/supabase/client";

import { KEEP_DAYS, MIN_SYNC_GAP_MS, SYNC_DAYS } from "./config";
import { addDays, dayKey, lastDays } from "./days";
import { isBlank, mergeDays } from "./merge";
import { sourceInfo } from "./registry";
import { accountId, demoOnly, loadState, saveState, type WearableState } from "./store";
import type { DaySummary } from "./types";

/*
 * A sync: read the last fortnight from every connected source, merge it into
 * one row per day, keep it on the phone, and (for real data only) save the
 * daily summaries to the database and hand today's steps to the plan.
 *
 * WHAT LEAVES THE PHONE: one small row per day. No minute-by-minute samples,
 * no heart rate trace, no route, no location. See migration 0044.
 *
 * Sample data never leaves the phone and never touches the plan.
 */

export type SyncResult = { ok: boolean; days: number; skipped?: "no_sources" | "too_soon" | "signed_out" };

let running: Promise<SyncResult> | null = null;

export function syncWearables(qc: QueryClient | null, opts: { force?: boolean } = {}): Promise<SyncResult> {
  // One at a time: a tap on Refresh while the foreground sync is still reading waits for it.
  running ??= run(qc, opts).finally(() => {
    running = null;
  });
  return running;
}

async function run(qc: QueryClient | null, opts: { force?: boolean }): Promise<SyncResult> {
  const state = await loadState();
  if (!state.connections.length) return { ok: true, days: 0, skipped: "no_sources" };
  if (!opts.force && state.lastSyncAt && Date.now() - Date.parse(state.lastSyncAt) < MIN_SYNC_GAP_MS) return { ok: true, days: state.days.length, skipped: "too_soon" };

  const today = dayKey(new Date());
  const window = lastDays(SYNC_DAYS, today);
  const lists = await Promise.all(
    state.connections.map(async (c) => {
      try {
        return (await sourceInfo(c.source)?.adapter.read(window)) ?? [];
      } catch {
        return [] as DaySummary[];
      }
    }),
  );
  const fresh = mergeDays(lists).filter((d) => !isBlank(d));

  // Days in the window are replaced by what was just read; older days are kept as they were.
  const freshDays = new Set(fresh.map((d) => d.day));
  const oldest = addDays(today, -(KEEP_DAYS - 1));
  const kept = state.days.filter((d) => d.day >= oldest && !freshDays.has(d.day) && !(demoOnly(state) === false && d.sources.includes("demo")));
  const days = [...kept, ...fresh].sort((a, b) => (a.day < b.day ? -1 : 1));

  const now = new Date().toISOString();
  let next: WearableState = { ...state, days, lastSyncAt: now, connections: state.connections.map((c) => ({ ...c, lastSyncAt: now })) };

  if (!demoOnly(state) && state.profileId) {
    await saveToServer(state.profileId, fresh.filter((d) => !d.sources.includes("demo")));
    next = await handStepsToPlan(qc, next, today);
  }
  await saveState(next);
  return { ok: true, days: days.length };
}

/** The daily summaries table. Missing table or no network: the phone's copy still works. */
async function saveToServer(profileId: string, days: readonly DaySummary[]): Promise<void> {
  const userId = await accountId();
  if (!userId || !days.length) return;
  const rows = days.map((d) => ({
    user_id: userId,
    profile_id: profileId,
    day: d.day,
    steps: d.steps,
    distance_km: d.distanceKm,
    active_kcal: d.activeKcal,
    sleep_minutes: d.sleepMinutes,
    resting_hr: d.restingHr,
    hrv_ms: d.hrvMs,
    spo2: d.spo2,
    weight_kg: d.weightKg,
    systolic: d.systolic,
    diastolic: d.diastolic,
    glucose_mg_dl: d.glucoseMgDl,
    workouts: d.workouts.slice(0, 12),
    sources: d.sources,
  }));
  try {
    await supabase.from("wearable_days").upsert(rows, { onConflict: "profile_id,day" });
  } catch {
    // Kept on the phone; the next sync sends it again.
  }
}

/** Least change in steps worth writing, and least time between writes. The plan's log has a daily cap. */
const STEP_GAP = 500;
const WRITE_GAP_MS = 30 * 60 * 1000;

/**
 * Today's plan already reads step counts from `daily_logs` (the row a person
 * types). Writing the watch's count there is the whole integration: the steps
 * task fills, and completes at its target, with no change to the plan.
 */
async function handStepsToPlan(qc: QueryClient | null, state: WearableState, today: string): Promise<WearableState> {
  const steps = state.days.find((d) => d.day === today)?.steps ?? null;
  const userId = await accountId();
  if (steps === null || steps < 100 || !userId || !state.profileId) return state;

  const last = state.stepsLogged?.day === today ? state.stepsLogged : null;
  if (last && (steps - last.value < STEP_GAP || Date.now() - Date.parse(last.at) < WRITE_GAP_MS)) return state;

  try {
    const { error } = await supabase.from("daily_logs").insert({
      user_id: userId,
      profile_id: state.profileId,
      day: today,
      task_key: "steps",
      pillar: "move",
      kind: "steps",
      value: steps,
      unit: "steps",
      value_text: "From your watch or phone",
      tags: ["wearable"],
    });
    if (error) return state;
  } catch {
    return state;
  }
  if (qc) void qc.invalidateQueries({ queryKey: dailyLogsKey(state.profileId) });
  return { ...state, stepsLogged: { day: today, value: steps, at: new Date().toISOString() } };
}
