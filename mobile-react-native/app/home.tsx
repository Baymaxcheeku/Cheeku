import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotFigure } from "@/components/illustrations/sprout";

/**
 * PLACEHOLDER. Home is Phase 2.
 *
 * It exists now only so onboarding has somewhere real to end: every route out
 * of A6 and A7 points here, and a flow whose last step throws a missing-route
 * error cannot be walked end to end or tested. It says what it is rather than
 * imitating the real screen, so nobody mistakes an empty shell for a
 * regression in the finished one.
 */
export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-canvas px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <MascotFigure size={160} />
      <Text className="mt-4 text-[20px] font-bold text-ink-900">You&apos;re all set</Text>
      <Text className="mt-2 text-center text-[13px] leading-[19px] text-ink-500">
        Onboarding is complete. Home, records and Ask Baymax arrive in the next build phase.
      </Text>
    </View>
  );
}
