import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { goalByKey, readGoalPrefs, reminderHour } from "@/lib/home/goals";
import { useDailyPrefs } from "@/lib/home/logs";
import { readMedPrefs } from "@/lib/home/meds";
import { useHomeStage, useTodayLog } from "@/lib/home/stage";
import { streakOf } from "@/lib/home/today";
import { usePlan } from "@/lib/home/use-plan";
import { todayIso } from "@/lib/memory/clock";
import { useFamily } from "@/lib/profiles/family";
import { DEFAULT_PREFS, ownFamily } from "@/lib/settings/queries";

import { engagementPlan } from "./engage";
import { pushPermission, syncNudges } from "./push";

const native = Platform.OS === "ios" || Platform.OS === "android";

/**
 * Mounted once, in the signed-in shell, beside usePushSetup. Keeps the
 * active member's doses and nudges on this phone in step with their plan:
 * plans again whenever the plan, their medicine settings or a switch
 * changes, and each time the app comes back to the front (the clock moved).
 * Only writes when the plan actually differs, so a re-render costs nothing.
 */
export function useEngagement() {
  const family = useFamily();
  const profile = family.data?.profile ?? null;
  const home = useHomeStage();
  const { plan, loading } = usePlan(profile?.id, home.state?.due ?? []);
  const prefs = useDailyPrefs(profile?.id);
  const log = useTodayLog(Boolean(profile));
  const own = useQuery({ queryKey: ["own-family"], queryFn: ownFamily });
  const switches = own.data?.prefs ?? DEFAULT_PREFS;
  // Granted later (an explainer, a switch): the same plan has to be written again.
  const permission = useQuery({ queryKey: ["push-permission"], queryFn: pushPermission });

  // The app coming back to the front is a new "now".
  const [wake, setWake] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        setWake((n) => n + 1);
        void permission.refetch();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nudges = useMemo(() => {
    if (!native || !profile || !plan || loading || !prefs.isFetched) return null;
    const today = todayIso();
    const goalPrefs = readGoalPrefs(prefs.data?.goal);
    const goal = goalPrefs ? goalByKey(goalPrefs.key) : null;
    const doneDays = new Set([...(home.state?.doneDays ?? []), ...(log.data ?? []).filter((a) => a.status === "done" && a.profileId === profile.id).map((a) => a.day)]);
    const lunch = plan.tasks.find((t) => t.key === "meal:lunch");
    const steps = plan.tasks.find((t) => t.kind === "steps");
    return engagementPlan({
      now: new Date(),
      profileId: profile.id,
      // engage.ts keeps the first name only.
      name: profile.isPrimary ? null : profile.name,
      primary: profile.isPrimary,
      switches: { dailyNudges: switches.dailyNudges, medicineReminders: switches.medicineReminders },
      todayUnlocked: home.stage === "today",
      meds: plan.meds
        ? {
            remind: readMedPrefs(prefs.data?.meds).remind,
            slots: plan.meds.slots.map((s) => ({ slot: s.slot, time: s.time, count: s.doses.length, taken: s.done })),
            low: plan.meds.low.map((m) => m.stock?.daysLeft ?? 0),
          }
        : null,
      plan: {
        openToday: plan.tasks.filter((t) => t.status === "open").length,
        doneToday: plan.done,
        lunchLogged: lunch ? lunch.status === "done" : true,
        stepsOpen: steps ? steps.status !== "done" : false,
        dueSoon: plan.tasks.filter((t) => t.due && t.status !== "done").length,
      },
      goal: goal && goalPrefs && plan.goal ? { hour: reminderHour(goal, goalPrefs.answers), remind: Boolean(goalPrefs.remind), doneToday: plan.goal.doneToday > 0 } : null,
      streak: streakOf(doneDays, today).count,
    });
    // `wake` is not read; it is here so a return to the app plans again from the new time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, plan, loading, prefs.isFetched, prefs.data, home.state, home.stage, log.data, switches.dailyNudges, switches.medicineReminders, wake]);

  const last = useRef(new Map<string, string>());
  useEffect(() => {
    if (!nudges || !profile) return;
    const sig = `${permission.data ?? "?"}#${nudges.map((n) => `${n.id}@${n.at.getTime()}`).join("|")}`;
    if (last.current.get(profile.id) === sig) return;
    last.current.set(profile.id, sig);
    void syncNudges(profile.id, nudges);
  }, [nudges, profile, permission.data]);
}
