import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Plus, ShieldCheck, UserPlus } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberCareCard } from "@/components/care/family-care";
import { Avatar } from "@/components/ui/avatar";
import { GLASS_SHEEN, glassCard } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";
import { Tap } from "@/components/ui/tap";
import { StaggerItem } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { useFamily } from "@/lib/profiles/family";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * FAMILY CARE (loop-caregiver).
 *
 * The account holder's view of everyone else in the family: one card each,
 * with today's doses, the week, their latest numbers and what needs a call.
 * Opened from Home's Family care card and from a caregiver alert in the
 * inbox. Paused members (beyond the plan's seats) are not shown, the same as
 * everywhere else.
 *
 * The alerts themselves come from the server (migration 0038), which sees
 * ticks from every phone; each card keeps that member's plan current there.
 *
 * REDESIGN, 17 Nov 2026: a glass hero with the family as faces and one big
 * number, then one breathable glass card per person (components/care).
 */

async function memberPhones(): Promise<Record<string, string>> {
  const { data } = await supabase.from("profiles").select("id, phone");
  const out: Record<string, string> = {};
  for (const r of (data ?? []) as { id: string; phone: string | null }[]) if (r.phone && /\d{6,}/.test(r.phone)) out[r.id] = r.phone;
  return out;
}

export default function FamilyCare() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const family = useFamily();
  const phones = useQuery({ queryKey: ["care-phones"], queryFn: memberPhones, staleTime: 5 * 60_000 });

  if (family.isPending) {
    return (
      <ScreenSkeleton title="Family care">
        <ListSkeleton rows={4} />
        <ListSkeleton rows={4} />
      </ScreenSkeleton>
    );
  }

  const others = (family.data?.access.selectable ?? []).filter((p) => !p.isPrimary);

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Family care" fallback="/home" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* The family at a glance: who you look after, as faces and one big number. Flat glass, no gradient. */}
        <StaggerItem index={0}>
          <View className="mt-3" style={[glassCard("#ffffff", "#0f1030"), { borderRadius: 28, padding: 20, shadowOpacity: 0.05 }]}>
            <View pointerEvents="none" style={GLASS_SHEEN} />
            <View className="flex-row items-start justify-between">
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500] }}>{others.length ? "You look after" : "Look after your family"}</Text>
                {others.length ? (
                  <Text style={{ marginTop: 4 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 52, lineHeight: 58, letterSpacing: -2, color: ink[900] }}>{others.length}</Text>
                    <Text style={{ fontFamily: font.medium, fontSize: 18, color: ink[500] }}>{others.length === 1 ? " person" : " people"}</Text>
                  </Text>
                ) : (
                  <Text style={{ fontFamily: font.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: ink[900], marginTop: 6 }}>Their doses, numbers and tests, in one place</Text>
                )}
              </View>
              <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
                <Icon3D name="family" size={38} />
              </View>
            </View>
            <View className="mt-4 flex-row items-center">
              {others.slice(0, 5).map((m, i) => (
                <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                  <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={42} ring="#ffffff" />
                </View>
              ))}
              <Tap
                accessibilityRole="button"
                accessibilityLabel="Add a family member"
                onPress={() => router.push("/family")}
                scale={0.94}
                style={{ marginLeft: others.length ? -6 : 0, width: 46, height: 46, borderRadius: 999, borderWidth: 2, borderColor: "#fff", backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}
              >
                <Plus size={20} color="#fff" strokeWidth={2.4} />
              </Tap>
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 14 }}>
              {others.length ? "Today's doses, their numbers and anything that needs a call." : "Add Papa or Ma to see their day here."}
            </Text>
          </View>
        </StaggerItem>

        {others.length ? (
          <View className="mt-4 gap-4">
            {others.map((m, i) => (
              <StaggerItem key={m.id} index={i + 1}>
                <MemberCareCard member={m} phone={phones.data?.[m.id] ?? null} />
              </StaggerItem>
            ))}
          </View>
        ) : (
          <PillButton style={{ marginTop: 16 }} icon={<UserPlus size={17} color="#fff" />} onPress={() => router.push("/family")}>
            Add a family member
          </PillButton>
        )}

        <View className="mt-6 flex-row items-start gap-2 px-1">
          <ShieldCheck size={15} color={ink[500]} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500] }}>
            Alerts reach this phone when doses stay unticked for 90 minutes, a strip runs low or a test is overdue. They name the person, never the medicine.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
