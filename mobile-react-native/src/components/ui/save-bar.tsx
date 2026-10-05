import { usePathname } from "expo-router";
import { CloudOff, X } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReducedMotion } from "@/components/ui/motion";
import { useSaveError } from "@/lib/optimistic";
import { ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE SAVE BAR: a background save that did not land.
 *
 * Every instant action (lib/optimistic.ts) reports here when its save fails,
 * after the screen has already gone back to how it was. One bar for the whole
 * app, at the bottom, dark and neutral: it is about the connection, not about
 * anyone's health, so it never uses the semantic red (PLAN.md rule 3).
 *
 * Retry runs the same change again. It goes away on its own after a while,
 * because the screen is already correct; the bar only explains why.
 */

const TABS = ["/home", "/records", "/ask", "/settings"];

export function SaveBar() {
  const { message, retry, seq, clear } = useSaveError();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const still = useReducedMotion();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clear, 9000);
    return () => clearTimeout(t);
  }, [message, seq, clear]);

  if (!message) return null;
  // Sit above the floating tab bar on the four tab screens.
  const lift = TABS.includes(pathname) ? 92 : 12;

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 12, right: 12, bottom: insets.bottom + lift }}>
      <Animated.View
        key={seq}
        entering={still ? undefined : SlideInDown.springify().damping(18)}
        exiting={still ? undefined : SlideOutDown.duration(160)}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 10,
          paddingLeft: 14,
          paddingRight: 8,
          borderRadius: 20,
          backgroundColor: ink[900],
          shadowColor: "#0f1030",
          shadowOpacity: 0.22,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <CloudOff size={18} color="rgba(255,255,255,0.8)" />
        <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13.5, lineHeight: 18, color: "#fff" }}>{message}</Text>
        {retry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry"
            onPress={() => {
              clear();
              retry();
            }}
            style={({ pressed }) => ({ paddingHorizontal: 14, height: 34, borderRadius: 999, justifyContent: "center", backgroundColor: pressed ? "#e9e7ff" : "#fff" })}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: ink[900] }}>Retry</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={clear} hitSlop={10} style={{ padding: 4 }}>
          <X size={16} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </Animated.View>
    </View>
  );
}
