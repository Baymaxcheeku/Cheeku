import { useRouter } from "expo-router";
import { ArrowRight, Check } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Dots, Headline, OnboardingHeader, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { PopIn, PressRow } from "@/components/ui/motion";
import { JOURNEYS, type JourneyId } from "@/lib/onboarding/journeys";
import { supabase } from "@/lib/supabase/client";
import { brand, shadow, surface } from "@/theme/tokens";

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

  return (
    <View className="flex-1 bg-canvas">
      <OnboardingHeader back="/profile" action={{ label: "Skip", href: "/first-upload" }} />

      <View className="flex-1 px-5" style={{ paddingBottom: insets.bottom + 12 }}>
        <Headline lead="Now tell me" accent="what you're living through" />
        <Text className="mt-2 text-[13px] leading-[19px] text-ink-500">
          So I speak to your life and not a generic one. This only decides what I bring you to read
          — it is never treated as a diagnosis, and you can change it any time.
        </Text>

        <View className="mt-5 flex-1 justify-center">
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="What are you living through?"
            /*
             * `items-start`, and it is load-bearing on device.
             *
             * A wrapped flex row stretches its items to the tallest in the
             * line by default. On the web that produced six equal tiles; in
             * Yoga the line's cross size resolved against the centred, flexed
             * parent, so each item stretched to the FULL height of the screen
             * — two full-height columns, four tiles pushed off the bottom, and
             * the headline clipped behind them. It rendered correctly in the
             * browser for weeks and was broken the first time it ran natively.
             */
            className="flex-row flex-wrap items-start"
            style={{ gap: 8 }}
          >
            {JOURNEYS.map((j, i) => {
              const active = journey === j.id;
              const Icon = j.icon;
              return (
                <PressRow
                  key={j.id}
                  index={i}
                  // Tapping the selected tile clears it. Without this the only
                  // way out of an answer given by mistake is Skip, which also
                  // throws away the screen.
                  onPress={() => setJourney(active ? null : j.id)}
                  style={{ width: "48%" }}
                >
                  <View
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${j.label}. ${j.problem}`}
                    // No `h-full`: height 100% against an auto-height animated
                    // wrapper is undefined in Yoga, and it was the other half
                    // of the stretch. The tiles size to their content, which is
                    // one line of label and two of description.
                    className="rounded-card p-3.5"
                    style={[
                      shadow.e1,
                      {
                        backgroundColor: active ? brand[50] : surface.base,
                        borderWidth: 1.5,
                        borderColor: active ? brand[500] : surface.line,
                      },
                    ]}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-tile"
                      style={{ backgroundColor: TINT[j.id] ?? brand[50] }}
                    >
                      <Icon size={18} color={TINT_FG[j.id] ?? brand[600]} />
                    </View>
                    <Text className="mt-2.5 text-[13.5px] font-semibold leading-[17px] text-ink-900">
                      {j.label}
                    </Text>
                    <Text className="mt-1 text-[11.5px] leading-[15px] text-ink-500">
                      {j.problem}
                    </Text>

                    {active ? (
                      <PopIn index={0} style={{ position: "absolute", right: 10, top: 10 }}>
                        <View
                          className="h-5 w-5 items-center justify-center rounded-pill"
                          style={{ backgroundColor: brand[600] }}
                        >
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </View>
                      </PopIn>
                    ) : null}
                  </View>
                </PressRow>
              );
            })}
          </View>
        </View>

        <View className="gap-3.5">
          <ReassuranceStrip>
            This is a hint about what to read, not a medical record. Baymax never treats it as one.
          </ReassuranceStrip>
          <Button onPress={submit} disabled={pending}>
            {/*
             * "Continue" either way. Labelling the primary button "Skip for
             * now" when nothing is selected paints the loudest control on the
             * screen with the word for leaving — it reads as the app pushing
             * you past its own question. Skip already exists in the header,
             * quietly, where a way out belongs.
             */}
            <Text className="text-[16px] font-bold text-white">Continue</Text>
            <ArrowRight size={17} color="#fff" />
          </Button>
          <Dots current={2} total={5} />
        </View>
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
