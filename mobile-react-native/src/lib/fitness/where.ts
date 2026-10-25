import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

import { kv } from "@/lib/storage";

import type { Place } from "./provider";

/*
 * WHERE TO LOOK FOR STUDIOS.
 *
 * Location is asked for only on the fitness screen, only while it is in use,
 * and only after the person taps "Use my location" on our own explainer, so
 * the system prompt never arrives cold. The answer stays on the phone
 * (kv, rounded to about 100 m) and is never written to the database: a
 * booking keeps the studio's place, not the person's.
 *
 * Without permission, picking a city works just as well.
 */

export type Where = Place & { label: string; source: "gps" | "city" };

export const CITIES: readonly (Place & { label: string })[] = [
  { label: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { label: "Mumbai", lat: 19.076, lng: 72.8777 },
  { label: "Delhi", lat: 28.6139, lng: 77.209 },
  { label: "Gurugram", lat: 28.4595, lng: 77.0266 },
  { label: "Noida", lat: 28.5355, lng: 77.391 },
  { label: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { label: "Chennai", lat: 13.0827, lng: 80.2707 },
  { label: "Pune", lat: 18.5204, lng: 73.8567 },
  { label: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { label: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { label: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { label: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { label: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { label: "Kochi", lat: 9.9312, lng: 76.2673 },
  { label: "Indore", lat: 22.7196, lng: 75.8577 },
  { label: "Coimbatore", lat: 11.0168, lng: 76.9558 },
];

const KEY = "cheeku.fitness.where";
const round = (n: number) => Math.round(n * 1000) / 1000;

export function readWhere(raw: string | null): Where | null {
  if (!raw) return null;
  try {
    const w = JSON.parse(raw) as Where;
    return Number.isFinite(w.lat) && Number.isFinite(w.lng) && typeof w.label === "string" ? w : null;
  } catch {
    return null;
  }
}

export type LocateState = "idle" | "locating" | "denied" | "error";

export function useWhere() {
  const [where, setWhere] = useState<Where | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<LocateState>("idle");

  useEffect(() => {
    let live = true;
    void kv
      .get(KEY)
      .catch(() => null)
      .then((raw) => {
        if (!live) return;
        setWhere(readWhere(raw));
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const keep = useCallback((w: Where) => {
    setWhere(w);
    void kv.set(KEY, JSON.stringify(w)).catch(() => undefined);
  }, []);

  const locate = useCallback(async (): Promise<Where | null> => {
    setState("locating");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setState("denied");
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let label = "Near you";
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        label = geo?.district ?? geo?.subregion ?? geo?.city ?? label;
      } catch {
        // A label is a nicety; the coordinates are what matter.
      }
      const w: Where = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude), label, source: "gps" };
      keep(w);
      setState("idle");
      return w;
    } catch {
      setState("error");
      return null;
    }
  }, [keep]);

  const pickCity = useCallback((c: Place & { label: string }) => keep({ ...c, source: "city" }), [keep]);

  return { where, loaded, state, locate, pickCity };
}
