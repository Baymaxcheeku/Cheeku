/*
 * How long the app may be away before the lock asks again.
 *
 * Pure, so it can be tested without a phone. The gate measures the time away
 * itself; this only decides what that time means.
 */

export type LockDelay = 0 | 60 | 300;

export const LOCK_DELAYS: readonly { seconds: LockDelay; label: string }[] = [
  { seconds: 0, label: "Immediately" },
  { seconds: 60, label: "1 minute" },
  { seconds: 300, label: "5 minutes" },
];

export const DEFAULT_LOCK_DELAY: LockDelay = 0;

export function parseLockDelay(raw: string | null | undefined): LockDelay {
  const n = Number(raw);
  return n === 60 || n === 300 ? n : DEFAULT_LOCK_DELAY;
}

/**
 * Whether coming back after `awayMs` should show the lock.
 *
 * FAILS CLOSED on anything odd. A negative or non-finite gap means the clock
 * moved while the app was away (someone set the phone's time back), and the
 * safe reading of "we cannot tell how long it was" is "long enough".
 */
export function shouldLock(awayMs: number, delay: LockDelay): boolean {
  if (delay === 0) return true;
  if (!Number.isFinite(awayMs) || awayMs < 0) return true;
  return awayMs >= delay * 1000;
}
