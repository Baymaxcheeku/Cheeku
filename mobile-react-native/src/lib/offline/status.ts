import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/*
 * Whether there is a usable connection, and when data last came back.
 *
 * React Query's default online detection is a browser `window.addEventListener`
 * that does nothing on a device, so without this the app believes it is online
 * in a tunnel, fires requests that hang, and shows spinners instead of the
 * records it already has.
 */

/**
 * Wired once, at startup.
 *
 * Returns nothing: `setEventListener` keeps the subscription for the life of
 * the manager, and there is exactly one manager for the life of the app. An
 * effect cleanup that tore this down would leave the app permanently believing
 * whatever it last thought about the network.
 */
export function startOnlineManager(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      /*
       * `isInternetReachable` is null while the first probe is in flight.
       * Treating null as offline would blank the app for a second on every
       * cold start, so unknown counts as connected and a real request is
       * allowed to be the thing that fails.
       */
      setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    }),
  );
}

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(() => onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(setOnline), []);
  return online;
}

/**
 * "last synced 09:14".
 *
 * Shown ONLY while offline. Online it is noise — the data is current, and a
 * timestamp on current data invites the reader to wonder what is wrong with
 * it. Offline it is the whole point: a medical record with no date on it is a
 * record you cannot safely act on, because you do not know what it predates.
 */
export function formatSyncedAt(at: number | undefined): string | null {
  if (!at) return null;

  const then = new Date(at);
  const now = new Date();
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();

  const time = then.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Last synced ${time}`;

  const date = then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `Last synced ${date}, ${time}`;
}
