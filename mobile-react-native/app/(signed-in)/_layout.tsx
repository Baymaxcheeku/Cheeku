import { Stack } from "expo-router";

import { surface } from "@/theme/tokens";

/*
 * Every screen that needs a signed-in account with a confirmed email.
 *
 * A group, so the root navigator guards all of it with one `Stack.Protected`
 * (app/_layout.tsx) and a new screen added here is protected by where it
 * lives rather than by somebody remembering to list it. The group name never
 * appears in a URL: /home, /records/123 and /settings/privacy are unchanged.
 */
export default function SignedInLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: surface.canvas },
        animation: "slide_from_right",
      }}
    >
      {/* Opens fast and from the side like every other push, but a
          touch quicker: it is a glance, not a destination. */}
      <Stack.Screen name="notifications" options={{ animationDuration: 240 }} />
      {/* Roots: nothing sits under these, so an edge swipe must not pop. The
          tab shell is where a signed-in person lives; who is the first screen
          of onboarding. */}
      <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="who" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
