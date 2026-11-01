import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { MascotFigure } from "@/components/illustrations/sprout";
import { Settle } from "@/components/ui/motion";
import { brand } from "@/theme/tokens";
import { font, type } from "@/theme/type";
import { resolveLanding } from "@/lib/auth/landing";
import { startFresh } from "@/lib/nav/start-fresh";
import { FAMILY_KEY, loadFamily } from "@/lib/profiles/family";
import { Brand } from "@/components/ui/brand";

/*
 * Only the first visit holds. The root navigator's guards also send people
 * here after a sign-in, a sign-out or a confirmed email, and making them watch
 * the mascot again each time would be a pause for nothing.
 */
let coldStart = true;

/**
 * A1 — splash. Holds just long enough to be seen, then hands off.
 *
 * It used to hand off to /welcome unconditionally, so every launch by an
 * existing user began with the carousel that introduces the product to
 * strangers. Where it goes is now a question about session and profile —
 * see `resolveLanding`.
 *
 * The 1.4s hold and the routing run TOGETHER rather than in sequence: the
 * lookup is usually faster than the animation, and waiting for both in series
 * would add a network round trip to every cold start for no benefit.
 *
 * Home's family is loaded before Home is shown, so it opens complete instead
 * of on a loader (this used to happen in sign-in, which no longer navigates:
 * the guards bring a new session here).
 */
export default function Splash() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    const hold = coldStart ? 1400 : 0;
    coldStart = false;

    async function go() {
      const [landing] = await Promise.all([
        resolveLanding(),
        new Promise((resolve) => setTimeout(resolve, hold)),
      ]);
      if (landing === "/home") {
        await queryClient.prefetchQuery({ queryKey: FAMILY_KEY, queryFn: loadFamily }).catch(() => undefined);
      }
      if (!cancelled) startFresh(router, landing);
    }

    void go();
    return () => {
      cancelled = true;
    };
  }, [router, queryClient]);

  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <Settle delay={0}>
        <MascotFigure size={200} moment="hello" move="float" />
      </Settle>
      <Settle delay={0.25}>
        <Text style={[type.hero, { marginTop: 14, fontSize: 36, lineHeight: 40, textAlign: "center" }]}>
          <Brand /> <Text style={{ color: brand[600] }}>AI</Text>
        </Text>
        <Text style={[type.body, { marginTop: 4, textAlign: "center", fontFamily: font.medium }]}>
          Your family&apos;s health, remembered.
        </Text>
      </Settle>
    </View>
  );
}
