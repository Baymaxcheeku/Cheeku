import { Check, Lock, UserPlus, X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { castFaces } from "@/lib/profiles/avatar";
import type { ActiveProfile } from "@/lib/profiles/context";
import { brand, ink, shadow, surface } from "@/theme/tokens";

/**
 * The whole family, opened from the "All" chip on Home.
 *
 * That chip was drawn from the start and never had a handler — on a Family
 * plan it rendered as plain text with `onPress` undefined, so tapping it did
 * nothing at all. This is what it was always pointing at: the roster the
 * horizontal strip cannot show, because the strip has room for three faces and
 * a family has up to six.
 *
 * It does three things the strip cannot. It names everyone rather than
 * truncating, it shows the locked members as locked instead of omitting them,
 * and it is where "add a member" belongs — beside the list of who is already
 * here, rather than only in Settings.
 */
export function FamilyTray({
  open,
  onClose,
  profiles,
  lockedCount,
  activeId,
  canAdd,
  onSelect,
  onAdd,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  /** Only the members the plan can open — same rule as the strip. */
  profiles: readonly ActiveProfile[];
  lockedCount: number;
  activeId: string;
  canAdd: boolean;
  onSelect: (profileId: string) => void;
  onAdd: () => void;
  onUpgrade: () => void;
}) {
  const insets = useSafeAreaInsets();
  const lockedFaces = castFaces(4);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.4)" }}
      />
      <View
        className="rounded-t-sheet bg-canvas pt-5"
        style={{ maxHeight: "82%", paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row items-start gap-3 px-5">
          <View className="min-w-0 flex-1">
            <Text className="text-[20px] font-bold tracking-tight text-ink-900">Your family</Text>
            <Text className="mt-1 text-[12.5px] leading-[18px] text-ink-500">
              Choose whose health you&apos;re looking at. Records never mix between people.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <X size={17} color={ink[500]} />
          </Pressable>
        </View>

        <ScrollView
          className="mt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          <View className="mx-5 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
            {profiles.map((profile, i) => {
              const active = profile.id === activeId;
              return (
                <Pressable
                  key={profile.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={
                    active ? `${profile.name}, currently viewing` : `Switch to ${profile.name}`
                  }
                  onPress={() => {
                    if (!active) onSelect(profile.id);
                    onClose();
                  }}
                  className="flex-row items-center gap-3 px-3.5 py-3"
                  style={{
                    backgroundColor: active ? brand[50] : undefined,
                    ...(i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : null),
                  }}
                >
                  <Avatar
                    svg={profile.avatar}
                    background={profile.avatarBackground ?? undefined}
                    size={44}
                  />
                  <View className="min-w-0 flex-1">
                    <Text className="text-[14.5px] font-semibold text-ink-900" numberOfLines={1}>
                      {profile.name}
                    </Text>
                    <Text className="mt-0.5 text-[11.5px] text-ink-500">
                      {active
                        ? "Currently viewing"
                        : profile.isPrimary
                          ? "You"
                          : (profile.relationship ?? "Family")}
                    </Text>
                  </View>
                  {active ? (
                    <View className="h-6 w-6 items-center justify-center rounded-pill bg-brand-600">
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

            {/*
             * Locked members appear WITHOUT their name or face. The reader knows
             * who they are; the point of the lock is that the plan does not
             * reach them, and rendering a real member's identity as bait for an
             * upgrade would be using their own data to sell against them.
             */}
            {Array.from({ length: lockedCount }, (_, i) => (
              <Pressable
                key={`locked-${i}`}
                accessibilityRole="button"
                accessibilityLabel="Locked family member. Opens plans"
                onPress={() => {
                  onClose();
                  onUpgrade();
                }}
                className="flex-row items-center gap-3 px-3.5 py-3"
                style={{ borderTopWidth: 1, borderTopColor: surface.line }}
              >
                <View className="h-11 w-11 items-center justify-center">
                  <View style={{ opacity: 0.25, position: "absolute" }}>
                    <Avatar svg={lockedFaces[i % lockedFaces.length] ?? ""} size={44} />
                  </View>
                  <Lock size={15} color={ink[500]} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14.5px] font-semibold text-ink-300">Family member</Text>
                  <Text className="mt-0.5 text-[11.5px] text-ink-300">
                    Part of the Family plan. Their records are safe.
                  </Text>
                </View>
                <Text className="text-[12px] font-semibold text-brand-600">Upgrade</Text>
              </Pressable>
            ))}
          </View>

          <View className="mx-5 mt-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={canAdd ? "Add a family member" : "Add a family member. Opens plans"}
              onPress={() => {
                onClose();
                // On a plan with no family seats this is the upgrade prompt
                // rather than a form that would be refused on submit.
                if (canAdd) onAdd();
                else onUpgrade();
              }}
              className="flex-row items-center gap-3 rounded-card bg-surface px-3.5 py-3"
              style={shadow.e1}
            >
              <View
                className="h-11 w-11 items-center justify-center rounded-pill bg-brand-50"
                style={{ borderWidth: 1, borderStyle: "dashed", borderColor: brand[200] }}
              >
                <UserPlus size={18} color={brand[600]} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[14.5px] font-semibold text-brand-600">
                  Add a family member
                </Text>
                <Text className="mt-0.5 text-[11.5px] text-ink-500">
                  {canAdd
                    ? "Keep their reports beside yours"
                    : "Family access covers up to 4 people"}
                </Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
