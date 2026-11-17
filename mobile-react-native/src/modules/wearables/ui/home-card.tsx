import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight, Watch } from "lucide-react-native";
import { Text, View } from "react-native";

import { Tap } from "@/components/ui/tap";
import type { HomeCardProps } from "@/lib/extensions";
import { useDailyPrefs } from "@/lib/home/logs";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { DEFAULT_STEPS_GOAL, WEARABLES_ENABLED } from "../config";
import { dayKey } from "../days";
import { lensTiles, snapshot } from "../insights";
import { dismissPrompt, useWearables, useWearableSync } from "../queries";
import { demoOnly } from "../store";
import { LensStrip } from "./lens-strip";
import { ago, SampleTag } from "./parts";

/*
 * Home's snapshot of the body: three numbers, a week of bars under each, and
 * at most one sentence. Tapping anywhere opens the full page.
 *
 * Shown only on the account holder's own profile: a watch belongs to one
 * person, and a child's or parent's Home must not show someone else's steps.
 * Before anything is connected it is a single quiet invitation that can be
 * dismissed for good.
 */

export function WearablesHomeCard({ profileId, isPrimary }: HomeCardProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const on = WEARABLES_ENABLED && isPrimary;
  const state = useWearables(on);
  const prefs = useDailyPrefs(on ? profileId : undefined);
  const connected = Boolean(state.data?.connections.length);
  useWearableSync(on && connected);

  if (!on || !state.data) return null;

  if (!connected) {
    if (state.data.promptDismissed) return null;
    return (
      <View className="mt-4 px-5">
        <View style={{ borderRadius: 24, backgroundColor: "#fff", padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
              <Watch size={21} color={ink[900]} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Connect your watch or phone</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>Steps, sleep and heart rate fill in on their own.</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
            <Tap accessibilityRole="button" onPress={() => router.push("/wearables/connect" as never)} style={{ height: 40, paddingHorizontal: 18, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }} scale={0.98}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>Connect</Text>
            </Tap>
            <Tap accessibilityRole="button" onPress={() => void dismissPrompt(qc)} hitSlop={8} style={{ height: 40, paddingHorizontal: 12, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>Not now</Text>
            </Tap>
          </View>
        </View>
      </View>
    );
  }

  const goal = prefs.data?.steps_goal && prefs.data.steps_goal >= 1000 ? prefs.data.steps_goal : DEFAULT_STEPS_GOAL;
  const today = dayKey(new Date());
  const snap = snapshot(state.data.days, today, goal);
  const tiles = lensTiles(state.data.days, today, goal);
  const sample = demoOnly(state.data);

  return (
    <View className="mt-4 px-5">
      <View style={{ borderRadius: 24, backgroundColor: "#fff", padding: 16, overflow: "hidden" }}>
        <Tap accessibilityRole="button" accessibilityLabel="Your body today. Open all your numbers." onPress={() => router.push("/wearables" as never)} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 8 }} scale={0.99}>
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.2, color: ink[900] }}>Your body today</Text>
          {sample ? <SampleTag /> : <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300] }}>Updated {ago(state.data.lastSyncAt)}</Text>}
          <ChevronRight size={18} color={ink[300]} />
        </Tap>

        {tiles.length ? (
          <View style={{ marginTop: 12 }}>
            <LensStrip tiles={tiles} onOpen={(key) => router.push(`/wearables/${key}` as never)} />
          </View>
        ) : null}

        {snap.headline ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 10 }}>{snap.headline}</Text>
        ) : !snap.hasData ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 12 }}>Nothing has come through yet. Open your health app once, then pull to refresh.</Text>
        ) : null}
      </View>
    </View>
  );
}
