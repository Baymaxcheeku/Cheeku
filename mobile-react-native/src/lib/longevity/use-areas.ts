import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { extensionSignals } from "@/lib/extensions";
import { todayIso } from "@/lib/memory/clock";
import { buildContext } from "@/lib/memory/context";
import { useMemory } from "@/lib/memory/store";

import { areasView, type AreasView } from "@/lib/chat/daily";

import { longevityAreas, recordSignals } from "./areas";

/*
 * THE SIX AREAS, FOR ONE PERSON, ON ANY SCREEN.
 *
 * The same areas the chat talks about (lib/chat/world.ts), from the same
 * records, readings, follow-ups and watch signals, so Home, Today's plan
 * and the chat never disagree. No score: each area is on track, worth
 * watching, needs a step, or not enough to go on.
 */

export type { AreasView } from "@/lib/chat/daily";

export function useAreas(profileId: string | undefined): { data: AreasView | null; isLoading: boolean } {
  const memory = useMemory(profileId);
  const watch = useQuery({
    queryKey: ["longevity-signals", profileId],
    queryFn: () => extensionSignals(profileId!),
    enabled: Boolean(profileId),
    staleTime: 60_000,
  });
  const data = useMemo(() => {
    if (!memory.data) return null;
    const day = todayIso();
    const ctx = buildContext(memory.data, day);
    const base = recordSignals({ series: ctx.series, loops: ctx.loops, today: day, ageYears: ctx.clock.ageYears ?? null, pregnant: ctx.clock.relative?.kind === "gestational" });
    return areasView(longevityAreas([...base, ...(watch.data ?? [])]));
  }, [memory.data, watch.data]);
  return { data, isLoading: memory.isLoading };
}

export { areaQuestion } from "./areas";
