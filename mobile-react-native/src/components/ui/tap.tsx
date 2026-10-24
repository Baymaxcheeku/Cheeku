import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { EASE_OUT, useReducedMotion } from "@/components/ui/motion";

/*
 * Press feedback, the same everywhere (UI audit, October 2026).
 *
 * Before this, about a third of the app's pressables reacted to a touch and
 * they used nine different scales, each snapping instantly. Now: a dip to
 * 0.97 (0.98 for big cards, 0.95 for small round buttons) on press-in in
 * 120ms with a strong ease-out, back in 160ms. It runs on the UI thread and
 * never re-renders the component.
 *
 * Reduce Motion: a slight dim instead of a scale.
 *
 * Do not pass a `transform` in `style`; the press owns it.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Tap({
  scale = 0.97,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Omit<PressableProps, "style"> & {
  scale?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const still = useReducedMotion();
  const p = useSharedValue(0);

  const pressed = useAnimatedStyle(() =>
    still ? { opacity: 1 - 0.15 * p.get() } : { transform: [{ scale: 1 - (1 - scale) * p.get() }] },
  );

  return (
    <AnimatedPressable
      {...rest}
      style={[style, pressed]}
      onPressIn={(e: GestureResponderEvent) => {
        p.set(withTiming(1, { duration: 120, easing: EASE_OUT }));
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        p.set(withTiming(0, { duration: 160, easing: EASE_OUT }));
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
