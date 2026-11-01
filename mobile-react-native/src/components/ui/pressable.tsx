import { useState, type ComponentProps } from "react";
import { Pressable as NativePressable, type GestureResponderEvent, type PressableProps } from "react-native";

/*
 * Pressable, with a `style` callback that survives NativeWind on a phone.
 *
 * ┌─ WHY THIS EXISTS (iPhone, Expo SDK 58, 2026-11-01) ──────────────────────┐
 * │                                                                          │
 * │ NativeWind registers React Native's Pressable for `className`, so every  │
 * │ Pressable in the app renders through its native runtime, className or   │
 * │ not. That runtime copies an inline `style` with `{ ...style }`. Spread a │
 * │ function and you get `{}`. So `style={({ pressed }) => ({ flexDirection: │
 * │ "row", gap: 12, padding: 14 })}` lost ALL of it on iOS: action plan rows │
 * │ stacked icon over title over chevron, Due soon rows collapsed to an icon │
 * │ in an empty box, notification rows and the avatar picker fell apart.     │
 * │ The web build uses a different NativeWind runtime and looked perfect.    │
 * │                                                                          │
 * │ Here the callback is resolved before NativeWind ever sees it, from a     │
 * │ pressed flag kept in state, so what reaches it is a plain style object.  │
 * │ Same props and same callback shape as React Native's, so call sites only │
 * │ change their import. ESLint refuses `Pressable` from "react-native" in   │
 * │ the app, so this cannot quietly come back.                               │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

export type { PressableProps };

export function Pressable({ style, onPressIn, onPressOut, ...rest }: ComponentProps<typeof NativePressable> & { className?: string }) {
  const [pressed, setPressed] = useState(false);
  const live = typeof style === "function";

  return (
    <NativePressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => {
        if (live) setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        if (live) setPressed(false);
        onPressOut?.(e);
      }}
      style={live ? style({ pressed }) : style}
    />
  );
}
