import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { AskToBook, CompactTile, Grid2, ServiceTile } from "@/components/services/parts";
import { useReducedMotion } from "@/components/ui/motion";
import { setWaitlisted } from "@/lib/notifications/queries";
import { onShelf, routeFor, SERVICES } from "@/lib/services/catalog";
import { kv } from "@/lib/storage";
import { brand, hue, ink } from "@/theme/tokens";
import { font } from "@/theme/type";
import { LocationChip } from "@/components/location/location-chip";
import { Tap } from "@/components/ui/tap";

/*
 * BOOK SERVICES, on Home.
 *
 * REBUILT 2026-10-04. The marketplace runs on a partner network reached over
 * one API (diagnostics, consultations, pharmacy, and specialised care), so it
 * is open from day one instead of a list of "soon" cards. Layout, top down:
 *
 *   prompt    a dark card: book anything by telling Cheeku in a sentence
 *   core      Doctors, Lab tests, Medicines, Fitness (fourth; it took health
 *             insurance's place on 2026-10-25, insurance comes later),
 *             as big two-up tiles
 *   more      mental health, dental, eye care, physio, home care, ambulance,
 *             insurance (soon): one swipeable row
 *
 * Doctors are one segment now: gynaecologists, dieticians, psychologists and
 * every other specialty sit inside it (/services/doctors), not as tiles.
 */

export function CareSection() {
  const router = useRouter();
  const still = useReducedMotion();
  const qc = useQueryClient();

  // One-time carry-over of "notify me" taps that were only saved on this phone.
  useEffect(() => {
    void kv.get(KEY).then(async (raw) => {
      if (!raw) return;
      try {
        const ids = JSON.parse(raw) as string[];
        await Promise.all(ids.map((id) => setWaitlisted(id, true)));
        await kv.remove(KEY);
        void qc.invalidateQueries({ queryKey: ["waitlist"] });
      } catch {
        // Try again next time; nothing is lost while the key is still there.
      }
    });
  }, [qc]);

  const core = onShelf("core");
  const more = SERVICES.filter((s) => s.shelf !== "core");
  const open = (route: string) => router.push(route as never);

  return (
    <View className="mt-8">
      <View className="flex-row items-end px-5">
        <View className="flex-1">
          <View className="flex-row items-center gap-2.5">
            <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>Book services</Text>
            {/*
             * Lime, not green. Green means "healthy" everywhere else in this app
             * (PLAN.md rule 3); this citrus lime only says "open now".
             */}
            <View className="flex-row items-center gap-1.5 rounded-pill px-2.5 py-1" style={{ backgroundColor: LIVE.bg }}>
              <LiveDot />
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: LIVE.fg }}>Open now</Text>
            </View>
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 3 }}>Doctors, tests, medicines and care at home</Text>
          <View style={{ marginTop: 8 }}>
            <LocationChip />
          </View>
        </View>
        <Tap accessibilityRole="button" onPress={() => open("/services")} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingBottom: 2 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>See all</Text>
          <ChevronRight size={15} color={brand[600]} />
        </Tap>
      </View>

      <View className="mt-4 px-5" style={{ gap: 12 }}>
        <AskToBook onPress={() => open("/ask")} />
        {/* One entrance for the grid: wrapping each tile would let Yoga collapse its height. */}
        <Animated.View entering={still ? undefined : FadeInDown.duration(320)}>
          <Grid2>
            {core.map((s) => (
              <ServiceTile key={s.id} service={s} onPress={() => open(routeFor(s))} />
            ))}
          </Grid2>
        </Animated.View>
      </View>

      <Text style={{ paddingHorizontal: 20, marginTop: 20, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>More care</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 10 }}>
        {more.map((s) => (
          <CompactTile key={s.id} service={s} onPress={() => open(routeFor(s))} />
        ))}
      </ScrollView>
    </View>
  );
}

const KEY = "cheeku.notify";

/** The "open now" accent: citrus lime on deep olive. See the note on the pill. */
export const LIVE = { bg: hue.lime.bg, fg: hue.lime.fg, dot: "#5f7a00" } as const;

function LiveDot() {
  const still = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    // Two pulses to catch the eye, then a steady dot.
    o.value = withRepeat(withSequence(withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 700 })), 2);
  }, [still, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: LIVE.dot }, style]} />;
}
