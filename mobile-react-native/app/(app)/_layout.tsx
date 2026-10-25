import { Tabs } from "expo-router";

import { TabBar } from "@/components/app/tab-bar";
import { useToast } from "@/components/notifications/toast";
import { useInboxLive } from "@/lib/notifications/use-inbox";
import { useEngagement } from "@/lib/notifications/use-engagement";
import { usePushSetup } from "@/lib/notifications/use-push";

/*
 * The signed-in shell. Everything past onboarding lives here and shares the tab
 * bar, so no screen has to remember to render it.
 *
 * The web build put this scroll on a column so a `sticky` bar had an ancestor
 * to stick to. Native tabs are outside the scroller by construction, so a long
 * records list scrolls under the bar without any of that. Each screen owns its
 * own top inset, because two of them draw a full-bleed header that must run
 * behind the status bar rather than start below it.
 */
export default function AppLayout() {
  /*
   * Notifications live here because this is the signed-in shell: it mounts
   * once after sign-in, stays mounted under every pushed screen, and unmounts
   * on sign-out, which is exactly the lifetime of a Realtime subscription and
   * of the push routing. New rows raise the in-app banner (drawn at the root
   * so it shows above pushed screens too).
   */
  const show = useToast((s) => s.show);
  useInboxLive(show);
  usePushSetup();
  // The active member's doses and the day's nudges, planned on this phone.
  useEngagement();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
      // The order here is the order in the bar, and the FAB is drawn between
      // the second and third, so this is load-bearing rather than cosmetic.
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="ask" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
