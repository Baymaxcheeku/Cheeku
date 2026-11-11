import { Watch } from "lucide-react-native";

import { registerExtension } from "@/lib/extensions";

import { WEARABLES_ENABLED } from "./config";
import { dayKey } from "./days";
import { chatNotes } from "./insights";
import { demoOnly, loadState, wipeState } from "./store";
import { WearablesHomeCard } from "./ui/home-card";

/*
 * The one place the wearables layer meets the app. Imported once, for its
 * side effect, from `app/_layout.tsx`.
 *
 * What it plugs in:
 *   Home      a snapshot card, on the account holder's own profile only
 *   Profile   a "Devices and wearables" row
 *   Chat      a few dated lines about the last week, for that same profile
 *   Sign-out  the copy on this phone is erased
 *
 * Today's plan needs no slot: a sync writes the day's step count into the
 * daily log the plan already reads (sync.ts).
 */

if (WEARABLES_ENABLED) {
  registerExtension({
    id: "wearables",
    homeCard: WearablesHomeCard,
    profileRow: { title: "Devices and wearables", body: "Steps, sleep and heart rate from your watch or phone", href: "/wearables", icon: Watch },
    chatNotes: async (profileId) => {
      const state = await loadState();
      // Sample data is for looking at, never for answering from; and a watch speaks for one person only.
      if (!state.connections.length || demoOnly(state) || state.profileId !== profileId) return [];
      return chatNotes(state.days.filter((d) => !d.sources.includes("demo")), dayKey(new Date()));
    },
    onSignOut: wipeState,
  });
}
