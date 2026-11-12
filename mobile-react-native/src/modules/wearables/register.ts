import { Watch } from "lucide-react-native";

import { registerExtension } from "@/lib/extensions";

import { WEARABLES_ENABLED } from "./config";
import { dayKey } from "./days";
import { chatNotes, deviceSignals } from "./insights";
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
 *             (sample data too, labelled as such in every line)
 *   Longevity movement, sleep and heart signals from this week's averages
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
      // A watch speaks for one person only.
      if (!state.connections.length || state.profileId !== profileId) return [];
      if (demoOnly(state)) {
        // Sample data stays labelled in every line, so Cheeku says so when it uses it.
        return chatNotes(state.days, dayKey(new Date())).map((n) => `Sample data, not a real reading. ${n}`);
      }
      return chatNotes(state.days.filter((d) => !d.sources.includes("demo")), dayKey(new Date()));
    },
    longevitySignals: async (profileId) => {
      const state = await loadState();
      if (!state.connections.length || state.profileId !== profileId) return [];
      const sample = demoOnly(state);
      return deviceSignals(sample ? state.days : state.days.filter((d) => !d.sources.includes("demo")), dayKey(new Date()), sample);
    },
    onSignOut: wipeState,
  });
}
