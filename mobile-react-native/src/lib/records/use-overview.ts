import { useQuery } from "@tanstack/react-query";

import { activeProfile } from "@/lib/profiles/context";
import { healthOverview, type HealthOverview } from "./overview";

/*
 * ONE HOOK, so the key and the shape cannot drift apart.
 *
 * Home and the health file screen both read this. They previously each wrote
 * their own `useQuery` against the key "health-overview" and returned DIFFERENT
 * shapes — Home a bare HealthOverview, the screen a `{ overview, name }`
 * wrapper. React Query caches by key, not by call site, so whichever mounted
 * second was handed the other's object. Home then read `.flagged[0]` off
 * something with no `flagged`, and the app white-screened on the way back from
 * the dashboard.
 *
 * A shared key is only shared if the shape is shared too. That is what this
 * file exists to guarantee: there is one place to change, and no way for a
 * second caller to invent a different payload under the same name.
 */

export const HEALTH_OVERVIEW_KEY = ["health-overview"] as const;

export const EMPTY_OVERVIEW: HealthOverview = {
  byType: [],
  totalDocuments: 0,
  needsReview: 0,
  dataPoints: 0,
  flagged: [],
  medications: [],
  vaccinations: 0,
  facilities: [],
  doctors: [],
  lastEvent: null,
};

export function useHealthOverview() {
  return useQuery({
    queryKey: HEALTH_OVERVIEW_KEY,
    queryFn: async (): Promise<HealthOverview> => {
      const profile = await activeProfile();
      return healthOverview(profile?.id ?? null);
    },
  });
}

/**
 * The active profile's display name, on its own key.
 *
 * Kept separate rather than bundled into the overview: the name is wanted by
 * one screen for one heading, and widening the overview payload to carry it is
 * how the two shapes diverged in the first place.
 */
export function useActiveProfileName() {
  return useQuery({
    queryKey: ["active-profile-name"],
    queryFn: async () => (await activeProfile())?.name ?? null,
  });
}
