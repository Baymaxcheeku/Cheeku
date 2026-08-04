import "../global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

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

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
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
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <StatusBar style="dark" />
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
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
