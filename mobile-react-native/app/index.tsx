import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { MascotFigure } from "@/components/illustrations/sprout";
import { Settle } from "@/components/ui/motion";

/** A1 — splash. Holds just long enough to be seen, then hands off. */
export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/welcome"), 1400);
    return () => clearTimeout(t);
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
