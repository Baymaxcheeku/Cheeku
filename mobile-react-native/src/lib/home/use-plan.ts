import { useEffect, useMemo, useState } from "react";

import { todayIso } from "@/lib/memory/clock";
import { buildContext, type MemoryContext } from "@/lib/memory/context";
import type { LoopView } from "@/lib/memory/loops";
import { useMemory } from "@/lib/memory/store";

import { useDailyLogs, useDailyPrefs } from "./logs";
import { buildPlan, type Plan } from "./plan";
import type { DueItem } from "./rules";
import { useTodayLog } from "./stage";

/** The hour, refreshed every ten minutes, so the plan reorders as the day goes on. */
function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 10 * 60_000);
    return () => clearInterval(id);
  }, []);
  return hour;
}

/**
 * Today's action plan for one member, from everything the app already holds
 * for them. Home and the plan screen both read it, so the two always agree.
 *
 * `serverDue` is the family's dated items from home_state; this member's
 * ones join the loops from memory, so a stored test can be Today's step.
 */
export function usePlan(profileId: string | undefined, serverDue: readonly DueItem[] = []): { plan: Plan | null; ctx: MemoryContext | null; loading: boolean } {
  const memory = useMemory(profileId);
  const actions = useTodayLog(Boolean(profileId));
  const logs = useDailyLogs(profileId);
  const prefs = useDailyPrefs(profileId);
  const hour = useHour();
  const today = todayIso();

  const ctx = useMemo(() => (memory.data ? buildContext(memory.data, today) : null), [memory.data, today]);

  const plan = useMemo(() => {
    if (!profileId) return null;
    const own = ctx?.loops ?? [];
    const known = new Set(own.map((l) => l.title.trim().toLowerCase()));
    const extra: LoopView[] = serverDue
      .filter((d) => d.profileId === profileId && d.source === "loop" && !known.has(d.title.trim().toLowerCase()))
      .map((d) => {
        const daysToDue = Math.round((Date.parse(`${d.dueBy}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
        return { key: d.id, type: d.type as LoopView["type"], title: d.title, detail: d.detail, openedOn: today, dueBy: d.dueBy, status: "open", closedBy: null, sourceDocumentId: null, relatesTo: [], daysOpen: 0, daysToDue, overdue: daysToDue < 0 };
      });
    return buildPlan({
      profileId,
      today,
      hour,
      loops: [...extra, ...own].sort((a, b) => (a.daysToDue ?? 999) - (b.daysToDue ?? 999)),
      series: ctx?.series ?? new Map(),
      ledger: ctx?.ledger ?? [],
      conditions: ctx?.subject.conditions ?? [],
      lifeStage: ctx?.clock.stage ?? "adult",
      ageYears: ctx?.clock.ageYears ?? null,
      pregnant: ctx?.clock.modifiers.includes("pregnant") ?? false,
      actions: actions.data ?? [],
      logs: logs.data ?? [],
      prefs: prefs.data ?? {},
    });
  }, [profileId, ctx, serverDue, today, hour, actions.data, logs.data, prefs.data]);

  return { plan, ctx, loading: memory.isPending || logs.isPending };
}
