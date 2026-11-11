import { useRouter } from "expo-router";
import { Plus, ShieldPlus } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PolicyCard } from "@/components/insurance/parts";
import { ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { Backdrop, PageTitle, PillButton, ScreenHeader } from "@/components/ui/screen";
import { glassShadow } from "@/components/ui/glass";
import { usePolicies } from "@/lib/insurance/queries";
import { policyState } from "@/lib/insurance/policy";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Profile > Insurance: every policy in the family, in one place.
 *
 * A family floater is one card covering several faces, not a copy per
 * person. Each person's Health file shows the policies that cover them, and
 * the chat answers cover questions from these. Policies are typed in (with
 * the PDF kept alongside); there is no insurer feed yet, so nothing is
 * fetched on anyone's behalf.
 */

export default function Insurance() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = usePolicies();
  const family = useFamily();
  const members = family.data?.access.all ?? [];

  if (q.isPending) {
    return (
      <ScreenSkeleton>
        <ListSkeleton rows={3} />
      </ScreenSkeleton>
    );
  }

  const policies = [...(q.data ?? [])].sort((a, b) => Number(policyState(a).status === "expired") - Number(policyState(b).status === "expired"));
  const uncovered = members.filter((m) => !policies.some((p) => p.coveredProfileIds.includes(m.id) && policyState(p).status !== "expired"));

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Insurance" fallback="/settings" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 32, gap: 14 }} showsVerticalScrollIndicator={false}>
        <PageTitle title="Your family's cover" line="Every policy in one place, and what each one covers, in plain words." />

        {q.isError ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>Couldn&apos;t load your policies. Pull down or come back in a moment.</Text>
        ) : null}

        {policies.length === 0 ? (
          <View style={[glassShadow, { backgroundColor: "#fff", borderRadius: 24, padding: 20, alignItems: "center", gap: 10, borderWidth: 1, borderColor: surface.line, marginTop: 6 }]}>
            <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
              <ShieldPlus size={26} color={ink[900]} />
            </View>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], textAlign: "center" }}>Add your health insurance</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500], textAlign: "center" }}>
              The policy number, cover and dates are enough to start. Add the PDF too if you have it. Then ask Cheeku things like &quot;is room rent capped?&quot;
            </Text>
            <PillButton icon={<Plus size={18} color="#fff" />} onPress={() => router.push("/insurance/edit")} style={{ alignSelf: "stretch", marginTop: 6 }}>
              Add a policy
            </PillButton>
          </View>
        ) : (
          <>
            {policies.map((p) => (
              <PolicyCard key={p.id} policy={p} members={members} onPress={() => router.push({ pathname: "/insurance/[id]", params: { id: p.id } })} />
            ))}
            <PillButton tone="light" icon={<Plus size={18} color={ink[900]} />} onPress={() => router.push("/insurance/edit")}>
              Add another policy
            </PillButton>
          </>
        )}

        {policies.length > 0 && uncovered.length > 0 ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500] }}>
            No active cover saved for {uncovered.map((m) => m.name.split(" ")[0]).join(", ")}. A policy from work counts too.
          </Text>
        ) : null}

        <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[300], marginTop: 6 }}>
          Only you can see these. Cheeku reads them to explain your cover back to you and never shares them with an insurer or anyone else.
        </Text>
      </ScrollView>
    </View>
  );
}
