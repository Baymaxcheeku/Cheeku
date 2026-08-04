import { useRouter } from "expo-router";
import { ChevronLeft, Lock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { brand, ink } from "@/theme/tokens";

/*
 * The pieces every onboarding screen shares, ported from the web build's
 * `components/onboarding/chrome.tsx`.
 *
 * The web layout applied the top inset once, in the route group's layout, so no
 * screen could forget it. expo-router has no equivalent shared frame here
 * without adding a nested layout for four screens, so the header owns the inset
 * instead — it is the topmost element on all four, and keeping it in one
 * component is the same "cannot be forgotten by the next screen" property.
 */

export function OnboardingHeader({
  back,
  action,
}: {
  /** Where the chevron goes when there is nothing to pop. Omit for no chevron. */
  back?: string;
  action?: { label: string; href: string };
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /*
   * `back()` throws GO_BACK when this screen is the first history entry, which
   * it is on a cold launch or a deep link. Falling back to the route the flow
   * came from keeps the control honest instead of surfacing an error.
   */
  function goBack() {
    if (router.canGoBack()) router.back();
    else if (back) router.replace(back as never);
  }

  return (
    <View className="h-11 flex-row items-center px-5" style={{ marginTop: insets.top }}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={10}
          className="h-8 w-8 items-center justify-center rounded-pill"
        >
          <ChevronLeft size={20} color={ink[700]} />
        </Pressable>
      ) : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          className="ml-auto"
          hitSlop={10}
          onPress={() => router.push(action.href as never)}
        >
          <Text className="text-[15px] font-medium text-brand-500">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The lock line that appears on nearly every onboarding frame. Trust is a
 * recurring visual element in this design, not a one-off.
 */
export function ReassuranceStrip({ children }: { children?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-center gap-2 rounded-tile bg-brand-50 px-4 py-3">
      <Lock size={13} color={brand[400]} />
      <Text className="flex-1 text-center text-[12px] leading-[17px] text-ink-500">
        {children ?? "Bank-level encryption. Only you and your family can access."}
      </Text>
    </View>
  );
}

export function Dots({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            height: 6,
            width: i === current ? 20 : 6,
            borderRadius: 999,
            backgroundColor: i === current ? brand[600] : brand[200],
          }}
        />
      ))}
    </View>
  );
}

/**
 * Onboarding headline: bold sans with the emphasis line in violet. The written
 * spec asked for a serif moment here; the frames contain no serif anywhere, and
 * the frames win.
 */
export function Headline({ lead, accent }: { lead: string; accent: string }) {
  return (
    <Text className="text-[27px] font-bold leading-[32px] tracking-tight text-ink-900">
      {lead}
      {"\n"}
      <Text className="text-brand-600">{accent}</Text>
    </Text>
  );
}
