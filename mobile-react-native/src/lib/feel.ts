import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/*
 * Haptics, in five words. The rules (docs/audits/2026-10-ui-ux-audit.md):
 *
 * - One per action, fired with the visual it belongs to, never on scroll or on
 *   an entrance the person did not cause.
 * - Never the only feedback: many phones have haptics off or too weak to feel,
 *   so every call site also changes something on screen.
 * - The phone's own setting wins. iOS and Android silence these when the
 *   person has system haptics off; there is no separate switch in the app.
 *
 * Phones only. On web every call is a no-op, and a failure is never surfaced.
 */

const native = Platform.OS === "ios" || Platform.OS === "android";

function fire(run: () => Promise<void>): void {
  if (!native) return;
  run().catch(() => undefined);
}

export const feel = {
  /** A value ticked over: tabs, chips, segmented controls, picking a person. */
  tick: () => fire(() => Haptics.selectionAsync()),
  /** Something landed or snapped: Mark done, a sheet catching, the + button. */
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A heavier moment: a destructive action going ahead. */
  thud: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** It worked: booking confirmed, report filed, the day's plan complete. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** It did not work and the person needs to act. */
  warn: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
