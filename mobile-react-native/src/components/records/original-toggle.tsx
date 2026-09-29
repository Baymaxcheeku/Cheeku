import { ExternalLink, FileSearch } from "lucide-react-native";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { brand, ink, surface } from "@/theme/tokens";

/**
 * The "structured / original" escape hatch on D2.
 *
 * EXTRACTION IS A GUESS. Everything above this on the screen is Cheeku's
 * reading of the document, and a medical record UI that only ever shows the
 * machine's interpretation — with no route back to what the lab actually
 * printed — is asking to be trusted further than it has earned. This is that
 * route, and it is why this component is not optional on the screen.
 */
export function OriginalToggle({
  url,
  rawText,
  fileLabel,
  confidence,
}: {
  url: string | null;
  rawText: string | null;
  fileLabel: string;
  confidence: number | null;
}) {
  const [showText, setShowText] = useState(false);

  /*
   * Opened in the system browser rather than rendered in-app.
   *
   * The signed URL lasts 60 seconds. An in-app viewer that silently 403s once
   * the link expires looks like the document was lost, which for a medical
   * record is the worst possible false alarm. Handing it to the browser makes
   * an expiry look like an expired link, which is what it is.
   *
   * A native document viewer belongs to the offline work in Phase 5, where the
   * file is on the device and there is no expiry to trip over.
   */
  function openOriginal() {
    if (url) void Linking.openURL(url);
  }

  return (
    <View
      className="mt-4 rounded-card bg-surface p-3"
      style={{ borderWidth: 1, borderColor: surface.line }}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-tile bg-canvas">
          <FileSearch size={17} color={ink[500]} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[13px] font-semibold text-ink-900">Original document</Text>
          {/*
           * Confidence is stated as a plain number in neutral type, NEVER as a
           * green/amber/red pill. Those three colours mean health severity
           * everywhere else in the app, and one palette must not carry two
           * meanings — "read with 78% confidence" is not a medical finding.
           */}
          <Text className="text-[11px] text-ink-500">
            {confidence !== null
              ? `Read with ${Math.round(confidence * 100)}% confidence`
              : "Check anything that looks wrong"}
          </Text>
        </View>
      </View>

      <View className="mt-2.5 flex-row gap-2">
        {url ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View the original file for ${fileLabel}`}
            onPress={openOriginal}
            className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-pill bg-brand-50"
            style={{ borderWidth: 1, borderColor: brand[200] }}
          >
            <ExternalLink size={14} color={brand[700]} />
            <Text className="text-[12px] font-semibold text-brand-700">View original</Text>
          </Pressable>
        ) : (
          <View
            accessibilityLabel="The original file could not be reached"
            className="h-9 flex-1 items-center justify-center rounded-pill"
            style={{ borderWidth: 1, borderColor: surface.line }}
          >
            <Text className="text-[12px] font-medium text-ink-300">Original unavailable</Text>
          </View>
        )}

        {rawText ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showText }}
            onPress={() => setShowText((v) => !v)}
            className="h-9 flex-1 items-center justify-center rounded-pill"
            style={{ borderWidth: 1, borderColor: surface.line }}
          >
            <Text className="text-[12px] font-semibold text-ink-700">
              {showText ? "Hide text" : "Show text"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {showText && rawText ? (
        <ScrollView
          className="mt-2.5 rounded-tile bg-canvas p-3"
          style={{ maxHeight: 224 }}
          nestedScrollEnabled
        >
          <Text className="text-[11px] leading-[17px] text-ink-700">{rawText}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}
