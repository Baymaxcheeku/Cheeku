import { Camera, ChevronRight, ImagePlus, X, type LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sheet } from "@/components/ui/sheet";
import { Tap } from "@/components/ui/tap";
import { glass, glassShadow } from "@/components/ui/glass";
import { ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/**
 * The chat's camera button: take a photo or choose one, then ask about it.
 * What happens to the picture is in lib/chat/photo.ts; the line under the
 * title says the short version, because people should know before they shoot.
 */
export function PhotoSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (source: "camera" | "library") => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Sheet open={open} onClose={onClose} label="Close">
      <View className="rounded-t-sheet bg-canvas px-4 pt-2" style={{ paddingBottom: insets.bottom + 16 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 20, lineHeight: 25, color: ink[900] }}>Ask about a photo</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 4 }}>
              A medicine strip, a food label, a rash, a report. Cheeku looks at it once and keeps only a small preview in the chat.
            </Text>
          </View>
          <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: surface.tint }}>
            <X size={18} color={ink[500]} />
          </Tap>
        </View>

        <View style={[glassShadow, { marginTop: 16, borderRadius: 16, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim, overflow: "hidden" }]}>
          <Row icon={Camera} label="Take a photo" onPress={() => onPick("camera")} />
          <View style={{ height: 1, marginLeft: 60, backgroundColor: surface.line }} />
          <Row icon={ImagePlus} label="Choose from photos" onPress={() => onPick("library")} />
        </View>
      </View>
    </Sheet>
  );
}

function Row({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Tap scale={0.98} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12 }}>
      <View className="bg-brand-50" style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={ink[900]} />
      </View>
      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 16, color: ink[900] }}>{label}</Text>
      <ChevronRight size={16} color={ink[300]} />
    </Tap>
  );
}
