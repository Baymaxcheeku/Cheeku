import { useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";

import { useFamily } from "@/lib/profiles/family";

import { pinPlace, saveMemberLocation, hydrateLocation, locateNow, acceptFix, readPermission, useLocationStore, useMemberLocations, MEMBER_LOCATIONS_KEY, type MemberLocation, type Source } from "./store";
import type { Place } from "./geo";

/*
 * LIVE, WHILE THE APP IS OPEN.
 *
 * Mounted once in the signed-in shell. When location is allowed and "Keep it
 * up to date" is on, it takes a fix on open and whenever the app comes back
 * to the front, and watches for moves of 200 m or more while it is in use.
 * Never in the background: that needs "Always" permission, drains a battery
 * and is more than booking a class or a clinic needs.
 *
 * It never prompts. The system dialog only ever follows a tap on our own
 * card (the primer on Home, or a screen's "Use my location").
 */
export function useLiveLocation() {
  const qc = useQueryClient();
  const family = useFamily();
  const primaryId = family.data?.access.all.find((m) => m.isPrimary)?.id ?? null;
  const live = useLocationStore((s) => s.live);
  const watch = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    void hydrateLocation().then(readPermission);
  }, []);

  useEffect(() => {
    if (!primaryId || !live) return;
    let stopped = false;

    async function start() {
      // The shell takes the fix; screens need not try their own.
      autoTried = true;
      const perm = await readPermission();
      if (perm !== "granted" || stopped) return;
      await locateNow({ prompt: false, primaryId, qc });
      if (stopped) return;
      try {
        watch.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 200, timeInterval: 60_000 },
          (pos) => void acceptFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null, primaryId, qc }),
        );
        if (stopped) watch.current.remove();
      } catch {
        // No watch on this device; the fix on each open still keeps it fresh.
      }
    }

    void start();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void locateNow({ prompt: false, primaryId, qc });
    });
    return () => {
      stopped = true;
      sub.remove();
      watch.current?.remove();
      watch.current = null;
    };
  }, [primaryId, live, qc]);
}

let autoTried = false;

/**
 * The place to look near for one member: their own saved place when it is
 * somewhere else (Papa in Lucknow), otherwise where this phone is.
 */
export function useNearbyPlace(profileId?: string | null) {
  const qc = useQueryClient();
  const family = useFamily();
  const rows = useMemberLocations();
  const fix = useLocationStore((s) => s.fix);
  const hydrated = useLocationStore((s) => s.hydrated);
  const locating = useLocationStore((s) => s.locating);
  const permission = useLocationStore((s) => s.permission);
  const error = useLocationStore((s) => s.error);

  const all = family.data?.access.all ?? [];
  const member = all.find((m) => m.id === (profileId ?? family.data?.profile?.id));
  const primaryId = all.find((m) => m.isPrimary)?.id ?? null;
  const theirs: MemberLocation | undefined = member && !member.isPrimary ? rows.data?.[member.id] : undefined;
  const mine = primaryId ? rows.data?.[primaryId] : undefined;

  const place: Place | null = useMemo(() => theirs ?? fix?.place ?? mine ?? null, [theirs, fix, mine]);
  const updatedAt: number | string | null = theirs ? theirs.capturedAt : fix ? fix.at : mine ? mine.capturedAt : null;
  const source: Source | "manual" | null = theirs ? theirs.source : fix ? fix.source : mine ? mine.source : null;

  const locate = useCallback(() => locateNow({ prompt: true, primaryId, qc, force: true }), [primaryId, qc]);

  useEffect(() => {
    void hydrateLocation();
  }, []);

  // Opened straight onto a screen with nothing known yet (a deep link, a
  // reload): take one fix if location is already allowed. Never prompts.
  useEffect(() => {
    if (!hydrated || fix || autoTried || !primaryId) return;
    autoTried = true;
    void readPermission().then((p) => (p === "granted" ? locateNow({ prompt: false, primaryId, qc }) : null));
  }, [hydrated, fix, primaryId, qc]);

  /** A searched or city place: for a family member it becomes theirs; for the phone's owner it pins for now. */
  const pick = useCallback(
    async (p: Place, how: Source = "search") => {
      if (member && !member.isPrimary) {
        await saveMemberLocation(member.id, p, how, null);
        await qc.invalidateQueries({ queryKey: MEMBER_LOCATIONS_KEY });
        return;
      }
      await pinPlace({ place: p, source: how, primaryId, qc });
    },
    [member, primaryId, qc],
  );

  return {
    place,
    updatedAt,
    source,
    forMember: member ?? null,
    isTheirs: Boolean(theirs),
    loaded: hydrated && !rows.isPending,
    locating,
    permission,
    error,
    locate,
    pick,
  };
}
