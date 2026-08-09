import { Crown, Lock, Users } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { allowsFamily, type Tier } from "@/lib/billing/plans";
import { Avatar } from "@/components/ui/avatar";
import type { ActiveProfile } from "@/lib/profiles/context";
import { brand, ink, surface } from "@/theme/tokens";

/*
 * B2 — the family switcher, as the inline row on Home.
 *
 * The ring colour is decorative identity, deliberately drawn from a
 * NON-SEMANTIC palette: green/amber/red mean health severity everywhere in this
 * app, and a green ring around someone's face would read as a verdict on them.
 */
const RINGS = [
  "#6C4EF6", // brand violet
  "#0E9BD1", // cyan
  "#D6459B", // magenta
  "#3F5BD9", // indigo
  "#7A5AF8", // light violet
  "#5B6B8C", // slate
] as const;

function ringFor(index: number): string {
  return RINGS[index % RINGS.length] ?? RINGS[0];
}

function Face({ profile, index, size }: { profile: ActiveProfile; index: number; size: number }) {
  // The ring, the clip and the content-box sizing all live in Avatar. Rolling
  // a circle by hand here is what squashed every face to 48x44.
  return (
    <Avatar
      svg={profile.avatar}
      background={profile.avatarBackground ?? undefined}
      size={size}
      ring={ringFor(index)}
    />
  );
}

export function FamilySwitcher({
  profiles,
  activeId,
  tier = "free",
  lockedCount = 0,
  onSelect,
  onUpgrade,
  onViewAll,
}: {
  /**
   * ONLY the profiles the current plan can actually open — see
   * `selectableProfiles`. Passing the full roster here would draw faces that
   * `switchProfile` then refuses to switch to, which reads as a broken control
   * rather than a locked feature.
   */
  profiles: readonly ActiveProfile[];
  activeId: string;
  tier?: Tier;
  /** Profiles that exist on the account but are behind the plan. */
  lockedCount?: number;
  onSelect: (profileId: string) => void;
  /** Opens the paywall. Both the padlocks and the Family plan chip call it. */
  onUpgrade?: () => void;
  /** Opens the full roster. The "All" chip existed with no handler until now. */
  onViewAll?: () => void;
}) {
  const canSwitch = allowsFamily(tier);
  if (profiles.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4, gap: 12 }}
      accessibilityRole="radiogroup"
      accessibilityLabel="Family member"
    >
      {profiles.map((profile, i) => {
        const active = profile.id === activeId;

        /*
         * The selected member expands into a labelled pill, as in the frame,
         * rather than only tinting. On a row of small faces a tint is far too
         * quiet a signal for "whose health am I looking at".
         */
        if (active) {
          return (
            <View
              key={profile.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: true }}
              aria-checked
              className="flex-row items-center gap-2.5 rounded-card bg-brand-50 py-1.5 pl-1.5 pr-4"
            >
              <Face profile={profile} index={i} size={48} />
              <View>
                <Text
                  className="max-w-[110px] text-[14px] font-semibold text-ink-900"
                  numberOfLines={1}
                >
                  {profile.name}
                </Text>
                <Text className="text-[11px] text-ink-500">
                  {profile.isPrimary ? "Me" : (profile.relationship ?? "Family")}
                </Text>
              </View>
              <View className="h-2 w-2 rounded-pill bg-brand-600" />
            </View>
          );
        }

        return (
          <Pressable
            key={profile.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: false }}
            aria-checked={false}
            accessibilityLabel={`Switch to ${profile.name}`}
            onPress={() => onSelect(profile.id)}
            className="items-center gap-1.5 px-1 py-1"
          >
            <Face profile={profile} index={i} size={48} />
            <Text className="max-w-[64px] text-[11px] text-ink-500" numberOfLines={1}>
              {profile.name}
            </Text>
          </Pressable>
        );
      })}

      {/*
       * Members this plan does not reach, drawn as padlocks rather than
       * omitted.
       *
       * Silently dropping them would tell a downgraded subscriber their
       * mother's records are gone. They are not — they are untouched and one
       * upgrade away — so the row says "locked", which is true, instead of
       * "absent", which is not.
       *
       * Pressable, and they open the paywall — the padlock is the reason
       * somebody wants to upgrade, so it is the natural place to ask. It is
       * still never labelled with the real member's name or face: the point of
       * the lock is that the plan does not reach them, and using their identity
       * as bait would be selling against their own data.
       */}
      {!canSwitch && lockedCount > 0
        ? Array.from({ length: Math.min(lockedCount, 3) }, (_, i) => (
            <Pressable
              key={`locked-${i}`}
              accessibilityRole="button"
              accessibilityLabel="Locked. Family members are part of the Family plan. Opens plans"
              onPress={onUpgrade}
              className="items-center gap-1.5 px-1 py-1"
            >
              <View
                className="h-12 w-12 items-center justify-center rounded-pill bg-surface-tint"
                style={{ borderWidth: 1, borderStyle: "dashed", borderColor: surface.line }}
              >
                <Lock size={16} color={ink[300]} />
              </View>
              <Text className="text-[11px] text-ink-300">Locked</Text>
            </Pressable>
          ))
        : null}

      {/*
       * The trailing chip. On a Family plan it opens the roster; otherwise it
       * opens the paywall. It previously rendered as plain text with no
       * handler on the paid tier, so the one control that looked like "show me
       * everyone" did nothing at all.
       */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={canSwitch ? "See all family members" : "Family plan. Opens plans"}
        onPress={canSwitch ? onViewAll : onUpgrade}
        className="items-center gap-1.5 px-1 py-1"
      >
        <View
          className="h-12 w-12 items-center justify-center rounded-pill bg-surface"
          style={{ borderWidth: 1, borderColor: canSwitch ? surface.line : brand[200] }}
        >
          {canSwitch ? (
            <Users size={18} color={ink[500]} />
          ) : (
            <Crown size={17} color={brand[600]} />
          )}
        </View>
        <Text className="text-[11px]" style={{ color: canSwitch ? ink[500] : brand[600] }}>
          {canSwitch ? "All" : "Family plan"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
