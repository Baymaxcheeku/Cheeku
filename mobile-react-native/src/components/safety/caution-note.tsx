import { Phone, TriangleAlert } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

import { cautionCopy } from "@/lib/safety/caution";
import type { SafetyResult } from "@/lib/safety/detect";
import { ink, semantic } from "@/theme/tokens";

/**
 * The tier-2 note, shown INSIDE the transcript above the answer.
 *
 * In the transcript rather than as a sheet, deliberately. A sheet is dismissed
 * to get to the answer and then it is gone; this has to still be there when the
 * reader scrolls back an hour later wondering whether to call someone. It is
 * attached to the turn it belongs to and stays attached.
 *
 * AMBER. This is the one semantic colour that means exactly what it says here:
 * caution, act soon, not an emergency. Red is reserved for the escalate
 * interrupt, and using it here would flatten the difference between "see
 * someone today" and "call an ambulance now" — which is the whole distinction
 * the three-tier gate exists to make.
 */
export function CautionNote({ result }: { result: SafetyResult }) {
  const copy = cautionCopy(result);

  return (
    <View
      accessibilityRole="alert"
      className="rounded-card px-4 py-3.5"
      style={{ backgroundColor: semantic.cautionBg }}
    >
      <View className="flex-row items-start gap-2.5">
        <TriangleAlert size={17} color={semantic.cautionText} style={{ marginTop: 1 }} />
        <View className="min-w-0 flex-1">
          <Text className="text-[14px] font-bold" style={{ color: semantic.cautionText }}>
            {copy.title}
          </Text>
          <Text className="mt-1 text-[12.5px] leading-[18px]" style={{ color: ink[700] }}>
            {copy.body}
          </Text>
        </View>
      </View>

      {/*
       * One tap to the national emergency number, always offered.
       *
       * Tier 2 is not an emergency by definition, but the boundary is not
       * something a lexicon can judge from a sentence — a reaction that was
       * mild when someone typed it can be an emergency by the time they finish
       * reading. Making the call one tap away costs nothing and removes the
       * step where somebody has to leave the app to find the number.
       */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Call emergency services on 112"
        onPress={() => void Linking.openURL("tel:112")}
        className="mt-3 h-10 flex-row items-center justify-center gap-2 rounded-pill"
        style={{ backgroundColor: semantic.cautionText }}
      >
        <Phone size={14} color="#fff" />
        <Text className="text-[13px] font-bold text-white">
          Call 112 if it gets worse
        </Text>
      </Pressable>
    </View>
  );
}
