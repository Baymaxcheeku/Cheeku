import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ActivityIndicator, Text, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { Tap } from "@/components/ui/tap";
import { brandify } from "@/components/ui/brand";
import { GlassCircle, Gradient, glassShadow } from "@/components/ui/glass";
import { brand, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The shared frame for every redesigned screen.
 *
 * One backdrop, one header, one title style, two button styles. Screens that
 * use these look like they belong to the same product without each having to
 * remember the numbers.
 *
 * Buttons use plain style objects on Pressable, never `className` together
 * with a function `style`: on web that combination drops NativeWind's styles
 * and the button renders invisible (see PROGRESS.md, doctor booking).
 */

/** The soft violet wash behind the top of a screen. */
export function Backdrop({ height = 420 }: { height?: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height }}>
      <Gradient from={lilac.base} to={surface.canvas} angle="vertical" />
    </View>
  );
}

/**
 * Glass back button, centred title, optional right slot. Owns the top inset.
 * `fallback` is where back goes when there is nothing to pop (cold start or a
 * deep link).
 */
export function ScreenHeader({
  title,
  subtitle,
  right,
  fallback = "/home",
  back = true,
  onBack,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  fallback?: string;
  back?: boolean;
  /** Overrides leaving the screen, for multi-step flows that step back instead. */
  onBack?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-center gap-3 px-4 pb-2" style={{ paddingTop: insets.top + 6 }}>
      {back ? (
        <GlassCircle label="Go back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(fallback as never)))}>
          <ChevronLeft size={21} color={ink[900]} />
        </GlassCircle>
      ) : (
        <View style={{ width: 48 }} />
      )}
      <View className="flex-1 items-center">
        {title ? (
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>
            {brandify(title)}
          </Text>
        ) : null}
        {subtitle ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{subtitle}</Text> : null}
      </View>
      <View style={{ minWidth: 48, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

/** A large page title under the header, left aligned, with an optional line. */
export function PageTitle({ title, line, style }: { title: string; line?: string; style?: ViewProps["style"] }) {
  return (
    <View style={style}>
      <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: ink[900] }}>
        {brandify(title)}
      </Text>
      {line ? <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[500], marginTop: 4 }}>{brandify(line)}</Text> : null}
    </View>
  );
}

/** Section heading inside a screen. */
export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View className="flex-row items-end justify-between">
      <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900] }}>{brandify(children)}</Text>
      {action}
    </View>
  );
}

/**
 * The pill button. `brand` is the one primary (UI audit, October 2026: the app
 * had purple and near-black primaries side by side); `light` is secondary on a
 * coloured surface; `danger` is a destructive action in a health context.
 */
export function PillButton({
  children,
  onPress,
  tone = "brand",
  disabled,
  loading,
  icon,
  style,
}: {
  children: string;
  onPress?: () => void;
  tone?: "brand" | "light" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewProps["style"];
}) {
  const bg = { brand: brand[600], light: "#ffffff", danger: semantic.dangerBg }[tone];
  const fg = { brand: "#ffffff", light: ink[900], danger: semantic.dangerText }[tone];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        tone === "light" ? glassShadow : null,
        {
          height: 54,
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 20,
          backgroundColor: bg,
          opacity: disabled ? 0.45 : 1,
          borderWidth: tone === "light" ? 1 : 0,
          borderColor: "rgba(15,16,48,0.08)" },
        style,
      ]} scale={0.98}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: fg }}>{brandify(children, { onDark: tone === "brand" })}</Text>
    </Tap>
  );
}

/** A doctor's illustrated face as a rounded portrait tile. */
export function Portrait({ face, size = 60, radius = 18 }: { face: { svg: string; background: string }; size?: number; radius?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", backgroundColor: face.background }}>
      <SvgXml xml={face.svg} width={size * 1.08} height={size * 1.08} />
    </View>
  );
}
