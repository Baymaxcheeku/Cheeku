import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductAssessmentCard } from "@/components/ai/product-assessment-card";
import { AssistantTurn, UserBubble } from "@/components/chat/turn";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { fetchSitting } from "@/lib/memory/store";
import { withDayBreaks } from "@/lib/memory/thread";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * One past sitting, read-only, exactly as it was answered: the tier, what was
 * read, the script. Carrying on happens in the main thread, where the memory
 * is current, so this ends in a button back to it rather than a composer.
 */
export default function Sitting() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const member = useFamily().data?.profile ?? null;
  const name = member?.name.split(/\s+/)[0] ?? "";
  const sitting = useQuery({ queryKey: ["thread", member?.id ?? "none", "sitting", id], queryFn: () => fetchSitting(id), enabled: Boolean(id) });

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop height={300} />
      <ScreenHeader title="Conversation" fallback="/chats" />
      {sitting.isPending ? (
        <ActivityIndicator color={brand[600]} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 32, gap: 14 }}>
          {withDayBreaks(sitting.data ?? []).map((item) => {
            if (item.kind === "day") {
              return (
                <View key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: surface.line }} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.4, color: ink[500] }}>{item.label}</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: surface.line }} />
                </View>
              );
            }
            const m = item.message;
            if (m.role === "user") return <UserBubble key={item.key} message={m} />;
            if (m.assessment) return <ProductAssessmentCard key={item.key} assessment={m.assessment} />;
            return <AssistantTurn key={item.key} message={m} name={name} onOpenRecord={(doc) => router.push(`/records/${doc}`)} onOpenMemory={() => router.push("/memory")} onBook={(mode) => router.push({ pathname: "/book/consult", params: { mode } })} />;
          })}
          <PillButton tone="dark" icon={<MessageCircle size={17} color="#fff" />} onPress={() => router.replace("/ask")} style={{ marginTop: 8 }}>
            {`Carry on with ${name}`}
          </PillButton>
        </ScrollView>
      )}
    </View>
  );
}
