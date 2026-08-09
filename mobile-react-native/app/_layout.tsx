import "../global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, type Metrics } from "react-native-safe-area-context";

import { AppLock } from "@/components/app/app-lock-gate";
import { persistOptions } from "@/lib/offline/cache";
import { startOnlineManager } from "@/lib/offline/status";
import { DeviceFrame } from "@/components/ui/device-frame";
import { surface } from "@/theme/tokens";

/*
 * Inter is loaded here, once, for the whole app.
 *
 * The web build got it from `next/font/google`; there is no equivalent, and
 * without an explicit load React Native falls back to the platform serif on
 * web and to San Francisco / Roboto on device. The design was sampled against
 * Inter, so every heading's tracking and weight step is wrong without it.
 *
 * The splash is held until the faces are ready rather than letting the first
 * frame paint in a fallback and reflow. A type swap on the first screen someone
 * ever sees is the cheapest possible way to look unfinished.
 */
void SplashScreen.preventAutoHideAsync();

/*
 * iPhone 16 metrics, injected on web only.
 *
 * Inside the preview frame the browser reports zero insets, so every screen
 * that reserves room for the status bar or the home indicator renders flush to
 * the edge and looks wrong in exactly the places that matter. Feeding the real
 * device numbers makes the preview trustworthy. On device this is undefined and
 * the provider measures the hardware as usual.
 */
const WEB_PREVIEW_METRICS: Metrics | undefined =
  Platform.OS === "web"
    ? {
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 59, left: 0, right: 0, bottom: 34 },
      }
    : undefined;

export default function RootLayout() {
  /*
   * `gcTime` has to outlive the persisted cache or restoring is pointless:
   * anything garbage-collected in memory is dropped from the written snapshot
   * too, so a shorter time here silently shrinks what survives a cold start.
   */
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 7 * 24 * 60 * 60 * 1000,
            // Refetch on reconnect rather than on every mount: the point of
            // the cache is that a screen opens instantly with what it had.
            refetchOnReconnect: true,
            retry: 2,
          },
        },
      }),
  );

  // React Query's default online check is a browser listener that never fires
  // on a device, so without this the app believes it is online in a tunnel.
  useEffect(startOnlineManager, []);
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Hide on error too: a missing font is a degraded screen, not a dead app.
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={WEB_PREVIEW_METRICS}>
        <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
          <StatusBar style="dark" />
          {/* Renders nothing but its children on device. */}
          <DeviceFrame>
          {/*
           * The lock wraps the navigator rather than a screen. What it guards
           * against is the app being left open on a table, and that happens on
           * whichever route the reader was last on — gating one means every
           * other route is the way around it. Passthrough on web, and whenever
           * the lock is switched off.
           */}
          <AppLock>
          {/*
           * `headerShown: false` throughout: every screen draws its own header
           * (the settings screens share one, onboarding has a step rail). A
           * native header on top of those would be a second title bar.
           */}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: surface.canvas },
              animation: "slide_from_right",
            }}
          />
          </AppLock>
          </DeviceFrame>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
