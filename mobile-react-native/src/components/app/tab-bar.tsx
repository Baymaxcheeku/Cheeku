/*
 * SDK 57 NOTE. expo-router no longer depends on `@react-navigation/*` — it
 * vendors the navigators and re-exports their types from the Tabs layout, so
 * this type comes from `expo-router/tabs` rather than the package the web
 * ecosystem's examples all import from. SDK 58 replaced the `navigation` prop
 * with `emitter` and `navigateToTab`.
 */
import type { BottomTabBarProps } from "expo-router/tabs";
import { useRouter } from "expo-router";
import { FolderClosed, House, MessageCircleHeart, Plus, User, type LucideIcon } from "lucide-react-native";
import { Fragment } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { glass, glassShadow } from "@/components/ui/glass";
import { brand, ink, shadow, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { brandify } from "@/components/ui/brand";
import { feel } from "@/lib/feel";

const ICONS: Record<string, { icon: LucideIcon; label: string; short: string }> = {
  home: { icon: House, label: "Home", short: "Home" },
  // "Health records", not "Documents". A document is a file; a health record is
  // what the reader came for, and it is the word the app already uses on the
  // screen itself and in every answer that cites one.
  // `short` is what fits under the icon in the pill; `label` is what a screen
  // reader announces.
  records: { icon: FolderClosed, label: "Health records", short: "Records" },
  ask: { icon: MessageCircleHeart, label: "Ask Cheeku", short: "Ask Cheeku" },
  settings: { icon: User, label: "Profile", short: "Profile" },
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
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /*
   * REDESIGNED 2026-09-29: a floating glass pill, after the owner's reference.
   * It still sits IN the layout (not absolutely over content), so no screen has
   * to pad for it and nothing scrolls invisibly underneath. The canvas-coloured
   * strip around it is what makes it read as floating.
   */
  return (
    <View style={{ backgroundColor: surface.canvas, paddingHorizontal: 14, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 10) }}>
      <View
        accessibilityRole="tablist"
        className="flex-row items-center rounded-2xl px-1.5"
        style={[
          glassShadow,
          { height: 68, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim },
        ]}
      >
        {state.routes.map((route, index) => {
          const meta = ICONS[route.name];
          if (!meta) return null;

          const active = state.index === index;
          const Icon = meta.icon;

          function onPress() {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            // Re-pressing the active tab is a no-op rather than a fresh
            // navigation, which would otherwise reset a scrolled list under
            // someone's thumb.
            if (!active && !event.defaultPrevented) {
              feel.tick();
              navigateToTab(route.key);
            }
          }

          /*
           * The FAB is a SIBLING of the tabs, not nested inside one of them, so
           * it never eats a tab's share of the row.
           */
          return (
            <Fragment key={route.key}>
              {index === 2 ? <Fab onPress={() => { feel.tap(); router.push("/scan"); }} /> : null}
              <Tap
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={meta.label}
                onPress={onPress}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", height: 56 }}
              >
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: active ? brand[50] : "transparent",
                  }}
                >
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} color={active ? brand[600] : ink[500]} />
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: active ? font.semibold : font.medium, fontSize: 11, color: active ? brand[700] : ink[500] }}
                  >
                    {/* The serif wordmark runs small at 10.5, so it is set up a size. */}
                    {brandify(meta.short, { size: 12.5 })}
                  </Text>
                </View>
              </Tap>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

/* The main write action: a dark disc in the middle of the pill. */
function Fab({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ width: 64, alignItems: "center" }}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel="Add a health record"
        onPress={onPress}
        style={[
          shadow.e2,
          {
            width: 52,
            height: 52,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: ink[900],
          },
        ]}
        scale={0.95}
      >
        <Plus size={24} strokeWidth={2.4} color="#ffffff" />
      </Tap>
    </View>
  );
}
