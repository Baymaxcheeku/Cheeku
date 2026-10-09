import { Check, ChevronDown, FileHeart, Handshake, MessageCircleHeart, UserRound, Users } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useReducedMotion } from "@/components/ui/motion";
import type { LegalKind } from "@/lib/legal/documents";
import { PURPOSE_COPY, REQUIRED_PURPOSES, type RequiredPurpose } from "@/lib/legal/purposes";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

const ICON: Record<RequiredPurpose, typeof UserRound> = {
  account: UserRound,
  health_records: FileHeart,
  ai_assistance: MessageCircleHeart,
  family_profiles: Users,
  care_bookings: Handshake,
};

/**
 * The one tick box.
 *
 * DESIGNED TO BE QUICK, AND TO HOLD UP LATER. Most people tick and move on,
 * and that is fine: the box is one sentence, unticked, with the three
 * documents named as links. Everything a careful reader or a regulator would
 * look for is one tap away and not one screen away: "What this covers"
 * unfolds the five uses in plain words, in place, so nobody has to leave the
 * form and lose what they typed to find out what they are agreeing to.
 *
 * The links are separate tap targets inside the sentence, and tapping one
 * never ticks the box. A tick has to be a tick on purpose.
 */
export function ConsentBox({
  checked,
  onToggle,
  onOpenDocument,
  startOpen = false,
}: {
  checked: boolean;
  onToggle: () => void;
  onOpenDocument: (kind: LegalKind) => void;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const still = useReducedMotion();

  const link = (kind: LegalKind, label: string) => (
    <Text
      accessibilityRole="link"
      accessibilityHint="Opens the full text"
      onPress={() => onOpenDocument(kind)}
      suppressHighlighting
      style={{ fontFamily: font.semibold, color: brand[600], textDecorationLine: "underline" }}
    >
      {label}
    </Text>
  );

  return (
    <View
      className="rounded-[18px]"
      style={{
        backgroundColor: checked ? brand[50] : surface.canvas,
        borderWidth: 1.5,
        borderColor: checked ? brand[300] : surface.line,
      }}
    >
      <View className="flex-row gap-3 px-4 pb-2 pt-3.5">
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel="I'm 18 or older and agree to the Terms of Use, Privacy Policy and Health Data Consent"
          onPress={onToggle}
          hitSlop={10}
          className="mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-[7px]"
          style={{
            borderWidth: 2,
            borderColor: checked ? brand[600] : brand[200],
            backgroundColor: checked ? brand[600] : surface.base,
          }}
        >
          {checked ? <Check size={14} color="#ffffff" strokeWidth={3.2} /> : null}
        </Pressable>
        <Text
          onPress={onToggle}
          suppressHighlighting
          style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700] }}
        >
          I&apos;m 18 or older, and I agree to the {link("terms", "Terms of Use")}, {link("privacy", "Privacy Policy")} and{" "}
          {link("health_consent", "Health Data Consent")}, including Cheeku storing and reading my family&apos;s health
          records.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        hitSlop={6}
        className="flex-row items-center gap-1.5 self-start px-4 pb-3 pl-[50px]"
      >
        <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: brand[600] }}>
          {open ? "Hide what this covers" : "What this covers"}
        </Text>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevronDown size={14} color={brand[600]} />
        </View>
      </Pressable>

      {open ? (
        <Animated.View
          entering={still ? undefined : FadeIn.duration(180)}
          exiting={still ? undefined : FadeOut.duration(120)}
          // Layout in `style`, not `className`: NativeWind does not reach a
          // Reanimated view, and the panel lost all its spacing on web.
          style={{
            marginHorizontal: 12,
            marginBottom: 12,
            gap: 12,
            borderRadius: 14,
            padding: 14,
            backgroundColor: surface.base,
            borderWidth: 1,
            borderColor: surface.line,
          }}
        >
          {REQUIRED_PURPOSES.map((p) => {
            const Icon = ICON[p];
            return (
              <View key={p} className="flex-row items-start gap-3">
                <View className="h-7 w-7 items-center justify-center rounded-[9px]" style={{ backgroundColor: brand[50] }}>
                  <Icon size={14} color={brand[600]} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[900] }}>{PURPOSE_COPY[p].title}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 1 }}>{PURPOSE_COPY[p].line}</Text>
                </View>
              </View>
            );
          })}
          <Text style={{ fontFamily: font.regular, fontSize: 11.5, lineHeight: 16.5, color: ink[500], marginTop: 2, paddingTop: 10, borderTopWidth: 1, borderTopColor: surface.line }}>
            Research, product improvement and offers stay off unless you turn them on in Settings, Privacy. Your data is
            never sold. You can withdraw, download or delete everything at any time.
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
