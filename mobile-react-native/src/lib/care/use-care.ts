import { useEffect, useMemo } from "react";

import { useDailyPrefs } from "@/lib/home/logs";
import { medsToday, readMedPrefs, type MedsToday } from "@/lib/home/meds";
import { useTodayLog } from "@/lib/home/stage";
import { todayIso } from "@/lib/memory/clock";
import { buildContext } from "@/lib/memory/context";
import { useMemory } from "@/lib/memory/store";

import { carePlan, careSummary, readCareAlerts, type CareSummary } from "./care";
import { writeCarePlan } from "./sync";

/**
 * One family member, the way Family care shows them: today's doses, the week,
 * their latest readings and what needs the caregiver. Reads the same memory
 * the member's own screens read, so the two can never disagree.
 *
 * Also keeps their plan on the server current (care_plan), which is what
 * lets the server tell you when their doses go unticked.
 */
export function useMemberCare(profileId: string): { summary: CareSummary | null; meds: MedsToday | null; alerts: boolean; loading: boolean } {
  const memory = useMemory(profileId);
  const log = useTodayLog(true);
  const prefs = useDailyPrefs(profileId);
  const today = todayIso();

  const ctx = useMemo(() => (memory.data ? buildContext(memory.data, today) : null), [memory.data, today]);
  const medPrefs = useMemo(() => readMedPrefs(prefs.data?.meds), [prefs.data]);
  const alerts = readCareAlerts((prefs.data as { care?: unknown } | undefined)?.care);

  const meds = useMemo(() => {
    if (!ctx) return null;
    const m = medsToday({ profileId, today, ledger: ctx.ledger, actions: log.data ?? [], prefs: medPrefs });
    return m.meds.length || m.unscheduled.length ? m : null;
  }, [ctx, profileId, today, log.data, medPrefs]);

  const summary = useMemo(() => {
    if (!ctx) return null;
    const now = new Date();
    return careSummary({ profileId, today, nowMin: now.getHours() * 60 + now.getMinutes(), meds, loops: ctx.loops, series: ctx.series, actions: log.data ?? [] });
  }, [ctx, profileId, today, meds, log.data]);

  const ready = Boolean(ctx) && prefs.isFetched;
  useCarePlanSync(profileId, ready ? meds : undefined, medPrefs, alerts);

  return { summary, meds, alerts, loading: memory.isPending || !prefs.isFetched };
}

/**
 * Writes the member's plan once what it is built from has loaded. `meds` is
 * undefined while loading (write nothing) and null when they take nothing on
 * a schedule (write an empty plan, so the server stops checking).
 */
export function useCarePlanSync(profileId: string | undefined, meds: MedsToday | null | undefined, medPrefs: ReturnType<typeof readMedPrefs>, alerts: boolean) {
  useEffect(() => {
    if (!profileId || meds === undefined) return;
    void writeCarePlan(profileId, carePlan(meds, medPrefs, alerts));
  }, [profileId, meds, medPrefs, alerts]);
}
