import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { create } from "zustand";

/*
 * INSTANT SAVES, WITH A WAY BACK.
 *
 * Quick actions (a switch, a tick, a type change, a form's Save) change the
 * screen first and save in the background. If the save does not land, the
 * screen goes back to exactly how it was and the save bar at the bottom says
 * so, with a Retry that runs the same change again.
 *
 * The rollback is the point, not a nicety: without it people see data that
 * was never saved, which in a health app is a promise broken quietly.
 *
 * NEVER USED FOR money, deletes, partner bookings, uploads or anything that
 * creates a profile. Those keep a normal spinner, because the screen would
 * say "done" before the server agrees, and there is nothing to roll back to.
 */

/**
 * What a write resolved to. A throw, `false` or `{ ok: false }` all mean it
 * failed; anything else (nothing, `true`, `{ ok: true }`) means it saved.
 */
function failed(r: unknown): string | null {
  if (r === false) return "";
  if (r && typeof r === "object" && "ok" in r && !(r as { ok: unknown }).ok) {
    const message = (r as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return null;
}

const DEFAULT_MESSAGE = "Couldn't save that. Check your connection and try again.";

type SaveError = {
  message: string | null;
  retry: (() => void) | null;
  /** Bumps on every new error so the bar re-announces a repeat failure. */
  seq: number;
  show: (message: string, retry: () => void) => void;
  clear: () => void;
};

export const useSaveError = create<SaveError>((set) => ({
  message: null,
  retry: null,
  seq: 0,
  show: (message, retry) => set((s) => ({ message, retry, seq: s.seq + 1 })),
  clear: () => set({ message: null, retry: null }),
}));

export type Optimistic = {
  /** Change the screen now. */
  apply: () => void;
  /** Put the screen back exactly as it was. */
  revert: () => void;
  /** The real save. */
  write: () => Promise<unknown>;
  /** Shown in the save bar if it fails. Defaults to a plain connection line. */
  message?: string;
  /** After a successful save, e.g. a refetch to pick up server-side changes. */
  onSaved?: () => void;
};

/**
 * Applies a change, saves it in the background, and rolls back with a Retry
 * if the save fails. Resolves to whether it saved, for callers that care;
 * most should not wait on it.
 */
export async function runOptimistic(op: Optimistic): Promise<boolean> {
  useSaveError.getState().clear();
  op.apply();
  let reason: string | null;
  try {
    reason = failed(await op.write());
  } catch {
    reason = "";
  }
  if (reason === null) {
    op.onSaved?.();
    return true;
  }
  op.revert();
  useSaveError.getState().show(reason || op.message || DEFAULT_MESSAGE, () => void runOptimistic(op));
  return false;
}

/**
 * The TanStack Query flavour: patches cached queries, snapshotting each one
 * first so the rollback restores exactly what was there. In-flight fetches of
 * those keys are cancelled so a stale response cannot overwrite the change.
 */
export function optimisticQueries(
  qc: QueryClient,
  patches: { key: QueryKey; update: (old: unknown) => unknown }[],
  rest: Omit<Optimistic, "apply" | "revert">,
): Promise<boolean> {
  let snapshots: { key: QueryKey; data: unknown }[] = [];
  return runOptimistic({
    ...rest,
    apply: () => {
      snapshots = patches.map((p) => ({ key: p.key, data: qc.getQueryData(p.key) }));
      for (const p of patches) {
        void qc.cancelQueries({ queryKey: p.key, exact: true });
        qc.setQueryData(p.key, (old: unknown) => (old === undefined ? old : p.update(old)));
      }
    },
    revert: () => {
      for (const s of snapshots) qc.setQueryData(s.key, s.data);
    },
  });
}
