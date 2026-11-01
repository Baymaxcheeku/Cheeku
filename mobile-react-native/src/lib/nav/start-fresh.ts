import type { Href, useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

/*
 * Go somewhere with nothing left behind it.
 *
 * Sign-in and the end of onboarding used `router.replace`, which only swaps
 * the CURRENT screen. Everything pushed before it stayed in the stack:
 * welcome, then who, profile, journey and first-upload for a new account.
 * On an iPhone (2026-11-01) a right swipe on Home walked back through all of
 * it to welcome, which looked exactly like being signed out (the session was
 * fine). Clearing the stack first means Home is the bottom of the stack and
 * there is nothing to swipe back to.
 */
export function startFresh(router: Router, href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
