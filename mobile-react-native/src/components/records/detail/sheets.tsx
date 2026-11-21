import { Check, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sheet, useSheetMax } from "@/components/ui/sheet";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

export type SheetOption = {
  key: string;
  label: string;
  sub?: string;
  icon?: LucideIcon;
  /** Rendered in place of the icon, e.g. a member's face. */
  leading?: React.ReactNode;
  tint?: string;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/**
 * A bottom sheet of choices: the record's menu, "move to whom", "what kind
 * of record is it". Same frame as ConfirmSheet so the app has one sheet.
 */
export function OptionsSheet({
  open,
  title,
  body,
  options,
  busyKey,
  error,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: string;
  options: SheetOption[];
  /** The option whose action is running, shown with a spinner. */
  busyKey?: string | null;
  error?: string | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const sheetMax80 = useSheetMax(0.80);
  return (
    <Sheet open={open} onClose={onClose} label="Close" dismissible={!busyKey}>
      <View style={{ maxHeight: sheetMax80, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: surface.canvas, paddingTop: 10, paddingBottom: insets.bottom + 12 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 20, color: ink[900] }}>{title}</Text>
          {body ? <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700], marginTop: 6 }}>{body}</Text> : null}
          {error ? (
            <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 8 }}>
              {error}
            </Text>
          ) : null}
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
          {options.map((o) => {
            const busy = busyKey === o.key;
            const color = o.destructive ? semantic.dangerText : ink[900];
            return (
              <Pressable
                key={o.key}
                accessibilityRole="button"
                accessibilityState={{ selected: o.selected, disabled: o.disabled || Boolean(busyKey) }}
                disabled={o.disabled || Boolean(busyKey)}
                onPress={o.onPress}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 56,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: o.selected ? brand[50] : pressed ? "rgba(15,16,48,0.04)" : "transparent",
                  opacity: o.disabled ? 0.45 : 1,
                })}
              >
                {o.leading ?? (o.icon ? (
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: o.destructive ? semantic.dangerBg : `${o.tint ?? brand[600]}14`, alignItems: "center", justifyContent: "center" }}>
                    <o.icon size={18} color={o.destructive ? semantic.dangerText : (o.tint ?? brand[600])} />
                  </View>
                ) : null)}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color }}>{o.label}</Text>
                  {o.sub ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{o.sub}</Text> : null}
                </View>
                {busy ? <ActivityIndicator color={ink[900]} /> : o.selected ? <Check size={18} color={ink[900]} strokeWidth={2.6} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Sheet>
  );
}
