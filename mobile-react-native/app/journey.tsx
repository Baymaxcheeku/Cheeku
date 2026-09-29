import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheekuSays, CtaLabel, Headline, StepLabel, Lede, OnboardingHeader } from "@/components/onboarding/chrome";
import { Boop } from "@/components/onboarding/motion";
import { Button } from "@/components/ui/button";
import { PopIn, PressRow } from "@/components/ui/motion";
import { JOURNEYS, type JourneyId } from "@/lib/onboarding/journeys";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, shadow, surface } from "@/theme/tokens";
import { type } from "@/theme/type";

/*
 * A5b — the season of life, asked AFTER the account exists.
 *
 * ┌─ WHY IT MOVED ───────────────────────────────────────────────────────────┐
 * │                                                                          │
 * │ This used to be panel 2 of the pre-signup carousel. Asking there meant   │
 * │ taking an answer with nowhere to put it: there was no account and no     │
 * │ profile, so it went to local storage and waited to be transferred onto a │
 * │ row that might never be created. Anyone who abandoned at sign-up had     │
 * │ answered a personal question into a drawer.                              │
 * │                                                                          │
 * │ Worse, it was asked before the product had shown what it does with the   │
 * │ answer, which makes it read as a survey standing between a stranger and  │
 * │ the app. Asked here, one screen after the profile is created, it is a    │
 * │ setting on something the reader can already see, and it is written       │
 * │ straight to the row it belongs to.                                       │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * WHAT THIS ANSWER IS. A personalisation hint: which articles surface on Home,
 * and nothing else. It is NEVER a clinical fact, never fed to the model as
 * history, never exported as one — the constraint is written into migration
 * 0018 and it is the reason the copy on this screen says so out loud.
 *
 * Skipping is a first-class outcome. A stranger should not have to classify
 * their own life to be allowed further in.
 */
export default function Journey() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [journey, setJourney] = useState<JourneyId | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      /*
       * Written to the PRIMARY profile — the account holder's own — not to
       * whichever profile happens to be active. This is a statement about the
       * person setting the app up, and at this point in onboarding theirs is
       * the only profile that exists anyway.
       *
       * A failure here is swallowed on purpose. Losing a content hint is not
       * worth trapping somebody inside onboarding, and it is recoverable from
       * Settings later. Nothing downstream breaks without it.
       */
      if (journey) {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (user) {
          await supabase
            .from("profiles")
            .update({ journey })
            .eq("user_id", user.id)
            .eq("is_primary", true);
        }
      }
      router.push("/first-upload");
    } finally {
      setPending(false);
    }
  }

  const picked = JOURNEYS.find((j) => j.id === journey);

  return (
    <View className="flex-1 bg-canvas">
      <OnboardingHeader back="/profile" action={{ label: "Skip", href: "/first-upload" }} step={3} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <StepLabel step={3} />
        <Headline lead="What brings you" accent="to Cheeku?" />
        <Lede>
          Pick what fits your life right now, and I&apos;ll bring you things worth reading. It is
          never treated as a diagnosis, and you can change it any time.
        </Lede>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="What brings you to Cheeku?"
          /*
           * `items-start`, and it is load-bearing on device. A wrapped flex row
           * stretches its items to the tallest in the line by default, and in
           * Yoga that resolved against the flexed parent: two full-height
           * columns and four tiles pushed off screen. See PROGRESS.md.
           */
          className="mt-6 flex-row flex-wrap items-start"
          style={{ gap: 10 }}
        >
          {JOURNEYS.map((j, i) => {
            const active = journey === j.id;
            const Icon = j.icon;
            const tint = TINT[j.id] ?? brand[50];
            const fg = TINT_FG[j.id] ?? brand[600];
            return (
              <PressRow
                key={j.id}
                index={i}
                // Tapping the selected tile clears it. Without this the only
                // way out of an answer given by mistake is Skip.
                onPress={() => setJourney(active ? null : j.id)}
                style={{ width: "48.4%" }}
              >
                <Boop trigger={active ? j.id : null}>
                  <View
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${j.label}. ${j.problem}`}
                    // No `h-full`: a percentage height against an auto-height
                    // animated wrapper is undefined in Yoga.
                    className="rounded-[22px] p-4"
                    style={[
                      active ? shadow.e2 : shadow.e1,
                      {
                        backgroundColor: active ? tint : surface.base,
                        borderWidth: 2,
                        borderColor: active ? fg : surface.line,
                        minHeight: 138,
                      },
                    ]}
                  >
                    <View
                      className="h-11 w-11 items-center justify-center rounded-pill"
                      style={{ backgroundColor: active ? surface.base : tint }}
                    >
                      <Icon size={20} color={fg} />
                    </View>
                    <Text style={[type.label, { marginTop: 12, fontSize: 14.5 }]}>{j.label}</Text>
                    <Text style={[type.caption, { marginTop: 3, lineHeight: 16, color: ink[500] }]}>{j.problem}</Text>

                    {active ? (
                      <PopIn index={0} style={{ position: "absolute", right: 12, top: 12 }}>
                        <View
                          className="h-6 w-6 items-center justify-center rounded-pill"
                          style={{ backgroundColor: fg }}
                        >
                          <Check size={14} color="#fff" strokeWidth={3.2} />
                        </View>
                      </PopIn>
                    ) : null}
                  </View>
                </Boop>
              </PressRow>
            );
          })}
        </View>
      </ScrollView>

      <View className="gap-4 px-6 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <CheekuSays>{picked?.reaction ?? "Pick whatever fits. Or skip it, no pressure."}</CheekuSays>
        <Button onPress={submit} disabled={pending}>
          {/*
           * "Continue" either way. Labelling the primary button "Skip" when
           * nothing is selected paints the loudest control with the word for
           * leaving. Skip already exists in the header, quietly.
           */}
          <CtaLabel>Continue</CtaLabel>
        </Button>
      </View>
    </View>
  );
}

/*
 * The journey tints as values. `journeys.ts` carries them as Tailwind class
 * strings for the web build; NativeWind cannot apply an arbitrary class to an
 * SVG icon's `color` prop, so the same palette is mirrored here. Non-semantic
 * on purpose: green, amber and red mean health status everywhere else.
 */
const TINT: Record<string, string> = {
  expecting: "#f3e9fd",
  fertility: "#e6f1fd",
  caregiver: "#fdeee0",
  new_parent: "#fdeaf0",
  optimiser: "#eaf6ec",
  other: brand[50],
};

const TINT_FG: Record<string, string> = {
  expecting: "#7b3fd4",
  fertility: "#1a6fc2",
  caregiver: "#c2650b",
  new_parent: "#c22a6b",
  optimiser: "#1f8a45",
  other: brand[600],
};
