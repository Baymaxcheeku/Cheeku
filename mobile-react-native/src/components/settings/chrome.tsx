import { useRouter } from "expo-router";
import { ChevronLeft, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { GlassCircle } from "@/components/ui/glass";
import { SkyWash } from "@/components/home/front";
import { glassCard } from "@/components/today/palette";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { RevealScroll } from "@/components/ui/reveal";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";
import { brandify } from "@/components/ui/brand";
import { goBack } from "@/lib/nav/go-back";

/**
 * The shared frame for every settings sub-screen.
 *
 * One header for all of them, so the back button never moves between screens.
 * REDESIGNED 2026-09-29 into the app's glass language: violet backdrop, a round
 * glass back button, a large title with a glass icon tile, and glass panels.
 * Every sub-screen inherits it without being edited.
 */
export function SettingsScreen({
  title,
  eyebrow,
  icon: Icon,
  art,
  children,
  footer,
  bare = false,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  /** Cheeku's 3D object for this page. Falls back to the line icon. */
  art?: Icon3DName;
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
    <View className="flex-1 bg-canvas">
      <SkyWash top={0} />
      <View className="flex-row items-center px-4 pb-1" style={{ paddingTop: insets.top + 6 }}>
        <GlassCircle label="Go back" onPress={() => goBack(router, "/settings")}>
          <ChevronLeft size={21} color={ink[900]} />
        </GlassCircle>
      </View>

      {/* Reveal-aware, so a page can let its sections rise in as they scroll into view. */}
      <RevealScroll
        contentContainerStyle={{ paddingBottom: footer ? 16 : insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          accessibilityRole="header"
          accessibilityLabel={`${title}. ${eyebrow}`}
          className="flex-row items-start gap-3 px-5 pt-2"
          style={bare ? { height: 0, opacity: 0, overflow: "hidden" } : undefined}
        >
          <View className="min-w-0 flex-1">
            <Text style={{ fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: ink[900] }}>
              {brandify(title)}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], marginTop: 4 }}>{brandify(eyebrow)}</Text>
          </View>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(15,16,48,0.05)" }}>
            {art ? <Icon3D name={art} size={46} /> : <Icon size={26} color={brand[600]} strokeWidth={1.8} />}
          </View>
        </View>

        {children}
      </RevealScroll>

      {footer ? (
        <View
          className="px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 10 }}
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
    <View style={{ marginTop: 28 }}>
      {label ? (
        <Text style={{ paddingHorizontal: 20, fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>{label}</Text>
      ) : null}
      <View style={label ? { marginTop: 12 } : undefined}>{children}</View>
    </View>
  );
}

/** A card with the standard margin and elevation. */
export function Panel({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <View
      style={[
        glassCard("#ffffff", "#0f1030"),
        {
          marginHorizontal: 20,
          overflow: "hidden",
          borderRadius: 24,
          shadowOpacity: 0.05,
          padding: padded ? 16 : 0,
        },
      ]}
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
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={pending}
      onPress={onPress}
      style={{
        height: 54,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        // Brand, never green, for "Saved": green means a health result here.
        backgroundColor: brand[600],
        opacity: pending ? 0.6 : 1,
      }}
      scale={0.98}
    >
      {pending ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text accessibilityRole="alert" style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>
          {saved ? "Saved ✓" : label}
        </Text>
      )}
    </Tap>
  );
}
