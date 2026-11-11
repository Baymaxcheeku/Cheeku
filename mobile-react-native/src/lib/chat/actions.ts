import type { QueryClient } from "@tanstack/react-query";

import { goalByKey } from "@/lib/home/goals";
import { dailyLogsKey, fetchDailyPrefs, saveDailyPrefs } from "@/lib/home/logs";
import { supabase } from "@/lib/supabase/client";

/*
 * WHAT THE CHAT MAY DO, AND HOW.
 *
 * A model (the stand-in today, Archit's later) can only PROPOSE an action.
 * Each one is checked here before it is shown, and nothing runs until the
 * person taps it. The one thing done without a tap is logging steps or sleep
 * the person just told us, which is what they asked for by saying it.
 */

export { ROUTES, safeActions } from "./safe-actions";

/** Makes a goal the person's own, from today. The plan picks it up on its next read. */
export async function applyGoal(qc: QueryClient, profileId: string, goal: string, today: string): Promise<boolean> {
  if (!goalByKey(goal)) return false;
  const prefs = await fetchDailyPrefs(profileId);
  return saveDailyPrefs(qc, profileId, { ...prefs, goal: { key: goal, since: today, answers: {} } });
}

export { activityFromText, type Activity } from "./activity";
import type { Activity } from "./activity";

/** Writes what was said into the day's logs, so the plan and the longevity areas see it. Returns the words for the reply. */
export async function logActivity(qc: QueryClient | null, args: { userId: string; profileId: string; day: string; activity: Activity }): Promise<string[]> {
  const rows: Record<string, unknown>[] = [];
  const said: string[] = [];
  const { steps, sleepMinutes } = args.activity;
  if (steps !== null) {
    rows.push({ user_id: args.userId, profile_id: args.profileId, day: args.day, task_key: "steps", pillar: "move", kind: "steps", value: steps, value_text: "Told Cheeku in chat", unit: "steps", tags: ["chat"] });
    said.push(`${steps.toLocaleString("en-IN")} steps today`);
  }
  if (sleepMinutes !== null) {
    rows.push({ user_id: args.userId, profile_id: args.profileId, day: args.day, task_key: "sleep_hours", pillar: "sleep", kind: "timer", value: sleepMinutes, value_text: "Told Cheeku in chat", unit: "min", tags: ["chat"] });
    const h = Math.floor(sleepMinutes / 60);
    const m = sleepMinutes % 60;
    said.push(`${h}h${m ? ` ${m}m` : ""} of sleep last night`);
  }
  if (!rows.length) return [];
  const { error } = await supabase.from("daily_logs").insert(rows);
  if (error) return [];
  if (qc) void qc.invalidateQueries({ queryKey: dailyLogsKey(args.profileId) });
  return said;
}
