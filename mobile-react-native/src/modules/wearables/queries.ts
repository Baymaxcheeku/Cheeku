import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import { syncWearables } from "./sync";
import { sourceInfo } from "./registry";
import { loadState, updateState, type WearableState } from "./store";
import type { ConnectResult, SourceId } from "./types";

/** One key for the whole layer's on-phone state. Deliberately absent from the offline-cache allowlist. */
export const wearablesKey = ["wearables"] as const;

export function useWearables(enabled = true) {
  return useQuery({ queryKey: wearablesKey, queryFn: loadState, enabled, staleTime: 15_000 });
}

function refresh(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: wearablesKey });
}

/**
 * Keeps the numbers fresh while the app is open: once when the screen mounts
 * and again each time the app comes back to the foreground. Never in the
 * background, so there is nothing to explain in a permission prompt.
 */
export function useWearableSync(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const go = () => {
      void syncWearables(qc).then((r) => {
        if (alive && !r.skipped) void refresh(qc);
      });
    };
    go();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") go();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [enabled, qc]);
}

export async function connectSource(qc: QueryClient, source: SourceId, profileId: string): Promise<ConnectResult> {
  const info = sourceInfo(source);
  if (!info) return { ok: false, reason: "unavailable", message: "That source isn't available." };
  const result = await info.adapter.connect();
  if (!result.ok) return result;
  const now = new Date().toISOString();
  await updateState((s) => ({
    ...s,
    profileId,
    promptDismissed: true,
    // Real data replaces the sample: the two never mix on screen.
    connections: [...s.connections.filter((c) => c.source !== source && (source === "demo" || c.source !== "demo")), { source, connectedAt: now, lastSyncAt: null }],
    days: source === "demo" ? s.days : s.days.filter((d) => !d.sources.includes("demo")),
  }));
  await syncWearables(qc, { force: true });
  await refresh(qc);
  return result;
}

export async function disconnectSource(qc: QueryClient, source: SourceId): Promise<void> {
  await sourceInfo(source)?.adapter.disconnect().catch(() => {});
  await updateState((s) => {
    const connections = s.connections.filter((c) => c.source !== source);
    return {
      ...s,
      connections,
      // With nothing connected the phone keeps nothing; with something left, only that source's days go.
      days: connections.length ? s.days.map((d) => ({ ...d, sources: d.sources.filter((x) => x !== source) })).filter((d) => d.sources.length) : [],
      lastSyncAt: connections.length ? s.lastSyncAt : null,
    };
  });
  await refresh(qc);
}

export async function refreshNow(qc: QueryClient): Promise<void> {
  await syncWearables(qc, { force: true });
  await refresh(qc);
}

export async function dismissPrompt(qc: QueryClient): Promise<void> {
  await updateState((s) => ({ ...s, promptDismissed: true }));
  await refresh(qc);
}

export type { WearableState };
