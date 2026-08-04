import { Tabs } from "expo-router";

import { TabBar } from "@/components/app/tab-bar";

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
