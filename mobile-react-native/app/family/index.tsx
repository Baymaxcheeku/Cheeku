import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight, Lock, Plus, ShieldCheck, Users } from "lucide-react-native";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PageTitle, PillButton, ScreenHeader } from "@/components/ui/screen";
import { planFor } from "@/lib/billing/plans";
import { familyMode, listMembers, useFamily } from "@/lib/profiles/family";
import { brand, ink, lilac } from "@/theme/tokens";
import { font } from "@/theme/type";
import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";
import { Bone, ListSkeleton } from "@/components/ui/skeleton";

/*
 * Manage family: everyone on the account, including anyone a smaller plan
 * paused, with a way into each person's details.
 *
 * Unlike the tray, paused members show their names here. The tray is where
 * you pick whose health to look at, and a paused person cannot be picked; this
 * is where you decide what to do about them (upgrade, or remove), and nobody
 * can decide about a padlock with no name.
 */
export default function Family() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const family = useFamily();
  const members = useQuery({ queryKey: ["family-members"], queryFn: listMembers });

  const tier = members.data?.tier ?? family.data?.entitlement.tier ?? "free";
  const mode = familyMode(tier);
  const seats = members.data?.seats ?? 1;
  const list = members.data?.members ?? [];
  const reachable = list.filter((m) => !m.locked).length;
  const paused = list.length - reachable;
  const activeId = family.data?.profile?.id;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader fallback="/settings" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={members.isRefetching} onRefresh={() => void members.refetch()} tintColor={brand[600]} />}
      >
        <PageTitle
          title="Your family"
          line={mode === "family" ? "Everyone you look after, each with their own file." : "Your plan covers you. Family makes room for everyone."}
          style={{ marginTop: 8 }}
        />

        {/* Seats. */}
        <View style={[glassCard(PILLAR_TONE.sleep.glass), { marginTop: 18, borderRadius: 24, padding: 16 }]}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon3D name="family" size={30} />
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>{planFor(tier).name}</Text>
            </View>
            {/* No seat count until the members are in: "0 of 1" while loading was wrong. */}
            {members.isPending ? (
              <Bone w={84} h={14} r={7} />
            ) : (
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
                {Math.min(reachable, seats)} of {seats} {seats === 1 ? "seat" : "seats"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
            {members.isPending ? (
              <Bone h={8} r={4} />
            ) : (
              Array.from({ length: Math.max(seats, 1) }, (_, i) => (
                <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < reachable ? brand[600] : "rgba(255,255,255,0.9)" }} />
              ))
            )}
          </View>
          {paused > 0 ? (
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 10 }}>
              {paused === 1 ? "1 person is paused" : `${paused} people are paused`} on this plan. Nothing is deleted; Family opens their files again.
            </Text>
          ) : null}
        </View>

        {members.isPending ? <ListSkeleton rows={3} round /> : null}

        {/* Members. */}
        <Glass strong className="mt-4 overflow-hidden rounded-xl">
          {list.map((m, i) => (
            <Animated.View key={m.id} entering={still ? undefined : FadeInDown.delay(i * 40).duration(240)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${m.name}${m.locked ? ", paused" : ""}. Open details`}
                onPress={() => router.push({ pathname: "/family/[id]", params: { id: m.id } })}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 13,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: "rgba(15,16,48,0.06)",
                  backgroundColor: pressed ? "rgba(74,42,222,0.06)" : "transparent",
                })}
              >
                <View style={{ opacity: m.locked ? 0.45 : 1 }}>
                  <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={50} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 15, color: m.locked ? ink[500] : ink[900] }}>
                      {m.name}
                    </Text>
                    {m.id === activeId ? <Tag label="Viewing" tone="brand" /> : null}
                    {m.locked ? <Tag label="Paused" tone="muted" icon /> : null}
                  </View>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>
                    {m.isPrimary ? "You" : (m.relationship ?? "Family")} · {m.reports === 1 ? "1 report" : `${m.reports} reports`}
                  </Text>
                </View>
                <ChevronRight size={18} color={ink[300]} />
              </Pressable>
            </Animated.View>
          ))}
        </Glass>

        {mode === "family" ? (
          reachable < seats ? (
            <PillButton onPress={() => router.push("/family/add")} icon={<Plus size={18} color="#fff" />} style={{ marginTop: 16 }}>
              Add a family member
            </PillButton>
          ) : (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], textAlign: "center", marginTop: 16 }}>
              All 4 seats are in use. Remove someone to make room.
            </Text>
          )
        ) : (
          <Glass strong className="mt-4 rounded-xl p-4">
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>
              {paused > 0 ? "Bring them back" : "Want your family here too?"}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700], marginTop: 4 }}>
              Family covers up to 4 people for ₹249 a month, with unlimited chats for everyone.
            </Text>
            <PillButton tone="brand" onPress={() => router.push("/settings/subscription")} style={{ marginTop: 14, height: 48 }}>
              See the Family plan
            </PillButton>
          </Glass>
        )}

        <View className="mt-6 flex-row items-start gap-2 px-1">
          <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500] }}>
            Only you can see these files. Each person&apos;s reports and chats stay in their own file and never mix.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Tag({ label, tone, icon }: { label: string; tone: "brand" | "muted"; icon?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, height: 22, borderRadius: 999, backgroundColor: tone === "brand" ? brand[50] : "rgba(15,16,48,0.06)" }}>
      {icon ? <Lock size={10} color={ink[500]} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 11, color: tone === "brand" ? brand[700] : ink[500] }}>{label}</Text>
    </View>
  );
}
