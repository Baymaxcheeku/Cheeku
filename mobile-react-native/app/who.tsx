import { useRouter } from "expo-router";
import { ArrowRight, Check, ShieldCheck, Users, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarFamily, AvatarSolo } from "@/components/illustrations/avatar-cluster";
import { Dots, Headline, OnboardingHeader, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { setAudience, type Audience } from "@/lib/auth/audience";
import { brand, shadow, surface } from "@/theme/tokens";

const OPTIONS: readonly {
  value: Audience;
  title: string;
  body: string;
  badge: { icon: LucideIcon; label: string };
  art: "solo" | "family";
}[] = [
  {
    value: "me",
    title: "It's for me",
    body: "Manage and track my own health records.",
    badge: { icon: ShieldCheck, label: "Private. Secure. Just for you" },
    art: "solo",
  },
  {
    value: "family",
    title: "It's for my family",
    body: "Manage health for my loved ones.",
    // Shortened from the web build's "Add and manage family members easily".
    // At 11px that ran the full width of the text column, so the pill stopped
    // reading as a badge and started reading as a bar pinned to the card edge.
    badge: { icon: Users, label: "Manage everyone in one place" },
    art: "family",
  },
];

/**
 * A4 — audience choice. Personalisation and routing only; it gates no feature.
 *
 * Picking "family" here is not consent to be charged and does not grant family
 * access. All it does is decide whether the plan step at the end of onboarding
 * is worth showing. The tier is the only thing that decides what the account
 * can do.
 */
export default function Who() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [audience, setAudienceChoice] = useState<Audience>("me");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      await setAudience(audience);
      router.push("/profile");
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="flex-1 bg-canvas">
      <OnboardingHeader back="/sign-in" action={{ label: "Skip", href: "/profile" }} />

      <View className="flex-1 px-5" style={{ paddingBottom: insets.bottom + 12 }}>
        <Headline lead="Who is" accent="this for?" />
        <Text className="mt-2 text-[13px] leading-[19px] text-ink-500">
          Choose an option to personalize your experience. You can add more members later.
        </Text>

        {/*
         * The check marker sits in the card's own top right corner rather than
         * in the text column. Inside the column its position depended on how
         * long the title happened to be, which is why the two cards never lined
         * up with each other in the web build.
         *
         * The art sits in a fixed-width column for the same reason: the solo
         * portrait and the three-face cluster are different widths, so letting
         * them size themselves left the two titles starting at different x.
         */}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Who is this for?"
          // Centred rather than top-aligned. The two cards cannot fill an 852pt
          // screen at any honest spacing, and pinning them to the top dumped
          // every leftover pixel into one slab above the footer. Splitting it
          // reads as an airy composition instead of an unfinished one.
          className="mt-5 flex-1 justify-center gap-3"
        >
          {OPTIONS.map((option) => {
            const selected = audience === option.value;
            const Badge = option.badge.icon;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                aria-checked={selected}
                accessibilityLabel={`${option.title}. ${option.body}`}
                onPress={() => setAudienceChoice(option.value)}
                className="flex-row items-start gap-3.5 rounded-card p-3.5 pr-11"
                style={[
                  {
                    borderWidth: 2,
                    borderColor: selected ? brand[500] : surface.line,
                    backgroundColor: selected ? brand[50] : surface.base,
                  },
                  selected ? shadow.e1 : null,
                ]}
              >
                <View
                  pointerEvents="none"
                  className="absolute right-3.5 top-3.5 h-[22px] w-[22px] items-center justify-center rounded-pill"
                  style={{
                    borderWidth: 2,
                    borderColor: selected ? brand[600] : brand[200],
                    backgroundColor: selected ? brand[600] : surface.base,
                  }}
                >
                  {selected ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
                </View>

                {/* 78pt, not the web build's 92. The badge underneath is the
                    widest thing in the text column and at 92 it wrapped to two
                    ragged lines inside its own pill. */}
                <View className="w-[78px] items-center justify-center">
                  {option.art === "solo" ? <AvatarSolo size={64} /> : <AvatarFamily size={64} />}
                </View>

                <View className="min-w-0 flex-1 pt-0.5">
                  <Text className="text-[15.5px] font-bold leading-tight text-ink-900">
                    {option.title}
                  </Text>
                  <Text className="mt-1 text-[12.5px] leading-[17px] text-ink-500">
                    {option.body}
                  </Text>
                  <View
                    className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-pill px-2.5 py-1.5"
                    style={{ backgroundColor: selected ? surface.base : brand[50] }}
                  >
                    <Badge size={12} color={brand[700]} />
                    <Text className="text-[11px] font-medium text-brand-700" numberOfLines={1}>
                      {option.badge.label}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-5 gap-4">
          <ReassuranceStrip>
            Bank-level encryption. Only you and your family can access.
          </ReassuranceStrip>
          <Button onPress={submit} disabled={pending}>
            <Text className="text-[16px] font-bold text-white">
              {pending ? "One moment…" : "Continue"}
            </Text>
            {pending ? null : <ArrowRight size={18} color="#ffffff" />}
          </Button>
          <Dots current={2} total={5} />
        </View>
      </View>
    </View>
  );
}
