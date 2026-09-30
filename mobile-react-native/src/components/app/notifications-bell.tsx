import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { useUnreadCount } from "@/lib/notifications/use-inbox";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/**
 * The bell. Opens the Notifications screen and shows how many are unread.
 *
 * Reads the same cached inbox query as the screen, so the badge and the list
 * can never disagree, and the list is already in memory when the screen
 * opens. When the count goes up while the bell is on screen (a trigger fired,
 * Realtime delivered it) the badge pops and the bell gives a small ring, once.
 *
 * The badge is violet, not red: red means something about health in this
 * app, and "you have 3 unread" is not a health statement.
 */
export function NotificationsBell() {
  const router = useRouter();
  const still = useReducedMotion();
  const count = useUnreadCount();
  const last = useRef(count);

  const badge = useSharedValue(1);
  const swing = useSharedValue(0);

  useEffect(() => {
    if (!still && count > last.current) {
      badge.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 320 }), withSpring(1));
      swing.value = withSequence(
        withTiming(14, { duration: 90 }),
        withTiming(-12, { duration: 110 }),
        withTiming(8, { duration: 100 }),
        withTiming(0, { duration: 120 }),
      );
    }
    last.current = count;
  }, [count, still, badge, swing]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badge.value }] }));
  const bellStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value}deg` }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      onPress={() => router.push("/notifications")}
      hitSlop={4}
      style={({ pressed }) => [
        glassShadow,
        {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: glass.fillStrong,
          borderWidth: 1,
          borderColor: glass.rim,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <Animated.View style={bellStyle}>
        <Bell size={20} color={ink[900]} strokeWidth={1.8} />
      </Animated.View>
      {count > 0 ? (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 5,
              right: 4,
              minWidth: 19,
              height: 19,
              paddingHorizontal: 5,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: brand[600],
              borderWidth: 2,
              borderColor: "#fff",
            },
            badgeStyle,
          ]}
        >
          <Text style={{ fontFamily: font.bold, fontSize: 10, lineHeight: 12, color: "#fff" }}>{count > 9 ? "9+" : count}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}
