import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { optimisticQueries } from "@/lib/optimistic";

import { setWaitlisted } from "./queries";

export const WAITLIST_KEY = ["waitlist"] as const;

/**
 * "Tell me when it's open": on the list the moment it is tapped, off again
 * (with Retry in the save bar) if the write does not land.
 */
export function useJoinWaitlist() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) =>
      optimisticQueries(qc, [{ key: WAITLIST_KEY, update: (old) => [...((old as string[] | undefined) ?? []).filter((x) => x !== id), id] }], {
        write: () => setWaitlisted(id, true),
        message: "Couldn't add you to the list. Check your connection.",
      }),
    [qc],
  );
}
