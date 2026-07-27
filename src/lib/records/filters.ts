/*
 * Filter helpers shared by the server page and the client filter bar.
 *
 * This file has no "use client" and no server-only import on purpose. It first
 * lived inside filter-bar.tsx, which made it part of the client bundle, and the
 * server page importing it failed at runtime — a client module's exports are
 * references to code that runs in the browser, not functions the server can
 * call.
 */

/** Turns the `period` search param ("30", "90", "365") into an ISO date. */
export function sinceFromPeriod(period: string | null | undefined): string | undefined {
  if (!period) return undefined;
  const days = Number(period);
  if (!Number.isFinite(days) || days <= 0) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
