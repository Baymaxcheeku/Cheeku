import { useRouter } from "expo-router";
import { Check, ShieldCheck, Users, type LucideIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarFamily, AvatarSolo } from "@/components/illustrations/avatar-cluster";
import { Avatar } from "@/components/ui/avatar";
import { CheekuSays, CtaLabel, Headline, StepLabel, Lede, OnboardingHeader } from "@/components/onboarding/chrome";
import { Boop } from "@/components/onboarding/motion";
import { PopIn } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { setAudience, type Audience } from "@/lib/auth/audience";
import { avatarPicks } from "@/lib/profiles/avatar";
import { brand, ink, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

const OPTIONS: readonly {
  value: Audience;
  title: string;
  body: string;
  badge: { icon: LucideIcon; label: string };
  art: "solo" | "family";
  /** What Cheeku says when this is picked. Warmth only, never about health. */
  reaction: string;
}[] = [
  {
    value: "me",
    title: "Just me",
    body: "My reports, my prescriptions, my questions.",
    badge: { icon: ShieldCheck, label: "Private to you" },
    art: "solo",
    reaction: "Just the two of us then. Deal!",
  },
  {
    value: "family",
    title: "Me and my family",
    body: "Parents, partner, kids. Up to 4 people.",
    badge: { icon: Users, label: "Everyone in one place" },
    art: "family",
    reaction: "A full house! I'll keep everyone's files separate.",
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
  const [avatar, setAvatar] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Ten SVGs, generated once. Regenerating them on every keystroke of state
  // elsewhere on the screen would redraw the whole tray for nothing.
  const picks = useMemo(() => avatarPicks(), []);
  const chosen = picks.find((p) => p.id === avatar) ?? null;

  async function submit() {
    setPending(true);
    try {
      await setAudience(audience);
      /*
       * The face travels as a route param, not through storage.
       *
       * There is no profile to write it to yet — /profile creates that on the
       * next screen — and a value parked in local storage for a row that may
       * never exist is the mistake the journey picker was making. As a param
       * it lands in the insert one screen later, or vanishes with the
       * navigation if they back out. Nothing to clean up either way.
       */
      router.push(avatar ? { pathname: "/profile", params: { avatar } } : "/profile");
    } finally {
      setPending(false);
    }
  }

  const reaction = OPTIONS.find((o) => o.value === audience)?.reaction ?? "";

  return (
    <View className="flex-1 bg-canvas">
      <OnboardingHeader back="/sign-in" action={{ label: "Skip", href: "/profile" }} step={1} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <StepLabel step={1} />
        <Headline lead="Who are we" accent="looking after?" />
        <Lede>Pick one. You can add family members any time.</Lede>

        {/*
         * The check sits in the card's own top-right corner rather than in the
         * text column, so both cards line up whatever their titles say. The art
         * sits in a fixed-width column for the same reason.
         */}
        <View accessibilityRole="radiogroup" accessibilityLabel="Who is this for?" className="mt-6 gap-3">
          {OPTIONS.map((option) => {
            const selected = audience === option.value;
            const Badge = option.badge.icon;
            return (
              <Boop key={option.value} trigger={selected ? audience : null}>
                <Tap scale={0.98}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  aria-checked={selected}
                  accessibilityLabel={`${option.title}. ${option.body}`}
                  onPress={() => setAudienceChoice(option.value)}
                  className="flex-row items-center gap-4 rounded-xl p-4 pr-12"
                  style={[
                    {
                      borderWidth: 2,
                      borderColor: selected ? brand[500] : surface.line,
                      backgroundColor: selected ? brand[50] : surface.base,
                    },
                    selected ? shadow.e2 : shadow.e1,
                  ]}
                >
                  <View
                    pointerEvents="none"
                    className="absolute right-4 top-4 h-6 w-6 items-center justify-center rounded-pill"
                    style={{
                      borderWidth: 2,
                      borderColor: selected ? brand[600] : brand[200],
                      backgroundColor: selected ? brand[600] : surface.base,
                    }}
                  >
                    {selected ? (
                      <PopIn>
                        <Check size={14} color="#ffffff" strokeWidth={3.2} />
                      </PopIn>
                    ) : null}
                  </View>

                  {/*
                   * The card shows the face that was picked, not a stand-in.
                   * Choosing yourself in the tray and still seeing somebody
                   * else's portrait above it is the complaint the tray answers.
                   */}
                  <View className="w-[76px] items-center justify-center">
                    {option.art === "solo" ? (
                      chosen ? (
                        <Avatar svg={chosen.svg} image={chosen.image} background={chosen.background} size={66} />
                      ) : (
                        <AvatarSolo size={66} />
                      )
                    ) : (
                      <AvatarFamily size={56} />
                    )}
                  </View>

                  <View className="min-w-0 flex-1">
                    <Text style={[type.heading, { fontSize: 20 }]}>{option.title}</Text>
                    <Text style={[type.bodySmall, { marginTop: 3 }]}>{option.body}</Text>
                    <View
                      className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-pill px-2.5 py-1"
                      style={{ backgroundColor: selected ? surface.base : brand[50] }}
                    >
                      <Badge size={12} color={brand[700]} />
                      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: brand[700] }} numberOfLines={1}>
                        {option.badge.label}
                      </Text>
                    </View>
                  </View>
                </Tap>
              </Boop>
            );
          })}
        </View>

        {/*
         * The face picker, and only for "me".
         *
         * A uuid-derived avatar is a coin toss, so a man setting up his own
         * profile was handed a woman's face with no way to change it.
         *
         * NOT SHOWN FOR "family": those faces stand for people who do not
         * exist yet, and picking one would be choosing a face for somebody else.
         *
         * NOT A GENDER FIELD. Nothing is labelled or grouped, and no pick is
         * stored as anything but a drawing id. `sex` is asked once, as a health
         * field, on the profile form.
         */}
        {audience === "me" ? (
          <View className="mt-6">
            <View className="flex-row items-baseline justify-between">
              <Text style={type.label}>Pick a face that feels like you</Text>
              <Text style={[type.caption, { color: ink[300] }]}>Optional</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 12, paddingRight: 24 }}
            >
              {picks.map((pick) => {
                const on = avatar === pick.id;
                return (
                  <Tap
                    key={pick.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    // Numbered, because the alternative is describing a
                    // stranger's face to them in a screen reader.
                    accessibilityLabel={`Avatar option ${pick.id.slice(1)}`}
                    // Tapping the chosen one clears it.
                    onPress={() => setAvatar(on ? null : pick.id)}
                  >
                    <Boop trigger={on ? pick.id : null}>
                      <View
                        className="rounded-pill p-[3px]"
                        style={{ backgroundColor: on ? brand[600] : surface.line }}
                      >
                        <Avatar svg={pick.svg} image={pick.image} background={pick.background} size={56} />
                      </View>
                      {on ? (
                        <View
                          pointerEvents="none"
                          className="absolute -right-0.5 -top-0.5 h-5 w-5 items-center justify-center rounded-pill"
                          style={{ backgroundColor: brand[600], borderWidth: 2, borderColor: "#fff" }}
                        >
                          <Check size={10} color="#fff" strokeWidth={3.5} />
                        </View>
                      ) : null}
                    </Boop>
                  </Tap>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <View className="gap-4 px-6 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        {reaction ? <CheekuSays>{reaction}</CheekuSays> : null}
        <Button onPress={submit} disabled={pending}>
          {pending ? <Text style={type.button}>One moment…</Text> : <CtaLabel>Continue</CtaLabel>}
        </Button>
      </View>
    </View>
  );
}
