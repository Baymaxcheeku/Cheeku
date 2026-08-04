import "../global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { surface } from "@/theme/tokens";

/*
 * Root layout.
 *
 * `headerShown: false` throughout: every screen in this app draws its own
 * header (the settings screens share `SettingsHeader`, the onboarding screens
 * have a step rail). A native header stacked on top of those would be a second
 * title bar.
 */
export default function RootLayout() {
  const [client] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <StatusBar style="dark" />
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
