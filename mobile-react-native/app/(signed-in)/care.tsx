import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { HeartHandshake, ShieldCheck, UserPlus } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberCareCard } from "@/components/care/family-care";
import { Avatar } from "@/components/ui/avatar";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { StaggerItem } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { useFamily } from "@/lib/profiles/family";
import { supabase } from "@/lib/supabase/client";
import { hue, ink, lilac } from "@/theme/tokens";
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
        <StaggerItem index={0}>
          <View className="mt-3 overflow-hidden rounded-2xl p-4" style={glassShadow}>
            <Gradient from={lilac.base} to={lilac.deep} glow="#ffffff" />
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: "#fff" }}>
                <HeartHandshake size={20} color={hue.rose.fg} />
              </View>
              <View className="min-w-0 flex-1">
                <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>
                  {others.length ? "How everyone's doing" : "Look after your family"}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>
                  {others.length ? "Today's doses, their numbers and anything that needs a call." : "Add Papa or Ma and see their doses, numbers and tests here."}
                </Text>
              </View>
            </View>
            {others.length ? (
              <View className="mt-3 flex-row">
                {others.slice(0, 5).map((m, i) => (
                  <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                    <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={30} ring="#ffffff" />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </StaggerItem>

        {others.length ? (
          <View className="mt-4 gap-3">
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
