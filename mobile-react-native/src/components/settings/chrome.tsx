import { useRouter } from "expo-router";
import { ChevronLeft, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { brand, ink, shadow, surface } from "@/theme/tokens";

/**
 * The shared frame for every settings sub-screen. Web `settings-header`.
 *
 * One header for all seven, so the back button never moves between screens —
 * a control that shifts by four pixels per route is a control people stop
 * trusting to be where they left it.
 */
export function SettingsScreen({
  title,
  eyebrow,
  icon: Icon,
  children,
  footer,
  bare = false,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  children: React.ReactNode;
  /** Pinned below the scroll area, for save buttons that must stay reachable. */
  footer?: React.ReactNode;
  /**
   * Suppress the icon-and-title block when the screen opens with its own hero.
   *
   * About was rendering two headers in a row — "About Cheeku / Your AI health
   * companion" in this chrome, then a card immediately below saying the same
   * thing in bigger type. `title` and `eyebrow` are still required because
   * they are the screen's identity for accessibility and for anything that
   * later needs to label it; this only stops them being drawn twice.
   */
  bare?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <View className="h-11 flex-row items-center px-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-pill"
        >
          <ChevronLeft size={20} color={ink[700]} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: footer ? 16 : insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          accessibilityRole="header"
          accessibilityLabel={`${title}. ${eyebrow}`}
          className="flex-row items-start gap-3 px-5"
          style={bare ? { height: 0, opacity: 0, overflow: "hidden" } : undefined}
        >
          <View className="h-11 w-11 items-center justify-center rounded-tile bg-brand-50">
            <Icon size={20} color={brand[600]} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[24px] font-bold leading-[28px] tracking-tight text-ink-900">
              {title}
            </Text>
            <Text className="mt-1 text-[12.5px] leading-[18px] text-ink-500">{eyebrow}</Text>
          </View>
        </View>

        {children}
      </ScrollView>

      {footer ? (
        <View
          className="px-5 pt-3"
          style={{
            paddingBottom: insets.bottom + 8,
            borderTopWidth: 1,
            borderTopColor: surface.line,
            backgroundColor: surface.base,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

/** A titled block. Matches the grouping on the settings hub. */
export function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      {label ? (
        <Text className="px-5 text-[12px] font-bold uppercase tracking-wide text-ink-300">
          {label}
        </Text>
      ) : null}
      <View className={label ? "mt-2" : undefined}>{children}</View>
    </View>
  );
}

/** A card with the standard margin and elevation. */
export function Panel({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <View
      className={`mx-5 overflow-hidden rounded-card bg-surface ${padded ? "p-4" : ""}`}
      style={shadow.e1}
    >
      {children}
    </View>
  );
}

/**
 * The save button.
 *
 * Confirms in place rather than adding a "Saved." line beside it: two
 * confirmations of one save is one too many, and the second one is always the
 * one that gets missed.
 */
export function SaveButton({
  onPress,
  pending,
  saved,
  label = "Save changes",
}: {
  onPress: () => void;
  pending: boolean;
  saved: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={pending}
      onPress={onPress}
      className="h-13 items-center justify-center rounded-pill"
      style={{
        height: 52,
        backgroundColor: saved ? "#23af5f" : brand[600],
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text accessibilityRole="alert" className="text-[16px] font-bold text-white">
          {saved ? "Saved" : label}
        </Text>
      )}
    </Pressable>
  );
}
