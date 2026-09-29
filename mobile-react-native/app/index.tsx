import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { MascotFigure } from "@/components/illustrations/sprout";
import { Bob } from "@/components/onboarding/motion";
import { Settle } from "@/components/ui/motion";
import { brand } from "@/theme/tokens";
import { font, type } from "@/theme/type";
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
        <Bob>
          <MascotFigure size={200} wave />
        </Bob>
      </Settle>
      <Settle delay={0.25}>
        <Text style={[type.hero, { marginTop: 14, fontSize: 36, lineHeight: 40, textAlign: "center" }]}>
          Cheeku <Text style={{ color: brand[600] }}>AI</Text>
        </Text>
        <Text style={[type.body, { marginTop: 4, textAlign: "center", fontFamily: font.medium }]}>
          Your family&apos;s health, remembered.
        </Text>
      </Settle>
    </View>
  );
}
