/*
 * SDK 57 NOTE. expo-router no longer depends on `@react-navigation/*` — it
 * vendors the navigators and re-exports their types from the Tabs layout, so
 * this type comes from `expo-router/tabs` rather than the package the web
 * ecosystem's examples all import from.
 */
import type { BottomTabBarProps } from "expo-router/tabs";
import { useRouter } from "expo-router";
import { FolderClosed, House, Plus, Stethoscope, User, type LucideIcon } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { brand, ink, shadow, surface } from "@/theme/tokens";

const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  home: { icon: House, label: "Home" },
  // "Health records", not "Documents". A document is a file; a health record is
  // what the reader came for, and it is the word the app already uses on the
  // screen itself and in every answer that cites one.
  records: { icon: FolderClosed, label: "Health records" },
  ask: { icon: Stethoscope, label: "Ask Cheeku" },
  settings: { icon: User, label: "Profile" },
};

/**
 * The app's primary navigation, per the frames: four tabs with a raised `+`
 * straddling the middle.
 *
 * Drawn by hand rather than using the default tab bar because of that `+`. It
 * is not a fifth tab — it is the app's main write action and it opens a route
 * that lives OUTSIDE the tab set, so pressing it must not leave a tab looking
 * selected for a screen that is not one of them.
 *
 * The FAB is emitted mid-row rather than positioned absolutely over the bar.
 * Absolutely positioning it would let a 56pt circle overlap the tap targets of
 * the tabs on either side, and a mis-hit here files a document instead of
 * opening a list.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row items-stretch justify-around bg-surface pt-1.5"
      style={{
        paddingBottom: insets.bottom,
        borderTopWidth: 1,
        borderTopColor: surface.line,
      }}
    >
      {state.routes.map((route, index) => {
        const meta = ICONS[route.name];
        if (!meta) return null;

        const active = state.index === index;
        const Icon = meta.icon;

        function onPress() {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          // Re-pressing the active tab is a no-op rather than a fresh
          // navigation, which would otherwise reset a scrolled list under
          // someone's thumb.
          if (!active && !event.defaultPrevented) navigation.navigate(route.name);
        }

        /*
         * The FAB is a SIBLING of the tabs, not nested inside one of them.
         * Wrapping it together with the third tab made the pair share a single
         * flex-1 share, so 76pt of that share went to the circle and "Ask
         * Cheeku" truncated to "A…" while the other three labels sat in full.
         */
        return (
          <Fragment key={route.key}>
            {index === 2 ? <Fab onPress={() => router.push("/scan")} /> : null}
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={meta.label}
              onPress={onPress}
              className="flex-1 items-center gap-1 rounded-tile px-1 pb-1.5 pt-1"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.9}
                color={active ? brand[600] : ink[500]}
              />
              <Text
                className="text-[10px] font-medium"
                numberOfLines={1}
                style={{ color: active ? brand[600] : ink[500] }}
              >
                {meta.label}
              </Text>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

/*
 * The raised circle. It overlaps the bar's top edge, so it reserves its own
 * width in the row and lifts itself with a negative margin.
 */
function Fab({ onPress }: { onPress: () => void }) {
  return (
    <View className="w-[76px] items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a document"
        onPress={onPress}
        className="h-14 w-14 items-center justify-center rounded-pill bg-brand-600"
        style={[{ marginTop: -24 }, shadow.e2]}
      >
        <Plus size={26} strokeWidth={2.5} color="#ffffff" />
      </Pressable>
    </View>
  );
}
