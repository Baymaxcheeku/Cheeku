import { useRouter } from "expo-router";
import { ChevronLeft, Hammer } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { brand, ink } from "@/theme/tokens";

/**
 * A screen that exists so navigation is whole, and says so.
 *
 * Home links to five routes that land in later phases. Leaving them missing
 * throws a router error on a tab press, and stubbing them with something that
 * LOOKS like the real screen is worse — an empty records list is
 * indistinguishable from an account with no records, which is a lie about
 * someone's data rather than a gap in the build.
 *
 * So these name the phase and get out of the way. Every one is replaced by the
 * real screen, not extended.
 */
export function ComingLater({
  title,
  phase,
  detail,
  back = false,
}: {
  title: string;
  phase: string;
  detail: string;
  /** Pushed routes (scan, record detail) need a way out; tabs do not. */
  back?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      {back ? (
        <View className="h-11 flex-row items-center px-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
            hitSlop={10}
            className="h-9 w-9 items-center justify-center rounded-pill"
          >
            <ChevronLeft size={20} color={ink[700]} />
          </Pressable>
        </View>
      ) : null}

      <View className="flex-1 items-center justify-center px-10">
        <View className="h-14 w-14 items-center justify-center rounded-pill bg-brand-50">
          <Hammer size={24} color={brand[600]} />
        </View>
        <Text className="mt-4 text-[20px] font-bold text-ink-900">{title}</Text>
        <Text className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-brand-600">
          {phase}
        </Text>
        <Text className="mt-2 text-center text-[13px] leading-[19px] text-ink-500">{detail}</Text>
      </View>
    </View>
  );
}
