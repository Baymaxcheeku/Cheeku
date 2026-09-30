import { usePathname } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";

import { glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import type { InboxItem } from "@/lib/notifications/types";
import { useOpenNotification } from "@/lib/notifications/use-inbox";
import { ink } from "@/theme/tokens";
import { font } from "@/theme/type";

import { NotificationIcon } from "./parts";

/*
 * The in-app banner: a new inbox row arriving while the app is open.
 *
 * The phone's own banner covers the app when it is closed. While it is open,
 * this slides down from the top instead, shows the row's own title (it is
 * already behind the app lock, so this can say more than a push ever does),
 * and opens the row on tap. Four seconds, then it goes. One at a time: a
 * newer one replaces the older, which is still in the inbox.
 *
 * Not shown on the Notifications screen itself, where the row appears in the
 * list in the same moment.
 */

type ToastState = { item: InboxItem | null; show: (item: InboxItem) => void; hide: () => void };

export const useToast = create<ToastState>((set) => ({
  item: null,
  show: (item) => set({ item }),
  hide: () => set({ item: null }),
}));

export function ToastHost() {
  const { item, hide } = useToast();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const open = useOpenNotification();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!item) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, 4200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [item, hide]);

  if (!item || pathname === "/notifications") return null;

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 6, left: 12, right: 12 }}>
      <Animated.View key={item.id} entering={still ? undefined : SlideInUp.springify().damping(18)} exiting={still ? undefined : SlideOutUp.duration(180)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`New notification. ${item.title}`}
          onPress={() => {
            hide();
            open(item);
          }}
          style={({ pressed }) => [
            glassShadow,
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 12,
              borderRadius: 22,
              backgroundColor: pressed ? "#ffffff" : glass.fillStrong,
              borderWidth: 1,
              borderColor: glass.rim,
              shadowOpacity: 0.16,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
        >
          <NotificationIcon kind={item.kind} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[900] }}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
              {item.body}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={hide} hitSlop={10}>
            <X size={16} color={ink[300]} />
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}
