import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useDailyPrefs } from "@/lib/home/logs";
import { readGoalPrefs } from "@/lib/home/goals";
import { todayIso } from "@/lib/memory/clock";
import { buildContext } from "@/lib/memory/context";
import { useMemory } from "@/lib/memory/store";
import { loadMemberHealth } from "@/lib/profiles/health";

import type { ActivityId } from "./catalog";
import { bmiFrom, fitFor, matchSessions, varied, type Fit, type FitnessProfile, type Match } from "./match";
import { fitnessNetwork, type Place, type Session, type Studio } from "./provider";

/*
 * The hooks the fitness screens and the chat card share: who this person is
 * for matching purposes, and what is on near a place.
 */

/** The profile as matching reads it, from memory, the Today goal and height/weight. */
export function useFitnessFit(profileId: string | undefined): { fit: Fit; profile: FitnessProfile; loading: boolean } {
  const memory = useMemory(profileId);
  const prefs = useDailyPrefs(profileId);
  const health = useQuery({ queryKey: ["member-health", profileId], queryFn: () => loadMemberHealth(profileId as string), enabled: Boolean(profileId), staleTime: 5 * 60_000 });

  const profile = useMemo<FitnessProfile>(() => {
    const ctx = memory.data ? buildContext(memory.data, todayIso()) : null;
    const h = health.data;
    return {
      conditions: ctx?.subject.conditions ?? h?.conditions ?? [],
      goal: readGoalPrefs(prefs.data?.goal)?.key ?? null,
      ageYears: ctx?.clock.ageYears ?? null,
      pregnant: ctx?.clock.modifiers.includes("pregnant") ?? false,
      bmi: bmiFrom(h?.heightCm ? Number(h.heightCm) : null, h?.weightKg ? Number(h.weightKg) : null),
      sex: ctx?.subject.sex ?? null,
    };
  }, [memory.data, prefs.data, health.data]);

  const fit = useMemo(() => fitFor(profile), [profile]);
  return { fit, profile, loading: memory.isPending && Boolean(profileId) };
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Studios within 8 km of a place. */
export function useStudiosNear(place: Place | null) {
  return useQuery({
    queryKey: ["fitness-studios", place ? `${place.lat.toFixed(3)},${place.lng.toFixed(3)}` : null],
    queryFn: () => fitnessNetwork().studiosNear(place as Place),
    enabled: Boolean(place),
    staleTime: 10 * 60_000,
  });
}

/** One studio's classes on one day. */
export function useStudioSessions(studio: Studio | null | undefined, day: Date) {
  return useQuery({
    queryKey: ["fitness-sessions", studio?.id, dayKey(day)],
    queryFn: () => fitnessNetwork().sessions(studio as Studio, day),
    enabled: Boolean(studio),
    staleTime: 60_000,
  });
}

/** The best classes for this person across nearby studios, today and tomorrow. */
export function useMatches(args: { fit: Fit; place: Place | null; studios: readonly Studio[] | undefined; activity?: ActivityId | null; limit?: number }) {
  const { fit, place, studios, activity, limit = 12 } = args;
  const q = useQuery({
    queryKey: ["fitness-near-sessions", place ? `${place.lat.toFixed(3)},${place.lng.toFixed(3)}` : null, dayKey(new Date())],
    queryFn: async () => {
      const net = fitnessNetwork();
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 86_400_000);
      const out: { session: Session; studio: Studio }[] = [];
      for (const s of studios ?? []) {
        const [a, b] = await Promise.all([net.sessions(s, today), net.sessions(s, tomorrow)]);
        for (const session of [...a, ...b]) out.push({ session, studio: s });
      }
      return out;
    },
    enabled: Boolean(place && studios?.length),
    staleTime: 60_000,
  });
  const matches = useMemo<Match[]>(
    () => (place && q.data ? varied(matchSessions({ fit, place, items: q.data, activity }), limit, activity ? limit : 2) : []),
    [fit, place, q.data, activity, limit],
  );
  return { matches, loading: q.isPending && Boolean(place && studios?.length) };
}

/** One studio by id: from the network's cache, else by looking near the last place again. */
export function useStudio(id: string | undefined, place: Place | null) {
  return useQuery({
    queryKey: ["fitness-studio", id, place ? `${place.lat.toFixed(3)},${place.lng.toFixed(3)}` : null],
    queryFn: async () => {
      const net = fitnessNetwork();
      const known = await net.studio(id as string);
      if (known || !place) return known;
      return (await net.studiosNear(place)).find((s) => s.id === id) ?? null;
    },
    enabled: Boolean(id),
    staleTime: 10 * 60_000,
  });
}
