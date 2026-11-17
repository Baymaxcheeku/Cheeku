import { ActivityIndicator, Text, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { EASE_OUT, useReducedMotion } from "@/components/ui/motion";
import { brand, ink, surface } from "@/theme/tokens";

/*
 * The primary action. Ported from the web `Button`.
 *
 * `active:scale` on web becomes a shared value here. The dip is small on
 * purpose: a control that visibly shrinks under a thumb reads as flimsy.
 */
export function Button({
  children,
  onPress,
  disabled,
  loading,
  variant = "primary",
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
}) {
  const still = useReducedMotion();
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
  }));

  const primary = variant === "primary";
  const off = disabled || loading;

  return (
    <Animated.View style={animated}>
      <Pressable
        accessibilityRole="button"
        disabled={off}
        onPress={onPress}
        onPressIn={() => {
          if (!still) pressed.value = withTiming(1, { duration: 120, easing: EASE_OUT });
        }}
        onPressOut={() => {
          if (!still) pressed.value = withTiming(0, { duration: 160, easing: EASE_OUT });
        }}
        style={{
          height: 52,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: off ? 0.6 : 1,
          backgroundColor: primary ? brand[600] : "#ffffff",
          borderWidth: primary ? 0 : 1,
          borderColor: surface.line,
        }}
      >
        {loading ? <ActivityIndicator color={primary ? "#fff" : ink[900]} /> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {typeof children === "string" ? (
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: primary ? "#ffffff" : ink[700],
              }}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
