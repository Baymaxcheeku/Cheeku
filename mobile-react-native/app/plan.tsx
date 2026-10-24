import { useRouter } from "expo-router";
import { ArrowRight, Check, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FamilyScene } from "@/components/illustrations/scenes";
import { Headline, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { Backdrop } from "@/components/ui/screen";
import { font } from "@/theme/type";
import { Paywall } from "@/components/billing/paywall";
import { Button } from "@/components/ui/button";
import { clearAudience, readAudience } from "@/lib/auth/audience";
import { formatPrice, PLANS } from "@/lib/billing/plans";
import { brand, lilac, surface } from "@/theme/tokens";

/**
 * A7 — family access, offered once, skippable.
 *
 * Only for people who said "it's for my family" on A4. Family access is
 * genuinely gated on the Family plan, so someone who picked it would otherwise
 * finish onboarding, land on Home and find they cannot add anyone — a dead end
 * they were walked into. This asks at the point the choice was made.
 *
 * It is skippable on purpose. Choosing "family" is not consent to be charged,
 * and an onboarding flow that cannot be completed without paying is a wall, not
 * a funnel. Skipping starts them on free with their own profile, which is
 * exactly what the "it's for me" path gives.
 *
 * The skip is a plain secondary button rather than a faint text link. Making
 * the way out hard to find is the standard trick here and it is not one worth
 * copying in an app that holds someone's medical records: the trust cost is
 * permanent and the conversion gain is not.
 */
export default function Plan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pending, setPending] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  /*
   * The web page did this check on the server before rendering a byte. Here it
   * runs on mount, so someone who chose "just me" and reached this route
   * directly is sent onward rather than shown an upsell for something they
   * already declined.
   *
   * The web version also skipped anyone who already holds a plan. That check
   * needs the entitlement read, which lands with billing in a later phase; the
   * audience half is the half that exists to be checked today.
   */
  useEffect(() => {
    let cancelled = false;
    void readAudience().then((audience) => {
      if (!cancelled && audience !== "family") router.replace("/home");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function finish() {
    setPending(true);
    try {
      // Cleared either way. Once this step has been answered the hint has
      // stopped describing anything, and a stale "family" would re-offer this.
      await clearAudience();
      router.replace("/home");
    } finally {
      setPending(false);
    }
  }

  const family = PLANS.family;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <View className="h-11 flex-row items-center px-5" style={{ marginTop: insets.top }}>
        <Glass className="ml-auto rounded-pill px-3 py-1.5">
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: brand[700] }}>Last step</Text>
        </Glass>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Headline lead="You're set up for" accent="your family" />
        <Text className="mt-2 text-sm leading-[19px] text-ink-500">
          Family access lets you keep records for everyone and switch between them. It&apos;s part of
          the Family plan.
        </Text>

        {/* Sized so the headline, the plan card and both buttons all clear the
            fold on a 852pt display: this screen must never need scrolling to
            find the way out of it. */}
        <View className="items-center py-1">
          <FamilyScene size={150} />
        </View>

        <View className="overflow-hidden rounded-2xl p-4" style={[glassShadow, { borderWidth: 2, borderColor: brand[300] }]}>
          <Gradient from="#ffffff" to={lilac.base} glow="#ffffff" />
          <View className="flex-row items-start gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-tile bg-brand-50">
              <Users size={20} color={brand[600]} />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-bold text-ink-900">{family.name}</Text>
                {family.highlight ? (
                  <View className="rounded-pill bg-brand-600 px-2 py-0.5">
                    <Text className="text-3xs font-bold text-white">{family.highlight}</Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-0.5 text-xs text-ink-500">{family.tagline}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xl font-bold leading-none text-ink-900">
                {formatPrice(family.priceInPaise)}
              </Text>
              <Text className="mt-0.5 text-2xs text-ink-500">/{family.period}</Text>
            </View>
          </View>

          <View
            className="mt-3 gap-1.5 pt-3"
            style={{ borderTopWidth: 1, borderTopColor: surface.line }}
          >
            {family.features.map((feature) => (
              <View key={feature} className="flex-row items-start gap-2">
                {/* Brand, not green: a plan feature is not a health result. */}
                <Check size={14} color={brand[600]} strokeWidth={2.6} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sm leading-[18px] text-ink-700">{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-4 gap-2.5">
          {/*
           * Opens the real chooser. The way past this screen still works
           * regardless — nobody is stuck behind a purchase, which matters more
           * here than anywhere else in the app because this is onboarding and
           * the reader has not seen a single record yet.
           */}
          <Button onPress={() => setPaywallOpen(true)}>
            <Text className="text-lg font-bold text-white">See plans</Text>
            <ArrowRight size={18} color="#ffffff" />
          </Button>

          <Button variant="secondary" onPress={finish} disabled={pending}>
            <Text className="text-lg font-bold text-ink-700">
              {pending ? "One moment…" : "Start free with just me"}
            </Text>
          </Button>
          <Text className="text-center text-xs leading-[16px] text-ink-500">
            You can add family members later from your Profile.
          </Text>
        </View>

        <View className="mt-auto gap-3 pt-4">
          <ReassuranceStrip />
        </View>

        <Paywall
          open={paywallOpen}
          reason="onboarding"
          onClose={() => setPaywallOpen(false)}
          onActivated={() => {
            setPaywallOpen(false);
            // Straight on to Home. Sending someone back to a plan chooser they
            // just bought from is the clearest way to make a purchase feel like
            // it did not register.
            router.replace("/home");
          }}
        />
      </ScrollView>
    </View>
  );
}
