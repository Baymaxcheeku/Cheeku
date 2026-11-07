import type { Href, useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

/*
 * Back, or somewhere sensible when there is nothing behind this screen.
 *
 * A bare `router.back()` throws "The action 'GO_BACK' was not handled by any
 * navigator" when the screen is the first entry in its stack. That happens a
 * lot here: sign-in and onboarding clear the stack (startFresh), a reminder
 * or a link opens a screen cold, and a `replace` swaps out what was behind.
 * Seen on an iPhone, 2026-11-07. Every back control goes through this, and a
 * lint rule keeps it that way.
 *
 * A second tap while the screen is still sliding out is ignored. Expo Router
 * queues navigation, so `canGoBack()` still answers for the old stack until
 * the first back lands: without the hold, a quick double tap sent two
 * GO_BACKs and the second had nowhere to go (iPhone, 2026-11-07).
 */
const HOLD_MS = 600;
let lastBack = 0;

export function goBack(router: Router, fallback: Href, now: number = Date.now()) {
  if (now - lastBack < HOLD_MS) return;
  lastBack = now;
  // eslint-disable-next-line no-restricted-properties -- the one guarded call
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
