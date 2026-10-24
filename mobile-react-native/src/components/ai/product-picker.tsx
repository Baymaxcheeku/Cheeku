import { Camera, X } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sheet, useSheetMax } from "@/components/ui/sheet";
import { PRODUCT_SCENARIOS } from "@/lib/ai/mock/scenarios";
import { brand, ink, shadow } from "@/theme/tokens";
import { Tap } from "@/components/ui/tap";

/**
 * The product-photo path, as a picker over FIXED scenarios rather than a real
 * camera.
 *
 * This is the honest shape for what exists. There is no model behind it that
 * can look at an arbitrary jar of cream and tell someone whether it is safe in
 * pregnancy, and shipping a camera that appears to do that — then answering
 * from a canned list — would be a lie about a medical judgement. The picker
 * says "these are the items this demo knows", which is true.
 *
 * The camera becomes real when the data scientist's vision model lands. Until
 * then the sheet names the limit rather than hiding it.
 */
export function ProductPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (scenarioId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const sheetMax78 = useSheetMax(0.78);

  return (
    <Sheet open={open} onClose={onClose} label="Close">
      <View
        className="rounded-t-sheet bg-canvas px-5 pt-2"
        style={{ maxHeight: sheetMax78, paddingBottom: insets.bottom + 16 }}
      >

        <View className="mt-3 flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-pill bg-brand-50">
            <Camera size={18} color={brand[600]} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-ink-900">Ask about a product</Text>
            <Text className="mt-0.5 text-sm leading-[18px] text-ink-500">
              Photo recognition is not live yet. Pick one of these to see how the check works.
            </Text>
          </View>
          <Tap scale={0.95}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <X size={17} color={ink[500]} />
          </Tap>
        </View>

        <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
          <View className="gap-2">
            {PRODUCT_SCENARIOS.map((scenario) => (
              <Tap scale={0.98}
                key={scenario.id}
                accessibilityRole="button"
                accessibilityLabel={`${scenario.title}. ${scenario.subtitle}`}
                onPress={() => onPick(scenario.id)}
                className="flex-row items-center gap-3 rounded-card bg-surface p-3"
                style={shadow.e1}
              >
                {/* Raw SVG markup, not a data URI — see the port note in
                    scenarios.ts, where `Buffer` does not exist. */}
                <SvgXml xml={scenario.thumbnail} width={44} height={44} />
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-ink-900" numberOfLines={1}>
                    {scenario.title}
                  </Text>
                  <Text className="text-xs text-ink-500" numberOfLines={1}>
                    {scenario.subtitle}
                  </Text>
                </View>
              </Tap>
            ))}
          </View>
        </ScrollView>
      </View>
    </Sheet>
  );
}
