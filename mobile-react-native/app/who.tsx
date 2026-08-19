import { useRouter } from "expo-router";
import { ArrowRight, Check, ShieldCheck, Users, type LucideIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarFamily, AvatarSolo } from "@/components/illustrations/avatar-cluster";
import { Avatar } from "@/components/ui/avatar";
import { Dots, Headline, OnboardingHeader, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { setAudience, type Audience } from "@/lib/auth/audience";
import { avatarPicks } from "@/lib/profiles/avatar";
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
                {/*
                 * The card shows the face that was picked, not a stand-in.
                 * Choosing yourself in a tray and then still seeing somebody
                 * else's portrait on the card above it is the same complaint
                 * the tray exists to answer, moved eight points up the screen.
                 */}
                <View className="w-[78px] items-center justify-center">
                  {option.art === "solo" ? (
                    chosen ? (
                      <Avatar svg={chosen.svg} background={chosen.background} size={64} />
                    ) : (
                      <AvatarSolo size={64} />
                    )
                  ) : (
                    <AvatarFamily size={64} />
                  )}
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

        {/*
         * The face picker, and only for "me".
         *
         * A uuid-derived avatar is a coin toss, so a man setting his own
         * profile up was being handed a woman's face with no way to change it.
         * It appears here rather than on the profile form because this is the
         * screen where the reader has just said the account is theirs — the
         * question "so which one is you" belongs to that answer.
         *
         * NOT SHOWN FOR "family": the faces there stand for several people who
         * do not exist yet, and picking one of them would be choosing a face
         * for somebody else.
         *
         * NOT A GENDER FIELD. Nothing is labelled, nothing is grouped, and no
         * pick is stored as anything but a drawing id. `sex` is asked once, as
         * a health field, on the profile form.
         */}
        {audience === "me" ? (
          <View className="mt-4">
            <Text className="text-[13px] font-semibold text-ink-900">Pick your face</Text>
            <Text className="mt-0.5 text-[12px] text-ink-500">
              Optional, and you can change it later.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 10, paddingRight: 20 }}
            >
              {picks.map((pick) => {
                const on = avatar === pick.id;
                return (
                  <Pressable
                    key={pick.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    // Numbered, because the alternative is describing a
                    // stranger's face to them in a screen reader.
                    accessibilityLabel={`Avatar option ${pick.id.slice(1)}`}
                    // Tapping the chosen one clears it, so a pick made by
                    // mistake does not have to be replaced by another pick.
                    onPress={() => setAvatar(on ? null : pick.id)}
                  >
                    {/*
                     * The ring is drawn as a padded disc rather than through
                     * Avatar's own `ring`, which is a fixed 2pt everywhere in
                     * the app. At 2pt a selected face and an unselected one
                     * are nearly the same object; a chosen thing should be
                     * unmistakable at a glance.
                     */}
                    <View
                      className="rounded-pill p-[3px]"
                      style={{ backgroundColor: on ? brand[600] : surface.line }}
                    >
                      <Avatar svg={pick.svg} background={pick.background} size={54} />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

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
