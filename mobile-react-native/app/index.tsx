import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { MascotFigure } from "@/components/illustrations/sprout";
import { Settle } from "@/components/ui/motion";
import { resolveLanding } from "@/lib/auth/landing";

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
 */
export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function go() {
      const [landing] = await Promise.all([
        resolveLanding(),
        new Promise((resolve) => setTimeout(resolve, 1400)),
      ]);
      if (!cancelled) router.replace(landing);
    }

    void go();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <Settle delay={0}>
        <MascotFigure size={200} wave />
      </Settle>
      <Text className="mt-4 text-[28px] font-bold tracking-tight text-ink-900">Baymax</Text>
      <Text className="mt-1 text-[14px] text-ink-500">Your family&apos;s health companion</Text>
    </View>
  );
}
