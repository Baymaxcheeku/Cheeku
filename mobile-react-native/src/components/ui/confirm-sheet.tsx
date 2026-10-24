import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sheet } from "@/components/ui/sheet";
import { brand, semantic, surface } from "@/theme/tokens";
import { feel } from "@/lib/feel";
import { Tap } from "@/components/ui/tap";

/*
 * The app's own confirmation, replacing `Alert.alert` for anything consequential.
 *
 * WHY NOT Alert.alert. React Native Web ships it as `class Alert { static
 * alert() {} }` — a literal no-op. Every confirmation in this app was therefore
 * dead in the preview: sign out did nothing, cancel subscription did nothing,
 * and each looked like a broken button rather than a missing dialog. That alone
 * only affects the preview, but two more things push this in-app on device too:
 *
 *   An OS alert cannot say what these moments need it to say. "Cancel plan?"
 *   with two buttons is not enough for someone whose real question is whether
 *   their records are about to be deleted. This has room for the sentence that
 *   answers it.
 *
 *   `Alert.alert`'s destructive button styling is iOS-only, so the most
 *   dangerous action on Android looked identical to the safe one.
 *
 * The confirm button carries the busy state itself, so a slow cancel cannot be
 * double-tapped into two calls.
 */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Keep it",
  destructive = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  /** Room for the reassurance the OS dialog had nowhere to put. */
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  async function run() {
    // A destructive choice going ahead is felt as a firmer tap.
    if (destructive) feel.thud();
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label={cancelLabel} dismissible={!busy}>
      <View
        className="rounded-t-sheet bg-canvas px-5 pt-5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Text className="text-xl font-bold text-ink-900">{title}</Text>
        <Text className="mt-2 text-sm leading-[19px] text-ink-700">{body}</Text>

        <View className="mt-5 gap-2">
          <Tap
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void run()}
            className="h-13 items-center justify-center rounded-pill"
            style={{
              height: 52,
              backgroundColor: destructive ? semantic.danger : brand[600],
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">{confirmLabel}</Text>
            )}
          </Tap>

          {/*
           * The safe option is second but full width and clearly a button. On
           * a sheet the reader is scanning downward, so putting "keep it" last
           * means the last thing they read before deciding is the way out.
           */}
          <Tap
            accessibilityRole="button"
            disabled={busy}
            onPress={onClose}
            className="h-13 items-center justify-center rounded-pill bg-surface"
            style={{ height: 52, borderWidth: 1, borderColor: surface.line }}
          >
            <Text className="text-base font-semibold text-ink-700">{cancelLabel}</Text>
          </Tap>
        </View>
      </View>
    </Sheet>
  );
}
