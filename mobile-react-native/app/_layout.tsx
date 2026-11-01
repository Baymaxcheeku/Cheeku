import "../global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_500Medium_Italic,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { ShareIntentProvider } from "expo-share-intent";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, type Metrics } from "react-native-safe-area-context";

import { AppLock } from "@/components/app/app-lock-gate";
import { ConsentGate } from "@/components/legal/consent-gate";
import { ShareIntake } from "@/components/scan/share-intake";
import { ToastHost } from "@/components/notifications/toast";
import { SaveBar } from "@/components/ui/save-bar";
import { startAuth, useAuth } from "@/lib/auth/state";
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
  // Who is signed in, followed for the life of the app. The guards below read it.
  useEffect(startAuth, []);
  const status = useAuth((s) => s.status);
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // The editorial accent line on Home's headline. Same package, JS-only.
    Inter_500Medium_Italic,
    // The "Cheeku" wordmark, and nothing else.
    InstrumentSerif_400Regular_Italic,
  });

  /*
   * The splash also waits for the stored session to be read, which is local
   * and quick. Drawing the navigator before then would apply the signed-out
   * guards to somebody who is signed in, for one frame.
   */
  const ready = (loaded || Boolean(error)) && status !== "loading";
  useEffect(() => {
    // Hide on error too: a missing font is a degraded screen, not a dead app.
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    /*
     * Outermost, as expo-share-intent asks: a report shared from WhatsApp
     * or Files reaches ShareIntake below, which takes it to Scan. Off on web.
     */
    <ShareIntentProvider>
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
           * WHO MAY SEE WHAT. Each screen belongs to one sign-in status, and a
           * screen whose guard is false cannot be reached: not by a push, an
           * edge swipe, the Android back button or a link. When the status
           * changes (a sign-in, a sign-out, a confirmed email), the screens
           * that just closed are removed from history and the navigator goes
           * to its first open screen, the splash, which asks resolveLanding
           * where the person belongs now.
           *
           *   index, auth/callback, legal  anyone (the consent box opens legal
           *                                before an account exists)
           *   (signed-in)                  a signed-in account with a
           *                                confirmed email: every app screen
           *   welcome, sign-in             signed out only
           *   verify-email                 anyone not fully signed in
           *
           * Navigation, not access control: row level security checks the
           * token on every query whatever is on screen.
           *
           * `headerShown: false` throughout: every screen draws its own header
           * (the settings screens share one, onboarding has a step rail). A
           * native header on top of those would be a second title bar. Swipe
           * back is off on the roots, where nothing sits underneath.
           */}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: surface.canvas },
              animation: "slide_from_right",
            }}
          >
            {/* First, so it is where every guard change lands. */}
            <Stack.Screen name="index" options={{ gestureEnabled: false, animation: "fade" }} />
            <Stack.Protected guard={status === "signedIn"}>
              <Stack.Screen name="(signed-in)" options={{ gestureEnabled: false, animation: "fade" }} />
            </Stack.Protected>
            <Stack.Protected guard={status === "signedOut"}>
              <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
              <Stack.Screen name="sign-in" />
            </Stack.Protected>
            <Stack.Protected guard={status !== "signedIn"}>
              <Stack.Screen name="verify-email" options={{ gestureEnabled: false }} />
            </Stack.Protected>
          </Stack>
          {/*
           * Here rather than in the signed-in tab shell, so it also covers a
           * screen opened directly (a link, or a reload on web, straight into
           * /settings/privacy). It renders nothing while signed out.
           */}
          <ConsentGate />
          <ShareIntake />
          <ToastHost />
          <SaveBar />
          </AppLock>
          </DeviceFrame>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}
