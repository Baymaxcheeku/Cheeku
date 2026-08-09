import { useEffect } from "react";
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
 * Confines React Native Web's modal portals to the phone rectangle.
 *
 * RNW's `Modal` does not render where it is written. It portals into a fresh
 * div appended to `document.body` and pins it `fixed` over the whole viewport,
 * outside `#root` — so this frame cannot clip it however it is styled. Every
 * sheet in the app escaped the phone and covered the browser: the paywall, the
 * notification panel, the record filters, the delete confirmation.
 *
 * THE APP CODE IS CORRECT. On a device, a modal covering the screen is exactly
 * what should happen, which is why the fix belongs here rather than in any of
 * those components. The preview was the thing telling the lie.
 *
 * Matched as "a body-level div that is not one of ours" rather than by class,
 * because those class names are RNW's generated atomic CSS and change between
 * versions. The rect is recomputed on resize, since the frame is centred.
 */
function useModalsInsideFrame(active: boolean, left: number, top: number) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const ID = "baymax-device-frame-modal-clip";
    let style = document.getElementById(ID) as HTMLStyleElement | null;

    if (!active) {
      style?.remove();
      return;
    }

    if (!style) {
      style = document.createElement("style");
      style.id = ID;
      document.head.appendChild(style);
    }

    /*
     * `transform` is the load-bearing line, not the width and height.
     *
     * RNW positions the sheet INSIDE this container as fixed as well, and a
     * fixed element resolves against the viewport while ignoring every
     * ancestor — so sizing the container alone shrank it to the phone while
     * its contents still spanned the browser. A transform makes this element
     * the containing block for fixed descendants, which is what actually
     * pulls them inside the frame.
     *
     * The pointer-events pair is not decoration, it is the difference between
     * a working app and a dead one. RNW leaves a portal container mounted and
     * EMPTY after a modal closes. Giving those leftovers a real 393x852 box
     * and a transform stacked four invisible panels over the whole phone, and
     * every tap landed on them instead of the UI underneath. So the container
     * never takes a pointer, its contents do, and a container with nothing in
     * it is removed from the layout entirely.
     *
     * Keep the CSS free of backticks: it lives in a template literal, and one
     * in a comment silently ends the string. That cost a bundle error here.
     */
    style.textContent = `
      body > div:not(#root):not(#error-toast) {
        position: fixed !important;
        left: ${left}px !important;
        top: ${top}px !important;
        width: ${SCREEN.width}px !important;
        height: ${SCREEN.height}px !important;
        right: auto !important;
        bottom: auto !important;
        border-radius: ${SCREEN.radius}px;
        overflow: hidden;
        transform: translateZ(0);
        pointer-events: none;
      }
      body > div:not(#root):not(#error-toast) > * {
        pointer-events: auto;
      }
      body > div:not(#root):not(#error-toast):empty {
        display: none !important;
      }
    `;
  }, [active, left, top]);
}

export function DeviceFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  // Narrow viewports are already phone-shaped; framing them would shrink the
  // real thing to fit inside a picture of itself.
  const framed = Platform.OS === "web" && width >= 720 && height >= 700;

  // Called before the early return, so the hook order never changes.
  useModalsInsideFrame(framed, (width - SCREEN.width) / 2, (height - SCREEN.height) / 2);

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
