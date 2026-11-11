import type { WorldDigest } from "@/lib/chat/world";

import { focusAreas, longevityAreas, type Signal } from "./areas";

/** The areas worth saying, worst first, with a sample flag. Pure. */
export function longevityDigest(signals: readonly Signal[]): WorldDigest["longevity"] {
  const areas = longevityAreas(signals).filter((a) => a.status !== "unknown");
  const ordered = [...focusAreas(areas), ...areas.filter((a) => a.status === "on_track")];
  return ordered.map((a) => ({ area: a.key, label: a.label, status: a.status, line: a.line, sample: a.signals.length > 0 && a.signals.every((s) => s.sample) }));
}
