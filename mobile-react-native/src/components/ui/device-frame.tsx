import { Platform, useWindowDimensions, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { surface } from "@/theme/tokens";

/*
 * An iPhone 16 shell, for the web preview only.
 *
 * On a device this renders nothing but its children: `Platform.OS !== "web"`
 * returns early, so there is no wrapper, no extra view in the tree, and no cost.
 * It exists because reviewing a phone app in a full-height desktop browser
 * misjudges every screen — a layout that puts the primary action just above the
 * thumb looks like it is floating in the middle of nowhere at 1000px tall.
 *
 * Numbers are the iPhone 16 logical viewport: 393x852pt, 62pt corner radius,
 * and a 59pt top inset for the Dynamic Island.
 */
const SCREEN = { width: 393, height: 852, radius: 62 } as const;

/*
 * Real iPhone 16 insets, supplied through the context directly.
 *
 * Passing `initialMetrics` to SafeAreaProvider is not enough: on web the
 * provider measures its own DOM node after mount and overwrites them with
 * zeroes. Every screen then renders its header under the Dynamic Island and
 * its footer under the home indicator, which is precisely the region the
 * inset exists to protect. Overriding the context is the only way to make the
 * preview tell the truth.
 */
const IPHONE_16_INSETS = { top: 59, bottom: 34, left: 0, right: 0 } as const;

/*
 * KNOWN LIMIT: `Modal` escapes this frame on web.
 *
 * React Native's Modal renders into the document root rather than into its
 * parent, so every sheet in the app (notifications, the record filters) appears
 * against the full browser viewport instead of inside the phone. Nothing is
 * wrong with those screens — on device the modal covers the device — but their
 * proportions cannot be judged here, and a sheet that looks wrong in the
 * preview is not evidence of a bug. Check sheets on the simulator.
 */

export function DeviceFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  // Narrow viewports are already phone-shaped; framing them would shrink the
  // real thing to fit inside a picture of itself.
  const framed = Platform.OS === "web" && width >= 720 && height >= 700;
  if (!framed) return <>{children}</>;

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#eceaf6",
      }}
    >
      {/* The bezel. A hair larger than the screen on every side. */}
      <View
        style={{
          width: SCREEN.width + 12,
          height: SCREEN.height + 12,
          borderRadius: SCREEN.radius + 6,
          backgroundColor: "#0f1030",
          padding: 6,
          shadowColor: "#0f1030",
          shadowOpacity: 0.28,
          shadowRadius: 48,
          shadowOffset: { width: 0, height: 24 },
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: SCREEN.radius,
            overflow: "hidden",
            backgroundColor: surface.canvas,
          }}
        >
          <SafeAreaInsetsContext.Provider value={IPHONE_16_INSETS}>
            {children}
          </SafeAreaInsetsContext.Provider>

          {/*
           * Dynamic Island and home indicator, drawn over the app.
           * `pointerEvents="none"` so they never eat a tap meant for the UI
           * underneath — the island sits exactly where a screen's back button
           * often is.
           */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 11,
              alignSelf: "center",
              width: 125,
              height: 36,
              borderRadius: 999,
              backgroundColor: "#000",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 8,
              alignSelf: "center",
              width: 140,
              height: 5,
              borderRadius: 999,
              backgroundColor: "#0f1030",
              opacity: 0.35,
            }}
          />
        </View>
      </View>
    </View>
  );
}
